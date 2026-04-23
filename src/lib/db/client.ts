import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DB = ReturnType<typeof drizzle<typeof schema>>;

let cached: DB | null = null;

/** True when no DATABASE_URL is configured (build without connected DB). */
export const isDbMissing = () => !process.env.DATABASE_URL;

function createDb(): DB {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Configure it in your environment (.env.local or Vercel project settings).",
    );
  }
  const client = postgres(url, { max: 10 });
  return drizzle(client, { schema });
}

/**
 * Proxy that defers `DATABASE_URL` validation to the first DB access.
 * Lets Next.js import route modules at build time without the env var.
 */
export const db: DB = new Proxy({} as DB, {
  get(_t, prop, receiver) {
    if (!cached) cached = createDb();
    const value = Reflect.get(cached, prop, receiver);
    return typeof value === "function" ? value.bind(cached) : value;
  },
});

/**
 * Runs the query and, if the DB is unavailable (e.g. during a Vercel build
 * when DATABASE_URL has not been provisioned yet), returns the provided
 * fallback. In normal runtime with a configured DB, errors still propagate.
 */
export async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  if (isDbMissing()) return fallback;
  try {
    return await fn();
  } catch (err) {
    if (process.env.NEXT_PHASE === "phase-production-build") {
      console.warn(
        "[db] query failed during build, falling back:",
        err instanceof Error ? err.message : err,
      );
      return fallback;
    }
    throw err;
  }
}

export { schema };
