#!/usr/bin/env node
/**
 * One-shot rebrand: replace user-facing "Pokémon" / "Pokédex" / "Pokedex"
 * with "Cobblemon" / "Cobbledex" in messages/*.json values only — keys
 * stay untouched (they're code identifiers).
 *
 * Run with: node scripts/rebrand-cobblemon.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const messagesDir = join(__dirname, "..", "messages");

// Order matters: longer/specific patterns first.
const REPLACEMENTS = [
  [/Pokédex/g, "Cobbledex"],
  [/Pokedex/g, "Cobbledex"],
  [/Pokémon/g, "Cobblemon"],
  [/Pokemon/g, "Cobblemon"],
];

function replaceInValue(s) {
  let out = s;
  for (const [from, to] of REPLACEMENTS) out = out.replace(from, to);
  return out;
}

function walk(node) {
  if (typeof node === "string") return replaceInValue(node);
  if (Array.isArray(node)) return node.map(walk);
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = walk(v);
    return out;
  }
  return node;
}

const files = readdirSync(messagesDir).filter((f) => f.endsWith(".json"));
for (const file of files) {
  const path = join(messagesDir, file);
  const raw = readFileSync(path, "utf8");
  const data = JSON.parse(raw);
  const next = walk(data);
  // Preserve trailing newline that the editor likely adds.
  const out = JSON.stringify(next, null, 2) + (raw.endsWith("\n") ? "\n" : "");
  writeFileSync(path, out, "utf8");
  console.log(`rebranded: ${file}`);
}
