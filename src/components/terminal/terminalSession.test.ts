import { describe, expect, it } from "vitest";
import {
  isPublishableTerminalSize,
  isSafeTerminalLink,
  isTerminalViewportMeasurable,
  resizeControlPayload,
  takeExecStatusNotice,
} from "./terminalSession";

describe("terminal session geometry", () => {
  it("publishes a size the agent can apply", () => {
    expect(isPublishableTerminalSize(120, 32, null)).toBe(true);
    expect(resizeControlPayload(120, 32)).toBe(
      '{"type":"resize","cols":120,"rows":32}',
    );
  });

  it("skips unchanged, tiny, and oversized grids", () => {
    expect(isPublishableTerminalSize(120, 32, { cols: 120, rows: 32 })).toBe(
      false,
    );
    expect(isPublishableTerminalSize(1, 24, null)).toBe(false);
    expect(isPublishableTerminalSize(80, 0, null)).toBe(false);
    expect(isPublishableTerminalSize(4097, 24, null)).toBe(false);
    expect(isPublishableTerminalSize(80.5, 24, null)).toBe(false);
  });

  it("does not measure a minimized drawer", () => {
    expect(isTerminalViewportMeasurable(40, 400)).toBe(false);
    expect(isTerminalViewportMeasurable(800, 40)).toBe(false);
    expect(isTerminalViewportMeasurable(800, 240)).toBe(true);
  });

  it("lifts controller status lines out of the pty bytes", () => {
    const waiting = new TextEncoder().encode(
      "Waiting for agent connection. Interactive exec will begin once the agent connects.\n",
    );
    expect(takeExecStatusNotice(waiting)).toEqual({
      status:
        "Waiting for agent connection. Interactive exec will begin once the agent connects.",
      rest: new Uint8Array(),
    });

    const mixed = new TextEncoder().encode(
      "Agent connected. Interactive exec is ready.\nbash-5.1# ",
    );
    const split = takeExecStatusNotice(mixed);
    expect(split.status).toBe("Agent connected. Interactive exec is ready.");
    expect(new TextDecoder().decode(split.rest)).toBe("bash-5.1# ");
  });

  it("leaves real shell output on the grid", () => {
    const output = new TextEncoder().encode("bash-5.1# ls\r\n");
    expect(takeExecStatusNotice(output).status).toBeNull();
    expect(takeExecStatusNotice(output).rest).toEqual(output);
  });

  it("opens only http and https links", () => {
    expect(isSafeTerminalLink("https://example.com/docs")).toBe(true);
    expect(isSafeTerminalLink("http://10.0.0.8:8080")).toBe(true);
    expect(isSafeTerminalLink("javascript:alert(1)")).toBe(false);
    expect(isSafeTerminalLink("file:///etc/passwd")).toBe(false);
    expect(isSafeTerminalLink("not a url")).toBe(false);
  });
});
