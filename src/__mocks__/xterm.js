import { vi } from "vitest";

export class Terminal {
  constructor() {
    this.onData = vi.fn();
    this.loadAddon = vi.fn();
    this.open = vi.fn();
    this.dispose = vi.fn();
    this.write = vi.fn();
    this.reset = vi.fn();
    this.resize = vi.fn();
    this.focus = vi.fn();
  }
}
