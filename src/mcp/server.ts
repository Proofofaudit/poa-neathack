/**
 * POA Model Context Protocol (MCP) Server
 * 
 * Standard: Model Context Protocol (JSON-RPC 2.0 over stdio)
 * Enables any MCP-compliant AI client (Cursor, Claude Desktop, Antigravity) to:
 *  1. Inspect DeFi incident parameters and on-chain contract state
 *  2. Execute deterministic counterfactual loss replays
 *  3. Generate and verify OpenZeppelin StandardMerkleTree claim proofs
 *  4. Inspect the Proof-Carrying Restitution Manifest (PCRM)
 */

import readline from "readline";
import { ethers } from "ethers";
import { CounterfactualReplayEngine } from "../economics/counterfactual.js";
import { MerkleManifestGenerator } from "../proofs/merkle.js";
import { ManifestGenerator } from "../proofs/manifest.js";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

const TOOLS = [
  {
    name: "poa_replay_counterfactual",
    description: "Execute deterministic counterfactual replay for a borrower position under an oracle intervention policy. Returns exact Net Equity delta and moral hazard status.",
    inputSchema: {
      type: "object",
      properties: {
        claimIndex: { type: "number", description: "Index of the claim" },
        borrowerAddress: { type: "string", description: "Borrower wallet address" },
        collateralWeth: { type: "string", description: "Collateral amount in 18 decimals WETH (e.g. 2000000000000000000)" },
        debtUsdc: { type: "string", description: "Debt amount in 6 decimals USDC (e.g. 2500000000)" },
        liquidatorAddress: { type: "string", description: "Liquidator wallet address" },
        debtCoveredUsdc: { type: "string", description: "Debt repaid by liquidator in 6 decimals USDC" },
        collateralSeizedWeth: { type: "string", description: "Collateral seized by liquidator in 18 decimals WETH" },
        faultyPriceUsd8Dec: { type: "string", description: "Faulty oracle price in 8 decimals (e.g. 180000000000)" },
        baselinePriceUsd8Dec: { type: "string", description: "True baseline reference price in 8 decimals (e.g. 200000000000)" }
      },
      required: ["claimIndex", "borrowerAddress", "collateralWeth", "debtUsdc", "faultyPriceUsd8Dec"]
    }
  },
  {
    name: "poa_generate_merkle_manifest",
    description: "Generate an OpenZeppelin StandardMerkleTree with double keccak-256 leaf hashing (CVE-2022-37454 immune) and SHA-256 sealed Proof-Carrying Restitution Manifest.",
    inputSchema: {
      type: "object",
      properties: {
        incidentId: { type: "string", description: "Hex incident identifier" },
        incidentTxHash: { type: "string", description: "Transaction hash of the incident" },
        claims: {
          type: "array",
          items: {
            type: "object",
            properties: {
              claimIndex: { type: "number" },
              claimant: { type: "string" },
              amountUsdc: { type: "string" }
            },
            required: ["claimIndex", "claimant", "amountUsdc"]
          }
        }
      },
      required: ["incidentId", "incidentTxHash", "claims"]
    }
  },
  {
    name: "poa_verify_claim_proof",
    description: "Independently verify a victim's Merkle inclusion proof against a published restitution root.",
    inputSchema: {
      type: "object",
      properties: {
        merkleRoot: { type: "string", description: "Published Merkle root" },
        claimIndex: { type: "number" },
        claimant: { type: "string" },
        amountUsdc: { type: "string" },
        incidentId: { type: "string" },
        proof: { type: "array", items: { type: "string" } }
      },
      required: ["merkleRoot", "claimIndex", "claimant", "amountUsdc", "incidentId", "proof"]
    }
  }
];

