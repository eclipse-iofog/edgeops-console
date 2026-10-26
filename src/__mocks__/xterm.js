import { vi } from "vitest";

export class Terminal {
  constructor() {
    this.cols = 80;
    this.rows = 24;
    this.options = {};
    this.unicode = { activeVersion: "11" };
    this.onData = vi.fn(() => ({ dispose: vi.fn() }));
    this.loadAddon = vi.fn();
    this.open = vi.fn();
    this.dispose = vi.fn();
    this.write = vi.fn();
    this.writeln = vi.fn();
    this.clear = vi.fn();
    this.reset = vi.fn();
    this.resize = vi.fn();
    this.focus = vi.fn();
    this.hasSelection = vi.fn(() => false);
    this.getSelection = vi.fn(() => "");
    this.clearSelection = vi.fn();
    this.attachCustomKeyEventHandler = vi.fn();
  }
}
