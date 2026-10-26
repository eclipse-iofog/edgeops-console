export const TERMINAL_FONT_FAMILY =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';

export const MIN_TERMINAL_VIEWPORT_PX = 80;
export const MIN_TERMINAL_COLS = 2;
export const MAX_TERMINAL_COLS = 4096;
export const MIN_TERMINAL_ROWS = 1;
export const MAX_TERMINAL_ROWS = 4096;

export type TerminalSize = {
  cols: number;
  rows: number;
};

export function isTerminalViewportMeasurable(
  width: number,
  height: number,
): boolean {
  return (
    width >= MIN_TERMINAL_VIEWPORT_PX && height >= MIN_TERMINAL_VIEWPORT_PX
  );
}

/** True when the shell should be told about this grid. Matches the agent bounds. */
export function isPublishableTerminalSize(
  cols: number,
  rows: number,
  previous: TerminalSize | null,
): boolean {
  if (!Number.isInteger(cols) || !Number.isInteger(rows)) {
    return false;
  }
  if (cols < MIN_TERMINAL_COLS || cols > MAX_TERMINAL_COLS) {
    return false;
  }
  if (rows < MIN_TERMINAL_ROWS || rows > MAX_TERMINAL_ROWS) {
    return false;
  }
  if (previous && previous.cols === cols && previous.rows === rows) {
    return false;
  }
  return true;
}

export function resizeControlPayload(cols: number, rows: number): string {
  return JSON.stringify({ type: "resize", cols, rows });
}

const EXEC_STATUS_NOTICES = [
  "Waiting for agent connection. Interactive exec will begin once the agent connects.",
  "Agent connected. Interactive exec is ready.",
] as const;

/** Pull controller status sentences out of a PTY chunk. The rest stays raw. */
export function takeExecStatusNotice(bytes: Uint8Array): {
  status: string | null;
  rest: Uint8Array;
} {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return { status: null, rest: bytes };
  }

  let status: string | null = null;
  let remaining = text;
  for (;;) {
    const stripped = remaining.replace(/^[\r\n]+/, "");
    const notice = EXEC_STATUS_NOTICES.find((line) =>
      stripped.startsWith(line),
    );
    if (!notice) {
      remaining = stripped;
      break;
    }
    status = notice;
    remaining = stripped.slice(notice.length);
  }
  remaining = remaining.replace(/^[\r\n]+/, "");
  if (!status) {
    return { status: null, rest: bytes };
  }
  if (!remaining) {
    return { status, rest: new Uint8Array() };
  }
  return { status, rest: new TextEncoder().encode(remaining) };
}

export function isSafeTerminalLink(uri: string): boolean {
  try {
    const url = new URL(uri);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
