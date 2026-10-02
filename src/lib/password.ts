import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const KEYLEN = 64;
const COST = 16384; // scrypt N

function derive(password: string, salt: Buffer, n: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password.normalize("NFKC"), salt, KEYLEN, { N: n, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );
}

/** Format: scrypt$N$salt(base64)$hash(base64) */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(password, salt, COST);
  return `scrypt$${COST}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const [algo, n, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !n || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await derive(password, Buffer.from(salt, "base64"), Number(n));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// A fixed hash to verify against when the account doesn't exist, so a wrong
// username takes as long as a wrong password (no account enumeration by timing).
let dummy: Promise<string> | null = null;
export function dummyHash() {
  dummy ??= hashPassword("not-a-real-password");
  return dummy;
}

/** Tiny in-memory limiter for login attempts (per server instance). */
const attempts = new Map<string, { count: number; until: number }>();
export function tooManyAttempts(key: string, max = 8, windowMs = 10 * 60_000): boolean {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || a.until < now) {
    attempts.set(key, { count: 1, until: now + windowMs });
    return false;
  }
  a.count++;
  return a.count > max;
}
export function clearAttempts(key: string) {
  attempts.delete(key);
}
