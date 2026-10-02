"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { saveAiSettings, testAiConnection } from "@/app/actions";
import { PROVIDERS, providerInfo, type ProviderId } from "@/lib/ai/catalog";
import type { AiSettingsView } from "@/lib/ai/providers";
import { Button } from "./ui";

const input =
  "w-full rounded-2xl border border-line bg-white px-4 py-2.5 outline-none transition focus:border-violet focus:ring-4 focus:ring-violet/15";
const SELECT_CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%237c5cff' stroke-width='2' fill='none'/%3E%3C/svg%3E")`;

export function AiSettingsForm({
  initial,
  onSaved,
  saveLabel = "Save AI settings",
}: {
  initial: AiSettingsView;
  onSaved?: () => void;
  saveLabel?: string;
}) {
  const [provider, setProvider] = useState<ProviderId>(initial.provider);
  const [model, setModel] = useState(initial.model);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [tavilyKey, setTavilyKey] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const info = providerInfo(provider);
  const sameProvider = provider === initial.provider;
  const storedKey = sameProvider ? initial.apiKeyMasked : null;
  const houseKey = initial.houseKeys[provider];

  const payload = () => ({
    provider,
    model: model || info.defaultModel,
    apiKey: apiKey || undefined,
    baseUrl: baseUrl || undefined,
    tavilyKey: tavilyKey || undefined,
  });

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          await saveAiSettings(payload());
          setApiKey("");
          setTavilyKey("");
          setStatus({ ok: true, message: "Saved! Your brain buddy is wired up. ✨" });
          onSaved?.();
        });
      }}
    >
      <label className="block">
        <span className="mb-1.5 block text-sm font-bold">AI provider</span>
        <select
          className={`${input} cursor-pointer appearance-none bg-[right_1rem_center] bg-no-repeat pr-10`}
          style={{ backgroundImage: SELECT_CHEVRON }}
          value={provider}
          onChange={(e) => {
            const p = e.target.value as ProviderId;
            setProvider(p);
            setModel(providerInfo(p).defaultModel);
            setStatus(null);
          }}
        >
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.emoji} {p.label}
            </option>
          ))}
        </select>
      </label>

      <AnimatePresence mode="wait">
        <motion.p
          key={provider}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="rounded-2xl bg-lilac/40 px-4 py-2.5 text-sm text-ink-soft"
        >
          <span className="mr-1" aria-hidden>
            {info.emoji}
          </span>
          {info.tagline}
          {info.nativeSearch ? " 🌐 Web search built in." : ""}
        </motion.p>
      </AnimatePresence>

      {provider !== "demo" && (
        <>
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold">Model</span>
            <input
              className={input}
              list={`models-${provider}`}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={info.defaultModel}
            />
            <datalist id={`models-${provider}`}>
              {info.models.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <span className="mt-1 block text-xs text-muted">Pick a suggestion or type any model id.</span>
          </label>

          {info.needsKey && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">API key</span>
              <input
                className={input}
                type="password"
                autoComplete="off"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  storedKey ? `Saved: ${storedKey} (leave blank to keep)` : houseKey ? "Optional: the app has a shared key" : "Paste your key"
                }
              />
              <span className="mt-1 block text-xs text-muted">
                Encrypted before it&rsquo;s stored.{" "}
                {info.keyUrl && (
                  <a href={info.keyUrl} target="_blank" rel="noreferrer" className="font-semibold text-violet underline">
                    Get a key
                  </a>
                )}
              </span>
            </label>
          )}

          {info.usesBaseUrl && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">Ollama URL</span>
              <input
                className={input}
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://localhost:11434/api"
              />
              <span className="mt-1 block text-xs text-muted">
                Must be reachable from the server running this app.
              </span>
            </label>
          )}

          <label className="block">
            <span className="mb-1.5 block text-sm font-bold">
              Tavily key{" "}
              <span className="font-normal text-muted">
                ({info.nativeSearch ? "optional: overrides built-in search" : "recommended: enables web research"})
              </span>
            </span>
            <input
              className={input}
              type="password"
              autoComplete="off"
              value={tavilyKey}
              onChange={(e) => setTavilyKey(e.target.value)}
              placeholder={
                initial.tavilyKeyMasked
                  ? `Saved: ${initial.tavilyKeyMasked}`
                  : initial.houseTavily
                    ? "Optional: the app has a shared key"
                    : "tvly-..."
              }
            />
            <span className="mt-1 block text-xs text-muted">
              Free tier at{" "}
              <a href="https://tavily.com" target="_blank" rel="noreferrer" className="font-semibold text-violet underline">
                tavily.com
              </a>
              .
            </span>
          </label>
        </>
      )}

      <AnimatePresence>
        {status && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`rounded-2xl px-4 py-2.5 text-sm font-semibold ${status.ok ? "bg-mint" : "bg-pink"}`}
            role="status"
          >
            {status.ok ? "✅ " : "⚠️ "}
            {status.message}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : saveLabel}
        </Button>
        {provider !== "demo" && (
          <Button
            type="button"
            variant="soft"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setStatus({ ok: true, message: "Knocking on the model's door..." });
                setStatus(await testAiConnection(payload()));
              })
            }
          >
            Test connection
          </Button>
        )}
      </div>
    </form>
  );
}
