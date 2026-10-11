"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Magic UI–style staggered list reveal. */
export function AnimatedList({ children, className, delay = 0.05 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <div className={cn(className)}>
      {React.Children.map(children, (child, i) => (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, delay: i * delay, ease: [0.21, 0.47, 0.32, 0.98] }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}
