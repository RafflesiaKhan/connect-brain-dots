import { z } from "zod";

// Every field is required (no .optional()) so strict structured-output modes
// on OpenAI, Grok and others accept the schemas. Numeric ranges live in the
// descriptions and are clamped in code: an out-of-range number should be
// corrected, not fail the whole run.

export const reflectionSchema = z.object({
  title: z.string().describe("Short, catchy title for the idea, max 6 words"),
  restatement: z.string().describe("One sentence: what the user is really trying to decide"),
  complexity: z.enum(["simple", "moderate", "complex"]),
  quip: z.string().describe("One short, warm, funny line about the dilemma"),
  consequences: z
    .array(
      z.object({
        text: z.string().describe("A consideration in the user's own voice, max 12 words"),
        kind: z.enum(["constraint", "worry", "preference", "goal", "unknown"]),
        emoji: z.string().describe("A single emoji"),
      }),
    )
    .describe("4 to 8 side-thoughts the user is probably juggling"),
});

export const planSchema = z.object({
  goal: z.string(),
  successLooksLike: z.string(),
  criteria: z
    .array(
      z.object({
        name: z.string().describe("2-3 words, e.g. 'Health', 'Family approval'"),
        description: z.string(),
        importance: z.number().describe("1 (minor) to 5 (critical)"),
        why: z.string().describe("Why this matters for THIS user, citing profile or considerations"),
      }),
    )
    .describe("3 to 6 decision criteria"),
  subQuestions: z.array(z.string()).describe("2 to 5 questions that research must answer"),
  searchQueries: z.array(z.string()).describe("Web search queries; 1-2 for simple ideas, up to 6 for complex"),
});

export const evidenceSchema = z.object({
  evidence: z
    .array(
      z.object({
        claim: z.string().describe("One factual, specific claim"),
        sourceNumber: z.number().describe("Number of the source [n] it came from, or 0 if none"),
        kind: z.enum(["research", "experience", "fact", "profile", "common-sense"]),
        strength: z.enum(["strong", "moderate", "weak"]),
      }),
    )
    .describe("4 to 14 evidence items"),
});

export const optionsSchema = z.object({
  options: z
    .array(
      z.object({
        name: z.string().describe("Short name, max 5 words"),
        emoji: z.string(),
        summary: z.string(),
        steps: z.array(z.string()).describe("2 to 5 concrete steps"),
        pros: z.array(z.string()),
        cons: z.array(z.string()),
        effort: z.number().describe("1 (trivial) to 5 (huge)"),
        risk: z.number().describe("1 (safe) to 5 (risky)"),
        addresses: z.array(z.string()).describe("Consideration ids this option satisfies, e.g. c1"),
        violates: z.array(z.string()).describe("Consideration ids this option conflicts with"),
        scores: z.array(
          z.object({
            criterionId: z.string().describe("e.g. k1"),
            score: z.number().describe("0 to 10"),
            rationale: z.string().describe("One sentence"),
            evidenceIds: z.array(z.string()).describe("e.g. e2"),
            consequenceIds: z.array(z.string()).describe("e.g. c3"),
          }),
        ),
      }),
    )
    .describe("3 to 5 genuinely different options"),
});

export const critiqueSchema = z.object({
  adjustments: z.array(
    z.object({
      optionId: z.string(),
      criterionId: z.string(),
      newScore: z.number().describe("0 to 10"),
      reason: z.string(),
    }),
  ),
  issues: z.array(z.string()).describe("Problems found in the analysis, if any"),
  blindSpots: z.array(z.string()).describe("Things nobody has evidence for yet"),
  confidence: z.number().describe("0 to 100"),
});

export const synthesisSchema = z.object({
  headline: z.string().describe("Punchy one-line verdict"),
  why: z.string().describe("2-3 sentences explaining the winner with references to evidence"),
  firstSteps: z.array(z.string()).describe("3 to 5 next actions"),
  alternatives: z.array(
    z.object({ optionId: z.string(), whenToChoose: z.string() }),
  ),
  watchOuts: z.array(z.string()),
  quip: z.string().describe("A short, kind joke to close"),
  path: z
    .array(z.object({ label: z.string(), detail: z.string() }))
    .describe("4 to 7 steps showing how the reasoning flowed from idea to decision"),
});

export type PlanOut = z.infer<typeof planSchema>;
export type OptionsOut = z.infer<typeof optionsSchema>;
