"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useState, useTransition } from "react";
import { saveAiSettings, testAiConnection } from "@/app/actions";
import { formatContext, PROVIDERS, providerInfo, TIERS, type ProviderId } from "@/lib/ai/catalog";
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
          <ModelPicker key={provider} provider={provider} model={model} onChange={setModel} />

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

function formatPrice(n: number) {
  return `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
}

/** Model cards sorted biggest to smallest, plus a free-text escape hatch for unlisted models. */
function ModelPicker({
  provider,
  model,
  onChange,
}: {
  provider: ProviderId;
  model: string;
  onChange: (id: string) => void;
}) {
  const info = providerInfo(provider);
  const name = useId();
  const listed = info.models.some((m) => m.id === model);
  const [custom, setCustom] = useState(!listed && model !== "");
  const models = [...info.models].sort((a, b) => TIERS[b.tier].rank - TIERS[a.tier].rank);

  return (
    <fieldset>
      <legend className="mb-1.5 block text-sm font-bold">
        Model <span className="font-normal text-muted">(sorted from biggest brain to lightest)</span>
      </legend>
      <div className="space-y-2" role="radiogroup">
        {models.map((m) => {
          const tier = TIERS[m.tier];
          const checked = !custom && model === m.id;
          return (
            <label
              key={m.id}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition ${
                checked ? "border-violet bg-lilac/40 ring-4 ring-violet/15" : "border-line bg-white hover:border-violet/50"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={m.id}
                checked={checked}
                onChange={() => {
                  setCustom(false);
                  onChange(m.id);
                }}
                className="mt-1 accent-violet"
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold">{m.label}</span>
                  {m.note && <span className="rounded-full bg-butter px-2 py-0.5 text-xs font-semibold">{m.note}</span>}
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  {tier.emoji} {tier.label}: {tier.hint.toLowerCase()}
                </span>
                <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-soft">
                  {m.context && <span>📚 {formatContext(m.context)} context</span>}
                  {m.price ? (
                    <span>
                      💸 {formatPrice(m.price[0])} in / {formatPrice(m.price[1])} out per 1M tokens
                    </span>
                  ) : (
                    provider === "ollama" && <span>💸 Free, runs on your hardware</span>
                  )}
                </span>
              </span>
              <TokenMeter rank={tier.rank} />
            </label>
          );
        })}

        <label
          className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition ${
            custom ? "border-violet bg-lilac/40 ring-4 ring-violet/15" : "border-dashed border-line bg-white hover:border-violet/50"
          }`}
        >
          <input
            type="radio"
            name={name}
            checked={custom}
            onChange={() => {
              setCustom(true);
              if (listed) onChange("");
            }}
            className="mt-1 accent-violet"
          />
          <span className="min-w-0 flex-1">
            <span className="font-semibold">Another model</span>
            <span className="mt-0.5 block text-xs text-muted">Type any model id your provider supports.</span>
            {custom && (
              <input
                className={`${input} mt-2`}
                value={model}
                onChange={(e) => onChange(e.target.value)}
                placeholder={info.defaultModel}
                autoFocus
              />
            )}
          </span>
        </label>
      </div>
      <p className="mt-1.5 text-xs text-muted">
        One analysis makes several calls (research, scoring, fact-checking), so bigger models cost noticeably more per run.
        Prices are the provider&rsquo;s list prices and may change.
      </p>
    </fieldset>
  );
}

/** Four dots: how many tokens (and dollars) this tier tends to burn. */
function TokenMeter({ rank }: { rank: number }) {
  return (
    <span className="mt-1 flex shrink-0 gap-0.5" title="Token appetite" aria-label={`Token appetite ${rank} of 4`}>
      {[1, 2, 3, 4].map((i) => (
        <span key={i} className={`h-2 w-2 rounded-full ${i <= rank ? "bg-violet" : "bg-line"}`} />
      ))}
    </span>
  );
}
