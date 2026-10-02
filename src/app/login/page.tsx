import { redirect } from "next/navigation";
import { auth, demoLoginEnabled, enabledProviders, signIn } from "@/auth";
import { BrainDots } from "@/components/BrainDots";
import { Peep } from "@/components/Peep";
import { Button, Logo } from "@/components/ui";
import { DOT_AVATAR } from "@/lib/avatar";

const ICONS: Record<string, string> = { google: "🔵", github: "🐙" };

export default async function LoginPage(props: PageProps<"/login">) {
  const session = await auth();
  if (session?.user) redirect("/home");
  const sp = await props.searchParams;
  const checkEmail = sp.check === "email";
  const oauth = enabledProviders.filter((p) => p.id === "google" || p.id === "github");
  const hasEmail = enabledProviders.some((p) => p.id === "resend");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <BrainDots density={0.00006} />
      <div className="card relative z-10 w-full max-w-md p-8">
        <div className="flex flex-col items-center text-center">
          <Logo className="mb-4" />
          <Peep config={DOT_AVATAR} size={110} mood="talking" />
          <h1 className="mt-3 font-display text-2xl font-bold">Hey there, thinker!</h1>
          <p className="mt-1 text-ink-soft">Sign in so I can remember your brilliant (and chaotic) ideas.</p>
        </div>

        {checkEmail && (
          <p className="mt-6 rounded-2xl bg-mint px-4 py-3 text-center text-sm font-semibold">
            📬 Check your inbox for a magic sign-in link!
          </p>
        )}

        <div className="mt-6 space-y-3">
          {oauth.map((p) => (
            <form
              key={p.id}
              action={async () => {
                "use server";
                await signIn(p.id, { redirectTo: "/home" });
              }}
            >
              <Button variant="soft" className="w-full py-3">
                <span aria-hidden>{ICONS[p.id]}</span> Continue with {p.name}
              </Button>
            </form>
          ))}

          {hasEmail && (
            <form
              className="flex gap-2"
              action={async (fd) => {
                "use server";
                await signIn("resend", { email: String(fd.get("email")), redirectTo: "/home" });
              }}
            >
              <input
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="min-w-0 flex-1 rounded-full border border-line bg-white px-4 py-2.5 outline-none focus:border-violet"
              />
              <Button>Email me a link</Button>
            </form>
          )}

          {demoLoginEnabled && (
            <form
              className="space-y-2 rounded-2xl border border-dashed border-violet/40 bg-lilac/30 p-4"
              action={async (fd) => {
                "use server";
                await signIn("demo", {
                  name: String(fd.get("name") ?? ""),
                  email: String(fd.get("email") ?? ""),
                  redirectTo: "/home",
                });
              }}
            >
              <p className="text-xs font-bold uppercase tracking-wide text-violet">Quick local login (dev only)</p>
              <input
                name="name"
                required
                placeholder="Your name"
                className="w-full rounded-full border border-line bg-white px-4 py-2.5 outline-none focus:border-violet"
              />
              <input
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="w-full rounded-full border border-line bg-white px-4 py-2.5 outline-none focus:border-violet"
              />
              <Button className="w-full">Let me in →</Button>
            </form>
          )}

          {!oauth.length && !hasEmail && !demoLoginEnabled && (
            <p className="rounded-2xl bg-butter px-4 py-3 text-sm">
              No sign-in methods are configured yet. Add Google credentials (<code>AUTH_GOOGLE_ID</code>) or set{" "}
              <code>AUTH_DEMO_LOGIN=true</code> for local development. See the README.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
