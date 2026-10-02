"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { eq, or } from "drizzle-orm";
import { z } from "zod";
import { signIn } from "@/auth";
import { db, schema } from "@/db";
import { clearAttempts, hashPassword, tooManyAttempts } from "@/lib/password";

export type AuthFormState = { error?: string; values?: Record<string, string> };

const signUpSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_.-]{3,24}$/, "Username: 3-24 characters, letters, numbers, dots, dashes or underscores."),
  email: z.string().trim().toLowerCase().email("Please enter a valid email address."),
  password: z.string().min(8, "Password needs at least 8 characters.").max(200),
});

async function clientKey(prefix: string, id: string) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  return `${prefix}:${ip}:${id}`;
}

/** Runs Auth.js sign-in; success redirects (by throwing), failure returns a message. */
async function passwordSignIn(identifier: string, password: string, redirectTo: string): Promise<string | null> {
  try {
    await signIn("password", { identifier, password, redirectTo });
    return null;
  } catch (e) {
    if (e instanceof AuthError) {
      if (e.type === "CredentialsSignin") return "Wrong username/email or password.";
      console.error("[auth] sign-in failed:", e.cause ?? e);
      return "Sign-in failed on the server. Please try again in a moment.";
    }
    throw e; // the success redirect
  }
}

export async function signInAction(_prev: AuthFormState, fd: FormData): Promise<AuthFormState> {
  const identifier = String(fd.get("identifier") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const values = { identifier };
  if (!identifier || !password) return { error: "Enter your username or email and your password.", values };
  const key = await clientKey("login", identifier);
  if (tooManyAttempts(key)) return { error: "Too many attempts. Take a breather and try again in 10 minutes.", values };
  const error = await passwordSignIn(identifier, password, "/home");
  return { error: error ?? undefined, values };
}

export async function signUpAction(_prev: AuthFormState, fd: FormData): Promise<AuthFormState> {
  const raw = {
    username: String(fd.get("username") ?? ""),
    email: String(fd.get("email") ?? ""),
    password: String(fd.get("password") ?? ""),
  };
  const values = { username: raw.username, email: raw.email };
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };
  const { username, email, password } = parsed.data;

  if (tooManyAttempts(await clientKey("signup", "any"), 10, 60 * 60_000)) {
    return { error: "Too many sign-ups from this network. Please try again later.", values };
  }

  const existing = await db
    .select()
    .from(schema.users)
    .where(or(eq(schema.users.email, email), eq(schema.users.username, username)));
  const byEmail = existing.find((u) => u.email === email);
  const byUsername = existing.find((u) => u.username === username);
  if (byUsername && byUsername.id !== byEmail?.id) return { error: "That username is taken. Try another one!", values };

  const passwordHash = await hashPassword(password);
  if (byEmail) {
    // Local development only: let accounts made with the old passwordless test login set a password.
    const canClaim = process.env.NODE_ENV !== "production" && !byEmail.passwordHash;
    if (!canClaim) return { error: "An account with that email already exists. Try signing in instead.", values };
    await db.update(schema.users).set({ username, passwordHash }).where(eq(schema.users.id, byEmail.id));
  } else {
    await db.insert(schema.users).values({ email, username, name: username, passwordHash });
  }

  clearAttempts(await clientKey("login", email));
  const error = await passwordSignIn(email, password, "/home"); // /home forwards to onboarding when needed
  return { error: error ?? undefined, values };
}
