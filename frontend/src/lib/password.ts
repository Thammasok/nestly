// Look-alike characters (0/O, 1/l/I) are left out so a password read aloud or copied by hand survives.
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%*-_';
const ALL = LOWER + UPPER + DIGITS + SYMBOLS;

/** Uniform random index in [0, max) from the CSPRNG, using rejection sampling to avoid modulo bias. */
function randomIndex(max: number): number {
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  const buffer = new Uint32Array(1);
  do {
    crypto.getRandomValues(buffer);
  } while (buffer[0] >= limit);
  return buffer[0] % max;
}

const pick = (chars: string) => chars[randomIndex(chars.length)];

/** Random password with at least one lowercase, uppercase, digit and symbol. */
export function generatePassword(length = 16): string {
  const chars = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)];
  while (chars.length < length) chars.push(pick(ALL));
  // Fisher–Yates so the guaranteed classes aren't always in the first four positions.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
