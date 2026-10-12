export {};
// The same evidence-driven scenario runs against a pinned Base fork; no historical incident is claimed.
process.env.POA_BASE_FORK = "true";
await import("./run_demo.js");
