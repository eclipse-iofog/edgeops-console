import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RegistryCaTextBox from "./RegistryCaTextBox";
import { encodeRegistryCa } from "@/lib/registryCa";

const SAMPLE_PEM = `-----BEGIN CERTIFICATE-----
MIIBkTCB+wIJAKHH0b1b0example
-----END CERTIFICATE-----
`;

describe("RegistryCaTextBox", () => {
  it("hides as base64 and reveals PEM", () => {
    const wire = encodeRegistryCa(SAMPLE_PEM);
    render(<RegistryCaTextBox data={wire} />);

    const field = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(field.value).toBe(wire.replace(/\n+$/, ""));
    expect(field.value).not.toContain("BEGIN CERTIFICATE");

    fireEvent.click(screen.getByTitle("Toggle visibility"));
    expect(field.value).toContain("BEGIN CERTIFICATE");
  });

  it("keeps invalid base64 as the raw string when revealed", () => {
    const raw = "not!!!valid-base64";
    render(<RegistryCaTextBox data={raw} />);

    const field = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(field.value).toBe(raw);

    fireEvent.click(screen.getByTitle("Toggle visibility"));
    expect(field.value).toBe(raw);
  });
});
