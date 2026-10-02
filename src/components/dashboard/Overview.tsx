"use client";

import { motion } from "motion/react";
import { useMemo } from "react";
import { KIND_STYLE } from "@/components/ui";
import { coverage, winProbability } from "@/lib/analysis";
import type { IdeaResult } from "@/lib/types";
import { lookup, optionColor, SwatchDot } from "./shared";

/** The landscape: every option with its percentages, before any verdict. */
export function Overview({ result }: { result: IdeaResult }) {
  const wins = useMemo(() => winProbability(result), [result]);
  const cov = useMemo(() => Object.fromEntries(coverage(result).map((c) => [c.optionId, c])), [result]);
  const max = Math.max(...result.options.map((o) => o.total));
  const min = Math.min(...result.options.map((o) => o.total));

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-5">
        {[
          ["Options", result.options.length],
          ["Criteria", result.criteria.length],
          ["Your considerations", result.consequences.length],
          ["Evidence", result.evidence.length],
          ["Sources", result.sources.length],
        ].map(([label, v]) => (
          <div key={label} className="rounded-2xl bg-white px-2 py-3 shadow-soft">
            <div className="font-display text-2xl font-bold">{v}</div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {result.options.map((o, i) => {
          const c = cov[o.id];
          const tag = o.total === max ? { t: "Highest fit", cls: "bg-mint" } : o.total === min ? { t: "Lowest fit", cls: "bg-pink" } : null;
          return (
            <motion.div
              key={o.id}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="relative overflow-hidden rounded-3xl border border-line bg-white p-4"
            >
              <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: optionColor(o.id) }} />
              <div className="flex items-start justify-between gap-2 pl-2">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Option #{o.rank}</div>
                  <h3 className="font-display text-lg font-semibold leading-tight">
                    {o.emoji} {o.name}
                  </h3>
                </div>
                {tag && <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${tag.cls}`}>{tag.t}</span>}
              </div>
              <p className="mt-1 line-clamp-2 pl-2 text-sm text-ink-soft">{o.summary}</p>
              <dl className="mt-3 space-y-2 pl-2 text-sm">
                <Meter label="Fit score" value={o.total} color={optionColor(o.id)} hint="Weighted score against your criteria" />
                <Meter label="Wins in simulations" value={wins[o.id] ?? 0} color={optionColor(o.id)} hint="How often it comes first when we shake up the weights 800 times" />
                <Meter label="Considerations met" value={c?.pct ?? 0} color={optionColor(o.id)} hint={`${c?.addressed ?? 0} met, ${c?.violated ?? 0} broken`} />
              </dl>
              <div className="mt-3 flex flex-wrap gap-1.5 pl-2 text-xs">
                <span className="rounded-full bg-cream px-2 py-0.5">⚙️ Effort {o.effort}/5</span>
                <span className="rounded-full bg-cream px-2 py-0.5">🎲 Risk {o.risk}/5</span>
                {o.violates.length > 0 && <span className="rounded-full bg-pink px-2 py-0.5">✕ breaks {o.violates.length}</span>}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function Meter({ label, value, color, hint }: { label: string; value: number; color: string; hint: string }) {
  return (
    <div title={hint}>
      <div className="flex justify-between text-xs">
        <dt className="font-semibold text-ink-soft">{label}</dt>
        <dd className="font-bold tabular-nums">{Math.round(value)}%</dd>
      </div>
      <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-lilac/30">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          whileInView={{ width: `${Math.min(100, value)}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

/** Options × considerations: which option satisfies or breaks each of the user's constraints. */
export function ConstraintMatrix({ result }: { result: IdeaResult }) {
  const L = lookup(result);
  const cov = coverage(result);
  const citedBy = (oid: string, cid: string) =>
    result.options.find((o) => o.id === oid)?.scores.some((s) => s.consequenceIds.includes(cid)) ?? false;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-1 text-sm">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left text-xs font-bold uppercase tracking-wide text-muted">Your consideration</th>
              {result.options.map((o) => (
                <th key={o.id} className="px-1 py-1 text-center text-xs font-bold text-ink-soft">
                  <span className="flex items-center justify-center gap-1">
                    <SwatchDot color={optionColor(o.id)} />
                    {o.emoji} {o.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.consequences.map((c) => (
              <tr key={c.id}>
                <th scope="row" className={`rounded-xl px-3 py-2 text-left font-semibold ${KIND_STYLE[c.kind]?.bg}`}>
                  {c.emoji} {c.text}
                  <span className="ml-2 text-[10px] font-bold uppercase text-ink-soft">{KIND_STYLE[c.kind]?.label}</span>
                </th>
                {result.options.map((o) => {
                  const ok = o.addresses.includes(c.id);
                  const bad = o.violates.includes(c.id);
                  const cited = citedBy(o.id, c.id);
                  return (
                    <td
                      key={o.id}
                      className={`rounded-xl px-2 py-2 text-center font-bold ${ok ? "bg-mint" : bad ? "bg-pink" : "bg-white text-muted"}`}
                      title={ok ? "Satisfies this" : bad ? "Conflicts with this" : cited ? "Considered in scoring" : "Not directly affected"}
                    >
                      {ok ? "✓ meets" : bad ? "✕ breaks" : cited ? "• weighed" : "–"}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <th scope="row" className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-muted">
                Coverage
              </th>
              {cov.map((c) => (
                <td key={c.optionId} className="rounded-xl bg-white px-2 py-2 text-center font-display text-base font-bold">
                  {c.pct}%
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      {result.options.some((o) => o.violates.some((id) => L.consequence(id)?.kind === "constraint")) && (
        <p className="mt-3 rounded-2xl bg-pink/70 px-4 py-2 text-sm">
          ⚠️ Hard constraints broken:{" "}
          {result.options
            .filter((o) => o.violates.some((id) => L.consequence(id)?.kind === "constraint"))
            .map((o) => `${o.emoji} ${o.name}`)
            .join(", ")}
          . These options are penalized in the scores.
        </p>
      )}
    </div>
  );
}
