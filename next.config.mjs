/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["neatlogs"],
  experimental: { cpus: 2 },
  outputFileTracingIncludes: {
    "/api/evidence": ["./evidence/run_evidence.json", "./evidence/base_fork_evidence.json"],
    "/judges": ["./evidence/*.json"],
  },
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
};

export default nextConfig;
