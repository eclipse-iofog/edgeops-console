/**
 * Read from canonical storage key, migrating legacy value once if present.
 */
export function readStorageWithMigration(
  storage: Storage,
  key: string,
  legacyKey: string,
): string | null {
  const current = storage.getItem(key);
  if (current !== null) {
    return current;
  }

  const legacy = storage.getItem(legacyKey);
  if (legacy !== null) {
    storage.setItem(key, legacy);
    storage.removeItem(legacyKey);
    return legacy;
  }

  return null;
}
