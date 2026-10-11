"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Magic UI–style shine border: conic beam rotating around the card edge.
 * Pure CSS, warm accent tinted to match the paper theme.
 */
export function ShineBorder({
  children,
  className,
  borderWidth = 1,
}: {
  children: React.ReactNode;
  className?: string;
  borderWidth?: number;
}) {
  return (
    <div className={cn("relative rounded-2xl", className)} style={{ padding: borderWidth }}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl magic-shine"
      />
      <div className="relative rounded-[15px] bg-white h-full">{children}</div>
    </div>
  );
}
