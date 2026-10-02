/**
 * Runs the full agent pipeline against a scripted mock model (no API key, no DB).
 * Checks that guardrails drop invented citations and that ranking is computed in code.
 *   npx tsx --conditions=react-server scripts/agent-smoke.ts
 */
import { MockLanguageModelV4 } from "ai/test";
import { runAgent } from "../src/lib/ai/agent";
import type { ResolvedAi } from "../src/lib/ai/providers";
import type { RunEvent } from "../src/lib/types";

const replies = [
  { goal: "Pick a lunch", successLooksLike: "Everyone eats", criteria: [
    { name: "Taste", description: "Yum", importance: 5, why: "c1" },
    { name: "Health", description: "Light", importance: 3, why: "c2" }],
    subQuestions: ["What is healthy?"], searchQueries: ["healthy lunch"] },
  "Notes: stir-fry uses little oil.",
  { evidence: [
    { claim: "Stir-fry uses little oil", sourceNumber: 0, kind: "research", strength: "strong" },
    { claim: "Partner dislikes curry", sourceNumber: 0, kind: "profile", strength: "strong" }] },
  { options: [
    { name: "Curry", emoji: "🍛", summary: "s", steps: ["a"], pros: ["p"], cons: ["c"], effort: 3, risk: 4,
      outcomes: [{ text: "Partner unhappy", effect: "negative", horizon: "short", likelihood: 9, impact: 4, consequenceIds: ["c1", "c42"] }],
      addresses: ["c9"], violates: ["c1"], scores: [
        { criterionId: "k1", score: 9, rationale: "r", evidenceIds: ["e99"], consequenceIds: [] },
        { criterionId: "k2", score: 5, rationale: "r", evidenceIds: [], consequenceIds: [] }] },
    { name: "Stir-fry", emoji: "🥢", summary: "s", steps: ["a"], pros: ["p"], cons: ["c"], effort: 2, risk: 1,
      outcomes: [],
      addresses: ["c1"], violates: [], scores: [
        { criterionId: "K1", score: 8, rationale: "r", evidenceIds: ["e2"], consequenceIds: ["c1"] },
        { criterionId: "k2", score: 15, rationale: "r", evidenceIds: ["e1"], consequenceIds: [] }] }] },
  { adjustments: [{ optionId: "o1", criterionId: "k1", newScore: 3, reason: "Partner hates curry" }],
    issues: ["Curry taste ignored c1"], blindSpots: [], confidence: 90 },
  { headline: "Stir-fry", why: "w", firstSteps: ["x"], alternatives: [{ optionId: "O1", whenToChoose: "alone" }, { optionId: "o7", whenToChoose: "?" }],
    watchOuts: [], quip: "q", path: [{ label: "a", detail: "b" }] },
];
let call = 0;
const model = new MockLanguageModelV4({
  doGenerate: async () => {
    const r = replies[call++];
    return {
      content: [{ type: "text", text: typeof r === "string" ? r : JSON.stringify(r) }],
      finishReason: { unified: "stop", raw: undefined },
      usage: { inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } },
      warnings: [],
    };
  },
});

async function main() {
const ai: ResolvedAi = { provider: "anthropic", modelId: "mock", model, nativeSearch: null, tavilyKey: undefined };
const events: RunEvent[] = [];
const result = await runAgent(
  ai,
  {
    idea: "lunch?",
    reflection: { title: "Lunch", restatement: "r", complexity: "simple", quip: "q", consequences: [] },
    consequences: [
      { id: "x", text: "Partner dislikes curry", kind: "constraint", emoji: "🙅" },
      { id: "y", text: "Healthy", kind: "worry", emoji: "🥗" },
    ],
  },
  { profile: "", memory: "" },
  (e) => events.push(e),
);

const assert = (cond: unknown, msg: string) => {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("ok -", msg);
};
const curry = result.options.find((o) => o.name === "Curry")!;
const stir = result.options.find((o) => o.name === "Stir-fry")!;
assert(result.searchMode === "none", "no search configured -> searchMode none");
assert(result.criteria[0].weight === 5 / 8, "weights normalized from importance");
assert(curry.scores[0].evidenceIds.length === 0 && curry.scores[0].unsupported, "invented evidence id e99 dropped and flagged");
assert(curry.addresses.length === 0, "unknown consequence id c9 dropped");
assert(curry.outcomes?.[0].likelihood === 5 && curry.outcomes[0].consequenceIds.join() === "c1", "outcome clamped and ids filtered");
assert(stir.scores[0].score === 8 && stir.scores[0].consequenceIds[0] === "c1", "criterion id matched case-insensitively");
assert(stir.scores[1].score === 10, "score clamped to 10");
assert(curry.scores[0].adjustedFrom === 9 && curry.scores[0].score === 3, "critique adjustment applied");
assert(result.options[0].name === "Stir-fry" && result.options[0].rank === 1, "ranking computed from weighted scores");
assert(result.synthesis.alternatives.length === 1, "alternatives filtered to real, non-winning options");
assert(result.confidence < 90, `confidence capped by citation coverage (${result.confidence})`);
assert(events.filter((e) => e.type === "stage" && e.status === "done").length === 5, "all 5 stages reported");
console.log("\nAll agent checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
