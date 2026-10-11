"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Magic UI–style marquee: infinite horizontal scroll, pauses on hover. */
export function Marquee({ children, className, reverse = false }: { children: React.ReactNode; className?: string; reverse?: boolean }) {
  return (
    <div className={cn("group flex overflow-hidden", className)}>
      {[0, 1].map((dup) => (
        <div
          key={dup}
          aria-hidden={dup === 1}
          className={cn("flex shrink-0 items-center gap-2 pr-2 magic-marquee", reverse && "magic-marquee-reverse")}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
