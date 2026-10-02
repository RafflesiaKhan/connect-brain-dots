import "server-only";
import { blendConfidence, cleanScores, rankOptions, totalScore, weighCriteria } from "@/lib/scoring";
import type { Consequence, IdeaResult, Reflection, RunEvent, StageId } from "@/lib/types";

/** Demo mode: a scripted run of the lunch dilemma so the whole UI can be explored without an API key. */

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((res, rej) => {
    const t = setTimeout(res, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      rej(new Error("aborted"));
    });
  });

export function demoReflection(idea: string): Reflection {
  return {
    title: idea.length < 40 ? idea : "Today's lunch dilemma",
    restatement:
      "You want a lunch that is tasty, reasonably healthy, and that everyone at the table will actually eat.",
    complexity: "simple",
    quip: "Ah, the classic lunch committee meeting. Today's agenda: curry, controversy, and calories.",
    consequences: [
      { id: "c1", text: "My husband doesn't like curry", kind: "constraint", emoji: "🙅" },
      { id: "c2", text: "Fried meat feels unhealthy", kind: "worry", emoji: "🍳" },
      { id: "c3", text: "I want rice and meat as the base", kind: "preference", emoji: "🍚" },
      { id: "c4", text: "It shouldn't take forever to cook", kind: "constraint", emoji: "⏱️" },
      { id: "c5", text: "Leftovers for tomorrow would be nice", kind: "goal", emoji: "🥡" },
      { id: "c6", text: "Do we have vegetables at home?", kind: "unknown", emoji: "🥦" },
    ],
  };
}

const SOURCES = [
  { id: "s1", title: "Air frying vs deep frying: oil and calorie comparison (review)", url: "https://pubmed.ncbi.nlm.nih.gov/?term=air+frying+deep+frying+oil+content" },
  { id: "s2", title: "Harvard Nutrition Source: The Healthy Eating Plate", url: "https://www.hsph.harvard.edu/nutritionsource/healthy-eating-plate/" },
  { id: "s3", title: "r/Cooking: 'Partner hates curry, what do you make instead?'", url: "https://www.reddit.com/r/Cooking/search/?q=partner+hates+curry" },
  { id: "s4", title: "Stir-fry basics: high heat, little oil, fast cooking", url: "https://www.seriouseats.com/search?q=stir+fry+basics" },
  { id: "s5", title: "USDA: Leftovers and food safety", url: "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety" },
];

