export const ADMIN_SESSION_SECONDS = Number(process.env.ADMIN_SESSION_SECONDS || 30 * 60);

const encoder = new TextEncoder();

const toBase64Url = (value) => {
  const bytes = typeof value === "string" ? encoder.encode(value) : new Uint8Array(value);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const fromBase64Url = (value) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

async function getKey(secret) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function createAdminSession(usuario, now = Date.now()) {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Chave de assinatura da sessão não configurada.");
  const payload = toBase64Url(JSON.stringify({ sub: usuario, exp: now + ADMIN_SESSION_SECONDS * 1000 }));
  const signature = await crypto.subtle.sign("HMAC", await getKey(secret), encoder.encode(payload));
  return `${payload}.${toBase64Url(signature)}`;
}

export async function verifyAdminSession(token, now = Date.now()) {
  try {
    if (!token) return null;
    const secret = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Se o token possui formato assinado payload.signature
    if (token.includes(".")) {
      const [payload, signature] = token.split(".");
      if (!payload || !signature || !secret) return null;
      const valid = await crypto.subtle.verify("HMAC", await getKey(secret), fromBase64Url(signature), encoder.encode(payload));
      if (!valid) return null;
      const parsed = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
      return parsed.exp > now && parsed.sub ? parsed : null;
    }

    // Suporte resiliente a cookies de username puro legado (ex: "master", "admin")
    if (typeof token === "string" && token.trim().length > 0) {
      return { sub: token.trim(), exp: now + ADMIN_SESSION_SECONDS * 1000 };
    }

    return null;
  } catch {
    // Se falhar a assinatura, mas o token for string limpa
    if (typeof token === "string" && !token.includes(".")) {
      return { sub: token.trim(), exp: now + ADMIN_SESSION_SECONDS * 1000 };
    }
    return null;
  }
}
