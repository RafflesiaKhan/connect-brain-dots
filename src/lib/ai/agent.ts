import "server-only";
import { generateText, isStepCount, Output, tool, type LanguageModel } from "ai";
import { tavily } from "@tavily/core";
import { z } from "zod";
import { blendConfidence, cleanScores, rankOptions, totalScore, weighCriteria } from "@/lib/scoring";
import type {
  Consequence,
  Criterion,
  Evidence,
  IdeaResult,
  Reflection,
  RunEvent,
  Source,
  StageId,
} from "@/lib/types";
import type { ResolvedAi } from "./providers";
import { contextBlock, SYSTEM } from "./prompts";
import {
  critiqueSchema,
  evidenceSchema,
  optionsSchema,
  planSchema,
  reflectionSchema,
  synthesisSchema,
} from "./schemas";

type Ctx = { profile: string; memory: string };

/** Structured call with one retry: models occasionally emit malformed JSON. */
async function structured<S extends z.ZodType>(
  model: LanguageModel,
  schema: S,
  prompt: string,
  signal?: AbortSignal,
): Promise<z.infer<S>> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { output } = await generateText({
        model,
        instructions: SYSTEM,
        prompt,
        output: Output.object({ schema }),
        maxRetries: 2,
        abortSignal: signal,
      });
      return output as z.infer<S>;
    } catch (e) {
      lastErr = e;
      if (signal?.aborted) break;
    }
  }
  throw lastErr;
}

/* ─── Step 0: reflect ("you're probably also thinking...") ──────────────── */

export async function reflect(ai: ResolvedAi, idea: string, ctx: Ctx): Promise<Reflection> {
  if (!ai.model) {
    const { demoReflection } = await import("./demo");
    return demoReflection(idea);
  }
  const out = await structured(
    ai.model,
    reflectionSchema,
    `${contextBlock(ctx.profile, ctx.memory)}

## The user's raw thought
"""${idea}"""

Before solving anything, mirror back the side-thoughts this person is probably juggling: constraints, worries, preferences, goals and unknowns. Use their profile and memory to make them personal (e.g. if their partner dislikes something, mention it). Phrase each in the user's voice, short and specific. 4 to 8 items.`,
  );
  return {
    ...out,
    consequences: out.consequences.slice(0, 8).map((c, i) => ({ ...c, id: `c${i + 1}` })),
  };
}

/* ─── The full pipeline ──────────────────────────────────────────────────── */

