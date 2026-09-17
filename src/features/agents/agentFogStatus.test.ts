import { describe, expect, it } from "vitest";
import {
  AGENT_PRUNE_CONFIRM_MESSAGE,
  displayActiveModels,
  displayFogValue,
  formatTotalBytes,
  formatUnixSeconds,
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

describe("formatUnixSeconds", () => {
  it("shows N/A for missing or zero timestamps", () => {
    expect(formatUnixSeconds(undefined)).toBe("N/A");
    expect(formatUnixSeconds(0)).toBe("N/A");
    expect(formatUnixSeconds("0")).toBe("N/A");
  });

  it("formats Unix seconds as a local datetime", () => {
    const formatted = formatUnixSeconds(1_700_000_000);
    expect(formatted).not.toBe("N/A");
    expect(formatted).toContain("2023");
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
  it("warns that unused local AI models are deleted and fleet models are not", () => {
    expect(AGENT_PRUNE_CONFIRM_MESSAGE).toMatch(/unused local AI models/i);
    expect(AGENT_PRUNE_CONFIRM_MESSAGE).toMatch(/container images/i);
    expect(AGENT_PRUNE_CONFIRM_MESSAGE).toMatch(
      /Fleet \(managed\) models are not removed/i,
    );
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
