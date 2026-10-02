"use client";

import { useState } from "react";
import type { IdeaResult, Score } from "@/lib/types";
import { lookup, optionColor, SwatchDot } from "./shared";

/** Sequential single-hue (violet) ramp for 0-10 scores. Text switches to white on dark steps. */
const RAMP = ["#f4f0ff", "#e4dbff", "#cfc0ff", "#b39cff", "#957aff", "#7c5cff", "#5b3fe0"];
function heat(score: number) {
  const i = Math.min(RAMP.length - 1, Math.floor((score / 10) * RAMP.length));
  return { background: RAMP[i], color: i >= 4 ? "#fff" : "#2b2440" };
}

/** Decision matrix: also serves as the accessible table view of every chart. */
export function Matrix({ result }: { result: IdeaResult }) {
  const [focus, setFocus] = useState<{ optionId: string; score: Score } | null>(null);
  const L = lookup(result);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-1 text-sm">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left text-xs font-bold uppercase tracking-wide text-muted">Option</th>
              {result.criteria.map((c) => (
                <th key={c.id} className="px-2 py-1 text-center text-xs font-bold text-ink-soft" title={c.description}>
                  {c.name}
                  <div className="font-normal text-muted">{Math.round(c.weight * 100)}%</div>
                </th>
              ))}
              <th className="px-2 py-1 text-center text-xs font-bold uppercase tracking-wide text-muted">Total</th>
            </tr>
          </thead>
          <tbody>
            {result.options.map((o) => (
              <tr key={o.id}>
                <th scope="row" className="rounded-xl bg-white px-3 py-2 text-left font-semibold">
                  <span className="flex items-center gap-2">
                    <SwatchDot color={optionColor(o.id)} />
                    {o.emoji} {o.name}
                  </span>
                </th>
                {result.criteria.map((c) => {
                  const s = o.scores.find((x) => x.criterionId === c.id)!;
                  const active = focus?.optionId === o.id && focus.score.criterionId === c.id;
                  return (
                    <td key={c.id} className="p-0">
                      <button
                        type="button"
                        onMouseEnter={() => setFocus({ optionId: o.id, score: s })}
                        onFocus={() => setFocus({ optionId: o.id, score: s })}
                        onClick={() => setFocus({ optionId: o.id, score: s })}
                        className={`relative w-full cursor-pointer rounded-xl px-2 py-2 text-center font-bold tabular-nums transition ${
                          active ? "ring-4 ring-butter" : ""
                        }`}
                        style={heat(s.score)}
                        aria-label={`${o.name}, ${c.name}: ${s.score} out of 10`}
                      >
                        {s.score}
                        {s.adjustedFrom !== undefined && (
                          <span className="absolute right-1 top-0.5 text-[10px]" title="Adjusted by fact-check">
                            ✎
                          </span>
                        )}
                        {s.unsupported && (
                          <span className="absolute left-1 top-0.5 text-[10px]" title="No evidence cited">
                            ?
                          </span>
                        )}
                      </button>
                    </td>
                  );
                })}
                <td className="rounded-xl bg-white px-2 py-2 text-center font-display text-base font-bold">
                  {o.total}
                  {o.rank === 1 && " 🏆"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 min-h-[92px] rounded-2xl bg-white px-4 py-3 text-sm" aria-live="polite">
        {focus ? (
          <>
            <p className="font-semibold">
              {L.option(focus.optionId)?.emoji} {L.option(focus.optionId)?.name} × {L.criterion(focus.score.criterionId)?.name}:{" "}
              {focus.score.score}/10
              {focus.score.adjustedFrom !== undefined && (
                <span className="ml-2 rounded-full bg-butter px-2 py-0.5 text-xs">
                  fact-checked from {focus.score.adjustedFrom}
                </span>
              )}
            </p>
            <p className="mt-1 text-ink-soft">{focus.score.rationale}</p>
            {focus.score.adjustNote && <p className="mt-1 text-xs text-ink-soft">✎ {focus.score.adjustNote}</p>}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {focus.score.evidenceIds.map((id) => (
                <span key={id} className="rounded-full bg-lilac/50 px-2 py-0.5 text-xs" title={L.evidence(id)?.claim}>
                  🔬 {L.evidence(id)?.claim.slice(0, 60)}...
                </span>
              ))}
              {focus.score.consequenceIds.map((id) => (
                <span key={id} className="rounded-full bg-peach px-2 py-0.5 text-xs">
                  {L.consequence(id)?.emoji} {L.consequence(id)?.text}
                </span>
              ))}
              {focus.score.unsupported && (
                <span className="rounded-full bg-pink px-2 py-0.5 text-xs">⚠️ No evidence cited: treat with caution</span>
              )}
            </div>
          </>
        ) : (
          <p className="text-muted">Hover or tap any score to see why it got that number and what backs it up.</p>
        )}
      </div>
    </div>
  );
}
