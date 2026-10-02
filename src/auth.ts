import NextAuth, { type NextAuthConfig } from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { eq, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { dummyHash, verifyPassword } from "@/lib/password";

const providers: NextAuthConfig["providers"] = [
  // Username or email + password. Sign-up lives in src/app/login/actions.ts.
  Credentials({
    id: "password",
    name: "Password",
    credentials: { identifier: {}, password: {} },
    async authorize(creds) {
      const identifier = String(creds?.identifier ?? "").trim().toLowerCase();
      const password = String(creds?.password ?? "");
      if (!identifier || !password) return null;
      const [user] = await db
        .select()
        .from(schema.users)
        .where(or(eq(schema.users.email, identifier), eq(schema.users.username, identifier)));
      const ok = await verifyPassword(password, user?.passwordHash ?? (await dummyHash()));
      if (!user || !ok) return null;
      return { id: user.id, name: user.name, email: user.email, image: user.image };
    },
  }),
];
// Optional extra sign-in methods, switched on by their env vars.
if (process.env.AUTH_GOOGLE_ID) providers.push(Google);
if (process.env.AUTH_GITHUB_ID) providers.push(GitHub);

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
  pages: { signIn: "/login" },
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
