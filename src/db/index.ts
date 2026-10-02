import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type DB = NodePgDatabase<typeof schema>;

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis as unknown as { __cbdPool?: Pool };

const pool =
  globalForDb.__cbdPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });
if (process.env.NODE_ENV !== "production") globalForDb.__cbdPool = pool;

export const db: DB = drizzle(pool, { schema });
export { schema };
