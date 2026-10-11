// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./CumulativeRestitutionDistributor.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title EIP712RestitutionDistributor
 * @notice Gasless restitution distributor enabling drained exploit victims with 0 ETH
 *         to receive their restitution via relayer-sponsored EIP-712 meta-transactions.
 */
contract EIP712RestitutionDistributor is CumulativeRestitutionDistributor, EIP712 {
    using SafeERC20 for IERC20;

    bytes32 public constant CLAIM_TYPEHASH = keccak256(
        "ClaimAuthorization(address claimant,uint256 cumulativeEntitlement,uint256 nonce,uint256 deadline)"
    );

    // claimant => nonces
    mapping(address => uint256) public nonces;

    event GaslessClaimExecuted(
        address indexed claimant,
        address indexed relayer,
        uint256 amountTransferred,
        uint256 nonce
    );

    constructor(
        bytes32 _incidentId,
        address _payoutToken
    ) CumulativeRestitutionDistributor(_incidentId, _payoutToken) EIP712("POA Restitution Relayer", "1.0.0") {}

    /**
     * @notice Returns the domain separator for EIP-712 signatures
     */
    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /**
     * @notice Helper to compute the standard EIP-712 digest for a claim authorization
     */
    function getDigest(
        address claimant,
        uint256 cumulativeEntitlement,
        uint256 nonce,
        uint256 deadline
    ) public view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                CLAIM_TYPEHASH,
                claimant,
                cumulativeEntitlement,
                nonce,
                deadline
            )
        );
        return _hashTypedDataV4(structHash);
    }

    /**
     * @notice Execute a gasless restitution claim on behalf of a victim with 0 ETH
     */
    function claimWithSignature(
        address claimant,
        uint256 cumulativeEntitlement,
        uint256 deadline,
        bytes calldata signature,
        bytes32[] calldata merkleProof
    ) external {
        require(block.timestamp <= deadline, "Claim signature has expired");
        require(claimant != address(0), "Invalid claimant address");

        bytes32 structHash = keccak256(
            abi.encode(
                CLAIM_TYPEHASH,
                claimant,
                cumulativeEntitlement,
                nonces[claimant]++,
                deadline
            )
        );

        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, signature);
        require(signer == claimant, "Invalid EIP-712 claimant signature");

        // Verify Merkle inclusion proof
        bytes32 leaf = keccak256(
            bytes.concat(
                keccak256(
                    abi.encode(
                        claimant,
                        address(payoutToken),
                        cumulativeEntitlement,
                        incidentId
                    )
                )
            )
        );

        require(
            MerkleProof.verify(merkleProof, epochs[currentEpoch].merkleRoot, leaf),
            "Invalid Merkle proof for cumulative restitution"
        );

        uint256 alreadyClaimed = cumulativeClaimed[claimant];
        require(cumulativeEntitlement > alreadyClaimed, "No new claimable balance available for this epoch");

        uint256 claimableDelta = cumulativeEntitlement - alreadyClaimed;
        cumulativeClaimed[claimant] = cumulativeEntitlement;

        // Payout transferred directly to victim, NOT the relayer
        payoutToken.safeTransfer(claimant, claimableDelta);

        emit GaslessClaimExecuted(claimant, msg.sender, claimableDelta, nonces[claimant] - 1);
        emit CumulativeClaimExecuted(claimant, claimableDelta, cumulativeEntitlement, currentEpoch);
    }
}
