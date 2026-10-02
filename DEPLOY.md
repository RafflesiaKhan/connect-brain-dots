# Deploying Connect Brain Dots (free)

Goal: a public link where anyone can create an account (username, email, password), add **their own** AI key, and start using the app. Your cost: $0 for hosting and database on the free tiers.

You need: a GitHub account (you have one), about 20 minutes.

---

## Step 1. Create the database on Neon

1. Go to [neon.tech](https://neon.tech) and sign up (you can use "Sign in with GitHub").
2. Create a project. Name: `connect-brain-dots`. Pick the region closest to you.
3. On the project dashboard, click **Connect**. Make sure **Connection pooling** is ON and copy the connection string. It looks like:
   ```
   postgresql://neondb_owner:xxxx@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require
   ```
4. Create the tables from your Mac (one time). In the project folder:
   ```bash
   DATABASE_URL="paste-the-neon-string-here" npm run db:push
   ```
   It should finish with **Changes applied**. A brand new database has no rows, so it won't ask any questions.

## Step 2. Make a secret key

In the project folder run:
```bash
openssl rand -base64 32
```
Copy the long random string it prints. This signs login sessions and encrypts users' API keys. Keep it private and never change it after launch (changing it logs everyone out and makes saved API keys unreadable).

## Step 3. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and **Continue with GitHub**. Choose the free **Hobby** plan.
2. Click **Add New → Project**, find `connect-brain-dots`, click **Import**.
3. Framework preset: **Next.js** (detected automatically). Leave build settings as they are.
4. Open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the Neon string from Step 1 |
   | `AUTH_SECRET` | the string from Step 2 |

   That's all that's required. Do **not** add `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` or other AI keys: on a public site everyone would use your credits. Users bring their own.
5. Click **Deploy**. After a minute or two you get a link like `https://connect-brain-dots.vercel.app`.

> Which branch? Vercel deploys your default branch (`main`). Merge the pull request first, or in Vercel go to **Settings → Git** and set the production branch.

## Step 4. Try it

1. Open your link, click **Meet your brain buddy → Create account**.
2. Build your avatar, answer Dot's questions, then pick an AI provider and paste a key (or choose **Demo mode** to look around first).
3. Type a thought and watch the dots connect.

Every `git push` to the production branch redeploys automatically.

---

## What your users need

- **An AI key** from one provider: Claude ([console.anthropic.com](https://console.anthropic.com/settings/keys)), OpenAI, Grok ([console.x.ai](https://console.x.ai)) or Gemini ([aistudio.google.com](https://aistudio.google.com/apikey), has a free tier). Keys are encrypted before they're stored and never sent back to the browser.
- **Optional:** a free [Tavily](https://tavily.com) key for web research when using a model without built-in search.
- **Ollama** works only if their Ollama server is reachable from the internet; a laptop at home isn't. In production the app ignores per-user Ollama URLs unless you set `OLLAMA_ALLOW_CUSTOM_URL=true`, because a user-typed URL lets the server be pointed at internal addresses.

## Good to know

- **Free plan limits.** Check Vercel's current Hobby limits for function duration. A deep research run can take a few minutes; if runs get cut off, faster models (e.g. Claude Sonnet, GPT mini models, Gemini Flash) finish sooner.
- **Hobby is for non-commercial use**, which matches a free community app. If you ever charge money, move to Vercel Pro.
- **No password reset email yet.** Adding one needs an email service (e.g. Resend with your own domain). Ask and we can add it.
- **Optional Google button.** Add `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` env vars (from Google Cloud Console → Credentials → OAuth client, redirect URI `https://YOUR-APP.vercel.app/api/auth/callback/google`) and a "Continue with Google" button appears on the login page.

## Updating the database later

When a future change adds columns, run the same command against Neon:
```bash
DATABASE_URL="your-neon-string" npm run db:push
```
If it asks whether to **truncate** (empty) a table, always choose the option that does **not** truncate. New columns start empty, so nothing is lost.
