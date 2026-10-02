<div align="center">

# 🧠✨ Connect Brain Dots

**Messy thoughts in. Clear decisions out.**

An open-source AI brain buddy that untangles your "but what if..." thoughts, researches the evidence,<br>
and draws you a complete, interactive map of your options before telling you which one fits you best.

[Watch the demo](#-watch-the-demo) · [See it in action](#-a-tour-of-the-app) · [Run it yourself](#-run-it-yourself) · [Deploy for free](DEPLOY.md)

</div>

---

## 😵‍💫 The problem: deciding is hard

I kept struggling with decisions, big and small.

Take something as simple as lunch. *"I'll cook rice and meat curry... but my husband doesn't like curry. So I'll fry the meat instead? But frying isn't healthy. Then what?"* Every single thought drags three more along with it: worries, constraints, other people's feelings, what you read somewhere once. Now scale that up to *"Should I do a PhD while AI is changing everything?"* and your head turns into a ball of yarn.

Most AI chatbots just hand you **one answer**. You can't see *why*, what it ignored, or whether it would still hold if your priorities were a little different.

**Connect Brain Dots does the opposite.** It lays out every dot your brain is juggling, connects them with real evidence, and lets you explore the whole picture before it gives its verdict.

## 🎬 Watch the demo

[![Watch the Connect Brain Dots demo on YouTube](https://img.youtube.com/vi/vob_3fqcFGg/hqdefault.jpg)](https://youtu.be/vob_3fqcFGg)

▶️ **[Watch the demo on YouTube](https://youtu.be/vob_3fqcFGg)**: from "Should I do a PhD while AI is doing everything?" to a full decision dashboard. (Prefer a file? [Download Demo.mp4](Demo.mp4).)

## ✨ What it does

1. **🧠 You dump the thought.** Type it exactly like it sounds in your head. Messy is welcome.
2. **🫧 Dot mirrors your side-thoughts.** Your avatar appears with every worry, constraint and goal connected to its brain. Pop the wrong ones and add the ones Dot missed.
3. **🔎 The agent does the legwork.** It breaks the idea into weighted criteria, searches the web for studies, facts and real people's experiences, brainstorms genuinely different options, scores them, and fact-checks itself.
4. **📊 You explore everything.** Constraints, consequences, comparisons, what-if sliders, the research report and the full reasoning, all interactive.
5. **🏆 Then the verdict.** The best fit for *you*, why it beats the runner-up, the promising alternatives, and your first steps.

It works for tiny decisions (lunch, weekend plans) and big ones (career moves, thesis methods, research trade-offs). It remembers your profile and past choices, so it gets more personal over time.

## 📸 A tour of the app

### 1. Get started
| | |
|:--:|:--:|
| ![Landing page](docs/screenshots/01-landing.png) | ![Sign up](docs/screenshots/02-sign-up.png) |
| **Landing page** with animated brain dots | **Sign up** with just a username, email and password |
| ![Avatar builder](docs/screenshots/03-avatar.png) | ![Profile chat](docs/screenshots/04-profile-chat.png) |
| **Build your avatar** (hand-drawn Open Peeps) | **Chat with Dot** so it learns what matters to you |
| ![AI provider](docs/screenshots/05-ai-provider.png) | ![Brain dump](docs/screenshots/06-brain-dump.png) |
| **Bring your own AI**: Claude, OpenAI, Grok, Gemini, Ollama or Demo mode | **Brain dump** your messy thought |

### 2. Untangle the thought
| | |
|:--:|:--:|
| ![Brain graph](docs/screenshots/07-brain-graph.png) | ![Thinking](docs/screenshots/08-thinking.png) |
| **Your brain graph**: every side-thought connected to you. Pop or add bubbles | **Dot at work**: research, scoring and fact-checking, live |

### 3. Explore the whole decision
The results page is a guided journey: the verdict waits at the end.

| | |
|:--:|:--:|
| ![Results intro](docs/screenshots/09-results-intro.png) | ![Overview](docs/screenshots/10-overview.png) |
| **The question** and how much was analysed | **Overview**: every option's fit %, win % and constraints met |
| ![Constraints](docs/screenshots/11-constraints.png) | ![Consequences](docs/screenshots/12-consequences.png) |
| **Your constraints**: which options meet or break each one | **Consequences**: "If you choose X..." tree plus a risk map |
| ![Compare](docs/screenshots/13-compare.png) | ![What-if](docs/screenshots/14-what-if.png) |
| **Compare**: scores, weights and where the points come from | **What-if sliders**: change your priorities, watch the ranking move |
| ![Research](docs/screenshots/15-research.png) | ![Reasoning](docs/screenshots/16-reasoning.png) |
| **Research report**: filterable evidence and cited sources | **Reasoning**: the decision path and blueprint diagram |
| ![Verdict](docs/screenshots/17-verdict.png) | ![Mobile](docs/screenshots/18-mobile.png) |
| **Verdict**: why #1 beats #2, alternatives and first steps | **Works on mobile** too |

## 🛡️ Why you can trust the answer

The AI never gets the final word on its own. A deterministic layer (`src/lib/scoring.ts`) sits between the model and the dashboard:

- **Every claim needs a receipt.** Scores must cite evidence or one of your considerations. Citations to things that don't exist are dropped, and uncited scores are flagged with a "?".
- **No fake research.** Evidence claiming to be research without a real source is downgraded to "weak".
- **Math, not vibes.** The ranking is calculated in code from weighted scores. The AI explains the ranking; it can't invent a different one.
- **It checks itself.** A separate critique pass audits the scores against the evidence and adjusts them, and you can see every change.
- **Honest confidence.** Confidence is capped by how much of the analysis is actually backed by sources.
- **You can stress-test it.** The what-if sliders and an 800-run simulation show whether the winner holds up when priorities shift.

`npm run test:agent` checks these guardrails against a scripted mock model, and CI runs it on every pull request.

## 🚀 Run it yourself

### Option A: Use your own free deployment
Follow **[DEPLOY.md](DEPLOY.md)** to put your own copy online with Neon (free Postgres) and Vercel (free hosting) in about 20 minutes. Anyone can then sign up and use it with their own AI key.

### Option B: Run it on your computer (about 5 minutes)
You need [Node.js 20.9+](https://nodejs.org) and [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
git clone https://github.com/RafflesiaKhan/connect-brain-dots.git
cd connect-brain-dots
npm install
docker compose up -d           # starts a local Postgres database
cp .env.example .env.local
```

Open `.env.local` and set a secret (run `openssl rand -base64 32` to make one):

```
AUTH_SECRET="paste-your-secret-here"
```

The database line already points at the Docker database. Then:

```bash
npm run db:push    # creates the tables
npm run dev        # http://localhost:3000
```

Open http://localhost:3000, click **Create account**, and choose **Demo mode** at the AI step to explore without a key.

### Getting an AI key
Each user brings their own key and picks a model in **Settings**. Keys are encrypted (AES-256-GCM) before they're stored and never sent back to the browser.

Every provider offers 3 to 4 models, sorted from 🧠 **Big brain** (deepest reasoning, most tokens) to 🐣 **Tiny** (fewest tokens, cheapest), with context size and price shown. You can also type any other model id your provider supports.

| Provider | Built-in web search | Get a key |
|---|:--:|---|
| Claude (Anthropic) | ✅ | [console.anthropic.com](https://console.anthropic.com/settings/keys) |
| OpenAI | ✅ | [platform.openai.com](https://platform.openai.com/api-keys) |
| Grok (xAI) | ✅ | [console.x.ai](https://console.x.ai) |
| Gemini (Google) | ✅ | [aistudio.google.com](https://aistudio.google.com/apikey) (has a free tier) |
| Ollama (local models) | via Tavily | runs on your own machine |
| Demo mode | sample data | no key needed |

For models without built-in search, add a free [Tavily](https://tavily.com) key in Settings to enable web research.

## ⚙️ Configuration

All settings live in `.env.local` (locally) or your host's environment variables. See [`.env.example`](.env.example) for the full list.

| Variable | Required | What it does |
|---|:--:|---|
| `DATABASE_URL` | ✅ | Postgres connection string (Docker locally, Neon online) |
| `AUTH_SECRET` | ✅ | Signs login sessions and encrypts saved API keys. Never change it after launch |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | | Adds a "Continue with Google" button |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | | Adds a "Continue with GitHub" button |
| `TAVILY_API_KEY` | | Shared web search for all users |
| `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, ... | | Shared "house" AI keys. **Leave empty on public sites**, or every visitor spends your credits |
| `OLLAMA_BASE_URL` | | Default Ollama server address |
| `OLLAMA_ALLOW_CUSTOM_URL` | | Let users enter their own Ollama URL in production (off by default for security) |

## 🧩 How it's built

| Area | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling and motion | Tailwind CSS 4, Motion |
| Graphs and charts | React Flow, Recharts |
| Avatars | [Open Peeps](https://www.openpeeps.com/) by Pablo Stanley, rendered with DiceBear |
| AI | Vercel AI SDK: Claude, OpenAI, Grok, Gemini, Ollama |
| Research | Provider web search or Tavily |
| Database | Postgres via Drizzle ORM |
| Auth | Auth.js: username or email with password (scrypt hashed), optional Google/GitHub |

### The agent pipeline

```
 your thought ─▶ reflect ─▶ you edit the side-thoughts
                                  │
   ┌──────────────────────────────┘
   ▼
 1. untangle   goal + weighted criteria, personalised to your profile
 2. research   web search: studies, facts, people's experiences
 3. options    3-5 genuinely different paths, each criterion scored with citations
 4. critique   a skeptical reviewer pass adjusts weak scores
 5. connect    verdict, alternatives, first steps
                                  │
                                  ▼
          deterministic guardrails (scoring.ts) ─▶ interactive dashboard
```

### Project map

```
src/
  app/
    page.tsx                   landing page
    login/                     sign up / sign in
    onboarding/                avatar builder, profile chat, AI setup
    home/                      brain dump + idea library
    ideas/[id]/                brain graph, live thinking view, results
    settings/                  AI provider + profile
    api/ideas/...              create + reflect, run (streams progress), choose
  components/
    dashboard/                 Overview, Consequences, Validate, Research, charts, graphs
    Peep.tsx                   animated avatar
    BrainDots.tsx              animated background
  lib/
    ai/agent.ts                the 5-stage pipeline
    ai/providers.ts            provider, model and key handling
    scoring.ts                 guardrails between the AI and the UI
    analysis.ts                what-if, simulations, coverage (runs in the browser)
  db/schema.ts                 database tables
```

### Useful commands

```bash
npm run dev          # start the app locally
npm run typecheck    # TypeScript checks
npm run lint         # ESLint
npm run test:agent   # agent guardrail tests (no API key needed)
npm run build        # production build
npm run db:push      # create or update database tables
```

## 🤝 Contributing

Contributions are very welcome, from typo fixes to new chart types.

1. Fork the repo and create a branch.
2. Make your change, then run `npm run typecheck && npm run lint && npm run test:agent`.
3. Open a pull request. CI runs the same checks plus a production build.

Ideas and bug reports are welcome as GitHub issues too.

## 🗺️ Roadmap

- [ ] Share a results dashboard with a link
- [ ] Compare a re-run with the previous result side by side
- [ ] Upload your own papers and notes as private evidence
- [ ] Learn your real priorities from the choices you make
- [ ] Password reset by email
- [ ] Mobile app and voice: talk your idea through with Dot

## 🔒 Privacy

- Your API keys are encrypted at rest and only used on the server to call your chosen provider.
- Your ideas and profile are stored in your own database (the one you deploy), and never shared with anyone else.
- The AI provider you choose receives your idea and profile details to do the analysis. Check their data policy.
- Important life, health, legal or financial decisions deserve a professional too. Connect Brain Dots helps you think; it doesn't replace expert advice.

## 📄 License

[Apache License 2.0](LICENSE). Avatars: [Open Peeps](https://www.openpeeps.com/) by Pablo Stanley (CC0).

<div align="center">

Made with 💜 for everyone who has ever overthought lunch.

</div>
