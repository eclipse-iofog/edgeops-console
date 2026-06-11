import { getApiV3BaseUrl } from "./api";

export type InteractionStep =
  | "login"
  | "mfa"
  | "enroll"
  | "confirm-enroll"
  | "change-password"
  | "complete";

export type InteractionStepResponse = {
  step: InteractionStep;
};

export type InteractionEnrollResponse = InteractionStepResponse & {
  secret: string;
  otpauthUrl: string;
};

export type InteractionConfirmEnrollResponse = InteractionStepResponse & {
  recoveryCodes: string[];
};

export type InteractionCompleteResponse = {
  step: "complete";
  redirectTo: string;
};

export type InteractionError = {
  kind: "error";
  message: string;
};

export function isInteractionError(
  result: unknown,
): result is InteractionError {
  return (
    typeof result === "object" &&
    result !== null &&
    (result as InteractionError).kind === "error"
  );
}

function interactionUrl(uid: string, suffix = ""): string {
  return `${getApiV3BaseUrl()}/user/interaction/${encodeURIComponent(uid)}${suffix}`;
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

async function parseStepResponse(
  response: Response,
  fallbackError: string,
): Promise<InteractionStepResponse | InteractionError> {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      kind: "error",
      message: errorMessage(data, fallbackError),
    };
  }

  if (
    data &&
    typeof data === "object" &&
    typeof (data as Record<string, unknown>).step === "string"
  ) {
    return { step: (data as Record<string, unknown>).step as InteractionStep };
  }

  return { kind: "error", message: "Unexpected interaction response" };
}

export async function getInteractionStatus(
  uid: string,
): Promise<InteractionStepResponse | InteractionError> {
  const response = await fetch(interactionUrl(uid));
  return parseStepResponse(response, "Interaction session expired");
}

export async function postInteractionLogin(
  uid: string,
  identifier: string,
  password: string,
): Promise<InteractionStepResponse | InteractionError> {
  const response = await fetch(interactionUrl(uid, "/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: identifier, password }),
  });
  return parseStepResponse(response, "Invalid username or password");
}

export async function postInteractionMfa(
  uid: string,
  code: string,
): Promise<InteractionStepResponse | InteractionError> {
  const response = await fetch(interactionUrl(uid, "/mfa"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  return parseStepResponse(response, "Invalid verification code");
}

export async function postInteractionEnroll(
  uid: string,
): Promise<InteractionEnrollResponse | InteractionError> {
  const response = await fetch(interactionUrl(uid, "/enroll"), {
    method: "POST",
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
      step: (record.step as InteractionStep) || "confirm-enroll",
      secret: record.secret as string,
      otpauthUrl:
        typeof record.otpauthUrl === "string" ? record.otpauthUrl : "",
    };
  }

  return { kind: "error", message: "Unexpected enroll response" };
}

export async function postInteractionConfirmEnroll(
  uid: string,
  code: string,
): Promise<InteractionConfirmEnrollResponse | InteractionError> {
  const response = await fetch(interactionUrl(uid, "/confirm-enroll"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      kind: "error",
      message: errorMessage(data, "Invalid verification code"),
    };
  }

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    return {
      step: (record.step as InteractionStep) || "complete",
      recoveryCodes: Array.isArray(record.recoveryCodes)
        ? record.recoveryCodes.filter((c): c is string => typeof c === "string")
        : [],
    };
  }

  return { kind: "error", message: "Unexpected confirm-enroll response" };
}

export async function postInteractionChangePassword(
  uid: string,
  currentPassword: string,
  newPassword: string,
): Promise<InteractionStepResponse | InteractionError> {
  const response = await fetch(interactionUrl(uid, "/change-password"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return parseStepResponse(response, "Failed to change password");
}

export async function postInteractionComplete(
  uid: string,
): Promise<InteractionCompleteResponse | InteractionError> {
  const response = await fetch(interactionUrl(uid, "/complete"), {
    method: "POST",
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      kind: "error",
      message: errorMessage(data, "Failed to complete sign in"),
    };
  }

  if (
    data &&
    typeof data === "object" &&
    typeof (data as Record<string, unknown>).redirectTo === "string"
  ) {
    const record = data as Record<string, unknown>;
    return {
      step: "complete",
      redirectTo: record.redirectTo as string,
    };
  }

  return { kind: "error", message: "Unexpected complete response" };
}
