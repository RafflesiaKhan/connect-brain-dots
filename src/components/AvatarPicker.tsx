"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { AVATAR_PARTS, randomAvatar, seededRandom, type AvatarConfig, type Mood } from "@/lib/avatar";
import { Peep } from "./Peep";

type Cyclable = "head" | "face" | "accessories" | "facialHair";
type Swatch = "skinColor" | "headContrastColor" | "clothingColor";

const CYCLE: { key: Cyclable; label: string }[] = [
  { key: "head", label: "Hair & hats" },
  { key: "face", label: "Expression" },
  { key: "accessories", label: "Eyewear" },
  { key: "facialHair", label: "Facial hair" },
];
const SWATCH: { key: Swatch; label: string }[] = [
  { key: "skinColor", label: "Skin" },
  { key: "headContrastColor", label: "Hair color" },
  { key: "clothingColor", label: "Outfit" },
];

const pretty = (s: string) => (s === "none" ? "None" : s.replace(/([A-Z])/g, " $1").replace(/(\d+)/, " $1").trim());

export function AvatarPicker({ value, onChange }: { value: AvatarConfig; onChange: (v: AvatarConfig) => void }) {
  const [mood, setMood] = useState<Mood>("idle");
  // Seeded so the first render matches between server and client; reshuffles use Math.random.
  const [ideas, setIdeas] = useState<AvatarConfig[]>(() => {
    const r = seededRandom(42);
    return Array.from({ length: 6 }, () => randomAvatar(r));
  });

  const react = () => {
    setMood("happy");
    setTimeout(() => setMood("idle"), 700);
  };
  const set = (patch: Partial<AvatarConfig>) => {
    onChange({ ...value, ...patch });
    react();
  };
  const cycle = (key: Cyclable, dir: 1 | -1) => {
    const list = AVATAR_PARTS[key] as readonly string[];
    const i = list.indexOf(value[key]);
    set({ [key]: list[(i + dir + list.length) % list.length] });
  };

  return (
    <div className="grid gap-6 md:grid-cols-[220px_1fr]">
      <div className="flex flex-col items-center gap-3">
        <motion.div
          key={value.head + value.clothingColor}
          initial={{ scale: 0.92 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="rounded-full bg-white p-2 shadow-pop"
        >
          <Peep config={value} size={190} mood={mood} />
        </motion.div>
        <button
          type="button"
          onClick={() => set(randomAvatar())}
          className="cursor-pointer rounded-full bg-butter px-4 py-2 font-display text-sm font-semibold transition-transform hover:rotate-[-3deg] hover:scale-105"
        >
          🎲 Surprise me
        </button>
      </div>

      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {CYCLE.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between rounded-2xl border border-line bg-white px-2 py-1.5">
              <button
                type="button"
                aria-label={`Previous ${label}`}
                onClick={() => cycle(key, -1)}
                className="h-8 w-8 cursor-pointer rounded-full text-lg hover:bg-lilac"
              >
                ‹
              </button>
              <div className="text-center leading-tight">
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</div>
                <div className="text-sm font-semibold capitalize">{pretty(value[key])}</div>
              </div>
              <button
                type="button"
                aria-label={`Next ${label}`}
                onClick={() => cycle(key, 1)}
                className="h-8 w-8 cursor-pointer rounded-full text-lg hover:bg-lilac"
              >
                ›
              </button>
            </div>
          ))}
        </div>

        {SWATCH.map(({ key, label }) => (
          <div key={key}>
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">{label}</div>
            <div className="flex flex-wrap gap-2">
              {(AVATAR_PARTS[key] as readonly string[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`${label} #${c}`}
                  onClick={() => set({ [key]: c })}
                  className={`h-8 w-8 cursor-pointer rounded-full border-2 transition-transform hover:scale-110 ${
                    value[key] === c ? "scale-110 border-violet ring-4 ring-violet/20" : "border-white shadow-soft"
                  }`}
                  style={{ background: `#${c}` }}
                />
              ))}
            </div>
          </div>
        ))}

        {ideas.length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted">
              Or steal one of these looks
              <button
                type="button"
                onClick={() => setIdeas(Array.from({ length: 6 }, () => randomAvatar()))}
                className="cursor-pointer rounded-full bg-lilac/60 px-2 py-0.5 normal-case tracking-normal text-ink-soft hover:bg-lilac"
              >
                ↻ more
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {ideas.map((a) => (
                <button
                  key={a.seed}
                  type="button"
                  onClick={() => set(a)}
                  className="cursor-pointer rounded-full bg-white p-1 shadow-soft transition-transform hover:-translate-y-1"
                >
                  <Peep config={a} size={52} bob={false} ring={false} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
