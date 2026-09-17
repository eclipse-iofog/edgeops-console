import { describe, expect, it } from "vitest";
import { resolveCommands } from "./importantContainerSpecFields";
import { hasPodId } from "./podIdSlideoverField";

describe("container spec display", () => {
  it("prefers commands and does not fall back when commands is set", () => {
    expect(
      resolveCommands({ commands: ["python", "app.py"], cmd: ["ignored"] }),
    ).toEqual(["python", "app.py"]);
  });

  it("falls back to cmd when commands is empty", () => {
    expect(resolveCommands({ commands: [], cmd: ["echo"] })).toEqual(["echo"]);
    expect(resolveCommands({ cmd: ["echo"] })).toEqual(["echo"]);
  });
});

describe("pod id row", () => {
  it("omits empty pod ids", () => {
    expect(hasPodId({ status: {} })).toBe(false);
    expect(hasPodId({ status: { podId: "" } })).toBe(false);
    expect(hasPodId({ status: { podId: "pod-1" } })).toBe(true);
  });
});
