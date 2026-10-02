"use client";

import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { avatarSvg, type AvatarConfig, type Mood } from "@/lib/avatar";

/**
 * Animated Open Peeps avatar: gentle bobbing, random blinks, and a face that
 * changes with `mood` (thinking, talking, surprised...).
 */
export function Peep({
  config,
  mood = "idle",
  size = 120,
  bob = true,
  ring = true,
  className = "",
}: {
  config: AvatarConfig;
  mood?: Mood;
  size?: number;
  bob?: boolean;
  ring?: boolean;
  className?: string;
}) {
  const [blink, setBlink] = useState(false);
  const [talkFrame, setTalkFrame] = useState(false);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 140);
        loop();
      }, 2500 + Math.random() * 3500);
    };
    loop();
    return () => clearTimeout(t);
  }, []);

  // While talking, alternate between two mouth shapes.
  useEffect(() => {
    if (mood !== "talking") return;
    const i = setInterval(() => setTalkFrame((f) => !f), 220);
    return () => clearInterval(i);
  }, [mood]);

  const effective: Mood = blink && mood !== "surprised" ? "blink" : mood === "talking" && talkFrame ? "happy" : mood;
  const svg = useMemo(() => avatarSvg(config, effective), [config, effective]);

  return (
    <motion.div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
      animate={
        bob
          ? mood === "thinking"
            ? { y: [0, -4, 0], rotate: [0, -3, 0, 3, 0] }
            : { y: [0, -5, 0] }
          : undefined
      }
      transition={{ duration: mood === "thinking" ? 1.6 : 3, repeat: Infinity, ease: "easeInOut" }}
    >
      {ring && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 50% 60%, #${config.clothingColor}55, transparent 70%)`,
          }}
        />
      )}
      {/* SVG is generated locally by DiceBear from a fixed whitelist of parts. */}
      <div className="peep relative h-full w-full" dangerouslySetInnerHTML={{ __html: svg }} />
      {mood === "thinking" && <ThinkingBubbles size={size} />}
    </motion.div>
  );
}

function ThinkingBubbles({ size }: { size: number }) {
  const s = Math.max(6, size / 16);
  return (
    <div className="absolute -top-1 right-0 flex gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block rounded-full bg-violet"
          style={{ width: s, height: s }}
          animate={{ y: [0, -6, 0], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </div>
  );
}
