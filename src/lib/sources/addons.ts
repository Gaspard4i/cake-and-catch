import { mkdir, readdir, rm, stat } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";

const execFile = promisify(execFileCb);

export interface AddonSource {
  name: string;
  modrinthSlug: string;
  license: string;
  pageUrl: string;
  versionZipUrl: string;
  versionName: string;
}

export interface AddonFetched extends AddonSource {
  dir: string;
  spawnPoolDir: string;
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

interface ModrinthVersion {
  name: string;
  version_number: string;
  files: { url: string; filename: string; primary?: boolean }[];
  loaders: string[];
  game_versions: string[];
}

export async function resolveLatestModrinthVersion(slug: string): Promise<{
  versionZipUrl: string;
  versionName: string;
}> {
  const res = await fetch(`https://api.modrinth.com/v2/project/${slug}/version`, {
    headers: { "User-Agent": "snack-and-catch/0.1 (contact: quatrei.gaspard@gmail.com)" },
  });
  if (!res.ok) throw new Error(`modrinth api ${slug}: ${res.status}`);
  const versions = (await res.json()) as ModrinthVersion[];
  if (versions.length === 0) throw new Error(`no versions for ${slug}`);
  const v = versions[0];
  const file = v.files.find((f) => f.primary) ?? v.files[0];
  return { versionZipUrl: file.url, versionName: v.name };
}

export async function downloadAndExtract(source: AddonSource): Promise<AddonFetched> {
  const base = join(tmpdir(), "snack-and-catch-addons", source.name);
  if (await pathExists(base)) await rm(base, { recursive: true, force: true });
  await mkdir(base, { recursive: true });

  const zipPath = join(base, "pack.zip");
  const res = await fetch(source.versionZipUrl, {
    headers: { "User-Agent": "snack-and-catch/0.1 (contact: quatrei.gaspard@gmail.com)" },
  });
  if (!res.ok || !res.body) throw new Error(`download ${source.name}: ${res.status}`);
  await pipeline(res.body as unknown as NodeJS.ReadableStream, createWriteStream(zipPath));

  const extractDir = join(base, "extracted");
  await mkdir(extractDir, { recursive: true });
  // Use PowerShell Expand-Archive (Windows-native, no extra dependency)
  await execFile(
    "powershell",
    ["-NoProfile", "-Command", `Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force`],
    { maxBuffer: 64 * 1024 * 1024 },
  );

  const spawnPoolDir = await findSpawnPoolDir(extractDir);
  if (!spawnPoolDir) {
    throw new Error(`no data/cobblemon/spawn_pool_world found in ${source.name}`);
  }

  return { ...source, dir: extractDir, spawnPoolDir };
}

async function findSpawnPoolDir(root: string): Promise<string | null> {
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const full = join(root, entry.name);
    if (entry.name === "spawn_pool_world") return full;
    const nested = await findSpawnPoolDir(full);
    if (nested) return nested;
  }
  return null;
}

export const ADDONS: AddonSource[] = [
  {
    name: "mysticmons",
    modrinthSlug: "mysticmons",
    license: "MIT",
    pageUrl: "https://modrinth.com/datapack/mysticmons",
    versionZipUrl: "", // resolved at runtime
    versionName: "",
  },
  {
    name: "better-cobblemon-spawns",
    modrinthSlug: "better-cobblemon-spawns",
    license: "MIT",
    pageUrl: "https://modrinth.com/mod/better-cobblemon-spawns",
    versionZipUrl: "",
    versionName: "",
  },
];
