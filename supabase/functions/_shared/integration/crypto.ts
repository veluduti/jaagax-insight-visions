const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function randomToken(bytes = 32) {
  const value = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...value)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function base64(bytes: ArrayBuffer | Uint8Array) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return btoa(String.fromCharCode(...data));
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), c => c.charCodeAt(0));
}

export async function sha256(value: string) {
  return base64(await crypto.subtle.digest("SHA-256", encoder.encode(value))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function encryptionKey() {
  const secret = Deno.env.get("INTEGRATION_CREDENTIAL_KEY");
  if (!secret) throw new Error("Integration credential encryption is not configured");
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptCredentials(value: Record<string, unknown>) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(), encoder.encode(JSON.stringify(value)));
  return { ciphertext: base64(ciphertext), iv: base64(iv) };
}

export async function decryptCredentials(row: { ciphertext: string; iv: string } | null): Promise<Record<string, any>> {
  if (!row) return {};
  const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(row.iv) }, await encryptionKey(), fromBase64(row.ciphertext));
  return JSON.parse(decoder.decode(clear));
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signPayload(secret: string, raw: string) {
  return base64(await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(raw)));
}

export async function verifySignature(secret: string, raw: string, signature: string) {
  try { return await crypto.subtle.verify("HMAC", await hmacKey(secret), encoder.encode(raw), fromBase64(signature)); }
  catch { return false; }
}
