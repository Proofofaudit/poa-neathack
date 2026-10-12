import { expect, it, vi } from "vitest";
import { publicAiCaseAllowed, reservePublicAiRun } from "../src/server/public-ai-access";
import { HISTORICAL_LIQUIDATION } from "../src/chain/aave-forensics";
it("public AI is explicitly enabled and restricted to its verified historical case", () => {
 vi.stubEnv("POA_PUBLIC_AI_ENABLED", undefined);expect(publicAiCaseAllowed()).toBe(false);
 vi.stubEnv("POA_PUBLIC_AI_ENABLED", "true");expect(publicAiCaseAllowed()).toBe(true);expect(publicAiCaseAllowed(HISTORICAL_LIQUIDATION)).toBe(true);expect(publicAiCaseAllowed(`0x${"ab".repeat(32)}`)).toBe(false);
});
it("bounds concurrent and repeated public runs per server instance", () => {
 const now=Date.now()+600000; const release=reservePublicAiRun(now)!;expect(release).toBeTypeOf("function");expect(reservePublicAiRun(now)).toBeNull();release();release();
 for(let i=0;i<4;i++)reservePublicAiRun(now)!();
 expect(reservePublicAiRun(now)).toBeNull();expect(reservePublicAiRun(now+600000)).toBeTypeOf("function");
});