export async function runDemo(
  input: { idea: string; reflection: Reflection; consequences: Consequence[] },
  emit: (e: RunEvent) => void,
  signal?: AbortSignal,
): Promise<IdeaResult> {
  const step = async (s: StageId, lines: string[]) => {
    emit({ type: "stage", stage: s, status: "start" });
    for (const text of lines) {
      await wait(650, signal);
      emit({ type: "log", stage: s, text });
    }
    await wait(400, signal);
    emit({ type: "stage", stage: s, status: "done" });
  };

  const consequences = input.consequences.length ? input.consequences : demoReflection(input.idea).consequences;
  const has = (id: string) => consequences.some((c) => c.id === id);

  const criteria = weighCriteria([
    { id: "k1", name: "Family approval", description: "Everyone at the table enjoys it", importance: 5, why: "Your husband's taste is a hard constraint (c1)." },
    { id: "k2", name: "Healthiness", description: "Balanced, not greasy", importance: 4, why: "You flagged fried food as a worry (c2)." },
    { id: "k3", name: "Speed", description: "On the table fast", importance: 3, why: "You want it quick (c4)." },
    { id: "k4", name: "Leftover power", description: "Tastes good tomorrow too", importance: 2, why: "Bonus goal (c5)." },
  ]);

  await step("decompose", [
    "Goal: a crowd-pleasing rice and meat lunch.",
    "Criterion: Family approval (36%)",
    "Criterion: Healthiness (29%)",
    "Criterion: Speed (21%)",
    "Criterion: Leftover power (14%)",
  ]);
  await step("research", [
    'Searching: "air fryer vs pan fry oil absorption"',
    'Searching: "partner doesn\'t like curry alternatives reddit"',
    'Searching: "quick healthy meat and rice dinners"',
    "Collected 5 sources. Extracting evidence...",
    "8 pieces of evidence, 5 with sources.",
  ]);

  const evidence = [
    { id: "e1", claim: "Air frying or oven roasting uses far less oil than deep or shallow frying, cutting fat and calories noticeably.", kind: "research" as const, strength: "strong" as const, sourceId: "s1" },
    { id: "e2", claim: "A balanced plate is about half vegetables, a quarter protein and a quarter whole grains.", kind: "research" as const, strength: "strong" as const, sourceId: "s2" },
    { id: "e3", claim: "People whose partners dislike curry often succeed with milder, sauce-light dishes like garlic-ginger stir-fries or grilled meats with a side sauce.", kind: "experience" as const, strength: "moderate" as const, sourceId: "s3" },
    { id: "e4", claim: "A stir-fry cooks in under 20 minutes with only a tablespoon or two of oil.", kind: "fact" as const, strength: "moderate" as const, sourceId: "s4" },
    { id: "e5", claim: "Cooked leftovers are safe in the fridge for 3 to 4 days.", kind: "fact" as const, strength: "strong" as const, sourceId: "s5" },
    { id: "e6", claim: "Serving sauce on the side lets each person customize spice and flavor.", kind: "experience" as const, strength: "moderate" as const, sourceId: "s3" },
    { id: "e7", claim: "Your husband dislikes curry, so curry-forward dishes risk a half-eaten plate.", kind: "profile" as const, strength: "strong" as const, sourceId: null },
    { id: "e8", claim: "Braised dishes usually taste even better the next day.", kind: "common-sense" as const, strength: "weak" as const, sourceId: null },
  ];
  const evIds = new Set(evidence.map((e) => e.id));
  const cqIds = new Set(consequences.map((c) => c.id));
  const c = (...ids: string[]) => ids.filter(has);

  await step("options", [
    "Sketching genuinely different paths...",
    "🥢 Ginger-garlic stir-fry bowl",
    "🍗 Air-fried crispy meat + rice",
    "🍛 Classic meat curry",
    "🍲 Mild braise, curry on the side",
  ]);

  const raw = [
    {
      name: "Ginger-garlic stir-fry bowl", emoji: "🥢",
      summary: "Thin-sliced meat stir-fried with veggies in a light soy-ginger-garlic sauce over rice.",
      steps: ["Start the rice", "Slice meat thin and marinate 10 min in soy, garlic, ginger", "Stir-fry veggies on high heat, then meat", "Toss with sauce and serve over rice"],
      pros: ["Fast", "Light on oil", "Not curry, so husband-approved"], cons: ["Needs some veggies in the fridge", "Less 'cozy' than a curry"],
      effort: 2, risk: 1, addresses: c("c1", "c2", "c3", "c4"), violates: [],
      scores: [
        { criterionId: "k1", score: 8.5, rationale: "Mild, non-curry flavors are a common win with curry skeptics.", evidenceIds: ["e3", "e7"], consequenceIds: c("c1") },
        { criterionId: "k2", score: 8.5, rationale: "Little oil and plenty of vegetables fit the healthy plate.", evidenceIds: ["e2", "e4"], consequenceIds: c("c2") },
        { criterionId: "k3", score: 9, rationale: "Done in about 20 minutes.", evidenceIds: ["e4"], consequenceIds: c("c4") },
        { criterionId: "k4", score: 6, rationale: "Reheats fine, veggies soften a bit.", evidenceIds: ["e5"], consequenceIds: c("c5") },
      ],
    },
    {
      name: "Air-fried crispy meat + rice", emoji: "🍗",
      summary: "Get the 'fry' crunch your husband likes using the air fryer or oven, with a quick salad.",
      steps: ["Season meat with salt, pepper, paprika", "Air-fry 12-15 min, flipping once", "Serve with rice and a cucumber-tomato salad"],
      pros: ["Crispy like fried", "Much less oil", "Almost hands-off"], cons: ["Needs an air fryer or oven", "Can dry out if overcooked"],
      effort: 1, risk: 2, addresses: c("c1", "c2", "c3", "c4"), violates: [],
      scores: [
        { criterionId: "k1", score: 8, rationale: "Delivers the fried texture without curry.", evidenceIds: ["e7"], consequenceIds: c("c1") },
        { criterionId: "k2", score: 7.5, rationale: "Air frying cuts oil a lot versus frying.", evidenceIds: ["e1"], consequenceIds: c("c2") },
        { criterionId: "k3", score: 8.5, rationale: "Mostly waiting time.", evidenceIds: [], consequenceIds: c("c4") },
        { criterionId: "k4", score: 5, rationale: "Crunch fades in the fridge.", evidenceIds: ["e5"], consequenceIds: c("c5") },
      ],
    },
    {
      name: "Classic meat curry", emoji: "🍛",
      summary: "Your original plan: rice and a rich meat curry.",
      steps: ["Brown onions and spices", "Add meat and simmer 40+ min", "Serve with rice"],
      pros: ["You crave it", "Great leftovers"], cons: ["Husband dislikes curry", "Longer cook time"],
      effort: 3, risk: 4, addresses: c("c3", "c5"), violates: c("c1", "c4"),
      scores: [
        { criterionId: "k1", score: 2.5, rationale: "Directly conflicts with your husband's taste.", evidenceIds: ["e7"], consequenceIds: c("c1") },
        { criterionId: "k2", score: 6.5, rationale: "Can be healthy, depends on oil and cream.", evidenceIds: ["e2"], consequenceIds: [] },
        { criterionId: "k3", score: 4, rationale: "Slow simmer.", evidenceIds: [], consequenceIds: c("c4") },
        { criterionId: "k4", score: 9.5, rationale: "Curry is famously better the next day.", evidenceIds: ["e8", "e5"], consequenceIds: c("c5") },
      ],
    },
    {
      name: "Mild braise, curry on the side", emoji: "🍲",
      summary: "Cook one gently spiced meat braise; you add curry sauce to your plate, he keeps his mild.",
      steps: ["Braise meat with onion, garlic, tomato", "Split a portion and stir curry paste into yours", "Serve both with rice"],
      pros: ["Everyone gets their way", "Fantastic leftovers"], cons: ["Takes longer", "Two pans to wash"],
      effort: 3, risk: 2, addresses: c("c1", "c3", "c5"), violates: c("c4"),
      scores: [
        { criterionId: "k1", score: 8, rationale: "Sauce-on-the-side lets each person customize.", evidenceIds: ["e6", "e3"], consequenceIds: c("c1") },
        { criterionId: "k2", score: 7, rationale: "Braising needs little oil.", evidenceIds: ["e2"], consequenceIds: c("c2") },
        { criterionId: "k3", score: 4.5, rationale: "45+ minutes.", evidenceIds: [], consequenceIds: c("c4") },
        { criterionId: "k4", score: 9, rationale: "Braises improve overnight.", evidenceIds: ["e8", "e5"], consequenceIds: c("c5") },
      ],
    },
  ];

  let options = raw.map((o, i) => {
    const scores = cleanScores(o.scores, criteria, evIds, cqIds);
    return { ...o, id: `o${i + 1}`, scores, total: totalScore(scores, criteria) };
  });

  await step("critique", [
    "Playing devil's advocate with myself...",
    "Air-fried 'Speed' cited no research. Flagged, kept.",
    "Adjusted 1 score after review.",
  ]);
  const s = options[1].scores.find((x) => x.criterionId === "k1");
  if (s) {
    s.adjustedFrom = s.score;
    s.adjustNote = "Fried texture is liked, but the profile says nothing about whether he likes it plain.";
    s.score = 7.5;
  }
  options = options.map((o) => ({ ...o, total: totalScore(o.scores, criteria) }));
  const ranked = rankOptions(options);
  const confidence = blendConfidence(82, ranked, evidence);

  await step("synthesize", [`${ranked[0].emoji} ${ranked[0].name} wins on points. Writing it up...`]);

  const others = ranked.slice(1);
  return {
    version: 1,
    provider: "demo",
    model: "sample-brain",
    searchMode: "demo",
    generatedAt: new Date().toISOString(),
    goal: "Cook a rice and meat lunch that everyone enjoys, without frying guilt.",
    successLooksLike: "Clean plates, no complaints, and maybe a lunchbox for tomorrow.",
    subQuestions: [
      "What do people cook when a partner dislikes curry?",
      "How much healthier is air frying than frying?",
      "Which meat and rice dishes are fastest?",
    ],
    criteria,
    consequences,
    sources: SOURCES,
    evidence,
    options: ranked,
    critique: {
      issues: ["Speed for the air-fried option is an estimate, not sourced."],
      blindSpots: ["We don't know if there are vegetables at home (c6).", "Your own craving for curry might still win the day!"],
    },
    confidence,
    synthesis: {
      headline: `${ranked[0].emoji} ${ranked[0].name}: fast, light, and husband-approved.`,
      why: "It satisfies the hard constraint (no curry), keeps oil low, which addresses your fried-food worry, and is on the table in about 20 minutes. Curry fans can still add chili crisp to their own bowl.",
      firstSteps: ["Put the rice on now", "Check the fridge for 2-3 vegetables", "Slice and marinate the meat for 10 minutes", "Stir-fry on high heat and serve"],
      alternatives: others.map((o) => ({
        optionId: o.id,
        whenToChoose:
          o.name.startsWith("Air") ? "No veggies at home, or he's craving something crispy."
          : o.name.startsWith("Classic") ? "He's out for lunch. Treat yourself!"
          : "You have time and want great leftovers for tomorrow.",
      })),
      watchOuts: ["Don't crowd the pan or the meat will steam instead of sear.", "Go easy on soy sauce if salt is a concern."],
      quip: "Verdict: the curry is not cancelled, it's just on a short sabbatical.",
      path: [
        { label: "Raw thought", detail: "Rice + meat curry?" },
        { label: "Constraint hit", detail: "Husband vetoes curry" },
        { label: "Detour", detail: "Frying? Worried about health" },
        { label: "Evidence", detail: "Stir-fry and air-fry use far less oil" },
        { label: "Scoring", detail: "Stir-fry leads on approval, health, and speed" },
        { label: "Decision", detail: "Ginger-garlic stir-fry bowl" },
      ],
    },
  };
}
