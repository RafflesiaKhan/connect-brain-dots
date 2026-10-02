"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { support } from "@/lib/analysis";
import type { EvidenceKind, IdeaResult } from "@/lib/types";
import { lookup, SwatchDot } from "./shared";

const KIND_BADGE: Record<string, string> = {
  research: "bg-lilac",
  experience: "bg-peach",
  fact: "bg-mint",
  profile: "bg-butter",
  "common-sense": "bg-[#efedf3]",
};
const KIND_LABEL: Record<string, string> = {
  research: "Research",
  experience: "People's experiences",
  fact: "Facts",
  profile: "Your profile",
  "common-sense": "Common sense",
};
const STRENGTH: Record<string, string> = { strong: "●●●", moderate: "●●○", weak: "●○○" };
const CITED = "#7c5cff";
const UNCITED = "#c9c3d8";

export function ResearchReport({ result }: { result: IdeaResult }) {
  const L = lookup(result);
  const [kind, setKind] = useState<EvidenceKind | "all">("all");
  const [strongOnly, setStrongOnly] = useState(false);

  const usage = (eid: string) => result.options.reduce((n, o) => n + o.scores.filter((s) => s.evidenceIds.includes(eid)).length, 0);
  const shown = result.evidence.filter((e) => (kind === "all" || e.kind === kind) && (!strongOnly || e.strength === "strong"));
  const kinds = [...new Set(result.evidence.map((e) => e.kind))];
  const sourceRows = result.sources
    .map((s) => {
      const ev = result.evidence.filter((e) => e.sourceId === s.id);
      return { ...s, claims: ev.length, citations: ev.reduce((n, e) => n + usage(e.id), 0) };
    })
    .sort((a, b) => b.citations - a.citations || b.claims - a.claims);
  const supportRows = result.options.map((o) => ({ name: `${o.emoji} ${o.name}`, ...support(o) }));

  return (
    <div className="space-y-8">
      {result.subQuestions.length > 0 && (
        <div>
          <h3 className="mb-2 font-display font-semibold">❓ Questions the research set out to answer</h3>
          <ol className="grid gap-2 sm:grid-cols-2">
            {result.subQuestions.map((q, i) => (
              <li key={q} className="rounded-2xl bg-white px-3 py-2 text-sm shadow-soft">
                <span className="mr-1 font-display font-bold text-violet">Q{i + 1}.</span> {q}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-display font-semibold">🔬 Evidence ({shown.length})</span>
          {(["all", ...kinds] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={`cursor-pointer rounded-full border-2 px-3 py-0.5 font-semibold transition ${
                kind === k ? "border-violet bg-lilac/50" : "border-line bg-white text-ink-soft"
              }`}
            >
              {k === "all" ? "All" : KIND_LABEL[k]}
            </button>
          ))}
          <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-ink-soft">
            <input type="checkbox" checked={strongOnly} onChange={(e) => setStrongOnly(e.target.checked)} className="accent-[#7c5cff]" />
            Strong only
          </label>
        </div>
        <div className="columns-1 gap-3 sm:columns-2 lg:columns-3">
          {shown.map((e) => {
            const src = L.source(e.sourceId);
            const n = usage(e.id);
            return (
              <div key={e.id} className="mb-3 break-inside-avoid rounded-2xl border border-line bg-white p-4 text-sm">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${KIND_BADGE[e.kind]}`}>{KIND_LABEL[e.kind]}</span>
                  <span className="text-xs tracking-widest text-violet" title={`${e.strength} evidence`}>
                    {STRENGTH[e.strength]} <span className="sr-only">{e.strength}</span>
                  </span>
                </div>
                <p>{e.claim}</p>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                  {src ? (
                    <a href={src.url} target="_blank" rel="noreferrer noopener" className="truncate font-semibold text-violet underline">
                      🔗 {src.title}
                    </a>
                  ) : (
                    <span className="text-muted">{e.kind === "profile" ? "From your profile" : "No external source"}</span>
                  )}
                  <span className="shrink-0 rounded-full bg-cream px-2 py-0.5 text-ink-soft" title="How many scores rely on this">
                    used {n}×
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        {result.searchMode === "none" && (
          <p className="rounded-2xl bg-butter px-4 py-2 text-sm">
            ℹ️ Web search wasn&rsquo;t configured, so this is based on the model&rsquo;s own knowledge. Add a Tavily key in Settings for live research.
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 font-display font-semibold">📚 Sources, by how much they shaped the scores</h3>
          {sourceRows.length === 0 ? (
            <p className="text-sm text-muted">No external sources were used.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto rounded-2xl bg-white">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-3 py-2">Source</th>
                    <th className="px-2 py-2 text-right">Claims</th>
                    <th className="px-3 py-2 text-right">Used in scores</th>
                  </tr>
                </thead>
                <tbody>
                  {sourceRows.map((s) => (
                    <tr key={s.id} className="border-t border-line">
                      <td className="max-w-0 px-3 py-2">
                        <a href={s.url} target="_blank" rel="noreferrer noopener" className="block truncate font-semibold text-violet underline" title={s.title}>
                          {s.title}
                        </a>
                        <span className="block truncate text-xs text-muted">{safeHost(s.url)}</span>
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">{s.claims}</td>
                      <td className="px-3 py-2 text-right font-bold tabular-nums">{s.citations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div>
          <h3 className="mb-2 font-display font-semibold">🧾 How well each option&rsquo;s scores are backed</h3>
          <div style={{ height: 50 + supportRows.length * 46 }} role="img" aria-label="Scores backed by evidence per option">
            <ResponsiveContainer>
              <BarChart data={supportRows} layout="vertical" margin={{ left: 8, right: 30, top: 4, bottom: 4 }} barCategoryGap={12}>
                <CartesianGrid horizontal={false} stroke="#ece5fb" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "#5f5878" }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 12, fill: "#2b2440", fontWeight: 600 }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "#f4f0ff" }} />
                <Bar dataKey="cited" name="Scores with citations" stackId="s" fill={CITED} stroke="#fff" strokeWidth={2} barSize={20}>
                  <LabelList dataKey="cited" position="center" style={{ fill: "#fff", fontWeight: 700, fontSize: 12 }} />
                </Bar>
                <Bar dataKey="uncited" name="Scores without citations" stackId="s" fill={UNCITED} stroke="#fff" strokeWidth={2} radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 flex justify-center gap-4 text-xs text-ink-soft">
            <span className="flex items-center gap-1">
              <SwatchDot color={CITED} /> backed by evidence or your considerations
            </span>
            <span className="flex items-center gap-1">
              <SwatchDot color={UNCITED} /> no citation (treat with caution)
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

function safeHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** What the fact-check pass changed, and why. */
export function FactCheck({ result }: { result: IdeaResult }) {
  const L = lookup(result);
  const changes = result.options.flatMap((o) =>
    o.scores.filter((s) => s.adjustedFrom !== undefined).map((s) => ({ o, s, c: L.criterion(s.criterionId) })),
  );
  return (
    <div className="space-y-3">
      {changes.length === 0 ? (
        <p className="rounded-2xl bg-mint/60 px-4 py-2 text-sm">✅ The reviewer pass found no scores that contradicted the evidence.</p>
      ) : (
        <ul className="space-y-2">
          {changes.map(({ o, s, c }) => (
            <li key={o.id + s.criterionId} className="rounded-2xl bg-white px-4 py-2 text-sm shadow-soft">
              <strong>
                {o.emoji} {o.name} × {c?.name}
              </strong>
              : <span className="tabular-nums line-through decoration-[#c23b3b]">{s.adjustedFrom}</span> →{" "}
              <strong className="tabular-nums">{s.score}</strong>
              <span className="block text-ink-soft">{s.adjustNote}</span>
            </li>
          ))}
        </ul>
      )}
      {(result.critique.issues.length > 0 || result.critique.blindSpots.length > 0) && (
        <ul className="space-y-2 text-sm">
          {result.critique.issues.map((x) => (
            <li key={x} className="rounded-2xl bg-sky/60 px-3 py-2">
              🧐 {x}
            </li>
          ))}
          {result.critique.blindSpots.map((x) => (
            <li key={x} className="rounded-2xl bg-butter/70 px-3 py-2">
              🕳️ Blind spot: {x}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
