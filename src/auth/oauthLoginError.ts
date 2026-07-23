export type OAuthLoginError = {
  code: string;
  message: string;
  detail?: string;
};

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  access_denied: "Sign-in was cancelled. Please try again.",
  login_required: "Please sign in again.",
};

export function resolveOAuthLoginErrorMessage(code: string): string {
  return (
    OAUTH_ERROR_MESSAGES[code] ??
    "Sign-in could not be completed. Please try again."
  );
}

export function readOAuthLoginError(
  search: string = window.location.search,
): OAuthLoginError | null {
  const params = new URLSearchParams(search);
  const code = params.get("oauthError");
  if (!code) {
    return null;
  }

  const detail = params.get("oauthErrorDescription") ?? undefined;
  return {
    code,
    message: resolveOAuthLoginErrorMessage(code),
    detail: detail || undefined,
  };
}

export function clearOAuthLoginErrorFromLocation(
  location: Pick<Location, "origin" | "pathname" | "hash" | "search"> = window.location,
): void {
  const params = new URLSearchParams(location.search);
  if (!params.has("oauthError") && !params.has("oauthErrorDescription")) {
    return;
  }

  params.delete("oauthError");
  params.delete("oauthErrorDescription");
  const search = params.toString();
  const next = `${location.origin}${location.pathname}${search ? `?${search}` : ""}${location.hash}`;
  window.history.replaceState(null, "", next);
}

/** Read Controller OAuth callback error params and remove them from the URL. */
export function consumeOAuthLoginErrorFromLocation(): OAuthLoginError | null {
  const error = readOAuthLoginError();
  if (!error) {
    return null;
  }
  clearOAuthLoginErrorFromLocation();
  return error;
}
