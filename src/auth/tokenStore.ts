import { readStorageWithMigration } from "@/lib/storage/migrateKey";
import { isAccessTokenExpired } from "./jwt";

export type TokenPair = {
  accessToken: string;
  refreshToken?: string;
};

const LEGACY_STORAGE_KEY = "ecn-viewer.auth.tokens";
const STORAGE_KEY = "edgeops-console.auth.tokens";

let accessToken: string | null = null;
let refreshToken: string | null = null;
let cachedSnapshot: TokenPair | null = null;

type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

function persistToStorage(tokens: TokenPair | null): void {
  try {
    if (!tokens) {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(LEGACY_STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? null,
      }),
    );
  } catch {
    // sessionStorage unavailable (private mode, quota, etc.)
  }
}

function readFromStorage(): TokenPair | null {
  try {
    const raw = readStorageWithMigration(
      sessionStorage,
      STORAGE_KEY,
      LEGACY_STORAGE_KEY,
    );
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof (parsed as Record<string, unknown>).accessToken !== "string"
    ) {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    return {
      accessToken: record.accessToken as string,
      refreshToken:
        typeof record.refreshToken === "string"
          ? record.refreshToken
          : undefined,
    };
  } catch {
    return null;
  }
}

function isStoredSessionUsable(tokens: TokenPair): boolean {
  if (!isAccessTokenExpired(tokens.accessToken)) {
    return true;
  }
  return Boolean(tokens.refreshToken);
}

/**
 * Restore tokens from sessionStorage before React/bootstrap runs.
 * Survives full-page redirects after OAuth callback.
 * Discards expired access tokens when no refresh token is available.
 */
export function hydrateTokensFromStorage(): void {
  if (accessToken) {
    return;
  }
  const stored = readFromStorage();
  if (!stored) {
    return;
  }
  if (!isStoredSessionUsable(stored)) {
    persistToStorage(null);
    return;
  }
  accessToken = stored.accessToken;
  refreshToken = stored.refreshToken ?? null;
  cachedSnapshot = null;
  notify();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): TokenPair | null {
  if (!accessToken) {
    cachedSnapshot = null;
    return null;
  }
  if (
    cachedSnapshot?.accessToken === accessToken &&
    cachedSnapshot?.refreshToken === (refreshToken ?? undefined)
  ) {
    return cachedSnapshot;
  }
  cachedSnapshot = {
    accessToken,
    refreshToken: refreshToken ?? undefined,
  };
  return cachedSnapshot;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

export function setTokens(tokens: TokenPair): void {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken ?? null;
  cachedSnapshot = null;
  persistToStorage({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
  notify();
}

export function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
  cachedSnapshot = null;
  persistToStorage(null);
  notify();
}

export function hasSession(): boolean {
  return accessToken !== null;
}
