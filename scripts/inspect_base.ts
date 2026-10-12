import "dotenv/config";
import { ethers } from "ethers";
import { AAVE_BASE_POOL, inspectBase } from "../src/chain/live-inspection.js";
const request = new ethers.FetchRequest(process.env.BASE_RPC_URL || "https://mainnet.base.org");
request.timeout = 10000;
const provider = new ethers.JsonRpcProvider(request, undefined, { batchMaxCount: 1 });
try {
  console.log(JSON.stringify(await inspectBase(provider, process.argv[2] || AAVE_BASE_POOL), null, 2));
} catch {
  console.error("Live Base inspection failed. Check your address/hash and BASE_RPC_URL. No demo result was substituted.");
  process.exitCode = 1;
} finally { provider.destroy(); }
