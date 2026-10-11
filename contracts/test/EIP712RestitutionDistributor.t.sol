// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/MockERC20.sol";
import "../src/EIP712RestitutionDistributor.sol";

contract EIP712RestitutionDistributorTest is Test {
    MockERC20 public usdc;
    EIP712RestitutionDistributor public distributor;

    uint256 internal victimPrivateKey = 0xA11CE;
    address internal victim;
    address internal relayer = address(0x9999);

    bytes32 public incidentId = keccak256("INCIDENT_TEST_EIP712_2026");

    function setUp() public {
        victim = vm.addr(victimPrivateKey);
        vm.deal(victim, 0); // Drained victim has exactly 0 ETH

        usdc = new MockERC20("USD Coin", "USDC", 6);
        distributor = new EIP712RestitutionDistributor(incidentId, address(usdc));

        // Fund distributor with 50,000 USDC
        usdc.mint(address(distributor), 50_000 * 1e6);
    }

    function test_GaslessClaimByRelayer() public {
        uint256 cumulativeEntitlement = 1_250 * 1e6; // 1,250 USDC
        uint256 deadline = block.timestamp + 1 hours;

        // Leaf calculation matches OZ Double Keccak
        bytes32 leaf = keccak256(
            bytes.concat(
                keccak256(
                    abi.encode(
                        victim,
                        address(usdc),
                        cumulativeEntitlement,
                        incidentId
                    )
                )
            )
        );

        // Single-leaf tree: root is the leaf
        distributor.publishEpoch(leaf, cumulativeEntitlement, "POA_RESTITUTION_POLICY_V1_EQUITY_DELTA");

        // Construct EIP-712 Digest using distributor helper
        bytes32 digest = distributor.getDigest(
            victim,
            cumulativeEntitlement,
            distributor.nonces(victim),
            deadline
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(victimPrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        bytes32[] memory emptyProof = new bytes32[](0);

        // Relayer submits transaction on behalf of victim
        vm.prank(relayer);
        distributor.claimWithSignature(
            victim,
            cumulativeEntitlement,
            deadline,
            signature,
            emptyProof
        );

        // Assert victim with 0 ETH received full payout directly
        assertEq(usdc.balanceOf(victim), 1_250 * 1e6);
        assertEq(distributor.cumulativeClaimed(victim), 1_250 * 1e6);
        assertEq(distributor.nonces(victim), 1);
        assertEq(victim.balance, 0); // ETH balance remained 0
    }

    function test_RevertExpiredSignature() public {
        uint256 cumulativeEntitlement = 500 * 1e6;
        uint256 deadline = block.timestamp - 1; // Expired

        bytes32[] memory emptyProof = new bytes32[](0);
        bytes memory dummySignature = new bytes(65);

        vm.expectRevert("Claim signature has expired");
        distributor.claimWithSignature(
            victim,
            cumulativeEntitlement,
            deadline,
            dummySignature,
            emptyProof
        );
    }

    function test_RevertInvalidSignatureSigner() public {
        uint256 cumulativeEntitlement = 500 * 1e6;
        uint256 deadline = block.timestamp + 1 hours;

        bytes32 leaf = keccak256(
            bytes.concat(
                keccak256(
                    abi.encode(
                        victim,
                        address(usdc),
                        cumulativeEntitlement,
                        incidentId
                    )
                )
            )
        );
        distributor.publishEpoch(leaf, cumulativeEntitlement, "POA_RESTITUTION_POLICY_V1");

        // Sign with an unauthorized attacker key
        uint256 attackerKey = 0xBAD;
        bytes32 digest = distributor.getDigest(
            victim,
            cumulativeEntitlement,
            distributor.nonces(victim),
            deadline
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(attackerKey, digest);
        bytes memory badSignature = abi.encodePacked(r, s, v);

        bytes32[] memory emptyProof = new bytes32[](0);

        vm.expectRevert("Invalid EIP-712 claimant signature");
        distributor.claimWithSignature(
            victim,
            cumulativeEntitlement,
            deadline,
            badSignature,
            emptyProof
        );
    }
}
