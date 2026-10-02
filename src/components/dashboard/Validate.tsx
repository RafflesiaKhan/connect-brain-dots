"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { contributions, flipPoints, headToHead, rankBy, totals, winProbability, type Weights } from "@/lib/analysis";
import type { IdeaResult } from "@/lib/types";
import { lookup, optionColor, SwatchDot } from "./shared";

/** Validated categorical order for criteria (distinct job from option colors). */
export const CRITERIA_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"];
const AXIS = { fontSize: 12, fill: "#5f5878" };

/* ─── What-if: drag how much each criterion matters, watch the ranking move ─── */

export function WhatIf({ result }: { result: IdeaResult }) {
  const initial = useMemo(() => Object.fromEntries(result.criteria.map((c) => [c.id, c.importance])), [result]);
  const [w, setW] = useState<Weights>(initial);
  const t = totals(result, w);
  const ranked = rankBy(result, t);
  const originalLeader = result.options[0];
  const changed = ranked[0].id !== originalLeader.id;
  const dirty = result.criteria.some((c) => w[c.id] !== initial[c.id]);
  const sum = Object.values(w).reduce((s, x) => s + x, 0) || 1;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-4">
        {result.criteria.map((c, i) => (
          <label key={c.id} className="block">
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="flex items-center gap-2 font-semibold">
                <SwatchDot color={CRITERIA_COLORS[i % CRITERIA_COLORS.length]} />
                {c.name}
              </span>
              <span className="tabular-nums text-ink-soft">
                {["ignore", "minor", "some", "important", "very", "critical"][w[c.id]] ?? w[c.id]} ·{" "}
                <strong>{Math.round((w[c.id] / sum) * 100)}%</strong>
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={5}
              step={1}
              value={w[c.id]}
              onChange={(e) => setW({ ...w, [c.id]: Number(e.target.value) })}
              className="w-full cursor-pointer accent-[#7c5cff]"
              aria-label={`How much ${c.name} matters`}
            />
          </label>
        ))}
        <button
          type="button"
          disabled={!dirty}
          onClick={() => setW(initial)}
          className="cursor-pointer rounded-full bg-lilac/60 px-4 py-1.5 text-sm font-semibold disabled:cursor-default disabled:opacity-40"
        >
          ↺ Reset to Dot&rsquo;s weights
        </button>
      </div>

      <div>
        <AnimatePresence>
          {changed && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-3 rounded-2xl bg-butter px-4 py-2 text-sm font-semibold"
            >
              🔀 With your weights, {ranked[0].emoji} {ranked[0].name} takes the lead over {originalLeader.emoji} {originalLeader.name}!
            </motion.p>
          )}
        </AnimatePresence>
        <ol className="space-y-2">
          {ranked.map((o, i) => (
            <motion.li key={o.id} layout transition={{ type: "spring", stiffness: 300, damping: 30 }} className="rounded-2xl bg-white p-3 shadow-soft">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-semibold">
                  <span className="mr-2 font-display text-muted">#{i + 1}</span>
                  {o.emoji} {o.name}
                </span>
                <span className="font-display font-bold tabular-nums">
                  {t[o.id]}
                  {t[o.id] !== o.total && (
                    <span className={`ml-1 text-xs ${t[o.id] > o.total ? "text-[#0a7a0a]" : "text-[#c23b3b]"}`}>
                      ({t[o.id] > o.total ? "+" : ""}
                      {Math.round((t[o.id] - o.total) * 10) / 10})
                    </span>
                  )}
                </span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-lilac/30">
                <motion.div className="h-full rounded-full" style={{ background: optionColor(o.id) }} animate={{ width: `${t[o.id]}%` }} />
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/* ─── Where each option's points come from ─── */

export function Contributions({ result }: { result: IdeaResult }) {
  const rows = contributions(result).map(({ option, parts }) => ({
    name: `${option.emoji} ${option.name}`,
    total: option.total,
    ...Object.fromEntries(parts.map((p) => [p.criterion.id, p.points])),
  }));
  return (
    <div>
      <div style={{ height: 60 + rows.length * 52 }} role="img" aria-label="Points each criterion contributes to each option">
        <ResponsiveContainer>
          <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 44, top: 4, bottom: 4 }} barCategoryGap={14}>
            <CartesianGrid horizontal={false} stroke="#ece5fb" />
            <XAxis type="number" domain={[0, 100]} tick={AXIS} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" width={190} tick={{ ...AXIS, fill: "#2b2440", fontWeight: 600 }} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: "#f4f0ff" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="rounded-2xl border border-line bg-white px-3 py-2 text-sm shadow-soft">
                    <strong>{label}</strong>
                    {payload.map((p) => (
                      <div key={String(p.dataKey)} className="flex items-center gap-2">
                        <SwatchDot color={String(p.color)} /> {p.name}: <strong>{String(p.value)}</strong> pts
                      </div>
                    ))}
                  </div>
                ) : null
              }
            />
            {result.criteria.map((c, i) => (
              <Bar
                key={c.id}
                dataKey={c.id}
                name={c.name}
                stackId="a"
                fill={CRITERIA_COLORS[i % CRITERIA_COLORS.length]}
                stroke="#fff"
                strokeWidth={2}
                radius={i === result.criteria.length - 1 ? [0, 4, 4, 0] : 0}
                barSize={22}
              >
                {i === result.criteria.length - 1 && <LabelList dataKey="total" position="right" style={{ fill: "#2b2440", fontWeight: 700, fontSize: 13 }} />}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-ink-soft">
        {result.criteria.map((c, i) => (
          <li key={c.id} className="flex items-center gap-1.5">
            <SwatchDot color={CRITERIA_COLORS[i % CRITERIA_COLORS.length]} /> {c.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── How solid is the leader? ─── */

export function Robustness({ result }: { result: IdeaResult }) {
  const wins = useMemo(() => winProbability(result), [result]);
  const flips = useMemo(() => flipPoints(result), [result]);
  const L = lookup(result);
  const data = result.options.map((o) => ({ id: o.id, name: `${o.emoji} ${o.name}`, p: wins[o.id] ?? 0 }));
  const leader = result.options[0];
  const lp = wins[leader.id] ?? 0;
  const verdict = lp >= 75 ? "rock solid" : lp >= 50 ? "fairly stable" : "a close call";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <p className="mb-2 text-sm text-ink-soft">
          We re-ran the scoring 800 times, shaking every criterion weight by up to ±50% and adding uncertainty to
          scores (more for scores without evidence). The leader came first in <strong>{lp}%</strong> of runs:{" "}
          <strong>{verdict}</strong>.
        </p>
        <div style={{ height: 50 + data.length * 46 }} role="img" aria-label="Share of simulations each option wins">
          <ResponsiveContainer>
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 52, top: 4, bottom: 4 }} barCategoryGap={12}>
              <CartesianGrid horizontal={false} stroke="#ece5fb" />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={AXIS} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={180} tick={{ ...AXIS, fill: "#2b2440", fontWeight: 600 }} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: "#f4f0ff" }} formatter={(v) => [`${v}% of simulations`, "Wins"]} />
              <Bar dataKey="p" radius={[0, 4, 4, 0]} barSize={20} minPointSize={2}>
                {data.map((d) => (
                  <Cell key={d.id} fill={optionColor(d.id)} />
                ))}
                <LabelList dataKey="p" position="right" formatter={(v) => `${v}%`} style={{ fill: "#2b2440", fontWeight: 700, fontSize: 13 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div>
        <h3 className="mb-2 font-display font-semibold">🎚️ What would change the answer?</h3>
        {flips.length === 0 ? (
          <p className="rounded-2xl bg-mint/60 px-4 py-3 text-sm">
            No single criterion can flip the result, even if you quadruple it or ignore it completely. Strong pick!
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {flips.map((f) => {
              const c = L.criterion(f.criterionId);
              const n = L.option(f.newLeaderId);
              const how =
                f.factor === 0 ? "didn't matter at all" : f.factor > 1 ? `mattered ${f.factor}× more` : `mattered ${Math.round((1 - f.factor) * 100)}% less`;
              return (
                <li key={f.criterionId} className="rounded-2xl bg-white px-3 py-2 shadow-soft">
                  If <strong>{c?.name}</strong> {how}, <strong>{n?.emoji} {n?.name}</strong> would lead.
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted">Try it yourself with the what-if sliders above.</p>
      </div>
    </div>
  );
}

/* ─── #1 vs #2, criterion by criterion ─── */

export function HeadToHead({ result }: { result: IdeaResult }) {
  const [a, b] = result.options;
  if (!b) return null;
  const rows = headToHead(result, a, b);
  const maxAbs = Math.max(0.1, ...rows.map((r) => Math.abs(r.diff)));
  const gap = Math.round((a.total - b.total) * 10) / 10;
  return (
    <div>
      <p className="mb-3 text-sm text-ink-soft">
        {a.emoji} <strong>{a.name}</strong> beats {b.emoji} <strong>{b.name}</strong> by <strong>{gap} points</strong>.
        Bars show weighted points gained (right) or lost (left) on each criterion.
      </p>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.criterion.id} className="grid grid-cols-[minmax(90px,140px)_1fr_minmax(70px,auto)] items-center gap-2 text-sm">
            <span className="truncate font-semibold" title={r.criterion.name}>
              {r.criterion.name}
            </span>
            <div className="relative h-6 rounded-full bg-[#f0efec]">
              <div className="absolute inset-y-0 left-1/2 w-px bg-[#c9c3d8]" />
              <motion.div
                className="absolute inset-y-1 rounded-full"
                style={{
                  background: r.diff >= 0 ? optionColor(a.id) : optionColor(b.id),
                  [r.diff >= 0 ? "left" : "right"]: "50%",
                }}
                initial={{ width: 0 }}
                whileInView={{ width: `${(Math.abs(r.diff) / maxAbs) * 50}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              />
            </div>
            <span className="text-right text-xs tabular-nums text-ink-soft">
              {r.a} vs {r.b}{" "}
              <strong className="text-ink">
                ({r.diff > 0 ? "+" : ""}
                {r.diff})
              </strong>
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-ink-soft">
        <span className="flex items-center gap-1">
          <SwatchDot color={optionColor(b.id)} /> ← favours {b.name}
        </span>
        <span className="flex items-center gap-1">
          favours {a.name} → <SwatchDot color={optionColor(a.id)} />
        </span>
      </div>
    </div>
  );
}
