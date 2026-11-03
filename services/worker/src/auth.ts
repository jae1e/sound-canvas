const encoder = new TextEncoder();
const INSTALL_ID = /^[A-Za-z0-9_-]{8,64}$/;

const toHex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Token format: `<installId>.<hex HMAC-SHA256(installId, TOKEN_SIGNING_SECRET)>`. */
export async function mintToken(secret: string, installId: string): Promise<string> {
  return `${installId}.${await hmacHex(secret, installId)}`;
}

/** Returns the install id when the bearer token is valid, otherwise null. */
export async function verifyBearer(header: string | null, secret: string | undefined): Promise<string | null> {
  if (!secret || !header) return null;
  const m = /^Bearer\s+(\S+)$/i.exec(header);
  if (!m) return null;
  const token = m[1]!;
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const id = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!INSTALL_ID.test(id)) return null;
  return timingSafeEqual(sig, await hmacHex(secret, id)) ? id : null;
}
