import { timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
export function authorizedDemoRequest(req: NextRequest) {
  const token = process.env.POA_DEMO_TOKEN;
  if (token) {
    if (token.length < 32) return false;
    const supplied = Buffer.from(
      req.headers.get("authorization")?.replace(/^Bearer /, "") || "",
    );
    const expected = Buffer.from(token);
    return (
      supplied.length === expected.length && timingSafeEqual(supplied, expected)
    );
  }
  if (process.env.NODE_ENV === "production") return false;
  if (!["localhost", "127.0.0.1", "[::1]"].includes(req.nextUrl.hostname))
    return false;
  // NextURL normalizes loopback addresses to localhost. The raw Host header
  // retains the browser's actual host; validate it before reconstructing origin.
  const host = req.headers.get("host") || req.nextUrl.host;
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/i.test(host))
    return false;
  try {
    const expected = new URL(`${req.nextUrl.protocol}//${host}`);
    return (
      expected.port === req.nextUrl.port &&
      req.headers.get("origin") === expected.origin
    );
  } catch {
    return false;
  }
}
