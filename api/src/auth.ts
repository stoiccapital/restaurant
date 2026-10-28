// Owner password hashing (PBKDF2-SHA256) + opaque session tokens.
// MVP: 150k iterations. Bump if cold-start CPU budget allows later.

const PBKDF2_ITERATIONS = 100_000; // Cloudflare Workers caps PBKDF2 at 100k
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function toHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
  return hex;
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function randomSaltHex(): string {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return toHex(salt.buffer);
}

export function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return toHex(bytes.buffer);
}

async function pbkdf2(password: string, saltBytes: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  );
  return toHex(bits);
}

export async function hashPassword(password: string, saltHex: string): Promise<string> {
  return pbkdf2(password, fromHex(saltHex));
}

export async function verifyPassword(password: string, saltHex: string, expectedHashHex: string): Promise<boolean> {
  const actual = await pbkdf2(password, fromHex(saltHex));
  if (actual.length !== expectedHashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expectedHashHex.charCodeAt(i);
  return diff === 0;
}

export function sessionExpiresAt(nowSeconds: number): number {
  return nowSeconds + SESSION_TTL_SECONDS;
}
