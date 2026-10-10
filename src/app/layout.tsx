import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "POA — Autonomous DeFi Incident Investigation & Restitution",
  description: "From on-chain damage to verifiable cryptographic recovery. neatHack 2026 entry for team poa.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#080c14] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
