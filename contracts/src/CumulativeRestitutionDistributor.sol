// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CumulativeRestitutionDistributor
 * @notice Multi-tranche, cumulative restitution distributor modeled on 1inch CumulativeMerkleDrop
 *         and Morpho Universal Rewards Distributor (URD).
 * 
 * Invariants:
 *  1. Claimable amount for account i in epoch k: Claimable_i = max(0, CumulativeEntitlement_i - Claimed_i)
 *  2. Monotonicity: CumulativeEntitlement^(k+1) >= CumulativeEntitlement^(k)
 *  3. Conservation: Sum(Claimable) <= Contract Token Balance
 *  4. Second-Preimage Defense: Double-hash leaf encoding keccak256(bytes.concat(keccak256(...)))
 */
contract CumulativeRestitutionDistributor is Ownable {
    using SafeERC20 for IERC20;

    struct DistributionEpoch {
        bytes32 merkleRoot;
        uint256 totalCumulativeAllocated;
        uint256 epochTimestamp;
        string policyVersion;
    }

    bytes32 public immutable incidentId;
    IERC20 public immutable payoutToken;

    // Current epoch number
    uint256 public currentEpoch;
    uint256 public totalPaid;
    // epochNumber => DistributionEpoch
    mapping(uint256 => DistributionEpoch) public epochs;
    // account => cumulative amount already withdrawn
    mapping(address => uint256) public cumulativeClaimed;

    event EpochPublished(
        uint256 indexed epochNumber,
        bytes32 indexed merkleRoot,
        uint256 totalCumulativeAllocated,
        string policyVersion
    );

    event CumulativeClaimExecuted(
        address indexed claimant,
        uint256 amountTransferred,
        uint256 newCumulativeClaimed,
        uint256 epochNumber
    );

    constructor(
        bytes32 _incidentId,
        address _payoutToken
    ) Ownable(msg.sender) {
        require(_payoutToken != address(0), "Invalid payout token address");
        incidentId = _incidentId;
        payoutToken = IERC20(_payoutToken);
    }

    /**
     * @notice Publish a new cumulative recovery epoch (e.g. after negotiating or recovering asset tranches)
     */
    function publishEpoch(
        bytes32 merkleRoot,
        uint256 totalCumulativeAllocated,
        string calldata policyVersion
    ) external onlyOwner {
        require(merkleRoot != bytes32(0), "Merkle root cannot be zero");
        
        require(totalCumulativeAllocated >= epochs[currentEpoch].totalCumulativeAllocated, "Allocation cannot decrease");
        require(totalCumulativeAllocated > 0 && payoutToken.balanceOf(address(this)) + totalPaid >= totalCumulativeAllocated, "Epoch insufficiently funded");
        currentEpoch += 1;
        epochs[currentEpoch] = DistributionEpoch({
            merkleRoot: merkleRoot,
            totalCumulativeAllocated: totalCumulativeAllocated,
            epochTimestamp: block.timestamp,
            policyVersion: policyVersion
        });

        emit EpochPublished(currentEpoch, merkleRoot, totalCumulativeAllocated, policyVersion);
    }

    /**
     * @notice Claim any newly unlocked recovery funds under the latest cumulative Merkle root
     * @param claimant Recipient address
     * @param cumulativeEntitlement Total entitlement allocated up to the current epoch
     * @param merkleProof Inclusion proof against the current epoch's root
     */
    function claimCumulative(
        address claimant,
        uint256 cumulativeEntitlement,
        bytes32[] calldata merkleProof
    ) external {
        require(currentEpoch > 0, "No distribution epochs published yet");
        DistributionEpoch memory epoch = epochs[currentEpoch];

        // Double keccak256 hash to prevent 64-byte intermediate node internal-node confusion attacks
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
            MerkleProof.verify(merkleProof, epoch.merkleRoot, leaf),
            "Invalid Merkle proof for cumulative restitution"
        );

        uint256 alreadyClaimed = cumulativeClaimed[claimant];
        require(cumulativeEntitlement > alreadyClaimed, "No new claimable balance available for this epoch");

        uint256 claimableDelta = cumulativeEntitlement - alreadyClaimed;
        require(totalPaid + claimableDelta <= epoch.totalCumulativeAllocated, "Claim exceeds epoch allocation");
        totalPaid += claimableDelta;
        cumulativeClaimed[claimant] = cumulativeEntitlement;

        payoutToken.safeTransfer(claimant, claimableDelta);

        emit CumulativeClaimExecuted(claimant, claimableDelta, cumulativeEntitlement, currentEpoch);
    }

    /**
     * @notice View remaining claimable balance for an account given an entitlement proof
     */
    function getClaimableAmount(address account, uint256 cumulativeEntitlement) external view returns (uint256) {
        uint256 alreadyClaimed = cumulativeClaimed[account];
        if (cumulativeEntitlement <= alreadyClaimed) {
            return 0;
        }
        return cumulativeEntitlement - alreadyClaimed;
    }
}
