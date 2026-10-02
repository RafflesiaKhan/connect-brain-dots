"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { saveProfile } from "@/app/actions";
import { AiSettingsForm } from "@/components/AiSettingsForm";
import { AvatarPicker } from "@/components/AvatarPicker";
import { Peep } from "@/components/Peep";
import { Button } from "@/components/ui";
import type { AiSettingsView } from "@/lib/ai/providers";
import { DEFAULT_AVATAR, DOT_AVATAR, type AvatarConfig } from "@/lib/avatar";
import { ANSWER_MAX, questionsFor, type ProfileAnswers } from "@/lib/profile";

type Step = "avatar" | "basics" | "chat" | "ai" | "done";
const ORDER: Step[] = ["avatar", "basics", "chat", "ai", "done"];

export function Wizard(props: {
  initialName: string;
  initialAvatar: AvatarConfig | null;
  initialType: "personal" | "research";
  initialAnswers: ProfileAnswers;
  ai: AiSettingsView;
  editing: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("avatar");
  const [avatar, setAvatar] = useState<AvatarConfig>(props.initialAvatar ?? DEFAULT_AVATAR);
  const [name, setName] = useState(props.initialName);
  const [type, setType] = useState(props.initialType);
  const [answers, setAnswers] = useState<ProfileAnswers>(props.initialAnswers);
  const [pending, start] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const idx = ORDER.indexOf(step);

  const save = (next: Step) =>
    start(async () => {
      setSaveError(null);
      try {
        const res = await saveProfile({ displayName: name.trim() || "Friend", avatar, profileType: type, answers });
        if (res.ok) setStep(next);
        else setSaveError(res.message);
      } catch {
        setSaveError("Couldn't save your profile. Check the terminal running npm run dev, then try again.");
      }
    });

  return (
    <div className="mt-6">
      {/* progress dots */}
      <div className="mb-6 flex items-center justify-center gap-2" aria-label={`Step ${idx + 1} of ${ORDER.length}`}>
        {ORDER.map((s, i) => (
          <motion.span
            key={s}
            className="block h-2.5 rounded-full"
            animate={{ width: i === idx ? 32 : 10, backgroundColor: i <= idx ? "#7c5cff" : "#e4dbff" }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ type: "spring", stiffness: 160, damping: 22 }}
          className="card p-6 sm:p-8"
        >
          {step === "avatar" && (
            <>
              <DotSays>
                {props.editing ? "Fancy a makeover? " : "Hi! I'm Dot, your brain buddy. "}
                First things first: who are <em>you</em>? Build your avatar.
              </DotSays>
              <AvatarPicker value={avatar} onChange={setAvatar} />
              <Nav onNext={() => setStep("basics")} />
            </>
          )}

          {step === "basics" && (
            <>
              <DotSays>Looking sharp! What should I call you, and what kind of thinking will we do together?</DotSays>
              <div className="flex items-center gap-4">
                <Peep config={avatar} size={72} mood="happy" />
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-2xl border border-line bg-white px-4 py-3 font-display text-xl outline-none focus:border-violet focus:ring-4 focus:ring-violet/15"
                />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["personal", "🏡", "Personal", "Everyday life: food, family, money, plans, big life moves."],
                    ["research", "🔬", "Research & work", "Professional problems with many parameters, papers and trade-offs."],
                  ] as const
                ).map(([id, emoji, title, text]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setType(id)}
                    className={`cursor-pointer rounded-3xl border-2 p-5 text-left transition-all hover:-translate-y-0.5 ${
                      type === id ? "border-violet bg-lilac/40 shadow-pop" : "border-line bg-white"
                    }`}
                  >
                    <div className="text-3xl" aria-hidden>
                      {emoji}
                    </div>
                    <div className="mt-2 font-display text-lg font-semibold">{title}</div>
                    <p className="text-sm text-ink-soft">{text}</p>
                  </button>
                ))}
              </div>
              <Nav onBack={() => setStep("avatar")} onNext={() => setStep("chat")} nextDisabled={!name.trim()} />
            </>
          )}

          {step === "chat" && (
            <ProfileChat
              name={name}
              avatar={avatar}
              type={type}
              answers={answers}
              setAnswers={setAnswers}
              onBack={() => setStep("basics")}
              onDone={() => save("ai")}
              pending={pending}
              saveError={saveError}
            />
          )}

          {step === "ai" && (
            <>
              <DotSays>
                Now pick my brain! Choose which AI powers me. No key yet? <strong>Demo mode</strong> works right away, and you
                can switch anytime in Settings.
              </DotSays>
              <AiSettingsForm initial={props.ai} saveLabel="Save & continue" onSaved={() => setStep("done")} />
              <div className="mt-4">
                <button type="button" onClick={() => setStep("chat")} className="cursor-pointer text-sm font-semibold text-muted hover:text-ink">
                  ← Back
                </button>
              </div>
            </>
          )}

          {step === "done" && <Done avatar={avatar} name={name} onGo={() => router.push("/home")} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function DotSays({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <Peep config={DOT_AVATAR} size={64} mood="talking" />
      <motion.p
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-3xl rounded-tl-md bg-lilac/50 px-5 py-3 text-[15px] leading-relaxed"
      >
        {children}
      </motion.p>
    </div>
  );
}

function Nav({ onBack, onNext, nextDisabled }: { onBack?: () => void; onNext: () => void; nextDisabled?: boolean }) {
  return (
    <div className="mt-8 flex items-center justify-between">
      {onBack ? (
        <button type="button" onClick={onBack} className="cursor-pointer text-sm font-semibold text-muted hover:text-ink">
          ← Back
        </button>
      ) : (
        <span />
      )}
      <Button onClick={onNext} disabled={nextDisabled}>
        Next →
      </Button>
    </div>
  );
}

/* ─── The personality interview, as a chat ───────────────────────────────── */

type Msg = { from: "dot" | "me"; text: string };

function ProfileChat({
  name,
  avatar,
  type,
  answers,
  setAnswers,
  onBack,
  onDone,
  pending,
  saveError,
}: {
  name: string;
  avatar: AvatarConfig;
  type: "personal" | "research";
  answers: ProfileAnswers;
  setAnswers: (a: ProfileAnswers) => void;
  onBack: () => void;
  onDone: () => void;
  pending: boolean;
  saveError: string | null;
}) {
  const qs = questionsFor(type);
  const [i, setI] = useState(0);
  const [log, setLog] = useState<Msg[]>(() => [{ from: "dot", text: qs[0].ask.replace("{name}", name || "friend") }]);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState<string | string[]>(() => answers[qs[0].id] ?? (qs[0].kind === "multi" ? [] : ""));
  const bottom = useRef<HTMLDivElement>(null);
  const q = qs[i];
  const finished = i >= qs.length;

  useEffect(() => {
    // Block body on purpose: newer browsers return a Promise from scrollIntoView,
    // and React treats any value returned from an effect as its cleanup.
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [log, typing]);

  const answer = (value: string | string[]) => {
    const shown = Array.isArray(value) ? value.join(", ") : value;
    const next = { ...answers, [q.id]: value };
    setAnswers(next);
    setLog((l) => [...l, { from: "me", text: shown || "(skipped)" }]);
    setTyping(true);
    const ni = i + 1;
    setTimeout(() => {
      const nq = qs[ni];
      setLog((l) => [
        ...l,
        ...(q.reply && shown ? [{ from: "dot" as const, text: q.reply }] : []),
        nq
          ? { from: "dot" as const, text: nq.ask.replace("{name}", name) }
          : { from: "dot" as const, text: `That's everything, ${name}! I've built your thinking profile. 🎉` },
      ]);
      setTyping(false);
      setI(ni);
      if (nq) setDraft(next[nq.id] ?? (nq.kind === "multi" ? [] : ""));
    }, 700);
  };

  return (
    <div>
      <div className="max-h-[46vh] min-h-[260px] space-y-3 overflow-y-auto pr-1">
        {log.map((m, k) => (
          <motion.div
            key={k}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-end gap-2 ${m.from === "me" ? "justify-end" : ""}`}
          >
            {m.from === "dot" && <Peep config={DOT_AVATAR} size={36} bob={false} ring={false} />}
            <p
              className={`max-w-[80%] rounded-3xl px-4 py-2.5 text-[15px] ${
                m.from === "dot" ? "rounded-bl-md bg-lilac/50" : "rounded-br-md bg-violet text-white"
              }`}
            >
              {m.text}
            </p>
            {m.from === "me" && <Peep config={avatar} size={36} bob={false} ring={false} />}
          </motion.div>
        ))}
        {typing && (
          <div className="flex items-center gap-2">
            <Peep config={DOT_AVATAR} size={36} mood="thinking" bob={false} ring={false} />
            <span className="text-sm text-muted">Dot is typing...</span>
          </div>
        )}
        <div ref={bottom} />
      </div>

      <div className="mt-5 border-t border-line pt-5">
        {!finished && !typing && (
          <motion.div key={q.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {q.kind === "text" ? (
              <form
                className="flex items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  answer(String(draft).trim());
                }}
              >
                <div className="min-w-0 flex-1">
                  <textarea
                    autoFocus
                    rows={2}
                    maxLength={ANSWER_MAX}
                    value={String(draft)}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      // Enter sends, Shift+Enter adds a new line.
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        answer(String(draft).trim());
                      }
                    }}
                    placeholder={q.placeholder}
                    className="block max-h-48 min-h-[3rem] w-full resize-y rounded-3xl border border-line bg-white px-4 py-2.5 outline-none focus:border-violet"
                  />
                  <div className="mt-1 flex justify-between px-2 text-[11px] text-muted">
                    <span>Enter to send · Shift+Enter for a new line</span>
                    <span className={String(draft).length > ANSWER_MAX * 0.9 ? "font-bold text-[#c23b3b]" : ""}>
                      {String(draft).length}/{ANSWER_MAX}
                    </span>
                  </div>
                </div>
                <Button type="submit" className="mb-6">
                  Send
                </Button>
              </form>
            ) : (
              <div className="flex flex-wrap gap-2">
                {q.options!.map((o) => {
                  const on = q.kind === "multi" ? (draft as string[]).includes(o) : draft === o;
                  return (
                    <button
                      key={o}
                      type="button"
                      onClick={() => {
                        if (q.kind === "choice") return answer(o);
                        const cur = draft as string[];
                        setDraft(on ? cur.filter((x) => x !== o) : [...cur, o]);
                      }}
                      className={`cursor-pointer rounded-full border-2 px-4 py-2 text-sm font-semibold transition-all hover:-translate-y-0.5 ${
                        on ? "border-violet bg-violet text-white" : "border-line bg-white"
                      }`}
                    >
                      {o}
                    </button>
                  );
                })}
                {q.kind === "multi" && (
                  <Button className="ml-auto" onClick={() => answer(draft as string[])}>
                    Done ✓
                  </Button>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => answer(q.kind === "multi" ? [] : "")}
              className="mt-3 cursor-pointer text-xs font-semibold text-muted hover:text-ink"
            >
              Skip this one
            </button>
          </motion.div>
        )}
        <div className="mt-4 flex items-center justify-between">
          <button type="button" onClick={onBack} className="cursor-pointer text-sm font-semibold text-muted hover:text-ink">
            ← Back
          </button>
          {finished && saveError && (
            <p role="alert" className="mx-3 flex-1 rounded-2xl bg-pink px-3 py-2 text-sm font-semibold">
              ⚠️ {saveError}
            </p>
          )}
          {finished && (
            <Button onClick={onDone} disabled={pending}>
              {pending ? "Saving your brain..." : "Save profile →"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Done({ avatar, name, onGo }: { avatar: AvatarConfig; name: string; onGo: () => void }) {
  return (
    <div className="relative py-6 text-center">
      {Array.from({ length: 18 }).map((_, k) => (
        <motion.span
          key={k}
          className="absolute left-1/2 top-1/3 block h-3 w-3 rounded-full"
          style={{ background: ["#7c5cff", "#ff9a76", "#2cc3a5", "#ffc93c", "#ff7eb6"][k % 5] }}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{ x: Math.cos((k / 18) * Math.PI * 2) * 180, y: Math.sin((k / 18) * Math.PI * 2) * 120, opacity: 0 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
      ))}
      <div className="flex items-end justify-center gap-2">
        <Peep config={avatar} size={130} mood="happy" />
        <Peep config={DOT_AVATAR} size={110} mood="talking" />
      </div>
      <h2 className="mt-4 font-display text-3xl font-bold">You&rsquo;re all set, {name}!</h2>
      <p className="mx-auto mt-2 max-w-md text-ink-soft">
        Tell me any thought, however tiny or tangled, and I&rsquo;ll connect the dots.
      </p>
      <Button className="mt-6 px-8 py-3.5 text-base" onClick={onGo}>
        Start thinking →
      </Button>
    </div>
  );
}
