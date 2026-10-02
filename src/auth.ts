import NextAuth, { type NextAuthConfig } from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

export const demoLoginEnabled =
  process.env.AUTH_DEMO_LOGIN === "true" && process.env.NODE_ENV !== "production";

const providers: NextAuthConfig["providers"] = [];
if (process.env.AUTH_GOOGLE_ID) providers.push(Google);
if (process.env.AUTH_GITHUB_ID) providers.push(GitHub);
if (process.env.AUTH_RESEND_KEY) {
  providers.push(Resend({ from: process.env.AUTH_EMAIL_FROM ?? "onboarding@resend.dev" }));
}
if (demoLoginEnabled) {
  providers.push(
    Credentials({
      id: "demo",
      name: "Quick local login",
      credentials: { name: {}, email: {} },
      async authorize(creds) {
        const email = String(creds?.email ?? "").trim().toLowerCase();
        const name = String(creds?.name ?? "").trim() || email.split("@")[0];
        if (!/^\S+@\S+\.\S+$/.test(email)) return null;
        const [found] = await db.select().from(schema.users).where(eq(schema.users.email, email));
        if (found) return found;
        const [created] = await db.insert(schema.users).values({ email, name }).returning();
        return created;
      },
    }),
  );
}

export const enabledProviders = providers.map((p) => {
  const cfg = typeof p === "function" ? p() : p;
  return { id: cfg.id, name: cfg.name };
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
  }),
  // JWT sessions so the credentials provider works alongside OAuth.
  session: { strategy: "jwt" },
  providers,
  pages: { signIn: "/login", verifyRequest: "/login?check=email" },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
