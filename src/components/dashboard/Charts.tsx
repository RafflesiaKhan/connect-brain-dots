"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { IdeaResult, Option } from "@/lib/types";
import { byId, optionColor, SwatchDot } from "./shared";

const AXIS = { fontSize: 12, fill: "#5f5878" };
const GRID = "#ece5fb";

function TipBox({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-line bg-white px-3 py-2 text-sm shadow-soft">{children}</div>;
}

/* ─── Weighted total per option (magnitude → horizontal bars, direct labels) ── */

export function ScoreBars({ result }: { result: IdeaResult }) {
  const data = result.options.map((o) => ({ id: o.id, name: `${o.emoji} ${o.name}`, total: o.total, rank: o.rank }));
  return (
    <div style={{ height: 56 + data.length * 52 }} role="img" aria-label="Weighted score per option">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 48, top: 4, bottom: 4 }} barCategoryGap={14}>
          <CartesianGrid horizontal={false} stroke={GRID} />
          <XAxis type="number" domain={[0, 100]} tick={AXIS} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" width={190} tick={{ ...AXIS, fill: "#2b2440", fontWeight: 600 }} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: "#f4f0ff" }}
            content={({ active, payload }) =>
              active && payload?.[0] ? (
                <TipBox>
                  <strong>{payload[0].payload.name}</strong>
                  <div className="text-ink-soft">
                    Rank #{payload[0].payload.rank} · {payload[0].payload.total}/100
                  </div>
                </TipBox>
              ) : null
            }
          />
          <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={22} isAnimationActive animationDuration={900}>
            {data.map((d) => (
              <Cell key={d.id} fill={optionColor(d.id)} />
            ))}
            <LabelList dataKey="total" position="right" style={{ fill: "#2b2440", fontWeight: 700, fontSize: 13 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Criteria profile of the top 3 (radar caps at 3 series for CVD safety) ── */

export function RadarCompare({ result }: { result: IdeaResult }) {
  // Up to 3 at once: beyond that, overlapping shapes stop being readable.
  const [picked, setPicked] = useState<string[]>(() => result.options.filter((o) => o.rank <= 3).map((o) => o.id));
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? (p.length > 1 ? p.filter((x) => x !== id) : p) : [...p, id].slice(-3)));
  const top = byId(result.options.filter((o) => picked.includes(o.id)));
  const data = result.criteria.map((c) => {
    const row: Record<string, string | number> = { criterion: c.name };
    for (const o of top) row[o.id] = o.scores.find((s) => s.criterionId === c.id)?.score ?? 0;
    return row;
  });
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {byId(result.options).map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => toggle(o.id)}
            aria-pressed={picked.includes(o.id)}
            className={`flex cursor-pointer items-center gap-1.5 rounded-full border-2 px-2.5 py-0.5 text-xs font-semibold transition ${
              picked.includes(o.id) ? "bg-white" : "border-transparent bg-white/50 text-muted"
            }`}
            style={{ borderColor: picked.includes(o.id) ? optionColor(o.id) : undefined }}
          >
            <SwatchDot color={optionColor(o.id)} /> {o.emoji} {o.name}
          </button>
        ))}
      </div>
      <div className="h-[300px]" role="img" aria-label="Criteria comparison of the selected options">
        <ResponsiveContainer>
          <RadarChart data={data} outerRadius="62%">
            <PolarGrid stroke={GRID} />
            <PolarAngleAxis dataKey="criterion" tick={{ ...AXIS, fontWeight: 600 }} />
            <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
            {top.map((o) => (
              <Radar
                key={o.id}
                name={o.name}
                dataKey={o.id}
                stroke={optionColor(o.id)}
                strokeWidth={2}
                fill={optionColor(o.id)}
                fillOpacity={0.12}
                dot={{ r: 4, strokeWidth: 2, stroke: "#fff", fill: optionColor(o.id) }}
                isAnimationActive
              />
            ))}
            <Tooltip
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <TipBox>
                    <strong>{label}</strong>
                    {payload.map((p) => (
                      <div key={String(p.dataKey)} className="flex items-center gap-2">
                        <SwatchDot color={String(p.stroke)} /> {p.name}: <strong>{String(p.value)}</strong>/10
                      </div>
                    ))}
                  </TipBox>
                ) : null
              }
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <Legend options={top} />
    </div>
  );
}

function Legend({ options }: { options: Option[] }) {
  return (
    <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-ink-soft">
      {options.map((o) => (
        <li key={o.id} className="flex items-center gap-1.5">
          <SwatchDot color={optionColor(o.id)} /> {o.emoji} {o.name}
        </li>
      ))}
    </ul>
  );
}

/* ─── Effort vs risk (every dot is directly labeled) ─────────────────────── */

export function EffortRisk({ result }: { result: IdeaResult }) {
  const data = byId(result.options).map((o) => ({ ...o, x: o.effort, y: o.risk, z: o.total }));
  return (
    <div className="h-[300px]" role="img" aria-label="Effort versus risk per option">
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 16, right: 24, bottom: 24, left: 0 }}>
          <CartesianGrid stroke={GRID} />
          <XAxis
            type="number"
            dataKey="x"
            domain={[0.5, 5.5]}
            ticks={[1, 2, 3, 4, 5]}
            tick={AXIS}
            label={{ value: "Effort →", position: "insideBottom", offset: -12, ...AXIS }}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[0.5, 5.5]}
            ticks={[1, 2, 3, 4, 5]}
            tick={AXIS}
            label={{ value: "Risk →", angle: -90, position: "insideLeft", offset: 18, ...AXIS }}
          />
          <ZAxis dataKey="z" range={[160, 520]} />
          <Tooltip
            cursor={{ strokeDasharray: "4 4", stroke: "#c9b8ff" }}
            content={({ active, payload }) =>
              active && payload?.[0] ? (
                <TipBox>
                  <strong>
                    {payload[0].payload.emoji} {payload[0].payload.name}
                  </strong>
                  <div className="text-ink-soft">
                    Effort {payload[0].payload.effort}/5 · Risk {payload[0].payload.risk}/5 · Score {payload[0].payload.total}
                  </div>
                </TipBox>
              ) : null
            }
          />
          <Scatter data={data} isAnimationActive>
            {data.map((d) => (
              <Cell key={d.id} fill={optionColor(d.id)} stroke="#fff" strokeWidth={2} />
            ))}
            <LabelList dataKey="emoji" position="center" style={{ fontSize: 14 }} />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Criteria weights (part-to-whole as a single labeled bar list) ──────── */

export function CriteriaWeights({ result }: { result: IdeaResult }) {
  const max = Math.max(...result.criteria.map((c) => c.weight));
  return (
    <ul className="space-y-3">
      {result.criteria.map((c, i) => (
        <li key={c.id} title={c.why}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="font-semibold">{c.name}</span>
            <span className="font-bold tabular-nums">{Math.round(c.weight * 100)}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-lilac/40">
            <div
              className="h-full rounded-full bg-violet transition-[width] duration-1000"
              style={{ width: `${(c.weight / max) * 100}%`, transitionDelay: `${i * 80}ms` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted">{c.why}</p>
        </li>
      ))}
    </ul>
  );
}
