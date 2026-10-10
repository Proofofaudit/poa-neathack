// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RestitutionDistributor is Ownable {
    using SafeERC20 for IERC20;

    struct IncidentManifest {
        bytes32 merkleRoot;
        uint256 totalAmount;
        address payoutToken;
        bool finalized;
        uint256 registeredAt;
        string policyVersion;
    }

    mapping(bytes32 => IncidentManifest) public incidents;
    // incidentId => claimIndex => claimed
    mapping(bytes32 => mapping(uint256 => bool)) public isClaimed;

    event IncidentRegistered(
        bytes32 indexed incidentId,
        bytes32 merkleRoot,
        uint256 totalAmount,
        address indexed payoutToken,
        string policyVersion
    );

    event RestitutionClaimed(
        bytes32 indexed incidentId,
        uint256 indexed claimIndex,
        address indexed claimant,
        uint256 amount
    );

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Authorize and finalize a restitution manifest for a verified incident
     */
    function registerIncident(
        bytes32 incidentId,
        bytes32 merkleRoot,
        uint256 totalAmount,
        address payoutToken,
        string calldata policyVersion
    ) external onlyOwner {
        require(!incidents[incidentId].finalized, "Incident already registered and finalized");
        require(merkleRoot != bytes32(0), "Merkle root cannot be zero");
        require(payoutToken != address(0), "Payout token cannot be zero");
        require(totalAmount > 0, "Total amount must be > 0");

        // Verify that the contract holds or receives sufficient payout tokens
        uint256 contractBalance = IERC20(payoutToken).balanceOf(address(this));
        require(contractBalance >= totalAmount, "Distributor contract has insufficient funding");

        incidents[incidentId] = IncidentManifest({
            merkleRoot: merkleRoot,
            totalAmount: totalAmount,
            payoutToken: payoutToken,
            finalized: true,
            registeredAt: block.timestamp,
            policyVersion: policyVersion
        });

        emit IncidentRegistered(incidentId, merkleRoot, totalAmount, payoutToken, policyVersion);
    }

    /**
     * @notice Claim verified restitution using an OpenZeppelin StandardMerkleTree proof
     */
    function claim(
        bytes32 incidentId,
        uint256 claimIndex,
        address claimant,
        uint256 amount,
        bytes32[] calldata merkleProof
    ) external {
        IncidentManifest memory manifest = incidents[incidentId];
        require(manifest.finalized, "Incident manifest not registered or finalized");
        require(!isClaimed[incidentId][claimIndex], "Claim has already been executed");

        // OpenZeppelin StandardMerkleTree leaf: keccak256(bytes.concat(keccak256(abi.encode(claimIndex, claimant, amount, incidentId))))
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(claimIndex, claimant, amount, incidentId))));

        require(
            MerkleProof.verify(merkleProof, manifest.merkleRoot, leaf),
            "Invalid Merkle proof for restitution claim"
        );

        isClaimed[incidentId][claimIndex] = true;

        IERC20(manifest.payoutToken).safeTransfer(claimant, amount);

        emit RestitutionClaimed(incidentId, claimIndex, claimant, amount);
    }
}
