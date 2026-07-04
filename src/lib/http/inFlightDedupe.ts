const inFlight = new Map<string, Promise<unknown>>();

export function dedupeInFlight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = fn().finally(() => {
    inFlight.delete(key);
  });

  inFlight.set(key, promise);
  return promise;
}

export function getInFlightDedupeKey(method: string, path: string): string {
  return `${method.toUpperCase()}:${path}`;
}
