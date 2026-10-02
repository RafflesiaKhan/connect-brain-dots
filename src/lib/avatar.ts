import { createAvatar } from "@dicebear/core";
import { openPeeps } from "@dicebear/collection";

/** Open Peeps (by Pablo Stanley) options, rendered locally as SVG by DiceBear. */
export const AVATAR_PARTS = {
  head: [
    "afro", "bangs", "bangs2", "bantuKnots", "bear", "bun", "bun2", "buns", "cornrows",
    "cornrows2", "dreads1", "dreads2", "flatTop", "flatTopLong", "grayBun", "grayMedium",
    "grayShort", "hatBeanie", "hatHip", "hijab", "long", "longAfro", "longBangs", "longCurly",
    "medium1", "medium2", "medium3", "mediumBangs", "mediumBangs2", "mediumBangs3",
    "mediumStraight", "mohawk", "mohawk2", "noHair1", "noHair2", "noHair3", "pomp", "shaved1",
    "shaved2", "shaved3", "short1", "short2", "short3", "short4", "short5", "turban", "twists",
    "twists2",
  ],
  accessories: [
    "none", "glasses", "glasses2", "glasses3", "glasses4", "glasses5", "sunglasses", "sunglasses2",
    "eyepatch",
  ],
  facialHair: [
    "none", "chin", "full", "full2", "full3", "full4", "goatee1", "goatee2", "moustache1",
    "moustache2", "moustache3", "moustache4", "moustache5", "moustache6", "moustache7",
    "moustache8", "moustache9",
  ],
  skinColor: ["ffdbb4", "edb98a", "d08b5b", "ae5d29", "694d3d"],
  clothingColor: ["e78276", "ffcf77", "fdea6b", "78e185", "9ddadb", "8fa7df", "e279c7"],
  headContrastColor: ["2c1b18", "724133", "a55728", "b58143", "d6b370", "c93305", "e8e1e1", "f59797"],
  face: [
    "smile", "smileBig", "cute", "calm", "cheeky", "lovingGrin1", "lovingGrin2", "smileLOL",
    "smileTeethGap", "driven", "awe", "serious", "solemn", "suspicious", "tired",
  ],
} as const;

export type AvatarConfig = {
  seed: string;
  head: string;
  face: string;
  accessories: string;
  facialHair: string;
  skinColor: string;
  clothingColor: string;
  headContrastColor: string;
};

export type Mood = "idle" | "happy" | "thinking" | "talking" | "surprised" | "worried" | "blink";

/** Each mood swaps the Peep's face so the avatar reacts to what the agent is doing. */
const MOOD_FACE: Record<Exclude<Mood, "idle">, string> = {
  happy: "smileBig",
  thinking: "driven",
  talking: "explaining",
  surprised: "awe",
  worried: "concerned",
  blink: "eyesClosed",
};

function pick<T>(arr: readonly T[], r: () => number): T {
  return arr[Math.floor(r() * arr.length)];
}

/** Small seeded PRNG so server and client can render the same "random" avatars. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomAvatar(r: () => number = Math.random): AvatarConfig {
  const seed = Math.floor(r() * 1e9).toString(36);
  return {
    seed,
    head: pick(AVATAR_PARTS.head, r),
    face: pick(AVATAR_PARTS.face.slice(0, 9), r),
    accessories: r() < 0.35 ? pick(AVATAR_PARTS.accessories.slice(1), r) : "none",
    facialHair: r() < 0.2 ? pick(AVATAR_PARTS.facialHair.slice(1), r) : "none",
    skinColor: pick(AVATAR_PARTS.skinColor, r),
    clothingColor: pick(AVATAR_PARTS.clothingColor, r),
    headContrastColor: pick(AVATAR_PARTS.headContrastColor, r),
  };
}

export const DEFAULT_AVATAR: AvatarConfig = {
  seed: "dot",
  head: "bun",
  face: "smile",
  accessories: "glasses",
  facialHair: "none",
  skinColor: "edb98a",
  clothingColor: "8fa7df",
  headContrastColor: "2c1b18",
};

/** The app's own mascot, "Dot". */
export const DOT_AVATAR: AvatarConfig = {
  seed: "dot-buddy",
  head: "twists2",
  face: "cute",
  accessories: "glasses4",
  facialHair: "none",
  skinColor: "d08b5b",
  clothingColor: "e279c7",
  headContrastColor: "724133",
};

const cache = new Map<string, string>();

export function avatarSvg(cfg: AvatarConfig, mood: Mood = "idle"): string {
  const face = mood === "idle" ? cfg.face : MOOD_FACE[mood];
  const k = JSON.stringify(cfg) + face;
  const hit = cache.get(k);
  if (hit) return hit;
  // DiceBear typings expect literal unions; our values come from the same lists.
  const opts = {
    seed: cfg.seed,
    head: [cfg.head],
    face: [face],
    accessories: cfg.accessories === "none" ? [] : [cfg.accessories],
    accessoriesProbability: cfg.accessories === "none" ? 0 : 100,
    facialHair: cfg.facialHair === "none" ? [] : [cfg.facialHair],
    facialHairProbability: cfg.facialHair === "none" ? 0 : 100,
    maskProbability: 0,
    skinColor: [cfg.skinColor],
    clothingColor: [cfg.clothingColor],
    headContrastColor: [cfg.headContrastColor],
  } as unknown as Parameters<typeof createAvatar<typeof openPeeps>>[1];
  const svg = createAvatar(openPeeps, opts).toString();
  cache.set(k, svg);
  return svg;
}
