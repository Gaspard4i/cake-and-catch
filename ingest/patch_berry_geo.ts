import { eq } from "drizzle-orm";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { db, schema } from "../src/lib/db/client";

async function main() {
  const base = join(tmpdir(), "cake-and-catch-cobblemon", "common", "src", "main", "resources", "data", "cobblemon", "berries");
  const files = (await readdir(base)).filter((f) => f.endsWith(".json"));
  let ok = 0;
  for (const f of files) {
    const raw = JSON.parse(await readFile(join(base, f), "utf-8"));
    const slug = f.replace(/\.json$/, "");
    const fruitModel = ((raw.fruitModel ?? "") as string).replace(/^cobblemon:/, "").replace(/\.geo$/, "") || null;
    const fruitTexture = ((raw.fruitTexture ?? "") as string).replace(/^cobblemon:/, "") || null;
    const positionings = raw.pokeSnackPositionings ?? [];
    await db
      .update(schema.berries)
      .set({ fruitModel, fruitTexture, snackPositionings: positionings })
      .where(eq(schema.berries.slug, slug));
    ok++;
  }
  console.log("[patch] updated berries:", ok);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
