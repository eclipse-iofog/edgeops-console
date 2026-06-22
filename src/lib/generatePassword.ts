const DEFAULT_LENGTH = 16;
const MIN_LENGTH = 12;

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const SPECIAL = "!@#$%&*";
const ALL = UPPER + LOWER + DIGITS + SPECIAL;

function pick(charset: string, bytes: Uint8Array, index: number): string {
  return charset[bytes[index] % charset.length];
}

function shuffle(chars: string[], bytes: Uint8Array, offset: number): string {
  const arr = [...chars];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = bytes[offset + i] % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join("");
}

/** Generates a password satisfying default Controller complexity (upper, lower, digit, min 12). */
export function generatePassword(length = DEFAULT_LENGTH): string {
  const size = Math.max(MIN_LENGTH, length);
  const bytes = new Uint8Array(size * 2);
  crypto.getRandomValues(bytes);

  const chars = [
    pick(UPPER, bytes, 0),
    pick(LOWER, bytes, 1),
    pick(DIGITS, bytes, 2),
  ];

  for (let i = chars.length; i < size; i++) {
    chars.push(pick(ALL, bytes, i));
  }

  return shuffle(chars, bytes, size);
}

export function meetsDefaultPasswordPolicy(password: string): boolean {
  return (
    password.length >= MIN_LENGTH &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}
