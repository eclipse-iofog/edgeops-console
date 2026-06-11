import { getApiBaseUrl } from "../../auth/api";
import { getAccessToken } from "../../auth/tokenStore";

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

export type AccountApiError = {
  kind: "error";
  message: string;
};

export async function postMfaDisable(
  code: string,
): Promise<{ kind: "success" } | AccountApiError> {
  const accessToken = getAccessToken();
  if (!accessToken) {
    return { kind: "error", message: "Not signed in" };
  }

  const response = await fetch(`${getApiBaseUrl()}/api/v3/user/mfa/disable`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code: code.trim() }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      kind: "error",
      message: errorMessage(data, "Failed to disable MFA"),
    };
  }

  return { kind: "success" };
}
