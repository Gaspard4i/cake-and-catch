import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DB = ReturnType<typeof drizzle<typeof schema>>;

let cached: DB | null = null;

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
 * This lets Next.js import route modules at build time (page data collection,
 * generateMetadata, etc.) without requiring the env var to be present.
 */
export const db: DB = new Proxy({} as DB, {
  get(_t, prop, receiver) {
    if (!cached) cached = createDb();
    const value = Reflect.get(cached, prop, receiver);
    return typeof value === "function" ? value.bind(cached) : value;
  },
});

export { schema };
