import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusColor } from "@/lib/constants/Enums/StatusColor";
import {
  isImagePullFailed,
  microserviceImagePullSlideoverFields,
  microserviceStatusColor,
} from "./microserviceImagePullStatus";

describe("isImagePullFailed", () => {
  it("treats a missing key and an empty string as healthy", () => {
    expect(isImagePullFailed(undefined)).toBe(false);
    expect(isImagePullFailed({})).toBe(false);
    expect(isImagePullFailed({ imagePullStatus: "" })).toBe(false);
  });

  it("is true only for the current pull failure", () => {
    expect(isImagePullFailed({ imagePullStatus: "failed" })).toBe(true);
    expect(isImagePullFailed({ imagePullStatus: "FAILED" })).toBe(false);
  });
});

describe("microserviceStatusColor", () => {
  it("turns a live service yellow when the desired image failed to pull", () => {
    expect(
      microserviceStatusColor({
        status: "RUNNING",
        imagePullStatus: "failed",
      }),
    ).toBe(StatusColor.WARNING);
  });

  it("keeps a healthy running service green", () => {
    expect(microserviceStatusColor({ status: "RUNNING" })).toBe(
      StatusColor.RUNNING,
    );
    expect(
      microserviceStatusColor({ status: "RUNNING", imagePullStatus: "" }),
    ).toBe(StatusColor.RUNNING);
  });

  it("leaves a queued pull failure on the queued color", () => {
    expect(
      microserviceStatusColor({
        status: "QUEUED",
        imagePullStatus: "failed",
      }),
    ).toBe(StatusColor.QUEUED);
  });
});

describe("microserviceImagePullSlideoverFields", () => {
  it("omits the row when there is no pull failure", () => {
    expect(
      microserviceImagePullSlideoverFields({ status: {} }).map(
        (field) => field.label,
      ),
    ).toEqual([]);
    expect(
      microserviceImagePullSlideoverFields({
        status: { imagePullStatus: "" },
      }).map((field) => field.label),
    ).toEqual([]);
  });

  it("shows failed while the pull is outstanding", () => {
    const row = {
      status: {
        status: "RUNNING",
        imagePullStatus: "failed",
        errorMessage: "unable to pull docker.io/library/nginx:miss: denied",
      },
    };
    const fields = microserviceImagePullSlideoverFields(row);
    expect(fields.map((field) => field.label)).toEqual(["Image Pull Status"]);
    render(<>{fields[0].render(row)}</>);
    expect(screen.getByText("failed")).toBeInTheDocument();
  });
});
