import { seededRandom } from "./avatar";
import type { IdeaResult, Option, Outcome } from "./types";

/** Pure, client-side analysis on top of an IdeaResult. Nothing here calls the AI. */

export type Weights = Record<string, number>; // criterionId -> importance (any positive scale)

export function normalize(w: Weights): Weights {
  const sum = Object.values(w).reduce((s, x) => s + Math.max(0, x), 0) || 1;
  return Object.fromEntries(Object.entries(w).map(([k, v]) => [k, Math.max(0, v) / sum]));
}

export function baseWeights(r: IdeaResult): Weights {
  return Object.fromEntries(r.criteria.map((c) => [c.id, c.weight]));
}

export function score(o: Option, criterionId: string): number {
  return o.scores.find((s) => s.criterionId === criterionId)?.score ?? 0;
}

/** Weighted total (0-100) for every option under the given weights. */
export function totals(r: IdeaResult, weights: Weights): Record<string, number> {
  const w = normalize(weights);
  return Object.fromEntries(
    r.options.map((o) => [o.id, Math.round(r.criteria.reduce((s, c) => s + (w[c.id] ?? 0) * score(o, c.id), 0) * 100) / 10]),
  );
}

export function rankBy(r: IdeaResult, t: Record<string, number>): Option[] {
  return [...r.options].sort((a, b) => t[b.id] - t[a.id] || a.risk - b.risk || a.effort - b.effort);
}

/** Points each criterion adds to each option's total (sums to the total). */
export function contributions(r: IdeaResult) {
  return r.options.map((o) => ({
    option: o,
    parts: r.criteria.map((c) => ({ criterion: c, points: Math.round(c.weight * score(o, c.id) * 100) / 10 })),
  }));
}

/**
 * Monte Carlo robustness check: jitter every weight by up to ±`spread` and every
 * score by a little noise (more for scores with no citations), then count how often
 * each option comes out on top. Seeded, so the numbers are stable between renders.
 */
export function winProbability(r: IdeaResult, runs = 800, spread = 0.5, seed = 7): Record<string, number> {
  const rand = seededRandom(seed);
  const wins: Record<string, number> = Object.fromEntries(r.options.map((o) => [o.id, 0]));
  for (let i = 0; i < runs; i++) {
    const w = Object.fromEntries(r.criteria.map((c) => [c.id, c.weight * (1 + (rand() * 2 - 1) * spread)]));
    const nw = normalize(w);
    let best: Option | null = null;
    let bestT = -Infinity;
    for (const o of r.options) {
      let t = 0;
      for (const c of r.criteria) {
        const s = o.scores.find((x) => x.criterionId === c.id);
        const noise = (rand() * 2 - 1) * (s?.unsupported ? 1.5 : 0.5);
        t += nw[c.id] * Math.min(10, Math.max(0, (s?.score ?? 0) + noise));
      }
      if (t > bestT) {
        bestT = t;
        best = o;
      }
    }
    if (best) wins[best.id]++;
  }
  return Object.fromEntries(Object.entries(wins).map(([k, v]) => [k, Math.round((v / runs) * 1000) / 10]));
}

export type FlipPoint = {
  criterionId: string;
  factor: number; // multiply this criterion's importance by `factor` ...
  newLeaderId: string; // ... and this option takes the lead
};

/** For each criterion: the smallest boost or cut to its weight that changes the leader. */
export function flipPoints(r: IdeaResult): FlipPoint[] {
  const base = baseWeights(r);
  const leader = rankBy(r, totals(r, base))[0]?.id;
  // Smallest change first, alternating boosts and cuts.
  const factors = [1.25, 0.75, 1.5, 0.5, 1.75, 2, 0.25, 2.5, 3, 0, 4];
  const out: FlipPoint[] = [];
  for (const c of r.criteria) {
    for (const f of factors) {
      const w = { ...base, [c.id]: base[c.id] * f };
      const top = rankBy(r, totals(r, w))[0]?.id;
      if (top && top !== leader) {
        out.push({ criterionId: c.id, factor: f, newLeaderId: top });
        break;
      }
    }
  }
  return out;
}

export type Coverage = { optionId: string; addressed: number; violated: number; neutral: number; pct: number };

/** Share of the user's considerations each option satisfies (violations count against it). */
export function coverage(r: IdeaResult): Coverage[] {
  const n = r.consequences.length || 1;
  return r.options.map((o) => {
    const addressed = o.addresses.length;
    const violated = o.violates.length;
    return {
      optionId: o.id,
      addressed,
      violated,
      neutral: Math.max(0, r.consequences.length - addressed - violated),
      pct: Math.max(0, Math.round(((addressed - violated * 0.5) / n) * 100)),
    };
  });
}

/** Weighted points difference per criterion between two options (positive favours `a`). */
export function headToHead(r: IdeaResult, a: Option, b: Option) {
  return r.criteria.map((c) => ({
    criterion: c,
    a: score(a, c.id),
    b: score(b, c.id),
    diff: Math.round(c.weight * (score(a, c.id) - score(b, c.id)) * 100) / 10,
  }));
}

/** Consequences for an option, falling back to pros/cons for older results. */
export function outcomesOf(o: Option): { items: Outcome[]; estimated: boolean } {
  if (o.outcomes?.length) return { items: o.outcomes, estimated: false };
  return {
    estimated: true,
    items: [
      ...o.pros.map((text) => ({ text, effect: "positive" as const, horizon: "short" as const, likelihood: 3, impact: 3, consequenceIds: [] })),
      ...o.cons.map((text) => ({ text, effect: "negative" as const, horizon: "short" as const, likelihood: 3, impact: 3, consequenceIds: [] })),
    ],
  };
}

/** How much of an option's scoring is backed by citations. */
export function support(o: Option) {
  const cited = o.scores.filter((s) => !s.unsupported).length;
  return { cited, uncited: o.scores.length - cited, adjusted: o.scores.filter((s) => s.adjustedFrom !== undefined).length };
}
