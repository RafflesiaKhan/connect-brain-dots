"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import type { IdeaResult, Option } from "@/lib/types";

/** Validated categorical order (see globals.css). Color follows the option id, never its rank. */
export const SERIES = ["#7c5cff", "#f0714f", "#16a394", "#e09a00", "#d9559b"];

export function optionColor(id: string): string {
  const n = parseInt(id.replace(/\D/g, ""), 10);
  return SERIES[(Number.isFinite(n) ? n - 1 : 0) % SERIES.length];
}

/** Options in id order, so colors and legends stay stable. */
export function byId(options: Option[]): Option[] {
  return [...options].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

export function Panel({
  emoji,
  title,
  hint,
  children,
  className = "",
  delay = 0,
}: {
  emoji: string;
  title: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay }}
      className={`card p-5 sm:p-6 ${className}`}
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-xl font-semibold">
          <span className="mr-2" aria-hidden>
            {emoji}
          </span>
          {title}
        </h2>
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
      {children}
    </motion.section>
  );
}

export function SwatchDot({ color }: { color: string }) {
  return <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden />;
}

export function lookup(result: IdeaResult) {
  return {
    criterion: (id: string) => result.criteria.find((c) => c.id === id),
    evidence: (id: string) => result.evidence.find((e) => e.id === id),
    source: (id: string | null) => (id ? result.sources.find((s) => s.id === id) : undefined),
    consequence: (id: string) => result.consequences.find((c) => c.id === id),
    option: (id: string) => result.options.find((o) => o.id === id),
  };
}
