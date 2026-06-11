const DEFAULT_LENGTH = 16;

/** Unambiguous charset (no 0/O, 1/l/I). */
const CHARSET =
  "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*";

export function generatePassword(length = DEFAULT_LENGTH): string {
  const size = Math.max(8, length);
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => CHARSET[byte % CHARSET.length]).join("");
}
