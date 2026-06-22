import { describe, expect, it } from "vitest";
import { generatePassword, meetsDefaultPasswordPolicy } from "./generatePassword";

describe("generatePassword", () => {
  it("always satisfies default Controller complexity rules", () => {
    for (let i = 0; i < 100; i++) {
      const password = generatePassword();
      expect(meetsDefaultPasswordPolicy(password)).toBe(true);
    }
  });

  it("respects minimum length", () => {
    for (let i = 0; i < 20; i++) {
      expect(generatePassword(8).length).toBeGreaterThanOrEqual(12);
      expect(generatePassword(20).length).toBe(20);
    }
  });
});
