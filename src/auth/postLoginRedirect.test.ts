import { describe, expect, it } from "vitest";
import {
  capturePostLoginRedirect,
  clearPostLoginRedirect,
  consumePostLoginRedirect,
  getPendingPostLoginRedirect,
} from "./postLoginRedirect";

describe("postLoginRedirect", () => {
  it("clearPostLoginRedirect drops a captured route", () => {
    window.location.hash = "#/access-control/users";
    capturePostLoginRedirect();
    expect(getPendingPostLoginRedirect()).toBe("/access-control/users");

    clearPostLoginRedirect();
    expect(getPendingPostLoginRedirect()).toBeNull();
    expect(consumePostLoginRedirect()).toBeNull();
  });
});
