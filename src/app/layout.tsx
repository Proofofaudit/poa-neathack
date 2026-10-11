import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-sans" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", display: "swap", variable: "--font-serif" });

export const metadata: Metadata = {
  title: "POA — Proof of Audits",
  description: "From oracle glitch to verifiable payout in 60 seconds. neatHack 2026 entry for team poa.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${serif.variable} font-sans bg-[#F7F5F2] text-stone-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}
