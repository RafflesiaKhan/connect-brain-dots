import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { auth, enabledProviders, signIn } from "@/auth";
import { databaseProblem } from "@/db/health";
import { BrainDots } from "@/components/BrainDots";
import { Peep } from "@/components/Peep";
import { Button, Logo } from "@/components/ui";
import { DOT_AVATAR } from "@/lib/avatar";
import { AuthPanel } from "./AuthPanel";

const ICONS: Record<string, string> = { google: "🔵", github: "🐙" };

const ERRORS: Record<string, string> = {
  CallbackRouteError: "Sign-in crashed on the server. The details are in the terminal running `npm run dev`.",
};

/** Turns Auth.js failures into a friendly message on this page instead of an error screen. */
async function trySignIn(provider: string, options: Record<string, string>) {
  "use server";
  try {
    await signIn(provider, options);
  } catch (e) {
    // signIn redirects on success by throwing; only Auth.js errors are failures.
    if (e instanceof AuthError) {
      console.error("[auth] sign-in failed:", e.cause ?? e);
      redirect(`/login?error=${e.type}`);
    }
    throw e;
  }
}

export default async function LoginPage(props: PageProps<"/login">) {
  const session = await auth();
  if (session?.user) redirect("/home");
  const sp = await props.searchParams;
  const mode = sp.mode === "signup" ? "signup" : "signin";
  const errorType = typeof sp.error === "string" ? sp.error : null;
  const dbProblem = await databaseProblem();
  const oauth = enabledProviders.filter((p) => p.id === "google" || p.id === "github");

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

        {dbProblem && (
          <div className="mt-6 rounded-2xl bg-butter px-4 py-3 text-sm" role="alert">
            <p className="font-bold">🛠️ Almost there: the database needs attention</p>
            <p className="mt-1">{dbProblem}</p>
          </div>
        )}

        {errorType && !dbProblem && (
          <p className="mt-6 rounded-2xl bg-pink px-4 py-3 text-center text-sm font-semibold" role="alert">
            {ERRORS[errorType] ?? `Sign-in failed (${errorType}). Please try again.`}
          </p>
        )}

        <AuthPanel initialMode={mode} />

        {oauth.length > 0 && (
          <div className="mt-5 space-y-2">
            <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted">or</p>
            {oauth.map((p) => (
              <form
                key={p.id}
                action={async () => {
                  "use server";
                  await trySignIn(p.id, { redirectTo: "/home" });
                }}
              >
                <Button variant="soft" className="w-full py-3">
                  <span aria-hidden>{ICONS[p.id]}</span> Continue with {p.name}
                </Button>
              </form>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
