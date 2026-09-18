import { render, screen } from "@testing-library/react";
import { format } from "date-fns";
import { describe, expect, it } from "vitest";
import {
  formatLastErrorAt,
  readMicroserviceCrashStatus,
  shouldShowCurrentError,
  shouldShowLastCrash,
  shouldShowRestartCount,
} from "./microserviceCrashStatus";
import { microserviceCrashSlideoverFields } from "./microserviceCrashStatusFields";

describe("readMicroserviceCrashStatus", () => {
  it("treats missing keys as empty rather than an error", () => {
    expect(readMicroserviceCrashStatus(undefined)).toEqual({
      errorMessage: "",
      lastError: "",
      lastErrorAt: 0,
      restartCount: 0,
    });
    expect(readMicroserviceCrashStatus({})).toEqual({
      errorMessage: "",
      lastError: "",
      lastErrorAt: 0,
      restartCount: 0,
    });
  });

  it("reads current vs last crash fields", () => {
    expect(
      readMicroserviceCrashStatus({
        errorMessage: "",
        lastError: "exitCode=1 oomKilled=false error=config missing",
        lastErrorAt: 1726660000123,
        restartCount: 4,
      }),
    ).toEqual({
      errorMessage: "",
      lastError: "exitCode=1 oomKilled=false error=config missing",
      lastErrorAt: 1726660000123,
      restartCount: 4,
    });
  });
});

describe("crash status visibility", () => {
  it("shows current error only when errorMessage is non-empty", () => {
    expect(
      shouldShowCurrentError(
        readMicroserviceCrashStatus({ errorMessage: "CRI reason=OOMKilled" }),
      ),
    ).toBe(true);
    expect(
      shouldShowCurrentError(readMicroserviceCrashStatus({ errorMessage: "" })),
    ).toBe(false);
  });

  it("shows last crash when lastError is set even after errorMessage clears", () => {
    const crash = readMicroserviceCrashStatus({
      errorMessage: "",
      lastError: "exitCode=1 oomKilled=false",
      lastErrorAt: 1726660000123,
      restartCount: 1,
    });
    expect(shouldShowCurrentError(crash)).toBe(false);
    expect(shouldShowLastCrash(crash)).toBe(true);
  });

  it("hides last crash when lastError is empty", () => {
    expect(shouldShowLastCrash(readMicroserviceCrashStatus({}))).toBe(false);
    expect(
      shouldShowLastCrash(readMicroserviceCrashStatus({ lastError: "" })),
    ).toBe(false);
  });

  it("shows restartCount when greater than 0", () => {
    expect(
      shouldShowRestartCount(readMicroserviceCrashStatus({ restartCount: 1 })),
    ).toBe(true);
  });

  it("shows restartCount 0 when leftover last crash is still set", () => {
    expect(
      shouldShowRestartCount(
        readMicroserviceCrashStatus({
          lastError: "exitCode=1 oomKilled=false",
          lastErrorAt: 1726660000123,
          restartCount: 0,
        }),
      ),
    ).toBe(true);
  });

  it("hides restartCount when there is no crash history", () => {
    expect(shouldShowRestartCount(readMicroserviceCrashStatus({}))).toBe(false);
  });
});

describe("formatLastErrorAt", () => {
  it("returns null when lastErrorAt is 0 or invalid", () => {
    expect(formatLastErrorAt(0)).toBeNull();
    expect(formatLastErrorAt(Number.NaN)).toBeNull();
  });

  it("formats unix milliseconds", () => {
    const at = 1726660000123;
    const formatted = formatLastErrorAt(at);
    expect(formatted).toContain(format(new Date(at), "PPpp"));
  });
});

describe("microserviceCrashSlideoverFields", () => {
  it("omits current error, last crash, and restarts when unknown", () => {
    expect(
      microserviceCrashSlideoverFields({ status: {} }).map((f) => f.label),
    ).toEqual([]);
  });

  it("splits current error from last crash and leftover restart count", () => {
    const labels = microserviceCrashSlideoverFields({
      status: {
        errorMessage: "exitCode=1 oomKilled=true",
        lastError: "exitCode=1 oomKilled=true",
        lastErrorAt: 1726660000123,
        restartCount: 0,
      },
    }).map((field) => field.label);
    expect(labels).toEqual([
      "Current Error",
      "Last Crash",
      "Last Crash At",
      "Restarts",
    ]);
  });

  it("keeps last crash after current error clears", () => {
    const labels = microserviceCrashSlideoverFields({
      status: {
        errorMessage: "",
        lastError: "CRI reason=Error exitCode=1 message=config missing",
        lastErrorAt: 1726660000123,
        restartCount: 4,
      },
    }).map((field) => field.label);
    expect(labels).toEqual(["Last Crash", "Last Crash At", "Restarts"]);
  });

  it("renders last crash text as-is after recovery", () => {
    const row = {
      status: {
        errorMessage: "",
        lastError: "CRI reason=Error exitCode=1 message=config missing",
        lastErrorAt: 1726660000123,
        restartCount: 4,
      },
    };
    const fields = microserviceCrashSlideoverFields(row);
    render(
      <>
        {fields.map((field) => (
          <div key={field.label}>{field.render(row)}</div>
        ))}
      </>,
    );
    expect(
      screen.getByText("CRI reason=Error exitCode=1 message=config missing"),
    ).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });
});
