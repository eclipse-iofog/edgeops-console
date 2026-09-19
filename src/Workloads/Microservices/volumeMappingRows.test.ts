import { describe, expect, it } from "vitest";
import {
  canDeleteVolumeMapping,
  displayVolumeMappingScope,
  toVolumeMappingRow,
} from "./volumeMappingRows";

describe("volume mapping slideover rows", () => {
  it("treats missing and blank scope as private", () => {
    expect(displayVolumeMappingScope(undefined)).toBe("private");
    expect(displayVolumeMappingScope("")).toBe("private");
    expect(displayVolumeMappingScope("  ")).toBe("private");
    expect(displayVolumeMappingScope("Shared")).toBe("shared");
  });

  it("hides delete for serviceAccount mappings", () => {
    expect(canDeleteVolumeMapping("serviceAccount")).toBe(false);
    expect(canDeleteVolumeMapping("volume")).toBe(true);
    expect(canDeleteVolumeMapping("bind")).toBe(true);
  });

  it("keeps mapping id for delete and defaults scope", () => {
    expect(
      toVolumeMappingRow(
        {
          id: 9,
          hostDestination: "nodered-config",
          containerDestination: "/data",
          accessMode: "rw",
          type: "volume",
        },
        0,
      ),
    ).toEqual({
      id: 9,
      host: "nodered-config",
      container: "/data",
      accessMode: "rw",
      type: "volume",
      scope: "private",
      key: "nodered-config-/data-0",
    });
  });
});
