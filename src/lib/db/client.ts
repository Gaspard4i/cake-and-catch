import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DB = ReturnType<typeof drizzle<typeof schema>>;

/** True when no DATABASE_URL is configured (build without connected DB). */
export const isDbMissing = () => !process.env.DATABASE_URL;

/**
 * Cache the postgres client on globalThis so Next.js HMR reloads reuse the
 * same pool. Otherwise each hot reload opens a fresh pool and the old ones
 * linger until their idle_timeout, quickly hitting Neon's connection cap
 * with "sorry, too many clients already".
 */
const GLOBAL_KEY = Symbol.for("snackAndCatch.db");
type GlobalDb = { db?: DB; client?: postgres.Sql };
const store = globalThis as unknown as Record<symbol, GlobalDb>;
store[GLOBAL_KEY] ??= {};
const holder = store[GLOBAL_KEY];

function createDb(): DB {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Configure it in your environment (.env.local or Vercel project settings).",
    );
  }
  /**
   * Supabase / Neon poolers terminate TLS — `ssl: "require"` makes the
   * postgres-js client opt into encrypted transport without needing a CA
   * bundle. Without this, the connection silently fails on Vercel lambdas
   * because the host enforces TLS and we'd otherwise speak plain TCP.
   */
  const needsSsl = /supabase|neon|render|amazonaws|sslmode=require/.test(url);
  const client = postgres(url, {
    max: process.env.NODE_ENV === "production" ? 10 : 3,
    idle_timeout: 20,
    max_lifetime: 60 * 10,
    ssl: needsSsl ? "require" : undefined,
  });
  holder.client = client;
  return drizzle(client, { schema });
}

/**
 * Proxy that defers `DATABASE_URL` validation to the first DB access.
 * Lets Next.js import route modules at build time without the env var.
 */
export const db: DB = new Proxy({} as DB, {
  get(_t, prop, receiver) {
    if (!holder.db) holder.db = createDb();
    const value = Reflect.get(holder.db, prop, receiver);
    return typeof value === "function" ? value.bind(holder.db) : value;
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
    /**
     * Always degrade gracefully instead of throwing. A throw here bubbles up
     * into the Server Component render, which Next surfaces as the generic
     * "A server error occurred" page — useless to users when the underlying
     * cause is a transient DB issue (Neon free-tier quota exhausted, cold
     * compute, sleeping branch). Returning the fallback keeps the route
     * renderable; downstream components already cope with empty arrays /
     * null. The error is logged so Vercel logs still expose the cause.
     */
    console.warn(
      "[db] query failed, falling back:",
      err instanceof Error ? err.message : err,
      err instanceof Error && err.cause ? `cause=${String(err.cause)}` : "",
      err && typeof err === "object" && "code" in err ? `code=${(err as { code: unknown }).code}` : "",
    );
    return fallback;
  }
}

export { schema };
