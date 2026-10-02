"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { Peep } from "@/components/Peep";
import { Button, LinkButton } from "@/components/ui";
import type { IdeaStatus } from "@/db/schema";
import { DOT_AVATAR, type AvatarConfig } from "@/lib/avatar";
import type { Consequence, IdeaResult, Reflection, RunEvent, StageId } from "@/lib/types";
import { ConsequenceBoard } from "./ConsequenceBoard";
import { ThinkingView, type StageState } from "./ThinkingView";

export type IdeaData = {
  id: string;
  title: string;
  prompt: string;
  status: IdeaStatus;
  reflection: Reflection | null;
  consequences: Consequence[] | null;
  result: IdeaResult | null;
  chosenOptionId: string | null;
  error: string | null;
};

type View = "board" | "thinking" | "dashboard" | "error" | "stale";

function initialView(i: IdeaData): View {
  if (i.status === "done" && i.result) return "dashboard";
  if (i.status === "running") return "stale";
  if (i.reflection) return i.status === "error" ? "error" : "board";
  return "error";
}

export function IdeaFlow({ idea, avatar }: { idea: IdeaData; avatar: AvatarConfig }) {
  const router = useRouter();
  const [view, setView] = useState<View>(() => initialView(idea));
  const [result, setResult] = useState<IdeaResult | null>(idea.result);
  const [error, setError] = useState<string | null>(idea.error);
  const [stages, setStages] = useState<Record<StageId, StageState>>({} as Record<StageId, StageState>);
  const [logs, setLogs] = useState<{ stage: StageId; text: string }[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Opened while a run was still going (e.g. after a refresh): poll until it lands.
  useEffect(() => {
    if (view !== "stale") return;
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [view, router]);
  // When the background run lands, the refreshed props switch the view.
  const shown: View =
    view !== "stale" ? view : idea.status === "done" && idea.result ? "dashboard" : idea.status === "error" ? "error" : "stale";
  const shownResult = result ?? idea.result;
  const shownError = error ?? idea.error;

  const run = async (consequences: Consequence[]) => {
    setView("thinking");
    setStages({} as Record<StageId, StageState>);
    setLogs([]);
    setError(null);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await fetch(`/api/ideas/${idea.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consequences }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) throw new Error(await res.text());
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let finished = false;
      while (!finished) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const p of parts) {
          if (!p.startsWith("data: ")) continue;
          const e = JSON.parse(p.slice(6)) as RunEvent;
          if (e.type === "stage") setStages((s) => ({ ...s, [e.stage]: e.status === "start" ? "active" : "done" }));
          else if (e.type === "log") setLogs((l) => [...l, { stage: e.stage, text: e.text }]);
          else if (e.type === "result") {
            setResult(e.result);
            // Let the last stage tick before the big reveal.
            setTimeout(() => setView("dashboard"), 700);
            finished = true;
          } else if (e.type === "error") {
            setError(e.message);
            setView("error");
            finished = true;
          }
        }
      }
      if (!finished) throw new Error("The connection dropped. Your result may still be saving; refresh in a moment.");
      router.refresh();
    } catch (e) {
      if (ac.signal.aborted) return;
      setError((e as Error).message);
      setView("error");
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={shown}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.35 }}
      >
        {shown === "board" && idea.reflection && (
          <ConsequenceBoard
            prompt={idea.prompt}
            reflection={idea.reflection}
            initial={idea.consequences ?? idea.reflection.consequences}
            avatar={avatar}
            onGo={run}
          />
        )}
        {shown === "thinking" && <ThinkingView stages={stages} logs={logs} title={idea.title} />}
        {shown === "stale" && <ThinkingView stages={{} as Record<StageId, StageState>} logs={[]} title={idea.title} stale />}
        {shown === "dashboard" && shownResult && (
          <Dashboard
            ideaId={idea.id}
            title={idea.title}
            prompt={idea.prompt}
            result={shownResult}
            chosenOptionId={idea.chosenOptionId}
            avatar={avatar}
            onRerun={idea.reflection ? () => setView("board") : undefined}
          />
        )}
        {shown === "error" && (
          <div className="card mx-auto max-w-xl p-8 text-center">
            <Peep config={DOT_AVATAR} size={110} mood="worried" className="mx-auto" />
            <h1 className="mt-4 font-display text-2xl font-bold">Oops, my brain tripped over a wire.</h1>
            <p className="mt-2 break-words rounded-2xl bg-pink/60 px-4 py-3 text-sm">{shownError ?? "Unknown error"}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {idea.reflection && <Button onClick={() => setView("board")}>Try again</Button>}
              <LinkButton href="/settings" variant="soft">
                Check AI settings
              </LinkButton>
              <LinkButton href="/home" variant="ghost">
                Back home
              </LinkButton>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
