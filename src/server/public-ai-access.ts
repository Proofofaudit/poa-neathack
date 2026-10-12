import { HISTORICAL_LIQUIDATION } from "../chain/aave-forensics";
// A small per-instance demo budget, not an account-wide spending cap.
let windowStarted = 0, runs = 0, active = false;
export function publicAiCaseAllowed(hash?: string) {
  return process.env.POA_PUBLIC_AI_ENABLED === "true" && (!hash || hash.toLowerCase() === HISTORICAL_LIQUIDATION);
}
export function reservePublicAiRun(now = Date.now()) {
  if (now - windowStarted >= 10 * 60 * 1000) { windowStarted = now; runs = 0; }
  if (active || runs >= 5) return null;
  runs++; active = true;
  let released = false;
  return () => { if (!released) { active = false; released = true; } };
}
