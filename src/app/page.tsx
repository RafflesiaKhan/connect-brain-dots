import { auth } from "@/auth";
import { BrainDots } from "@/components/BrainDots";
import { HeroPeeps } from "@/components/landing/HeroPeeps";
import { LinkButton, Logo } from "@/components/ui";

const STEPS = [
  { emoji: "🧠", title: "Dump the thought", text: "\"Rice and curry for lunch? But he hates curry... fry it? Not healthy...\" Just type it like you think it." },
  { emoji: "🫧", title: "See your side-thoughts", text: "Dot mirrors back the worries and constraints you're juggling. Keep, pop, or add more." },
  { emoji: "🔎", title: "Agent does the legwork", text: "It researches the web, real people's experiences and studies, using your profile and past choices." },
  { emoji: "📊", title: "Get the full map", text: "Idea graph, decision matrix, charts, a winner, smart alternatives, and every claim cited." },
];

export default async function Landing() {
  const session = await auth();
  const signedIn = !!session?.user;
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <BrainDots />
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center px-4 py-5 sm:px-6">
        <Logo />
        <div className="ml-auto">
          <LinkButton href={signedIn ? "/home" : "/login"} variant="soft">
            {signedIn ? "My ideas" : "Sign in"}
          </LinkButton>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6">
        <section className="grid items-center gap-10 py-10 md:grid-cols-[1.1fr_1fr] md:py-16">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-sm font-semibold text-violet shadow-soft">
              <span className="h-2 w-2 animate-pulse rounded-full bg-violet" /> Your thoughtful (and slightly funny) AI brain buddy
            </p>
            <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-ink sm:text-6xl">
              Messy thoughts in.
              <br />
              <span className="scribble-underline text-violet">Clear decisions</span> out.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-soft">
              From &ldquo;what&rsquo;s for lunch?&rdquo; to a gnarly research problem: Connect Brain Dots untangles every
              &ldquo;but what if...&rdquo;, researches the evidence, and draws you a complete map with the best path and
              solid alternatives.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href={signedIn ? "/home" : "/login"} className="px-7 py-3.5 text-base">
                {signedIn ? "Connect some dots" : "Meet your brain buddy"} →
              </LinkButton>
              <a href="#how" className="inline-flex items-center px-4 font-semibold text-ink-soft hover:text-ink">
                How it works
              </a>
            </div>
          </div>
          <HeroPeeps />
        </section>

        <section id="how" className="pb-20">
          <h2 className="mb-8 text-center font-display text-3xl font-bold">How the dots get connected</h2>
          <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="card relative p-6 transition-transform duration-300 hover:-translate-y-1">
                <span className="absolute right-5 top-4 font-display text-4xl font-bold text-lilac">{i + 1}</span>
                <div className="mb-3 text-3xl" aria-hidden>
                  {s.emoji}
                </div>
                <h3 className="font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-ink-soft">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <footer className="relative z-10 pb-8 text-center text-sm text-muted">
        Avatars: Open Peeps by Pablo Stanley (CC0), rendered with DiceBear.
      </footer>
    </div>
  );
}
