import { ethers } from "ethers";
import { rpcRead } from "../chain/rpc.js";
export interface EnrichedEntityProfile {
  addressOrIdentifier: string;
  entityType: "CONTRACT" | "EOA_OR_UNDEPLOYED" | "UNKNOWN";
  isVerifiedEntity: false;
  isContract?: boolean;
  source: "ON_CHAIN_BYTECODE_INSPECTION" | "UNAVAILABLE";
}
// Bytecode is evidence of contract deployment only; it cannot establish identity or MEV activity.
export class CrustdataEnricher {
  async enrichEntities(
    addresses: string[],
    _protocol?: string,
    provider?: ethers.Provider,
  ): Promise<Record<string, EnrichedEntityProfile>> {
    return Object.fromEntries(
      await Promise.all(
        addresses.map(async (address) => {
          const profile: EnrichedEntityProfile = {
            addressOrIdentifier: address,
            entityType: "UNKNOWN",
            isVerifiedEntity: false,
            source: "UNAVAILABLE",
          };
          if (provider)
            try {
              const code = await rpcRead(() => provider.getCode(address), {
                attempts: 1,
                timeoutMs: 1500,
              });
              profile.isContract = code !== "0x";
              profile.entityType = profile.isContract
                ? "CONTRACT"
                : "EOA_OR_UNDEPLOYED";
              profile.source = "ON_CHAIN_BYTECODE_INSPECTION";
            } catch {
              /* Unknown stays unknown. */
            }
          return [address, profile];
        }),
      ),
    );
  }
}
