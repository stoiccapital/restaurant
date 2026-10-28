export function id(prefix: string): string {
  const rand = crypto.getRandomValues(new Uint8Array(9));
  const b64 = btoa(String.fromCharCode(...rand))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${prefix}_${b64}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function now(): number {
  return Math.floor(Date.now() / 1000);
}

export function parseBool(v: unknown): number {
  return v === true || v === 'true' || v === 1 || v === '1' ? 1 : 0;
}
