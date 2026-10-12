import { spawn, ChildProcess } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { ethers } from "ethers";
import { rpcRead } from "./rpc.js";
export async function startSandbox(fork = false): Promise<{
  process: ChildProcess;
  provider: ethers.JsonRpcProvider;
  rpcUrl: string;
  forkBlockNumber?: number;
}> {
  const port = await new Promise<number>((resolve, reject) => {
    const socket = net.createServer();
    socket.once("error", reject);
    socket.listen(0, "127.0.0.1", () => {
      const address = socket.address() as net.AddressInfo;
      socket.close(() => resolve(address.port));
    });
  });
  const args = ["--host", "127.0.0.1", "--port", String(port), "--silent"];
  let forkBlockNumber: number | undefined;
  if (fork) {
    const url = process.env.BASE_RPC_URL || "https://mainnet.base.org";
    const request = new ethers.FetchRequest(url);
    request.timeout = 12000;
    const upstream = new ethers.JsonRpcProvider(request);
    try {
      forkBlockNumber = process.env.BASE_FORK_BLOCK
        ? Number(process.env.BASE_FORK_BLOCK)
        : await rpcRead(() => upstream.getBlockNumber(), {
            attempts: 1,
            timeoutMs: 12000,
          });
    } finally {
      upstream.destroy();
    }
    if (!Number.isSafeInteger(forkBlockNumber) || forkBlockNumber! < 1)
      throw new Error("Invalid Base fork block");
    args.push(
      "--fork-url",
      url,
      "--fork-block-number",
      String(forkBlockNumber),
      "--chain-id",
      "8453",
    );
  }
  const child = spawn(
    process.env.ANVIL_BIN ||
      path.join(process.env.HOME || "", ".foundry/bin/anvil"),
    args,
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  process.once("exit", () => child.kill());
  for (const signal of ["SIGTERM", "SIGINT"] as const)
    process.once(signal, () => {
      child.kill();
      process.exit(1);
    });
  let startupError: Error | undefined;
  let stderr = "";
  child.once("error", (error) => (startupError = error));
  child.stderr?.on("data", (chunk) => {
    stderr = (stderr + chunk.toString()).slice(-1000);
  });
  const rpcUrl = `http://127.0.0.1:${port}`;
  const provider = new ethers.JsonRpcProvider(rpcUrl, fork ? 8453 : 31337, {
    staticNetwork: true,
    cacheTimeout: -1,
    batchMaxCount: 1,
  });
  try {
    for (let attempt = 0; attempt < 40; attempt++) {
      if (startupError) throw startupError;
      if (child.exitCode !== null)
        throw new Error(`Sandbox exited during startup: ${stderr}`);
      try {
        await provider.getBlockNumber();
        return { process: child, provider, rpcUrl, forkBlockNumber };
      } catch {
        await new Promise((r) => setTimeout(r, 250));
      }
    }
    throw new Error("Sandbox startup timed out");
  } catch (error) {
    child.kill();
    provider.destroy();
    throw error;
  }
}
