import crypto from "node:crypto";

export const SESSION_COOKIE = "pe_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET não configurado em .env.local.");
  return secret;
}

function sign(value: string): string {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("hex");
}

export function createSessionToken(email: string): string {
  const expiresAt = String(Date.now() + SESSION_MAX_AGE * 1000);
  const payload = `${expiresAt}.${Buffer.from(email, "utf8").toString("base64url")}`;
  return `${payload}.${sign(payload)}`;
}

export function parseSessionToken(
  token: string | undefined,
): { email: string } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [expiresAt, emailEncoded, signature] = parts;
  const expected = sign(`${expiresAt}.${emailEncoded}`);
  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  )
    return null;
  if (Number(expiresAt) <= Date.now()) return null;
  try {
    return { email: Buffer.from(emailEncoded, "base64url").toString("utf8") };
  } catch {
    return null;
  }
}

export function isSessionTokenValid(token: string | undefined): boolean {
  return parseSessionToken(token) !== null;
}
