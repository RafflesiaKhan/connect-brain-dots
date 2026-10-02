"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { CartesianGrid, Cell, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { outcomesOf } from "@/lib/analysis";
import type { IdeaResult, Outcome } from "@/lib/types";
import { lookup, optionColor } from "./shared";

// Status colors (fixed meaning) always paired with an icon + label.
const GOOD = "#0ca30c";
const BAD = "#d03b3b";

export function OptionPicker({
  result,
  value,
  onChange,
}: {
  result: IdeaResult;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2" role="tablist">
      {result.options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={`cursor-pointer rounded-full border-2 px-3 py-1.5 text-sm font-semibold transition ${
            value === o.id ? "bg-white shadow-soft" : "border-transparent bg-white/60 text-ink-soft hover:bg-white"
          }`}
          style={{ borderColor: value === o.id ? optionColor(o.id) : undefined }}
        >
          {o.emoji} {o.name}
          <span className="ml-1.5 text-xs text-muted">#{o.rank}</span>
        </button>
      ))}
    </div>
  );
}

/** "If you choose X, then..." tree with good outcomes above and bad below. */
export function ConsequenceExplorer({ result }: { result: IdeaResult }) {
  const [id, setId] = useState(result.options[0].id);
  const o = result.options.find((x) => x.id === id) ?? result.options[0];
  const { items, estimated } = outcomesOf(o);
  const good = items.filter((x) => x.effect === "positive");
  const bad = items.filter((x) => x.effect === "negative");

  return (
    <div>
      <OptionPicker result={result} value={id} onChange={setId} />
      <AnimatePresence mode="wait">
        <motion.div
          key={id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="grid gap-6 lg:grid-cols-[1.4fr_1fr]"
        >
          <Tree optionLabel={`${o.emoji} ${o.name}`} color={optionColor(o.id)} good={good} bad={bad} result={result} />
          <RiskMatrix items={items} />
        </motion.div>
      </AnimatePresence>
      {estimated && (
        <p className="mt-3 text-xs text-muted">
          This analysis was created before detailed consequences existed, so these come from the pros and cons with
          estimated likelihood and impact. Re-run the idea for full detail.
        </p>
      )}
    </div>
  );
}

function Tree({
  optionLabel,
  color,
  good,
  bad,
  result,
}: {
  optionLabel: string;
  color: string;
  good: Outcome[];
  bad: Outcome[];
  result: IdeaResult;
}) {
  const L = lookup(result);
  const leaves = [...good.map((x) => ({ ...x, g: true })), ...bad.map((x) => ({ ...x, g: false }))];
  const rowH = 74;
  const h = Math.max(200, leaves.length * rowH);
  const rootY = h / 2;

  return (
    <div className="overflow-x-auto">
    <div className="relative min-w-[520px]" style={{ height: h }}>
      <svg className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        {leaves.map((l, i) => {
          const y = i * rowH + rowH / 2;
          return (
            <motion.path
              key={i}
              d={`M 150 ${rootY} C 200 ${rootY}, 190 ${y}, 236 ${y}`}
              fill="none"
              stroke={l.g ? GOOD : BAD}
              strokeOpacity={0.5}
              strokeWidth={1 + l.impact * 0.6}
              strokeDasharray={l.horizon === "long" ? "6 5" : undefined}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: i * 0.06 }}
            />
          );
        })}
      </svg>
      <div
        className="absolute left-0 flex w-[150px] -translate-y-1/2 items-center rounded-2xl border-[3px] bg-white px-3 py-2 font-display text-sm font-semibold shadow-soft"
        style={{ top: rootY, borderColor: color }}
      >
        If you choose {optionLabel}...
      </div>
      {leaves.map((l, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 + i * 0.06 }}
          className={`absolute left-[236px] right-0 -translate-y-1/2 rounded-2xl px-3 py-1.5 text-sm ${l.g ? "bg-mint/70" : "bg-pink/70"}`}
          style={{ top: i * rowH + rowH / 2 }}
        >
          <div className="font-semibold leading-snug">
            <span aria-hidden>{l.g ? "▲ " : "▼ "}</span>
            <span className="sr-only">{l.g ? "Good: " : "Bad: "}</span>
            {l.text}
          </div>
          <div className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-ink-soft">
            <span>{l.horizon === "long" ? "⏳ long term" : "⚡ short term"}</span>
            <span>likelihood {"●".repeat(l.likelihood)}{"○".repeat(5 - l.likelihood)}</span>
            <span>impact {"●".repeat(l.impact)}{"○".repeat(5 - l.impact)}</span>
            {l.consequenceIds.map((cid) => (
              <span key={cid} className="rounded-full bg-white/70 px-1.5">
                {L.consequence(cid)?.emoji} {L.consequence(cid)?.text}
              </span>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
    </div>
  );
}

/** Likelihood × impact. Top-right is what matters most. */
function RiskMatrix({ items }: { items: Outcome[] }) {
  // Nudge overlapping points apart so every dot stays hoverable.
  const seen = new Map<string, number>();
  const data = items.map((x) => {
    const k = `${x.likelihood}-${x.impact}`;
    const n = seen.get(k) ?? 0;
    seen.set(k, n + 1);
    return { ...x, x: x.likelihood + n * 0.14, y: x.impact + n * 0.14 };
  });
  return (
    <div>
      <div className="h-[300px]" role="img" aria-label="Consequences by likelihood and impact">
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 10, right: 16, bottom: 24, left: 0 }}>
            <CartesianGrid stroke="#ece5fb" />
            <XAxis type="number" dataKey="x" domain={[0.5, 5.5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 12, fill: "#5f5878" }} label={{ value: "Likelihood →", position: "insideBottom", offset: -12, fontSize: 12, fill: "#5f5878" }} />
            <YAxis type="number" dataKey="y" domain={[0.5, 5.5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 12, fill: "#5f5878" }} label={{ value: "Impact →", angle: -90, position: "insideLeft", offset: 18, fontSize: 12, fill: "#5f5878" }} />
            <ZAxis range={[280, 280]} />
            <Tooltip
              cursor={{ strokeDasharray: "4 4", stroke: "#c9b8ff" }}
              content={({ active, payload }) =>
                active && payload?.[0] ? (
                  <div className="max-w-60 rounded-2xl border border-line bg-white px-3 py-2 text-sm shadow-soft">
                    <strong>
                      {payload[0].payload.effect === "positive" ? "▲ Good" : "▼ Bad"}: {payload[0].payload.text}
                    </strong>
                    <div className="text-ink-soft">
                      Likelihood {payload[0].payload.likelihood}/5 · Impact {payload[0].payload.impact}/5
                    </div>
                  </div>
                ) : null
              }
            />
            <Scatter data={data} isAnimationActive>
              {data.map((d, i) => (
                <Cell key={i} fill={d.effect === "positive" ? GOOD : BAD} stroke="#fff" strokeWidth={2} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 flex justify-center gap-4 text-xs text-ink-soft">
        <span>
          <span style={{ color: GOOD }}>●</span> ▲ good outcome
        </span>
        <span>
          <span style={{ color: BAD }}>●</span> ▼ bad outcome
        </span>
        <span>- - long-term line in tree</span>
      </p>
    </div>
  );
}
