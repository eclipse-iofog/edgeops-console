import { describe, expect, it } from "vitest";

import {
  sectionSlugFromDocsHref,
  shouldIgnoreHistoryUpdate,
} from "./consoleUrlLock";

const locked =
  "http://localhost:5173/#/api?authToken=token&baseUrl=http%3A%2F%2Flocalhost%3A51121%2Fapi%2Fv3";

describe("shouldIgnoreHistoryUpdate", () => {
  it("keeps console hash routes", () => {
    expect(
      shouldIgnoreHistoryUpdate("http://localhost:5173/#/nodes/list", locked),
    ).toBe(false);
    expect(
      shouldIgnoreHistoryUpdate("#/dashboard", locked),
    ).toBe(false);
  });

  it("ignores Scalar section hashes", () => {
    expect(shouldIgnoreHistoryUpdate("#tag/Controller/get", locked)).toBe(true);
    expect(shouldIgnoreHistoryUpdate("#description/overview", locked)).toBe(
      true,
    );
    expect(
      shouldIgnoreHistoryUpdate(
        "http://localhost:5173/api-reference/tag/Controller#/api",
        locked,
      ),
    ).toBe(true);
  });

  it("ignores a section appended to the console hash", () => {
    expect(
      shouldIgnoreHistoryUpdate(`${locked}/tag/Controller/get`, locked),
    ).toBe(true);
    expect(
      shouldIgnoreHistoryUpdate(
        "http://localhost:5173/#/api/tag/Controller/get",
        locked,
      ),
    ).toBe(true);
    expect(
      shouldIgnoreHistoryUpdate(
        "http://localhost:5173/#/api?authToken=token&baseUrl=http://localhost:51121/api/v3/description/introduction",
        locked,
      ),
    ).toBe(true);
  });
});

describe("sectionSlugFromDocsHref", () => {
  it("reads a Scalar section hash", () => {
    expect(sectionSlugFromDocsHref("#tag/events/GET/events", locked)).toBe(
      "tag/events/GET/events",
    );
  });

  it("strips the console route from a docs link", () => {
    expect(
      sectionSlugFromDocsHref(
        "http://localhost:5173/#/api/tag/events/GET/events",
        locked,
      ),
    ).toBe("tag/events/GET/events");
    expect(
      sectionSlugFromDocsHref(`${locked}/description/introduction`, locked),
    ).toBe("description/introduction");
  });
});
