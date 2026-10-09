/**
 * Módulo de Rate Limiting e Proteção contra Abuso / DDoS
 * Sistema RMCare / RMAgenda - Clinical OS
 * 
 * Funcionalidades:
 * - Algoritmo Sliding Window em memória com auto-expiração e limpeza
 * - Integração transparente com Upstash Redis se UPSTASH_REDIS_REST_URL estiver configurada
 * - Headers padronizados RFC 6585 (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset)
 */

// Armazenamento em memória para instâncias serverless / Next.js
const memoryStore = new Map();

// Limpeza periódica em memória de entradas expiradas a cada 60 segundos
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of memoryStore.entries()) {
      if (value.resetAt <= now) {
        memoryStore.delete(key);
      }
    }
  }, 60000);
}

/**
 * Executa checagem de rate limit usando Upstash Redis via REST API (se disponível)
 */
async function checkUpstash(key, limit, windowSeconds) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  try {
    const redisKey = `ratelimit:${key}`;
    const pipelineUrl = `${url}/pipeline`;

    const res = await fetch(pipelineUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["TTL", redisKey],
      ]),
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = await res.json();
    const count = data[0]?.result || 1;
    let ttl = data[1]?.result || windowSeconds;

    if (count === 1 || ttl === -1) {
      await fetch(`${url}/EXPIRE/${redisKey}/${windowSeconds}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      ttl = windowSeconds;
    }

    const reset = Math.floor(Date.now() / 1000) + ttl;
    const remaining = Math.max(0, limit - count);

    return {
      success: count <= limit,
      limit,
      remaining,
      reset,
    };
  } catch (err) {
    console.warn("[RateLimit Upstash Fallback to Memory]:", err.message);
    return null;
  }
}

/**
 * Executa checagem de rate limit em memória local
 */
function checkMemory(key, limit, windowSeconds) {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const record = memoryStore.get(key);

  if (!record || record.resetAt <= now) {
    const resetAt = now + windowMs;
    memoryStore.set(key, { count: 1, resetAt });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: Math.floor(resetAt / 1000),
    };
  }

  record.count += 1;
  const remaining = Math.max(0, limit - record.count);
  const success = record.count <= limit;

  return {
    success,
    limit,
    remaining,
    reset: Math.floor(record.resetAt / 1000),
  };
}

/**
 * Função principal de verificação de Rate Limit.
 * 
 * @param {string} identifier - IP do cliente ou ID do usuário
 * @param {object} options - Configurações
 * @param {number} options.limit - Número máximo de requisições
 * @param {number} options.windowSeconds - Janela de tempo em segundos
 * @returns {Promise<{ success: boolean, limit: number, remaining: number, reset: number }>}
 */
export async function rateLimit(identifier, options = {}) {
  const { limit = 60, windowSeconds = 60 } = options;
  const safeIdentifier = (identifier || "unknown_client").trim();
  const key = `${safeIdentifier}:${limit}:${windowSeconds}`;

  // Tenta Upstash Redis primeiro
  const upstashResult = await checkUpstash(key, limit, windowSeconds);
  if (upstashResult) return upstashResult;

  // Fallback em memória ultrarrápido
  return checkMemory(key, limit, windowSeconds);
}

/**
 * Helper para extrair o IP real do cliente mesmo através de proxies (Vercel, Cloudflare, Nginx)
 * @param {Request} request 
 * @returns {string}
 */
export function getClientIp(request) {
  const headers = request.headers;
  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();

  const xRealIp = headers.get("x-real-ip");
  if (xRealIp) return xRealIp.trim();

  const xForwardedFor = headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const ips = xForwardedFor.split(",").map((ip) => ip.trim());
    return ips[0];
  }

  return "127.0.0.1";
}
