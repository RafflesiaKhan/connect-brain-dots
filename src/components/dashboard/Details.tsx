"use client";

import { motion } from "motion/react";
import type { IdeaResult } from "@/lib/types";
import { lookup, optionColor } from "./shared";

const KIND_BADGE: Record<string, string> = {
  research: "bg-lilac",
  experience: "bg-peach",
  fact: "bg-mint",
  profile: "bg-butter",
  "common-sense": "bg-[#efedf3]",
};
const STRENGTH: Record<string, string> = { strong: "●●●", moderate: "●●○", weak: "●○○" };

export function OptionCards({ result }: { result: IdeaResult }) {
  const L = lookup(result);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {result.options.map((o, i) => {
        const alt = result.synthesis.alternatives.find((a) => a.optionId === o.id);
        return (
          <motion.article
            key={o.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="relative overflow-hidden rounded-3xl border border-line bg-white p-5"
          >
            <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: optionColor(o.id) }} />
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-lg font-semibold">
                {o.emoji} {o.name}
              </h3>
              <span className="shrink-0 rounded-full bg-cream px-2.5 py-1 text-xs font-bold">
                #{o.rank} · {o.total}
              </span>
            </div>
            <p className="mt-1 text-sm text-ink-soft">{o.summary}</p>
            {alt && <p className="mt-2 rounded-2xl bg-sky/70 px-3 py-2 text-sm">🔀 Choose this when: {alt.whenToChoose}</p>}
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <ul className="space-y-1">
                {o.pros.map((p) => (
                  <li key={p}>👍 {p}</li>
                ))}
              </ul>
              <ul className="space-y-1">
                {o.cons.map((p) => (
                  <li key={p}>👎 {p}</li>
                ))}
              </ul>
            </div>
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-semibold text-violet">How to do it ({o.steps.length} steps)</summary>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink-soft">
                {o.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </details>
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
              {o.addresses.map((id) => (
                <span key={id} className="rounded-full bg-mint px-2 py-0.5">
                  ✓ {L.consequence(id)?.text}
                </span>
              ))}
              {o.violates.map((id) => (
                <span key={id} className="rounded-full bg-pink px-2 py-0.5">
                  ✕ {L.consequence(id)?.text}
                </span>
              ))}
            </div>
          </motion.article>
        );
      })}
    </div>
  );
}

export function EvidenceBoard({ result }: { result: IdeaResult }) {
  const L = lookup(result);
  return (
    <div>
      <div className="columns-1 gap-3 sm:columns-2 lg:columns-3">
        {result.evidence.map((e, i) => {
          const src = L.source(e.sourceId);
          return (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: (i % 6) * 0.05 }}
              className="mb-3 break-inside-avoid rounded-2xl border border-line bg-white p-4 text-sm"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${KIND_BADGE[e.kind]}`}>
                  {e.kind}
                </span>
                <span className="text-xs tracking-widest text-violet" title={`${e.strength} evidence`}>
                  {STRENGTH[e.strength]} <span className="sr-only">{e.strength}</span>
                </span>
              </div>
              <p>{e.claim}</p>
              {src ? (
                <a
                  href={src.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-2 block truncate text-xs font-semibold text-violet underline"
                >
                  🔗 {src.title}
                </a>
              ) : (
                <p className="mt-2 text-xs text-muted">{e.kind === "profile" ? "From your profile" : "No external source"}</p>
              )}
            </motion.div>
          );
        })}
      </div>
      {result.searchMode === "none" && (
        <p className="mt-2 rounded-2xl bg-butter px-4 py-2 text-sm">
          ℹ️ Web search wasn&rsquo;t configured, so this is based on the model&rsquo;s own knowledge. Add a Tavily key in
          Settings for live research.
        </p>
      )}
    </div>
  );
}

export function DecisionPath({ result }: { result: IdeaResult }) {
  return (
    <ol className="flex flex-col gap-3 md:flex-row md:items-stretch">
      {result.synthesis.path.map((p, i) => (
        <motion.li
          key={i}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.12, type: "spring" }}
          className="relative flex-1"
        >
          <div
            className={`h-full rounded-2xl px-4 py-3 text-sm ${
              i === result.synthesis.path.length - 1 ? "bg-violet text-white shadow-pop" : "bg-white"
            }`}
          >
            <div className="text-[11px] font-bold uppercase tracking-wide opacity-70">
              {i + 1}. {p.label}
            </div>
            <div className="mt-0.5 font-semibold">{p.detail}</div>
          </div>
          {i < result.synthesis.path.length - 1 && (
            <span className="absolute -bottom-3 left-6 z-10 text-violet md:-right-3 md:bottom-auto md:left-auto md:top-1/2 md:-translate-y-1/2" aria-hidden>
              <span className="md:hidden">↓</span>
              <span className="hidden md:inline">→</span>
            </span>
          )}
        </motion.li>
      ))}
    </ol>
  );
}
