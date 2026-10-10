import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { ethers } from "ethers";

export interface ClaimManifestItem {
  claimIndex: number;
  claimant: string;
  amount: bigint; // 6 decimals USDC
  incidentId: string;
  proof: string[];
}

export interface RestitutionMerkleManifest {
  incidentId: string;
  merkleRoot: string;
  totalRestitutionAmount: bigint;
  claimsCount: number;
  claims: ClaimManifestItem[];
  generatedAt: string;
  policyVersion: string;
}

export class MerkleManifestGenerator {
  public static readonly POLICY_VERSION = "POA_RESTITUTION_POLICY_V1_EQUITY_DELTA";

  public static generateManifest(
    incidentId: string,
    verifiedClaims: Array<{ claimIndex: number; claimant: string; amount: bigint }>
  ): RestitutionMerkleManifest {
    // Filter to claims with positive compensation
    const activeClaims = verifiedClaims.filter(c => c.amount > 0n);
    if (activeClaims.length === 0) {
      throw new Error("Cannot generate manifest with zero valid claims");
    }

    // Format entries for OpenZeppelin StandardMerkleTree: [claimIndex, claimant, amount, incidentId]
    const treeValues: Array<[number, string, string, string]> = activeClaims.map(c => [
      c.claimIndex,
      ethers.getAddress(c.claimant),
      c.amount.toString(),
      incidentId
    ]);

    const tree = StandardMerkleTree.of(treeValues, ["uint256", "address", "uint256", "bytes32"]);
    const merkleRoot = tree.root;

    let totalAmount = 0n;
    const claimsWithProof: ClaimManifestItem[] = [];

    for (const [i, v] of tree.entries()) {
      const proof = tree.getProof(i);
      const claimIndex = Number(v[0]);
      const claimant = v[1];
      const amount = BigInt(v[2]);
      totalAmount += amount;

      claimsWithProof.push({
        claimIndex,
        claimant,
        amount,
        incidentId,
        proof
      });
    }

    return {
      incidentId,
      merkleRoot,
      totalRestitutionAmount: totalAmount,
      claimsCount: claimsWithProof.length,
      claims: claimsWithProof,
      generatedAt: new Date().toISOString(),
      policyVersion: this.POLICY_VERSION
    };
  }

  /**
   * Independently verify a claim proof against a Merkle root
   */
  public static verifyClaimProof(
    merkleRoot: string,
    claimIndex: number,
    claimant: string,
    amount: bigint,
    incidentId: string,
    proof: string[]
  ): boolean {
    const claimValues: Array<[number, string, string, string]> = [[
      claimIndex,
      ethers.getAddress(claimant),
      amount.toString(),
      incidentId
    ]];
    const tempTree = StandardMerkleTree.of(claimValues, ["uint256", "address", "uint256", "bytes32"]);
    // Leaf is the keccak256 hash
    const leaf = tempTree.leafHash([claimIndex, ethers.getAddress(claimant), amount.toString(), incidentId]);
    return StandardMerkleTree.verify(merkleRoot, ["uint256", "address", "uint256", "bytes32"], [claimIndex, ethers.getAddress(claimant), amount.toString(), incidentId], proof);
  }
}
