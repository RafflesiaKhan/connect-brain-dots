export type ProfileAnswers = Record<string, string | string[]>;

export type ProfileQuestion = {
  id: string;
  /** What Dot says. `{name}` is replaced with the user's name. */
  ask: string;
  /** Witty follow-up shown after the user answers. */
  reply?: string;
  kind: "choice" | "multi" | "text";
  options?: string[];
  placeholder?: string;
};

export const PERSONAL_QUESTIONS: ProfileQuestion[] = [
  {
    id: "age",
    ask: "Nice to meet you, {name}! First, roughly which chapter of life are you in?",
    kind: "choice",
    options: ["Under 18", "18-24", "25-34", "35-44", "45-59", "60+"],
    reply: "Great chapter. Excellent plot so far.",
  },
  {
    id: "household",
    ask: "Who shares your decisions (and your fridge)?",
    kind: "multi",
    options: ["Just me", "Partner / spouse", "Kids", "Parents", "Roommates", "Pets (they vote too)"],
    reply: "Noted. I'll keep the whole committee in mind.",
  },
  {
    id: "values",
    ask: "When you make a call, what usually matters most?",
    kind: "multi",
    options: ["Health", "Saving money", "Saving time", "Family happiness", "Fun", "Learning", "Peace of mind", "Sustainability"],
    reply: "Those will become my scoring weights. No pressure.",
  },
  {
    id: "decisionStyle",
    ask: "How do you usually decide things?",
    kind: "choice",
    options: ["Gut feeling, fast", "List every pro and con", "Ask everyone I know", "Overthink, then panic", "Research rabbit hole"],
    reply: "Ha, I've met your brain. We'll get along.",
  },
  {
    id: "risk",
    ask: "Adventure meter: how comfortable are you with risk?",
    kind: "choice",
    options: ["Play it safe", "A little spicy", "Balanced", "Bring on the chaos"],
  },
  {
    id: "constraints",
    ask: "Anything I should always respect? Diet, health, budget, beliefs, schedule...",
    kind: "text",
    placeholder: "e.g. halal food, bad knee, tight budget this month, night shifts",
    reply: "Locked in. I'll never suggest anything that breaks these.",
  },
  {
    id: "about",
    ask: "Last one! Tell me anything else that makes you, you.",
    kind: "text",
    placeholder: "Hobbies, where you live, what stresses you out...",
  },
];

export const RESEARCH_QUESTIONS: ProfileQuestion[] = [
  {
    id: "field",
    ask: "Welcome, {name}! What's your field or domain?",
    kind: "text",
    placeholder: "e.g. computational biology, product design, economics",
    reply: "Ooh, nerd-level unlocked. I'll tune my research for that.",
  },
  {
    id: "role",
    ask: "What best describes your role?",
    kind: "choice",
    options: ["Student", "PhD / Researcher", "Engineer", "Founder", "Manager", "Analyst", "Independent"],
  },
  {
    id: "expertise",
    ask: "How deep should I go on technical detail?",
    kind: "choice",
    options: ["Explain like I'm new", "Practitioner level", "Expert, skip the basics"],
  },
  {
    id: "evidence",
    ask: "Which evidence do you trust most?",
    kind: "multi",
    options: ["Peer-reviewed papers", "Industry reports", "Benchmarks & data", "Practitioner experience", "Official docs & standards"],
    reply: "I'll weigh sources accordingly and always cite them.",
  },
  {
    id: "values",
    ask: "What usually matters most in your decisions?",
    kind: "multi",
    options: ["Rigor", "Speed", "Cost", "Scalability", "Novelty", "Reproducibility", "Impact", "Ethics"],
  },
  {
    id: "constraints",
    ask: "Any standing constraints? Budget, tools, compliance, deadlines...",
    kind: "text",
    placeholder: "e.g. Python only, GDPR, no cloud GPUs, thesis due in May",
  },
  {
    id: "about",
    ask: "Anything else I should know about how you work?",
    kind: "text",
    placeholder: "Current projects, team size, pet peeves...",
  },
];

export function questionsFor(type: "personal" | "research") {
  return type === "research" ? RESEARCH_QUESTIONS : PERSONAL_QUESTIONS;
}

/** Human-readable profile summary handed to the agent. */
export function profileToText(p: {
  displayName: string;
  profileType: "personal" | "research";
  answers: ProfileAnswers;
}): string {
  const qs = questionsFor(p.profileType);
  const lines = [`Name: ${p.displayName || "unknown"}`, `Profile type: ${p.profileType}`];
  for (const q of qs) {
    const a = p.answers[q.id];
    if (!a || (Array.isArray(a) && a.length === 0)) continue;
    lines.push(`${q.id}: ${Array.isArray(a) ? a.join(", ") : a}`);
  }
  return lines.join("\n");
}
