import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function key(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.AUTH_SECRET;
  if (!secret) throw new Error("Set ENCRYPTION_KEY or AUTH_SECRET to store API keys.");
  return createHash("sha256").update(secret).digest();
}

/** AES-256-GCM. Output: base64(iv).base64(tag).base64(ciphertext) */
export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ct].map((b) => b.toString("base64")).join(".");
}

export function decrypt(payload: string | null | undefined): string | undefined {
  if (!payload) return undefined;
  try {
    const [iv, tag, ct] = payload.split(".").map((p) => Buffer.from(p, "base64"));
    const decipher = createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  } catch {
    return undefined;
  }
}

export function maskKey(k: string | undefined): string | null {
  if (!k) return null;
  return k.length <= 8 ? "••••" : `${k.slice(0, 4)}••••${k.slice(-4)}`;
}
