"use client";

import { AnimatePresence, motion } from "motion/react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui";
import { signInAction, signUpAction, type AuthFormState } from "./actions";

const input =
  "w-full rounded-full border border-line bg-white px-4 py-2.5 outline-none transition focus:border-violet focus:ring-4 focus:ring-violet/15";

export function AuthPanel({ initialMode = "signin" }: { initialMode?: "signin" | "signup" }) {
  const [mode, setMode] = useState(initialMode);
  const [signInState, signInFormAction, signingIn] = useActionState<AuthFormState, FormData>(signInAction, {});
  const [signUpState, signUpFormAction, signingUp] = useActionState<AuthFormState, FormData>(signUpAction, {});

  return (
    <div className="mt-6">
      <div className="mb-5 grid grid-cols-2 rounded-full bg-lilac/40 p-1" role="tablist">
        {(
          [
            ["signin", "Sign in"],
            ["signup", "Create account"],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`relative cursor-pointer rounded-full py-2 font-display text-sm font-semibold transition ${
              mode === m ? "text-ink" : "text-ink-soft hover:text-ink"
            }`}
          >
            {mode === m && <motion.span layoutId="auth-tab" className="absolute inset-0 rounded-full bg-white shadow-soft" />}
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {mode === "signin" ? (
          <motion.form
            key="signin"
            action={signInFormAction}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            className="space-y-3"
          >
            <input
              name="identifier"
              required
              autoComplete="username"
              placeholder="Username or email"
              defaultValue={signInState.values?.identifier}
              className={input}
            />
            <input name="password" type="password" required autoComplete="current-password" placeholder="Password" className={input} />
            <ErrorLine message={signInState.error} />
            <Button className="w-full py-3" disabled={signingIn}>
              {signingIn ? "Waking up your brain..." : "Sign in →"}
            </Button>
          </motion.form>
        ) : (
          <motion.form
            key="signup"
            action={signUpFormAction}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            className="space-y-3"
          >
            <input
              name="username"
              required
              autoComplete="username"
              placeholder="Pick a username"
              pattern="[A-Za-z0-9_.\-]{3,24}"
              title="3-24 characters: letters, numbers, dots, dashes or underscores"
              defaultValue={signUpState.values?.username}
              className={input}
            />
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              defaultValue={signUpState.values?.email}
              className={input}
            />
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Password (8+ characters)"
              className={input}
            />
            <ErrorLine message={signUpState.error} />
            <Button className="w-full py-3" disabled={signingUp}>
              {signingUp ? "Building your brain..." : "Create my account →"}
            </Button>
            <p className="text-center text-xs text-muted">
              Free to use. You&rsquo;ll plug in your own AI key (Claude, OpenAI, Grok, Gemini or Ollama), or try Demo mode first.
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

function ErrorLine({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-2xl bg-pink px-4 py-2 text-center text-sm font-semibold">
      {message}
    </p>
  );
}
