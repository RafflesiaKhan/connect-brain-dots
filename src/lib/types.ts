/** Shared domain types. Safe to import from client and server. */

export type ConsequenceKind = "constraint" | "worry" | "preference" | "goal" | "unknown";

export type Consequence = {
  id: string;
  text: string;
  kind: ConsequenceKind;
  emoji: string;
  /** Added by the user rather than suggested by the agent. */
  userAdded?: boolean;
};

export type Reflection = {
  title: string;
  restatement: string;
  complexity: "simple" | "moderate" | "complex";
  quip: string;
  consequences: Consequence[];
};

export type Criterion = {
  id: string;
  name: string;
  description: string;
  importance: number; // 1-5 from the agent
  weight: number; // normalized 0-1, sums to 1
  why: string;
};

export type Source = { id: string; url: string; title: string; snippet?: string };

export type EvidenceKind = "research" | "experience" | "fact" | "profile" | "common-sense";

export type Evidence = {
  id: string;
  claim: string;
  kind: EvidenceKind;
  strength: "strong" | "moderate" | "weak";
  sourceId: string | null;
};

export type Score = {
  criterionId: string;
  score: number; // 0-10
  rationale: string;
  evidenceIds: string[];
  consequenceIds: string[];
  /** True when the score cites nothing (no evidence, no consequence). */
  unsupported: boolean;
  /** Set when the critique pass changed the score. */
  adjustedFrom?: number;
  adjustNote?: string;
};

export type Outcome = {
  text: string;
  effect: "positive" | "negative";
  horizon: "short" | "long";
  likelihood: number; // 1-5
  impact: number; // 1-5
  consequenceIds: string[];
};

export type Option = {
  id: string;
  name: string;
  emoji: string;
  summary: string;
  steps: string[];
  pros: string[];
  cons: string[];
  /** Likely consequences of choosing this option. Missing on results created before this field existed. */
  outcomes?: Outcome[];
  effort: number; // 1-5
  risk: number; // 1-5
  addresses: string[]; // consequence ids
  violates: string[]; // consequence ids
  scores: Score[];
  total: number; // weighted, 0-100
  rank: number;
};

export type IdeaResult = {
  version: 1;
  provider: string;
  model: string;
  searchMode: "tavily" | "native" | "none" | "demo";
  generatedAt: string;
  goal: string;
  successLooksLike: string;
  subQuestions: string[];
  criteria: Criterion[];
  consequences: Consequence[];
  sources: Source[];
  evidence: Evidence[];
  options: Option[];
  critique: { issues: string[]; blindSpots: string[] };
  confidence: number; // 0-100
  synthesis: {
    headline: string;
    why: string;
    firstSteps: string[];
    alternatives: { optionId: string; whenToChoose: string }[];
    watchOuts: string[];
    quip: string;
    path: { label: string; detail: string }[];
  };
};

export type StageId = "decompose" | "research" | "options" | "critique" | "synthesize";

export const STAGES: { id: StageId; label: string; emoji: string; blurb: string }[] = [
  { id: "decompose", label: "Untangling", emoji: "🧶", blurb: "Splitting the thought into goals and criteria" },
  { id: "research", label: "Researching", emoji: "🔎", blurb: "Gathering evidence, studies and real experiences" },
  { id: "options", label: "Brainstorming", emoji: "💡", blurb: "Building and scoring candidate solutions" },
  { id: "critique", label: "Fact-checking", emoji: "🧐", blurb: "Hunting for weak claims and blind spots" },
  { id: "synthesize", label: "Connecting dots", emoji: "✨", blurb: "Drawing the final plan" },
];

export type RunEvent =
  | { type: "stage"; stage: StageId; status: "start" | "done" }
  | { type: "log"; stage: StageId; text: string }
  | { type: "result"; result: IdeaResult }
  | { type: "error"; message: string };