export async function runAgent(
  ai: ResolvedAi,
  input: { idea: string; reflection: Reflection; consequences: Consequence[] },
  ctx: Ctx,
  emit: (e: RunEvent) => void,
  signal?: AbortSignal,
): Promise<IdeaResult> {
  if (!ai.model) {
    const { runDemo } = await import("./demo");
    return runDemo(input, emit, signal);
  }
  const model = ai.model;
  const stage = (s: StageId, status: "start" | "done") => emit({ type: "stage", stage: s, status });
  const log = (s: StageId, text: string) => emit({ type: "log", stage: s, text });

  // Renumber so ids are stable and predictable for the model.
  const consequences = input.consequences.map((c, i) => ({ ...c, id: `c${i + 1}` }));
  const considerations = consequences.map((c) => `- [${c.id}] (${c.kind}) ${c.text}`).join("\n");
  const base = `${contextBlock(ctx.profile, ctx.memory)}

## The idea
"""${input.idea}"""
Restated: ${input.reflection.restatement}
Complexity: ${input.reflection.complexity}

## Considerations the user confirmed
${considerations || "- none"}`;

  /* 1. Decompose */
  stage("decompose", "start");
  log("decompose", "Pulling the thought apart, gently...");
  const plan = await structured(
    model,
    planSchema,
    `${base}

Break this into a clear goal, what success looks like, 3 to 6 decision criteria with importance 1-5 (personalized to the profile and considerations), the sub-questions research must answer, and web search queries. Include queries that surface real people's lived experiences (forums, Reddit, blogs) as well as expert or research sources when relevant. Simple ideas: 1-2 queries. Complex: up to 6.`,
    signal,
  );
  const criteria: Criterion[] = weighCriteria(
    plan.criteria
      .slice(0, 6)
      .map((c, i) => ({ ...c, id: `k${i + 1}`, importance: Math.min(5, Math.max(1, Math.round(c.importance) || 3)) })),
  );
  for (const c of criteria) log("decompose", `Criterion: ${c.name} (${Math.round(c.weight * 100)}%)`);
  stage("decompose", "done");

  /* 2. Research */
  stage("research", "start");
  const sources: Source[] = [];
  const addSource = (url: string, title: string, snippet?: string) => {
    if (!url || sources.some((s) => s.url === url)) return sources.find((s) => s.url === url);
    const s = { id: `s${sources.length + 1}`, url, title: title || url, snippet };
    sources.push(s);
    return s;
  };
  let searchMode: IdeaResult["searchMode"] = "none";
  let notes = "";
  const researchPrompt = `${base}

## Goal
${plan.goal}

## Questions to answer
${plan.subQuestions.map((q) => `- ${q}`).join("\n")}

## Suggested searches
${plan.searchQueries.map((q) => `- ${q}`).join("\n")}`;

  const queries = plan.searchQueries.slice(0, input.reflection.complexity === "complex" ? 6 : 3);
  if (ai.tavilyKey) {
    searchMode = "tavily";
    const client = tavily({ apiKey: ai.tavilyKey });
    const webSearch = tool({
      description: "Search the web. Returns numbered results with snippets.",
      inputSchema: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        log("research", `Searching: "${query}"`);
        try {
          const res = await client.search(query, { maxResults: 5, searchDepth: "basic" });
          return res.results
            .map((r) => {
              const s = addSource(r.url, r.title, r.content?.slice(0, 400));
              return `[${s?.id.slice(1)}] ${r.title} (${r.url})\n${r.content?.slice(0, 700) ?? ""}`;
            })
            .join("\n\n");
        } catch (e) {
          return `Search failed: ${(e as Error).message}`;
        }
      },
    });
    const r = await generateText({
      model,
      instructions: SYSTEM,
      prompt: `${researchPrompt}

Use the webSearch tool (up to ${queries.length + 2} searches) to answer the questions. Then write concise research notes. Cite results by their number like [3]. Separate facts, research findings, and people's lived experiences.`,
      tools: { webSearch },
      stopWhen: isStepCount(queries.length + 4),
      maxRetries: 2,
      abortSignal: signal,
    });
    notes = r.text;
  } else if (ai.nativeSearch) {
    searchMode = "native";
    for (const q of queries) log("research", `Searching: "${q}"`);
    const r = await generateText({
      model,
      instructions: SYSTEM,
      prompt: `${researchPrompt}

Search the web to answer the questions, then write concise research notes. Separate facts, research findings, and people's lived experiences, and mention which source each point came from.`,
      tools: ai.nativeSearch,
      stopWhen: isStepCount(6),
      maxRetries: 2,
      abortSignal: signal,
    });
    for (const s of r.sources) if (s.sourceType === "url") addSource(s.url, s.title ?? s.url);
    notes = r.text;
  } else {
    log("research", "No web search configured, so I'm using what I already know (lower confidence).");
    const r = await generateText({
      model,
      instructions: SYSTEM,
      prompt: `${researchPrompt}

You have no web access. Write concise research notes from well-established knowledge only. Mark anything uncertain as uncertain.`,
      maxRetries: 2,
      abortSignal: signal,
    });
    notes = r.text;
  }
  log("research", `Collected ${sources.length} source${sources.length === 1 ? "" : "s"}. Extracting evidence...`);

  const sourceList = sources.map((s) => `[${s.id.slice(1)}] ${s.title} (${s.url})`).join("\n");
  const ev = await structured(
    model,
    evidenceSchema,
    `${base}

## Research notes
${notes}

## Sources
${sourceList || "(none)"}

Extract 4 to 14 evidence items that matter for this decision. Each claim must come from the notes, a listed source, or the user's profile/considerations (kind "profile"). sourceNumber must be the [n] number of a listed source, or 0 if the claim is not from a listed source. Never make up numbers.`,
    signal,
  );
  const evidence: Evidence[] = ev.evidence.slice(0, 14).map((e, i) => {
    const src = e.sourceNumber > 0 ? sources.find((s) => s.id === `s${e.sourceNumber}`) : undefined;
    return {
      id: `e${i + 1}`,
      claim: e.claim,
      kind: e.kind,
      // A "research" claim without a real source is downgraded, not trusted.
      strength: src || e.kind === "profile" ? e.strength : "weak",
      sourceId: src?.id ?? null,
    };
  });
  log("research", `${evidence.length} pieces of evidence, ${evidence.filter((e) => e.sourceId).length} with sources.`);
  stage("research", "done");

  /* 3. Options */
  stage("options", "start");
  log("options", "Sketching genuinely different paths...");
  const criteriaList = criteria
    .map((c) => `- [${c.id}] ${c.name} (weight ${Math.round(c.weight * 100)}%): ${c.description}`)
    .join("\n");
  const evidenceList = evidence.map((e) => `- [${e.id}] (${e.kind}, ${e.strength}) ${e.claim}`).join("\n");
  const opt = await structured(
    model,
    optionsSchema,
    `${base}

## Criteria
${criteriaList}

## Evidence
${evidenceList}

Propose 3 to 5 genuinely different options (not small variations). For each, score EVERY criterion 0-10 with a one-sentence rationale and cite the evidence ids (e.g. e2) and consideration ids (e.g. c1) that justify the score. Only cite ids listed above. List which considerations each option addresses and which it violates. Be honest: options that break a hard constraint should score low.`,
    signal,
  );
  const evidenceIds = new Set(evidence.map((e) => e.id));
  const consequenceIds = new Set(consequences.map((c) => c.id));
  let options = opt.options.slice(0, 5).map((o, i) => {
    const scores = cleanScores(o.scores, criteria, evidenceIds, consequenceIds);
    return {
      id: `o${i + 1}`,
      name: o.name,
      emoji: o.emoji,
      summary: o.summary,
      steps: o.steps,
      pros: o.pros,
      cons: o.cons,
      effort: Math.min(5, Math.max(1, Math.round(o.effort))),
      risk: Math.min(5, Math.max(1, Math.round(o.risk))),
      addresses: o.addresses.map((x) => x.toLowerCase()).filter((x) => consequenceIds.has(x)),
      violates: o.violates.map((x) => x.toLowerCase()).filter((x) => consequenceIds.has(x)),
      scores,
      total: totalScore(scores, criteria),
    };
  });
  for (const o of options) log("options", `${o.emoji} ${o.name}: ${o.total}/100`);
  stage("options", "done");

  /* 4. Critique */
  stage("critique", "start");
  log("critique", "Playing devil's advocate with myself...");
  const scoreTable = options
    .map(
      (o) =>
        `[${o.id}] ${o.name}\n` +
        o.scores
          .map(
            (s) =>
              `  ${s.criterionId}: ${s.score} (${s.rationale}) cites ${[...s.evidenceIds, ...s.consequenceIds].join(", ") || "NOTHING"}`,
          )
          .join("\n"),
    )
    .join("\n");
  const crit = await structured(
    model,
    critiqueSchema,
    `${base}

## Criteria
${criteriaList}

## Evidence
${evidenceList}

## Scores to audit
${scoreTable}

Audit these scores like a skeptical reviewer. Adjust a score only when it contradicts the evidence, ignores a hard constraint, or is inconsistent across options. Flag issues and blind spots. Give an overall confidence 0-100 that the top option is genuinely best for this user.`,
    signal,
  );
  let changed = 0;
  for (const a of crit.adjustments) {
    const o = options.find((x) => x.id === a.optionId.trim().toLowerCase());
    const s = o?.scores.find((x) => x.criterionId === a.criterionId.trim().toLowerCase());
    if (!o || !s) continue;
    const next = Math.round(Math.min(10, Math.max(0, a.newScore)) * 10) / 10;
    if (next === s.score) continue;
    s.adjustedFrom = s.score;
    s.adjustNote = a.reason;
    s.score = next;
    changed++;
  }
  options = options.map((o) => ({ ...o, total: totalScore(o.scores, criteria) }));
  log("critique", changed ? `Adjusted ${changed} score${changed > 1 ? "s" : ""} after review.` : "Scores held up. Nice.");
  const ranked = rankOptions(options);
  const confidence = blendConfidence(crit.confidence, ranked, evidence);
  stage("critique", "done");

  /* 5. Synthesize */
  stage("synthesize", "start");
  log("synthesize", `${ranked[0].emoji} ${ranked[0].name} wins on points. Writing it up...`);
  const syn = await structured(
    model,
    synthesisSchema,
    `${base}

## Final ranking (computed from weighted scores; do not change it)
${ranked.map((o) => `${o.rank}. [${o.id}] ${o.name}: ${o.total}/100. ${o.summary}`).join("\n")}

## Evidence
${evidenceList}

## Reviewer notes
${crit.issues.join("\n") || "none"}

Explain why #1 wins for THIS user, referencing evidence and considerations. Give 3-5 first steps, alternatives (use option ids) with when each would be the better choice, watch-outs, a decision path of 4-7 steps from idea to decision, and a kind closing joke.`,
    signal,
  );
  stage("synthesize", "done");

  return {
    version: 1,
    provider: ai.provider,
    model: ai.modelId,
    searchMode,
    generatedAt: new Date().toISOString(),
    goal: plan.goal,
    successLooksLike: plan.successLooksLike,
    subQuestions: plan.subQuestions,
    criteria,
    consequences,
    sources,
    evidence,
    options: ranked,
    critique: { issues: crit.issues, blindSpots: crit.blindSpots },
    confidence,
    synthesis: {
      ...syn,
      alternatives: syn.alternatives
        .map((a) => ({ ...a, optionId: a.optionId.trim().toLowerCase() }))
        .filter((a) => ranked.some((o) => o.id === a.optionId && o.rank > 1)),
    },
  };
}
