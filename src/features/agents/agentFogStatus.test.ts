import { describe, expect, it } from "vitest";
import {
  AGENT_PRUNE_CONFIRM_MESSAGE,
  displayActiveModels,
  displayFogValue,
  formatTotalBytes,
  formatUnixMilliseconds,
  isManagedModelSource,
  parseCdiDeviceNames,
  parseModelStatusRows,
  parseRuntimeClassRows,
} from "./agentFogStatus";

describe("isManagedModelSource", () => {
  it("treats managed as clickable and local as text", () => {
    expect(isManagedModelSource("managed")).toBe(true);
    expect(isManagedModelSource("Managed")).toBe(true);
    expect(isManagedModelSource("local")).toBe(false);
    expect(isManagedModelSource(undefined)).toBe(false);
  });
});

describe("displayFogValue", () => {
  it("shows N/A for empty values and stringifies the rest", () => {
    expect(displayFogValue(undefined)).toBe("N/A");
    expect(displayFogValue("")).toBe("N/A");
    expect(displayFogValue(false)).toBe("false");
    expect(displayFogValue(0)).toBe("0");
  });
});

describe("formatUnixMilliseconds", () => {
  it("shows N/A for missing, blank, zero, or non-finite timestamps", () => {
    expect(formatUnixMilliseconds(undefined)).toBe("N/A");
    expect(formatUnixMilliseconds(null)).toBe("N/A");
    expect(formatUnixMilliseconds("")).toBe("N/A");
    expect(formatUnixMilliseconds(0)).toBe("N/A");
    expect(formatUnixMilliseconds("0")).toBe("N/A");
    expect(formatUnixMilliseconds(Number.NaN)).toBe("N/A");
    expect(formatUnixMilliseconds(Number.POSITIVE_INFINITY)).toBe("N/A");
  });

  it("formats Unix milliseconds as a local datetime", () => {
    const formatted = formatUnixMilliseconds(1_700_000_000_000);
    expect(formatted).not.toBe("N/A");
    expect(formatted).toContain("2023");
  });

  it("does not scale a seconds-sized value into milliseconds", () => {
    const formatted = formatUnixMilliseconds(1_700_000_000);
    expect(formatted).not.toContain("2023");
    expect(formatted).toContain("1970");
  });
});

describe("formatTotalBytes", () => {
  it("formats byte counts and treats missing as N/A", () => {
    expect(formatTotalBytes(undefined)).toBe("N/A");
    expect(formatTotalBytes(1024)).not.toBe("N/A");
    expect(formatTotalBytes(1024)).toMatch(/B/i);
  });
});

describe("prune confirm copy", () => {
  it("warns that unused local AI models and local Knowledge are deleted", () => {
    expect(AGENT_PRUNE_CONFIRM_MESSAGE).toMatch(/unused local AI models/i);
    expect(AGENT_PRUNE_CONFIRM_MESSAGE).toMatch(/unused local Knowledge/i);
    expect(AGENT_PRUNE_CONFIRM_MESSAGE).toMatch(/container images/i);
    expect(AGENT_PRUNE_CONFIRM_MESSAGE).toMatch(/fleet \(managed\) models/i);
    expect(AGENT_PRUNE_CONFIRM_MESSAGE).toMatch(/fleet Knowledge/i);
    expect(AGENT_PRUNE_CONFIRM_MESSAGE).toMatch(/not removed/i);
    expect(AGENT_PRUNE_CONFIRM_MESSAGE).not.toMatch(/system prune/i);
  });
});

describe("displayActiveModels", () => {
  it("uses the managed count including zero", () => {
    expect(displayActiveModels(0)).toBe("0");
    expect(displayActiveModels(3)).toBe("3");
    expect(displayActiveModels(undefined)).toBe("N/A");
  });
});

describe("fog status parsers", () => {
  it("parses runtime class JSON strings", () => {
    expect(
      parseRuntimeClassRows(
        '[{"name":"spin","handler":"spin","source":"managed"}]',
      ),
    ).toEqual([{ name: "spin", handler: "spin", source: "managed" }]);
  });

  it("parses model status JSON strings", () => {
    const rows = parseModelStatusRows(
      '[{"name":"llama","source":"managed","state":"ready"}]',
    );
    expect(rows).toEqual([
      { name: "llama", source: "managed", state: "ready" },
    ]);
  });

  it("parses CDI device name lists", () => {
    expect(parseCdiDeviceNames('["nvidia.com/gpu=0"]')).toEqual([
      "nvidia.com/gpu=0",
    ]);
    expect(parseCdiDeviceNames(["nvidia.com/gpu=1"])).toEqual([
      "nvidia.com/gpu=1",
    ]);
    expect(parseCdiDeviceNames("[]")).toEqual([]);
  });
});
