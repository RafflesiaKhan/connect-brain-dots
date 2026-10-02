"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { DOT_AVATAR, type AvatarConfig } from "@/lib/avatar";
import { Peep } from "../Peep";

const FRIENDS: AvatarConfig[] = [
  { seed: "a", head: "afro", face: "smileBig", accessories: "none", facialHair: "none", skinColor: "ae5d29", clothingColor: "ffcf77", headContrastColor: "2c1b18" },
  { seed: "b", head: "hijab", face: "cute", accessories: "glasses", facialHair: "none", skinColor: "edb98a", clothingColor: "78e185", headContrastColor: "f59797" },
  { seed: "c", head: "pomp", face: "cheeky", accessories: "none", facialHair: "goatee1", skinColor: "ffdbb4", clothingColor: "9ddadb", headContrastColor: "724133" },
];

const THOUGHTS = [
  { q: "Rice and meat curry for lunch?", a: "He doesn't like curry though 🙅" },
  { q: "Fry the meat instead?", a: "Fried isn't healthy... 🍳" },
  { q: "Which thesis method should I pick?", a: "3 papers, 5 opinions, 0 sleep 😵" },
  { q: "Should I switch jobs?", a: "But my team is great... 🤔" },
];

export function HeroPeeps() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % THOUGHTS.length), 3800);
    return () => clearInterval(t);
  }, []);
  const t = THOUGHTS[i];

  return (
    <div className="relative mx-auto h-[420px] w-full max-w-[460px]">
      {/* orbit of friends */}
      {FRIENDS.map((f, k) => (
        <motion.div
          key={f.seed}
          className="absolute"
          style={{ left: ["2%", "70%", "60%"][k], top: ["58%", "4%", "66%"][k] }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 + k * 0.15, type: "spring" }}
        >
          <Peep config={f} size={k === 1 ? 92 : 104} mood={k === i % 3 ? "talking" : "idle"} />
        </motion.div>
      ))}

      {/* Dot, the mascot */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 120 }}
      >
        <div className="rounded-full bg-white/70 p-3 shadow-pop">
          <Peep config={DOT_AVATAR} size={170} mood="thinking" ring={false} />
        </div>
        <p className="mt-2 text-center font-display text-sm font-semibold text-violet">Dot, your brain buddy</p>
      </motion.div>

      {/* thought bubbles */}
      <AnimatePresence mode="wait">
        <motion.div
          key={i}
          className="absolute left-0 top-2 max-w-[230px]"
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          <div className="rounded-2xl rounded-bl-sm bg-white px-4 py-2.5 text-sm font-semibold shadow-soft">{t.q}</div>
          <motion.div
            className="ml-6 mt-2 rounded-2xl rounded-tl-sm bg-pink px-4 py-2 text-sm shadow-soft"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            {t.a}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
