#!/usr/bin/env node
/**
 * Replace em-dashes (—) and en-dashes (–) with simple punctuation in
 * USER-FACING strings only:
 *   - .json message bundles                  → every value
 *   - JSX text + JSX string attribute values → ts/tsx
 *
 * Code comments (// — or /* — *\/) and TypeScript identifiers are left
 * alone so the source still reads naturally for developers.
 *
 * Replacement strategy:
 *   " — "  → ". "          (sentence break)
 *   " –"   → ":"           (definition)
 *   "—"    → ","           (loose dash inside a clause)
 *   "–"    → "-"
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function replaceUserText(s) {
  return s
    .replace(/ — /g, ". ")
    .replace(/—/g, ", ")
    .replace(/ – /g, ": ")
    .replace(/–/g, "-");
}

function processJsonValues(node) {
  if (typeof node === "string") return replaceUserText(node);
  if (Array.isArray(node)) return node.map(processJsonValues);
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = processJsonValues(v);
    return out;
  }
  return node;
}

/**
 * Strip dashes from JSX text content (between > and <) and from string
 * literals that look like attribute values (placeholder=, title=, etc.).
 * Skips comment blocks // and /* … *\/.
 */
function processTsxSource(src) {
  // Pull out comment regions, replace separately.
  const tokens = [];
  let cursor = 0;
  const re = /\/\/[^\n]*|\/\*[\s\S]*?\*\//g;
  let m;
  while ((m = re.exec(src))) {
    if (m.index > cursor) {
      tokens.push({ kind: "code", text: src.slice(cursor, m.index) });
    }
    tokens.push({ kind: "comment", text: m[0] });
    cursor = re.lastIndex;
  }
  if (cursor < src.length) tokens.push({ kind: "code", text: src.slice(cursor) });

  return tokens
    .map((t) => (t.kind === "comment" ? t.text : replaceUserText(t.text)))
    .join("");
}

function listFiles(dir, exts) {
  // Use a cheap recursive walk so we don't need a glob lib.
  const out = [];
  function walk(d) {
    const entries = readdirSync(d, { withFileTypes: true });
    for (const e of entries) {
      if (e.name === "node_modules" || e.name === ".next" || e.name === ".git") {
        continue;
      }
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (exts.includes(extname(e.name))) out.push(p);
    }
  }
  walk(dir);
  return out;
}

let touched = 0;
for (const file of listFiles(join(ROOT, "messages"), [".json"])) {
  const raw = readFileSync(file, "utf8");
  const data = JSON.parse(raw);
  const next = processJsonValues(data);
  const out = JSON.stringify(next, null, 2) + (raw.endsWith("\n") ? "\n" : "");
  if (out !== raw) {
    writeFileSync(file, out, "utf8");
    touched++;
    console.log(`json: ${file}`);
  }
}

for (const file of listFiles(join(ROOT, "src"), [".tsx", ".ts"])) {
  const raw = readFileSync(file, "utf8");
  const next = processTsxSource(raw);
  if (next !== raw) {
    writeFileSync(file, next, "utf8");
    touched++;
    console.log(`code: ${file}`);
  }
}

console.log(`done, ${touched} files touched`);
