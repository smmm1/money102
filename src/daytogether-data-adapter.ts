export type DayTogetherDataCollections = "goals" | "savings" | "health" | "notes" | "bills" | "visits";

export interface DayTogetherDataAdapter<TState> {
  load(): TState;
  replace(next: TState): TState;
  reset(): TState;
}

/**
 * Phase 1 adapter: volatile, in-memory only.
 * A future backend adapter can implement this contract without changing view components.
 * Never persists to localStorage, IndexedDB, a worker, or a network.
 */
export function createMemoryDataAdapter<TState>(
  initialState: TState,
  clone: (value: TState) => TState = value => structuredClone(value),
): DayTogetherDataAdapter<TState> {
  const pristine = clone(initialState);
  let current = clone(pristine);
  return {
    load: () => clone(current),
    replace: next => {
      current = clone(next);
      return clone(current);
    },
    reset: () => {
      current = clone(pristine);
      return clone(current);
    },
  };
}


export interface SnapshotDataAdapter<TState> {
  load(): TState;
  save(next: TState): TState;
  clear(): void;
}

/**
 * Production adapter for the CloudAuth bridge. The bridge overrides localStorage
 * with an in-memory shim and sends this namespaced snapshot to the authenticated
 * Cloudflare Worker; the browser does not persist app records to disk.
 */
export function createCloudSnapshotAdapter<TState>(
  key: string,
  isValid: (value: unknown) => value is TState,
  initialState: TState,
  clone: (value: TState) => TState = value => structuredClone(value),
): SnapshotDataAdapter<TState> {
  return {
    load() {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (isValid(parsed)) return clone(parsed);
        }
      } catch {
        // An unavailable bridge or malformed snapshot falls back to a clean state.
      }
      return clone(initialState);
    },
    save(next) {
      window.localStorage.setItem(key, JSON.stringify(next));
      return clone(next);
    },
    clear() {
      window.localStorage.removeItem(key);
    },
  };
}
