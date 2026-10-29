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
