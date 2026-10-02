# Connect Brain Dots 🧠✨

Turn messy thoughts into clear, evidence-backed decisions.

You type a thought the way it sounds in your head ("rice and curry for lunch? but he hates curry... frying is unhealthy..."). **Dot**, your brain buddy, then:

1. **Reflects** back the side-thoughts you're juggling (constraints, worries, preferences, goals, unknowns). You keep, pop or add them.
2. **Untangles** the idea into a goal and weighted criteria, personalized to your profile and past decisions.
3. **Researches** the web for studies, facts and real people's experiences (forums, blogs, papers).
4. **Brainstorms** 3 to 5 genuinely different options and scores each criterion, citing evidence.
5. **Fact-checks** itself: a critique pass adjusts scores that contradict the evidence.
6. **Connects the dots** into a dashboard: verdict, idea graph, blueprint diagram, scoreboard, radar, effort-vs-risk, decision matrix, evidence board, alternatives, watch-outs and first steps.

Light, playful pastel UI with animated [Open Peeps](https://www.openpeeps.com/) avatars (rendered with DiceBear) that blink, bob and change expression while the agent thinks.

![Dashboard](docs/screenshots/dashboard.png)

| | |
|---|---|
| ![Landing](docs/screenshots/landing.png) | ![Considerations](docs/screenshots/considerations.png) |
| ![Idea map](docs/screenshots/idea-map.png) | ![Charts](docs/screenshots/charts.png) |

## Tech

| Area | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| Styling / motion | Tailwind CSS 4, Motion (Framer Motion) |
| Graphs / charts | React Flow (`@xyflow/react`), Recharts |
| AI | Vercel AI SDK v7: Claude, OpenAI, Grok (xAI), Gemini, Ollama, plus a no-key Demo mode |
| Research | Provider built-in web search, or Tavily for any model |
| Database | Postgres (Neon free tier) via Drizzle ORM |
| Auth | Auth.js v5: username/email + password (scrypt), optional Google/GitHub buttons |

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill it in (see below)
npm run db:push              # create tables
npm run dev                  # http://localhost:3000
```

### Quick local run (about 5 minutes)

Needs Node 20.9+ and Docker.

```bash
git clone https://github.com/RafflesiaKhan/connect-brain-dots.git
cd connect-brain-dots
git checkout mycwork/epic-ptolemy-yjygi8
npm install
docker compose up -d          # local Postgres on port 5432
cp .env.example .env.local
```

Edit `.env.local` so it contains at least:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cbd"
AUTH_SECRET="<output of: npx auth secret>"
```

Then:

```bash
npm run db:push
npm run dev
```

Open http://localhost:3000, click **Create account** (username, email, password), and pick **Demo mode** at the AI step. Add a real key later in Settings.

### 1. Database (Neon, free)

1. Create a project at [neon.tech](https://neon.tech).
2. Copy the **pooled** connection string into `DATABASE_URL`.
3. Run `npm run db:push`.

Any Postgres works (local Docker too). Migrations are generated into `drizzle/` with `npm run db:generate`.

### 2. Auth

- `AUTH_SECRET`: run `npx auth secret`.
- Sign-up is username + email + password, nothing else to configure. Passwords are hashed with scrypt; logins are rate limited per IP and account.
- There is no "forgot password" email yet (that needs an email service).
- Optional extra buttons: Google (`AUTH_GOOGLE_ID/SECRET`, redirect URI `https://YOUR-APP/api/auth/callback/google`) and GitHub (`AUTH_GITHUB_ID/SECRET`).

### 3. AI

Each user picks their provider, model and key in **Settings** (keys are AES-256-GCM encrypted with `ENCRYPTION_KEY` or `AUTH_SECRET`). You can also set "house" keys in env (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `XAI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`) used when a user hasn't added their own. **On a public deployment leave them empty**, or every visitor spends your credits.

- **Demo mode** needs no key and plays a sample analysis, so the whole UI can be explored.
- **Ollama**: set the server URL (default `http://localhost:11434/api`). It must be reachable from the Next.js server. In production, per-user URLs are ignored unless `OLLAMA_ALLOW_CUSTOM_URL=true` (otherwise `OLLAMA_BASE_URL` is used), because a user-supplied URL lets the server be pointed at internal addresses.
- **Web research**: Claude, OpenAI, Grok and Gemini use their built-in search. For Ollama (or to override), add a [Tavily](https://tavily.com) key (`TAVILY_API_KEY` or per user). Without either, the agent uses model knowledge and says so.

## How the agent avoids nonsense

The model never gets the final word on its own. `src/lib/scoring.ts` sits between the model and the dashboard:

- Structured output for every step (Zod schemas in `src/lib/ai/schemas.ts`), with one retry on malformed JSON.
- Every option gets exactly one score per criterion; missing scores become a neutral 5 and are flagged.
- Citations are filtered to evidence and consideration ids that actually exist. A score that cites nothing is marked "unsupported" in the matrix.
- Evidence claiming to be research but lacking a real source is downgraded to "weak".
- Ranking is computed in code from the weighted scores; the final write-up must explain that ranking, not invent a new one.
- Confidence is capped by how much of the analysis is backed by citations and sources.

`npm run test:agent` runs the whole pipeline against a scripted mock model and checks these guardrails.

GitHub Actions (`.github/workflows/ci.yml`) runs typecheck, lint, these agent tests and a production build on every pull request and every push to `main`.

## Project map

```
src/
  app/
    page.tsx                 landing
    login/                   sign-in
    onboarding/Wizard.tsx    avatar builder, profile chat, AI setup
    home/                    brain dump + idea library
    ideas/[id]/              consideration board, live thinking view, dashboard
    settings/                AI provider + profile
    api/ideas/…              create+reflect, run (Server-Sent Events), choose/delete
    actions.ts               server actions (profile, AI settings, connection test)
  components/
    dashboard/               IdeaMap, Blueprint, Charts, Matrix, Details
    Peep.tsx                 animated Open Peeps avatar
    BrainDots.tsx            animated canvas background
  lib/
    ai/agent.ts              the 5-stage pipeline
    ai/providers.ts          provider/model/key resolution
    ai/demo.ts               demo-mode run
    scoring.ts               deterministic guardrails
  db/schema.ts               Drizzle schema (Auth.js tables + profile, ai_settings, idea)
```

## Deploying

Step-by-step guide: **[DEPLOY.md](DEPLOY.md)** (Neon + Vercel, free).

The analysis endpoint streams for up to 300 s (`maxDuration`). If your Vercel plan allows less, long research runs can be cut off; faster models avoid that.

## Roadmap

- **Phase 2**: share a dashboard by link, compare re-runs side by side, richer memory (learn criteria weights from past choices), upload documents/papers as private evidence.
- **Phase 3**: mobile app and voice ("call Dot"), reusing the same JSON + SSE API.

Avatars: Open Peeps by Pablo Stanley, CC0.
