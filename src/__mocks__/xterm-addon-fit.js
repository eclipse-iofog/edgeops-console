import { vi } from "vitest";

export class FitAddon {
  activate = vi.fn();
  dispose = vi.fn();
  fit = vi.fn();
}