function handleToolCall(name: string, args: any): any {
  switch (name) {
    case "poa_replay_counterfactual": {
      const claimIndex = Number(args.claimIndex || 0);
      const collateral = BigInt(args.collateralWeth);
      const debt = BigInt(args.debtUsdc);
      const faultyPrice = BigInt(args.faultyPriceUsd8Dec || "180000000000");

      const liqEvent = args.debtCoveredUsdc ? {
        txHash: "0xsimulated",
        blockNumber: 1,
        liquidator: args.liquidatorAddress || "0x0",
        borrower: args.borrowerAddress,
        debtCovered: BigInt(args.debtCoveredUsdc),
        collateralSeized: BigInt(args.collateralSeizedWeth || "0"),
        oraclePriceUsed: faultyPrice
      } : undefined;

      const result = CounterfactualReplayEngine.analyzeBorrowerIncident(
        claimIndex,
        { account: args.borrowerAddress, collateralBase: collateral, debtBase: debt },
        liqEvent,
        faultyPrice
      );

      return {
        status: result.status,
        borrower: result.borrower,
        baselineHealthFactor: result.baselineHealthFactor,
        faultyHealthFactor: result.faultyHealthFactor,
        counterfactualNetEquityUsd: result.counterfactualNetEquityUsd,
        observedNetEquityUsd: result.observedNetEquityUsd,
        restitutionUsdc: result.restitutionAmountUsdc.toString(),
        restitutionUsdcFormatted: `${(Number(result.restitutionAmountUsdc) / 1e6).toFixed(2)} USDC`,
        reason: result.reason
      };
    }

    case "poa_generate_merkle_manifest": {
      const claimsForTree = args.claims.map((c: any) => ({
        claimIndex: Number(c.claimIndex),
        claimant: c.claimant,
        amount: BigInt(c.amountUsdc)
      }));

      const manifest = MerkleManifestGenerator.generateManifest(args.incidentId, claimsForTree);
      return {
        incidentId: manifest.incidentId,
        merkleRoot: manifest.merkleRoot,
        totalRestitutionUsdc: manifest.totalRestitutionAmount.toString(),
        totalRestitutionFormatted: `${(Number(manifest.totalRestitutionAmount) / 1e6).toFixed(2)} USDC`,
        claimsCount: manifest.claimsCount,
        policyVersion: manifest.policyVersion,
        leaves: manifest.claims
      };
    }

    case "poa_verify_claim_proof": {
      const valid = MerkleManifestGenerator.verifyClaimProof(
        args.merkleRoot,
        Number(args.claimIndex),
        args.claimant,
        BigInt(args.amountUsdc),
        args.incidentId,
        args.proof
      );
      return {
        valid,
        claimant: args.claimant,
        amountUsdc: args.amountUsdc,
        merkleRoot: args.merkleRoot
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function startMcpServer() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  rl.on("line", (line) => {
    if (!line.trim()) return;
    try {
      const request: JsonRpcRequest = JSON.parse(line);
      let response: JsonRpcResponse = { jsonrpc: "2.0", id: request.id };

      switch (request.method) {
        case "initialize":
          response.result = {
            protocolVersion: "2024-11-05",
            serverInfo: {
              name: "poa-restitution-mcp",
              version: "1.0.0"
            },
            capabilities: {
              tools: {}
            }
          };
          break;

        case "tools/list":
          response.result = { tools: TOOLS };
          break;

        case "tools/call": {
          const { name, arguments: toolArgs } = request.params || {};
          try {
            const toolOutput = handleToolCall(name, toolArgs);
            response.result = {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(toolOutput, null, 2)
                }
              ]
            };
          } catch (toolErr: any) {
            response.error = {
              code: -32603,
              message: toolErr.message || "Internal tool execution error"
            };
          }
          break;
        }

        default:
          response.error = {
            code: -32601,
            message: `Method not found: ${request.method}`
          };
          break;
      }

      console.log(JSON.stringify(response));
    } catch (parseErr: any) {
      console.log(JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error" }
      }));
    }
  });
}

startMcpServer();
