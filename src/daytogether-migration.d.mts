export function migrateLegacyState<T extends { settings: Record<string, unknown> }>(defaults: T, getItem: (key: string) => string | null): T;
