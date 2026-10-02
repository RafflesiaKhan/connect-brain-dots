import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";
import type { AvatarConfig } from "@/lib/avatar";
import type { ProfileAnswers } from "@/lib/profile";
import type { Consequence, IdeaResult, Reflection } from "@/lib/types";

/* ─── Auth.js tables ──────────────────────────────────────────────────────── */

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [primaryKey({ columns: [account.provider, account.providerAccountId] })],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

/* ─── App tables ──────────────────────────────────────────────────────────── */

export const profiles = pgTable("profile", {
  userId: text("userId")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  displayName: text("displayName").notNull().default(""),
  avatar: jsonb("avatar").$type<AvatarConfig>(),
  profileType: text("profileType").$type<"personal" | "research">().notNull().default("personal"),
  answers: jsonb("answers").$type<ProfileAnswers>().notNull().default({}),
  onboarded: boolean("onboarded").notNull().default(false),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const aiSettings = pgTable("ai_settings", {
  userId: text("userId")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull().default("demo"),
  model: text("model").notNull().default(""),
  apiKeyEnc: text("apiKeyEnc"),
  baseUrl: text("baseUrl"),
  tavilyKeyEnc: text("tavilyKeyEnc"),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export type IdeaStatus = "reflecting" | "awaiting" | "running" | "done" | "error";

export const ideas = pgTable("idea", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("Untitled thought"),
  prompt: text("prompt").notNull(),
  status: text("status").$type<IdeaStatus>().notNull().default("reflecting"),
  reflection: jsonb("reflection").$type<Reflection>(),
  consequences: jsonb("consequences").$type<Consequence[]>(),
  result: jsonb("result").$type<IdeaResult>(),
  chosenOptionId: text("chosenOptionId"),
  error: text("error"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export type Profile = typeof profiles.$inferSelect;
export type AiSettingsRow = typeof aiSettings.$inferSelect;
export type Idea = typeof ideas.$inferSelect;
