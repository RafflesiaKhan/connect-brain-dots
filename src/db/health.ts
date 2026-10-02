import "server-only";
import { sql } from "drizzle-orm";
import { db } from "./index";

/** Plain-language reason the database isn't usable, or null when it is fine. */
export async function databaseProblem(): Promise<string | null> {
  if (!process.env.DATABASE_URL) {
    return "DATABASE_URL is not set. Add it to .env.local and restart `npm run dev`.";
  }
  try {
    await db.execute(sql`select 1 from "user" limit 1`);
    return null;
  } catch (e) {
    const err = e as { code?: string; cause?: { code?: string }; message?: string };
    const code = err.code ?? err.cause?.code;
    console.error("[db] health check failed:", e);
    if (code === "42P01") return "The database is reachable but its tables are missing. Run `npm run db:push`, then refresh.";
    if (code === "ECONNREFUSED" || code === "ENOTFOUND") {
      return "Can't reach the database. If you use Docker, run `docker compose up -d` (and make sure Docker Desktop is open), then refresh.";
    }
    if (code === "28P01" || code === "3D000") {
      return "The database rejected the connection (wrong user, password or database name). Check DATABASE_URL in .env.local.";
    }
    return `The database returned an error: ${err.message ?? code ?? "unknown"}. See the terminal running npm run dev.`;
  }
}
