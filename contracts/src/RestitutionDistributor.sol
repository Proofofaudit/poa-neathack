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
        uint256 remainingAmount;
        address payoutToken;
        bool finalized;
        uint256 registeredAt;
        string policyVersion;
    }

    mapping(bytes32 => IncidentManifest) public incidents;
    mapping(bytes32 => bool) public wasRegistered;
    // incidentId => claimIndex => claimed
    mapping(bytes32 => mapping(uint256 => bool)) public isClaimed;

    // payoutToken => total committed unspent restitution
    mapping(address => uint256) public totalCommittedTokens;

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

    event IncidentExpiredSwept(
        bytes32 indexed incidentId,
        address indexed recipient,
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
        require(!wasRegistered[incidentId], "Incident already registered and finalized");
        require(merkleRoot != bytes32(0), "Merkle root cannot be zero");
        require(payoutToken != address(0), "Payout token cannot be zero");
        require(totalAmount > 0, "Total amount must be > 0");

        // Verify that the contract holds sufficient uncommitted payout tokens
        uint256 contractBalance = IERC20(payoutToken).balanceOf(address(this));
        require(contractBalance >= totalCommittedTokens[payoutToken] + totalAmount, "Distributor contract has insufficient uncommitted funding");

        totalCommittedTokens[payoutToken] += totalAmount;
        wasRegistered[incidentId] = true;

        incidents[incidentId] = IncidentManifest({
            merkleRoot: merkleRoot,
            totalAmount: totalAmount,
            remainingAmount: totalAmount,
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
        IncidentManifest storage manifest = incidents[incidentId];
        require(manifest.finalized, "Incident manifest not registered or finalized");
        require(block.timestamp < manifest.registeredAt + 180 days, "Incident claim window expired");
        require(!isClaimed[incidentId][claimIndex], "Claim has already been executed");

        // OpenZeppelin StandardMerkleTree leaf: keccak256(bytes.concat(keccak256(abi.encode(claimIndex, claimant, amount, incidentId))))
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(claimIndex, claimant, amount, incidentId))));

        require(
            MerkleProof.verify(merkleProof, manifest.merkleRoot, leaf),
            "Invalid Merkle proof for restitution claim"
        );

        require(amount > 0 && amount <= manifest.remainingAmount, "Claim exceeds incident balance");

        isClaimed[incidentId][claimIndex] = true;

        manifest.remainingAmount -= amount;
        totalCommittedTokens[manifest.payoutToken] -= amount;

        IERC20(manifest.payoutToken).safeTransfer(claimant, amount);

        emit RestitutionClaimed(incidentId, claimIndex, claimant, amount);
    }

    /**
     * @notice Sweep unclaimed restitution after the 180-day dispute/claim window expires
     */
    function sweepExpiredIncident(bytes32 incidentId, address recipient) external onlyOwner {
        IncidentManifest storage manifest = incidents[incidentId];
        require(manifest.finalized, "Incident manifest not finalized");
        require(block.timestamp >= manifest.registeredAt + 180 days, "Incident claim window not expired");
        require(recipient != address(0), "Recipient cannot be zero");

        uint256 remainingCommitted = manifest.remainingAmount;
        manifest.remainingAmount = 0;
        manifest.finalized = false;
        totalCommittedTokens[manifest.payoutToken] -= remainingCommitted;

        IERC20(manifest.payoutToken).safeTransfer(recipient, remainingCommitted);

        emit IncidentExpiredSwept(incidentId, recipient, remainingCommitted);
    }
}
