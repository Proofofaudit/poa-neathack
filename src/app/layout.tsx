import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "POA — Autonomous DeFi Incident Investigation & Restitution",
  description: "From oracle glitch to verifiable payout in 60 seconds. neatHack 2026 entry for team poa.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#090d16] text-slate-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
