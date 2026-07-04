import { fetchWithTimeout } from "@/lib/http/fetchWithTimeout";
import { getApiBase, getApiV3Base, getWsBase } from "./apiBase";
import { enrichProfileFromToken } from "./jwt";
import type { AuthProfile } from "./AuthContext";
import type { TokenPair } from "./tokenStore";

function getConfig(): ControllerConfig {
  return window.controllerConfig || { publicUrl: "", auth: {} as ControllerAuthConfig };
}

export function getApiBaseUrl(): string {
  return getApiBase(getConfig());
}

export function getApiV3BaseUrl(): string {
  return getApiV3Base(getConfig());
}

export function getWsBaseUrl(): string {
  return getWsBase(getConfig());
}

type AuthEndpointKey = Exclude<
  keyof ControllerAuthConfig,
  "mode"
>;

function authPath(key: AuthEndpointKey): string {
  const config = getConfig();
  const path = config.auth?.[key] || "";
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return `${getApiBaseUrl()}${path}`;
}

function errorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.message === "string" && record.message) {
      return record.message;
    }
    if (typeof record.error === "string" && record.error) {
      return record.error;
    }
  }
  return fallback;
}

function parseProfileRecord(record: Record<string, unknown>): AuthProfile {
  return {
    sub: typeof record.sub === "string" ? record.sub : undefined,
    email: typeof record.email === "string" ? record.email : undefined,
    preferred_username:
      typeof record.preferred_username === "string"
        ? record.preferred_username
        : undefined,
    groups: Array.isArray(record.groups)
      ? record.groups.filter((g): g is string => typeof g === "string")
      : undefined,
    mustChangePassword:
      typeof record.mustChangePassword === "boolean"
        ? record.mustChangePassword
        : typeof record.password_change_required === "boolean"
          ? record.password_change_required
          : undefined,
    mfaEnabled:
      typeof record.mfaEnabled === "boolean" ? record.mfaEnabled : undefined,
  };
}

export type FetchProfileResult = {
  profile: AuthProfile | null;
  unauthorized?: boolean;
};

export async function fetchProfile(
  accessToken: string,
): Promise<FetchProfileResult> {
  const response = await fetchWithTimeout(authPath("profileUrl"), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 401) {
    return { profile: null, unauthorized: true };
  }

  if (!response.ok) {
    return { profile: null };
  }

  const data = await response.json().catch(() => null);
  if (!data || typeof data !== "object") {
    return { profile: null };
  }

  const record = data as Record<string, unknown>;
  let profile: AuthProfile;

  if (Array.isArray(record.userinfo) && record.userinfo[0]) {
    profile = parseProfileRecord(record.userinfo[0] as Record<string, unknown>);
  } else {
    profile = parseProfileRecord(record);
  }

  return {
    profile: enrichProfileFromToken(profile, accessToken),
  };
}

export type AuthApiError = {
  kind: "error";
  message: string;
};

export async function postLogout(accessToken: string): Promise<void> {
  try {
    await fetchWithTimeout(authPath("logoutUrl"), {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    // Best-effort server logout
  }
}

export async function postChangePassword(
  accessToken: string,
  payload: { currentPassword: string; newPassword: string },
): Promise<{ kind: "success" } | AuthApiError> {
  const response = await fetchWithTimeout(authPath("changePasswordUrl"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      kind: "error",
      message: errorMessage(data, "Failed to change password"),
    };
  }

  return { kind: "success" };
}

export type MfaEnrollResult = {
  kind: "enroll";
  secret: string;
  otpauthUrl: string;
};

export async function postMfaEnroll(
  accessToken: string,
): Promise<MfaEnrollResult | AuthApiError> {
  const response = await fetchWithTimeout(`${getApiBaseUrl()}/api/v3/user/mfa/enroll`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      kind: "error",
      message: errorMessage(data, "Failed to start MFA enrollment"),
    };
  }

  if (
    data &&
    typeof data === "object" &&
    typeof (data as Record<string, unknown>).secret === "string"
  ) {
    const record = data as Record<string, unknown>;
    return {
      kind: "enroll",
      secret: record.secret as string,
      otpauthUrl:
        typeof record.otpauthUrl === "string" ? record.otpauthUrl : "",
    };
  }

  return { kind: "error", message: "Unexpected MFA enroll response" };
}

export async function postMfaConfirm(
  accessToken: string,
  code: string,
): Promise<{ kind: "success" } | AuthApiError> {
  const response = await fetchWithTimeout(`${getApiBaseUrl()}/api/v3/user/mfa/confirm`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      kind: "error",
      message: errorMessage(data, "Invalid verification code"),
    };
  }

  return { kind: "success" };
}

export async function postRefresh(
  refreshToken: string,
): Promise<TokenPair | null> {
  const response = await fetchWithTimeout(authPath("refreshUrl"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  if (!data?.accessToken || !data?.refreshToken) {
    return null;
  }

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  };
}
