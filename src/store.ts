// Moo's memory, kept in localStorage. Everything degrades gracefully if
// storage is unavailable (private mode, blocked site data): she just forgets.

export interface Memory {
  boops: number;
  seagrass: number;
  pets: number;
  rolls: number;
  visits: number;
  flowers: number;
  shellsOpened: number;
  firstVisit: number;
  lastVisit: number;
  lastFed: number;
}

const KEY = "moo:memory:v1";

const fresh = (): Memory => ({
  boops: 0,
  seagrass: 0,
  pets: 0,
  rolls: 0,
  visits: 0,
  flowers: 0,
  shellsOpened: 0,
  firstVisit: Date.now(),
  lastVisit: 0,
  lastFed: 0,
});

function load(): Memory {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...fresh(), ...(JSON.parse(raw) as Partial<Memory>) };
  } catch {
    // Unreadable or blocked storage: start over.
  }
  return fresh();
}

export const memory = load();

let saveTimer = 0;
export function save(): void {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(memory));
    } catch {
      // Storage full or blocked. Moo will remember for this visit only.
    }
  }, 150);
}

export function bump<K extends keyof Memory>(key: K, by = 1): number {
  memory[key] += by;
  save();
  return memory[key];
}
