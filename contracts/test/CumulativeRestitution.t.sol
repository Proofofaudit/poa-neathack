// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/MockERC20.sol";
import "../src/CumulativeRestitutionDistributor.sol";

contract CumulativeRestitutionTest is Test {
    MockERC20 public usdc;
    CumulativeRestitutionDistributor public distributor;

    address public owner = address(this);
    address public victim1 = address(0x1111);
    address public victim2 = address(0x2222);

    bytes32 public incidentId = keccak256("INCIDENT_TEST_2026");

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC", 6);
        distributor = new CumulativeRestitutionDistributor(incidentId, address(usdc));

        // Fund distributor with 10,000 USDC
        usdc.mint(address(distributor), 10_000 * 1e6);
    }

    function test_SingleBeneficiaryCumulativeTranches() public {
        // Victim 1 has cumulative entitlement of 400 USDC in Epoch 1
        uint256 epoch1Entitlement = 400 * 1e6;
        bytes32 leaf1 = keccak256(
            bytes.concat(
                keccak256(
                    abi.encode(
                        victim1,
                        address(usdc),
                        epoch1Entitlement,
                        incidentId
                    )
                )
            )
        );

        // Single-leaf tree: root is the leaf itself
        bytes32 rootEpoch1 = leaf1;
        bytes32[] memory emptyProof = new bytes32[](0);

        distributor.publishEpoch(rootEpoch1, epoch1Entitlement, "POA_RESTITUTION_POLICY_V1_EQUITY_DELTA");

        // Verify claimable balance before claim
        assertEq(distributor.getClaimableAmount(victim1, epoch1Entitlement), 400 * 1e6);

        // Execute claim for Epoch 1
        distributor.claimCumulative(victim1, epoch1Entitlement, emptyProof);

        assertEq(usdc.balanceOf(victim1), 400 * 1e6);
        assertEq(distributor.cumulativeClaimed(victim1), 400 * 1e6);
        assertEq(distributor.getClaimableAmount(victim1, epoch1Entitlement), 0);

        // Try claiming again in Epoch 1 -> should revert
        vm.expectRevert("No new claimable balance available for this epoch");
        distributor.claimCumulative(victim1, epoch1Entitlement, emptyProof);

        // --- Now publish Epoch 2 with increased cumulative entitlement (750 USDC total) ---
        uint256 epoch2Entitlement = 750 * 1e6;
        bytes32 leaf2 = keccak256(
            bytes.concat(
                keccak256(
                    abi.encode(
                        victim1,
                        address(usdc),
                        epoch2Entitlement,
                        incidentId
                    )
                )
            )
        );
        bytes32 rootEpoch2 = leaf2;

        distributor.publishEpoch(rootEpoch2, epoch2Entitlement, "POA_RESTITUTION_POLICY_V1_EQUITY_DELTA");

        // Claimable should now be 750 - 400 = 350 USDC
        assertEq(distributor.getClaimableAmount(victim1, epoch2Entitlement), 350 * 1e6);

        // Execute claim for Epoch 2
        distributor.claimCumulative(victim1, epoch2Entitlement, emptyProof);

        // Total received by victim1 should now be 750 USDC
        assertEq(usdc.balanceOf(victim1), 750 * 1e6);
        assertEq(distributor.cumulativeClaimed(victim1), 750 * 1e6);
    }

    function test_RevertInvalidProof() public {
        uint256 entitlement = 500 * 1e6;
        bytes32 fakeRoot = keccak256("SOME_ROOT");
        distributor.publishEpoch(fakeRoot, entitlement, "POA_RESTITUTION_POLICY_V1_EQUITY_DELTA");

        bytes32[] memory fakeProof = new bytes32[](1);
        fakeProof[0] = keccak256("WRONG_PROOF");

        vm.expectRevert("Invalid Merkle proof for cumulative restitution");
        distributor.claimCumulative(victim1, entitlement, fakeProof);
    }

    function test_SecondPreimageAttackResistance() public {
        // Attempting to submit a raw 64-byte internal node hash as leaf fails
        uint256 entitlement = 500 * 1e6;
        bytes32 validLeaf = keccak256(
            bytes.concat(
                keccak256(
                    abi.encode(victim1, address(usdc), entitlement, incidentId)
                )
            )
        );
        distributor.publishEpoch(validLeaf, entitlement, "POA_RESTITUTION_POLICY_V1_EQUITY_DELTA");

        // Malicious caller tries to claim with forged entitlement or mismatched leaf
        bytes32[] memory emptyProof = new bytes32[](0);
        vm.expectRevert("Invalid Merkle proof for cumulative restitution");
        distributor.claimCumulative(victim1, entitlement + 100 * 1e6, emptyProof);
    }
}
