/**
 * Local-storage saved-recipe registry. Lets the user park snack and juice
 * compositions client-side without a backend, so they survive reloads
 * and can be reloaded into the maker.
 *
 * Storage layout:
 *   key: "snc:saved-recipes:v1"
 *   value: JSON { snacks: SavedSnack[]; juices: SavedJuice[] }
 *
 * Capped at MAX_PER_KIND entries each to keep localStorage from
 * growing unbounded; oldest entries are dropped on overflow.
 */

const KEY = "snc:saved-recipes:v1";
const MAX_PER_KIND = 50;

export type SavedSnack = {
  id: string;
  name: string;
  createdAt: number;
  /** Slugs in the snack's seasoning slots (max 3). */
  seasoningSlugs: string[];
  /** Optional pot colour the user picked. */
  potColour?: string | null;
};

export type SavedJuice = {
  id: string;
  name: string;
  createdAt: number;
  apricorn: string;
  /** Berry slugs used as seasonings (max 8 per Cobblemon's pot cap). */
  seasoningSlugs: string[];
};

type Store = { snacks: SavedSnack[]; juices: SavedJuice[] };

function read(): Store {
  if (typeof window === "undefined") return { snacks: [], juices: [] };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { snacks: [], juices: [] };
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      snacks: Array.isArray(parsed.snacks) ? parsed.snacks : [],
      juices: Array.isArray(parsed.juices) ? parsed.juices : [],
    };
  } catch {
    return { snacks: [], juices: [] };
  }
}

function write(store: Store) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
    // Notify same-tab listeners (storage events only fire across tabs).
    // The header badge reacts to this so the count updates immediately.
    window.dispatchEvent(new CustomEvent("snc:saved-changed"));
  } catch {
    /* quota exceeded — ignore, the user can clean up via the UI */
  }
}

function uid(): string {
  // Date + random suffix is enough; collisions don't matter — the user
  // will see two entries and can rename/delete.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function listSavedSnacks(): SavedSnack[] {
  return read().snacks.slice().sort((a, b) => b.createdAt - a.createdAt);
}

export function listSavedJuices(): SavedJuice[] {
  return read().juices.slice().sort((a, b) => b.createdAt - a.createdAt);
}

export function saveSnack(input: Omit<SavedSnack, "id" | "createdAt">): SavedSnack {
  const store = read();
  const entry: SavedSnack = { ...input, id: uid(), createdAt: Date.now() };
  store.snacks.unshift(entry);
  if (store.snacks.length > MAX_PER_KIND) store.snacks.length = MAX_PER_KIND;
  write(store);
  return entry;
}

export function saveJuice(input: Omit<SavedJuice, "id" | "createdAt">): SavedJuice {
  const store = read();
  const entry: SavedJuice = { ...input, id: uid(), createdAt: Date.now() };
  store.juices.unshift(entry);
  if (store.juices.length > MAX_PER_KIND) store.juices.length = MAX_PER_KIND;
  write(store);
  return entry;
}

export function deleteSnack(id: string) {
  const store = read();
  store.snacks = store.snacks.filter((s) => s.id !== id);
  write(store);
}

export function deleteJuice(id: string) {
  const store = read();
  store.juices = store.juices.filter((j) => j.id !== id);
  write(store);
}

export function renameSnack(id: string, name: string) {
  const store = read();
  const s = store.snacks.find((x) => x.id === id);
  if (s) {
    s.name = name;
    write(store);
  }
}

export function renameJuice(id: string, name: string) {
  const store = read();
  const j = store.juices.find((x) => x.id === id);
  if (j) {
    j.name = name;
    write(store);
  }
}
