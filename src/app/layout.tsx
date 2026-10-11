import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-sans" });

export const metadata: Metadata = {
  title: "POA — Proof of Audits",
  description: "Autonomous DeFi Incident Forensics & Cryptographic Restitution Coprocessor. neatHack 2026 entry.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans bg-[#fafafc] text-zinc-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}
