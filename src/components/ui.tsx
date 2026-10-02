import Link from "next/link";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "soft" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary:
    "bg-violet text-white shadow-pop hover:bg-violet-deep hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0",
  soft: "bg-white text-ink border border-line hover:border-violet/40 hover:-translate-y-0.5 shadow-soft disabled:opacity-50",
  ghost: "text-ink-soft hover:bg-white/70 hover:text-ink",
  danger: "text-[#c23b3b] hover:bg-[#ffe8e8]",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 font-display font-semibold text-[15px] transition-all duration-200 cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet/25";

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={clsx(base, variants[variant], className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={clsx(base, variants[variant], className)} {...props} />;
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={clsx("inline-flex items-center gap-2 font-display text-lg font-bold text-ink", className)}>
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden>
        <path d="M8 9 L21 7 L23 20 L10 22 Z" stroke="#c9b8ff" strokeWidth="2" fill="none" strokeLinejoin="round" />
        <path d="M8 9 L23 20" stroke="#ffc6a8" strokeWidth="2" />
        <circle cx="8" cy="9" r="4" fill="#7c5cff" />
        <circle cx="21" cy="7" r="3.2" fill="#ff9a76" />
        <circle cx="23" cy="20" r="3.6" fill="#2cc3a5" />
        <circle cx="10" cy="22" r="3" fill="#ffc93c" />
      </svg>
      <span className={compact ? "hidden sm:inline" : undefined}>Connect Brain Dots</span>
    </span>
  );
}

export function SectionTitle({ emoji, title, hint }: { emoji: string; title: string; hint?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
      <h2 className="font-display text-xl font-semibold text-ink">
        <span className="mr-2" aria-hidden>
          {emoji}
        </span>
        {title}
      </h2>
      {hint && <p className="text-sm text-muted">{hint}</p>}
    </div>
  );
}

export const KIND_STYLE: Record<string, { bg: string; label: string }> = {
  constraint: { bg: "bg-peach", label: "Constraint" },
  worry: { bg: "bg-pink", label: "Worry" },
  preference: { bg: "bg-sky", label: "Preference" },
  goal: { bg: "bg-mint", label: "Goal" },
  unknown: { bg: "bg-butter", label: "Unknown" },
};
