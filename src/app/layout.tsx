import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "POA — Proof of Audits",
  description:
    "Autonomous DeFi Incident Forensics & Cryptographic Restitution Coprocessor. neatHack 2026 entry.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`font-sans bg-[#fafafc] text-zinc-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}
