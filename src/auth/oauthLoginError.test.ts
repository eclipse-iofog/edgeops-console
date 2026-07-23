import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearOAuthLoginErrorFromLocation,
  consumeOAuthLoginErrorFromLocation,
  readOAuthLoginError,
  resolveOAuthLoginErrorMessage,
} from "./oauthLoginError";

describe("oauthLoginError", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps known oauthError codes to friendly messages", () => {
    expect(resolveOAuthLoginErrorMessage("access_denied")).toBe(
      "Sign-in was cancelled. Please try again.",
    );
    expect(resolveOAuthLoginErrorMessage("login_required")).toBe(
      "Please sign in again.",
    );
    expect(resolveOAuthLoginErrorMessage("server_error")).toBe(
      "Sign-in could not be completed. Please try again.",
    );
  });

  it("reads oauthError and oauthErrorDescription from search params", () => {
    expect(
      readOAuthLoginError("?oauthError=access_denied&oauthErrorDescription=User%20abort"),
    ).toEqual({
      code: "access_denied",
      message: "Sign-in was cancelled. Please try again.",
      detail: "User abort",
    });
  });

  it("returns null when oauthError is absent", () => {
    expect(readOAuthLoginError("?foo=bar")).toBeNull();
  });

  it("clears oauth error params from the location", () => {
    const replaceState = vi.fn();
    vi.stubGlobal("history", { replaceState });

    clearOAuthLoginErrorFromLocation({
      origin: "http://localhost:3000",
      pathname: "/login",
      search: "?oauthError=access_denied&oauthErrorDescription=User%20abort",
      hash: "#/login",
    });

    expect(replaceState).toHaveBeenCalledWith(
      null,
      "",
      "http://localhost:3000/login#/login",
    );
  });

  it("consumeOAuthLoginErrorFromLocation reads then clears params", () => {
    const replaceState = vi.fn();
    vi.stubGlobal("history", { replaceState });
    vi.stubGlobal("location", {
      origin: "http://localhost:3000",
      pathname: "/login",
      search: "?oauthError=login_required",
      hash: "",
    });

    expect(consumeOAuthLoginErrorFromLocation()).toEqual({
      code: "login_required",
      message: "Please sign in again.",
    });
    expect(replaceState).toHaveBeenCalledWith(
      null,
      "",
      "http://localhost:3000/login",
    );
  });
});
