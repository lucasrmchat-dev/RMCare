const encoder = new TextEncoder();
const secret = () => process.env.APPOINTMENT_ACCESS_SECRET || process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
const b64 = (bytes) => Buffer.from(bytes).toString("base64url");

async function key() {
  return crypto.subtle.importKey("raw", encoder.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function createAppointmentAccess(patientId, now = Date.now()) {
  const payload = b64(JSON.stringify({ sub: patientId, exp: now + 30 * 60 * 1000 }));
  const signature = await crypto.subtle.sign("HMAC", await key(), encoder.encode(payload));
  return `${payload}.${b64(signature)}`;
}

export async function verifyAppointmentAccess(token, now = Date.now()) {
  try {
    const [payload, signature] = token.split(".");
    const valid = await crypto.subtle.verify("HMAC", await key(), Buffer.from(signature, "base64url"), encoder.encode(payload));
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return valid && data.exp > now ? data : null;
  } catch { return null; }
}

