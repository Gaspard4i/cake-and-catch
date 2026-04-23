import { mkdir, readFile, readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCb);

const REPO_URL = "https://gitlab.com/cable-mc/cobblemon.git";
const DATA_ROOT = "common/src/main/resources/data/cobblemon";

export interface RepoClone {
  dir: string;
  commitSha: string;
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

export async function cloneRepo(targetDir: string, ref = "main"): Promise<RepoClone> {
  if (await pathExists(targetDir)) {
    await rm(targetDir, { recursive: true, force: true });
  }
  await mkdir(targetDir, { recursive: true });
  await execFile("git", ["clone", "--depth", "1", "--branch", ref, REPO_URL, targetDir], {
    maxBuffer: 64 * 1024 * 1024,
  });
  const { stdout } = await execFile("git", ["rev-parse", "HEAD"], { cwd: targetDir });
  return { dir: targetDir, commitSha: stdout.trim() };
}

export function dataPath(clone: RepoClone, ...parts: string[]): string {
  return join(clone.dir, DATA_ROOT, ...parts);
}

export async function listJsonFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listJsonFiles(full)));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(full);
    }
  }
  return files;
}

export async function readJson<T = unknown>(path: string): Promise<T> {
  const content = await readFile(path, "utf-8");
  return JSON.parse(content) as T;
}

export function gitlabBlobUrl(commitSha: string, relativePath: string): string {
  return `https://gitlab.com/cable-mc/cobblemon/-/blob/${commitSha}/${relativePath}`;
}

export function relativeDataPath(clone: RepoClone, absolutePath: string): string {
  return absolutePath.slice(clone.dir.length + 1).replaceAll("\\", "/");
}
