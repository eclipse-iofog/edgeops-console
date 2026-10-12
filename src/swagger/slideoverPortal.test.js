import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it } from "vitest";

import { watchHeadlessPortal } from "./headlessPortal";

describe("slideover rows inside the Scalar portal", () => {
  it("overrides Scalar's unlayered flex rule with a two-column grid", () => {
    const pageCss = readFileSync("src/swagger/api-reference-page.css", "utf8");
    const slideOver = readFileSync("src/components/ui/SlideOver.tsx", "utf8");

    expect(slideOver).toContain("console-slideover-row");
    expect(pageCss).toContain(
      "#headlessui-portal-root.scalar-app .console-slideover-row",
    );
    expect(pageCss).toMatch(
      /@media \(min-width: 640px\) \{[\s\S]*display:\s*grid;[\s\S]*grid-template-columns:\s*minmax\(120px, 150px\) 1fr;/,
    );
  });
});

describe("watchHeadlessPortal", () => {
  afterEach(() => {
    document.getElementById("headlessui-portal-root")?.remove();
  });

  it("strips scalar-app from a portal that is already open", () => {
    const portal = document.createElement("div");
    portal.id = "headlessui-portal-root";
    portal.classList.add("scalar-app");
    document.body.appendChild(portal);

    const stop = watchHeadlessPortal(document);
    expect(portal.classList.contains("scalar-app")).toBe(false);
    stop();
  });

  it("strips scalar-app when the portal appears and Scalar tags it", async () => {
    const stop = watchHeadlessPortal(document);
    const portal = document.createElement("div");
    portal.id = "headlessui-portal-root";
    document.body.appendChild(portal);
    portal.classList.add("scalar-app");

    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(portal.classList.contains("scalar-app")).toBe(false);
    stop();
  });
});
