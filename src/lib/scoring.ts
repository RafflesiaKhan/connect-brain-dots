import type { Criterion, Evidence, Option, Score } from "./types";

/** Turns 1-5 importance into weights that sum to 1. */
export function weighCriteria<T extends { importance: number }>(list: T[]): (T & { weight: number })[] {
  const sum = list.reduce((s, c) => s + Math.max(1, c.importance), 0) || 1;
  return list.map((c) => ({ ...c, weight: Math.max(1, c.importance) / sum }));
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));

type RawScore = {
  criterionId: string;
  score: number;
  rationale: string;
  evidenceIds: string[];
  consequenceIds: string[];
};

/**
 * Deterministic guardrail between the model and the dashboard: every criterion
 * gets exactly one score, citations are filtered to ids that actually exist,
 * and uncited scores are flagged instead of silently trusted.
 */
export function cleanScores(
  raw: RawScore[],
  criteria: Criterion[],
  evidenceIds: Set<string>,
  consequenceIds: Set<string>,
): Score[] {
  return criteria.map((c) => {
    const s = raw.find((r) => r.criterionId.trim().toLowerCase() === c.id);
    if (!s) {
      return {
        criterionId: c.id,
        score: 5,
        rationale: "Not assessed by the agent; neutral score assumed.",
        evidenceIds: [],
        consequenceIds: [],
        unsupported: true,
      };
    }
    const ev = s.evidenceIds.map((x) => x.trim().toLowerCase()).filter((x) => evidenceIds.has(x));
    const cq = s.consequenceIds.map((x) => x.trim().toLowerCase()).filter((x) => consequenceIds.has(x));
    return {
      criterionId: c.id,
      score: Math.round(clamp(s.score, 0, 10) * 10) / 10,
      rationale: s.rationale,
      evidenceIds: [...new Set(ev)],
      consequenceIds: [...new Set(cq)],
      unsupported: ev.length === 0 && cq.length === 0,
    };
  });
}

export function totalScore(scores: Score[], criteria: Criterion[]): number {
  const t = criteria.reduce((sum, c) => {
    const s = scores.find((x) => x.criterionId === c.id);
    return sum + c.weight * (s?.score ?? 0);
  }, 0);
  return Math.round(t * 100) / 10; // 0-100 with one decimal
}

/** Ranks by weighted total; ties go to the lower-risk, then lower-effort option. */
export function rankOptions(options: Omit<Option, "rank">[]): Option[] {
  const sorted = [...options].sort((a, b) => b.total - a.total || a.risk - b.risk || a.effort - b.effort);
  return sorted.map((o, i) => ({ ...o, rank: i + 1 }));
}

/** Confidence can't exceed what the citations support. */
export function blendConfidence(criticConfidence: number, options: Option[], evidence: Evidence[]): number {
  const all = options.flatMap((o) => o.scores);
  const supported = all.length ? all.filter((s) => !s.unsupported).length / all.length : 0;
  const sourced = evidence.length ? evidence.filter((e) => e.sourceId).length / evidence.length : 0;
  const ceiling = 35 + 45 * supported + 20 * sourced;
  return Math.round(clamp(Math.min(criticConfidence, ceiling), 5, 99));
}
