import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FC,
  type ReactNode,
} from "react";
import { tryConsumeOAuthCallbackFromLocation } from "./bootstrap";
import { fetchProfile, postLogout, postRefresh } from "./api";
import { getTokenSubject, isAccessTokenExpiringSoon } from "./jwt";
import { clearPostLoginRedirect } from "./postLoginRedirect";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  getSnapshot,
  hasSession,
  setTokens,
  subscribe,
  type TokenPair,
} from "./tokenStore";

export type AuthProfile = {
  sub?: string;
  email?: string;
  preferred_username?: string;
  groups?: string[];
  mustChangePassword?: boolean;
  mfaEnabled?: boolean;
};

export type AuthUser = {
  access_token: string;
  profile?: AuthProfile;
};

export type AuthContextValue = {
  token?: string;
  isAuthenticated: boolean;
  isSessionValidating: boolean;
  hasRefreshToken: boolean;
  isLoading: boolean;
  initialized: boolean;
  user?: AuthUser;
  logout: () => void;
  signoutRedirect: () => Promise<void>;
  updateProfile: (profile: AuthProfile) => void;
  reloadProfile: () => Promise<AuthProfile | null>;
  hasRole: (role: string) => boolean;
  setSession: (tokens: TokenPair, profile?: AuthProfile) => void;
  ensureFreshToken: () => Promise<string | null>;
  refreshSession: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const session = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null);
  const sessionEpochRef = useRef(0);
  const profileTokenKeyRef = useRef<string | null>(null);
  const [profile, setProfile] = useState<AuthProfile | undefined>();
  const [isSessionValidating, setIsSessionValidating] = useState(false);

  const accessToken = session?.accessToken ?? null;
  const refreshToken = session?.refreshToken ?? null;
  const authenticated = accessToken !== null;

  useEffect(() => {
    if (!hasSession()) {
      tryConsumeOAuthCallbackFromLocation();
    }
  }, []);

  useEffect(() => {
    if (!accessToken) {
      setIsSessionValidating(false);
      setProfile(undefined);
      profileTokenKeyRef.current = null;
      return;
    }

    const tokenKey = getTokenSubject(accessToken) ?? accessToken;
    if (profileTokenKeyRef.current === tokenKey) {
      setIsSessionValidating(false);
      return;
    }

    let cancelled = false;
    const epoch = sessionEpochRef.current;
    setIsSessionValidating(true);
    setProfile(undefined);

    void (async () => {
      const result = await fetchProfile(accessToken);
      if (cancelled || sessionEpochRef.current !== epoch) {
        return;
      }

      if (result.unauthorized) {
        clearTokens();
        setProfile(undefined);
        profileTokenKeyRef.current = null;
        setIsSessionValidating(false);
        return;
      }

      if (result.profile) {
        setProfile(result.profile);
        profileTokenKeyRef.current = tokenKey;
      }
      setIsSessionValidating(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const setSession = useCallback(
    (tokens: TokenPair, nextProfile?: AuthProfile) => {
      setTokens(tokens);
      if (nextProfile) {
        setProfile(nextProfile);
      }
    },
    [],
  );

  const clearSession = useCallback(() => {
    sessionEpochRef.current += 1;
    refreshPromiseRef.current = null;
    profileTokenKeyRef.current = null;
    clearTokens();
    setProfile(undefined);
    setIsSessionValidating(false);
    clearPostLoginRedirect();
  }, []);

  const updateProfile = useCallback((nextProfile: AuthProfile) => {
    setProfile(nextProfile);
  }, []);

  const reloadProfile = useCallback(async (): Promise<AuthProfile | null> => {
    const token = getAccessToken();
    if (!token) {
      return null;
    }
    const epoch = sessionEpochRef.current;
    const result = await fetchProfile(token);
    if (sessionEpochRef.current !== epoch || !getAccessToken()) {
      return null;
    }
    if (result.unauthorized) {
      clearSession();
      return null;
    }
    if (result.profile) {
      setProfile(result.profile);
    }
    return result.profile ?? null;
  }, [clearSession]);

  const signoutRedirect = useCallback(async () => {
    const token = getAccessToken();
    if (token) {
      await postLogout(token);
    }
    clearSession();
    window.location.replace(`${window.location.origin}/#/login`);
  }, [clearSession]);

  const runRefresh = useCallback(async (): Promise<boolean> => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const epoch = sessionEpochRef.current;
    const promise = (async () => {
      const currentRefresh = getRefreshToken();
      if (!currentRefresh) {
        return false;
      }

      try {
        const tokens = await postRefresh(currentRefresh);
        if (
          !tokens ||
          sessionEpochRef.current !== epoch ||
          !getRefreshToken()
        ) {
          return false;
        }
        setTokens(tokens);
        return true;
      } catch {
        return false;
      } finally {
        if (refreshPromiseRef.current === promise) {
          refreshPromiseRef.current = null;
        }
      }
    })();

    refreshPromiseRef.current = promise;
    return promise;
  }, []);

  const ensureFreshToken = useCallback(async (): Promise<string | null> => {
    const token = getAccessToken();
    if (!token) {
      return null;
    }

    if (!isAccessTokenExpiringSoon(token)) {
      return token;
    }

    const refreshed = await runRefresh();
    if (!refreshed) {
      // Access-only BFF callback (no offline_access / refresh_token) — use JWT until exp
      return getRefreshToken() ? null : token;
    }

    return getAccessToken();
  }, [runRefresh]);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    return runRefresh();
  }, [runRefresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token: accessToken || undefined,
      isAuthenticated: authenticated,
      isSessionValidating,
      hasRefreshToken: refreshToken !== null,
      isLoading: false,
      initialized: true,
      user: accessToken
        ? { access_token: accessToken, profile }
        : undefined,
      logout: clearSession,
      signoutRedirect,
      hasRole: () => false,
      setSession,
      updateProfile,
      reloadProfile,
      ensureFreshToken,
      refreshSession,
    }),
    [
      accessToken,
      authenticated,
      isSessionValidating,
      refreshToken,
      profile,
      clearSession,
      signoutRedirect,
      setSession,
      updateProfile,
      reloadProfile,
      ensureFreshToken,
      refreshSession,
    ],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
