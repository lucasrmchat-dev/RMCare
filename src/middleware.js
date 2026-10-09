import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { verifyAdminSession } from "@/lib/session";

/**
 * Middleware Central de Segurança, Isolamento e Performance
 * Sistema RMCare / RMAgenda - Clinical OS
 */
export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request);

  // 1. Rate Limiting por IP para impedir ataques de DDoS e brute-force
  const isApiRoute = pathname.startsWith("/api");
  const isLoginRoute = pathname.startsWith("/login");

  if (isApiRoute || isLoginRoute) {
    // Limite mais estrito para rotas de autenticação (15 req/min) vs APIs gerais (60 req/min)
    const limit = isLoginRoute ? 15 : 60;
    const windowSeconds = 60;

    const rateResult = await rateLimit(`ip:${ip}:${isLoginRoute ? "login" : "api"}`, {
      limit,
      windowSeconds,
    });

    if (!rateResult.success) {
      if (isApiRoute) {
        return NextResponse.json(
          {
            success: false,
            error: "Limite de requisições excedido. Por favor, aguarde alguns instantes.",
            retryAfter: rateResult.reset,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(rateResult.reset - Math.floor(Date.now() / 1000)),
              "X-RateLimit-Limit": String(rateResult.limit),
              "X-RateLimit-Remaining": String(rateResult.remaining),
              "X-RateLimit-Reset": String(rateResult.reset),
            },
          }
        );
      } else {
        const errorUrl = new URL("/login", request.url);
        errorUrl.searchParams.set("error", "rate_limit_exceeded");
        return NextResponse.redirect(errorUrl, 307);
      }
    }
  }

  // 2. Proteção de Rotas Administrativas Privadas
  const isAdminRoute = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");

  if (isAdminRoute || isAdminApi) {
    const adminToken =
      request.cookies.get("rmagenda_auth")?.value ||
      request.cookies.get("rmcare_auth")?.value;

    let isAuthenticated = false;

    if (adminToken) {
      const session = await verifyAdminSession(adminToken);
      if (session && session.sub && session.exp > Date.now()) {
        isAuthenticated = true;
      }
    }

    if (!isAuthenticated) {
      if (isAdminApi) {
        return NextResponse.json(
          { success: false, error: "Acesso não autorizado. Sessão administrativa inválida ou expirada." },
          { status: 401 }
        );
      }

      // Redireciona usuários anônimos tentando acessar /admin para /login
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl, 307);
    }
  }

  // 3. Resposta e Injeção de Cabeçalhos de Segurança (Security Headers)
  const response = NextResponse.next();

  // Cabeçalhos de Segurança Padrão OWASP / Vercel
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );

  // 4. Tratamento de CORS para rotas de API
  if (isApiRoute) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");

    // Permite mesma origem ou domínios explicitamente autorizados
    if (origin) {
      const allowedOrigins = [
        "https://rmagenda.com.br",
        "https://www.rmagenda.com.br",
        process.env.NEXT_PUBLIC_APP_URL,
      ].filter(Boolean);

      const isAllowed =
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        origin.includes("localhost") ||
        (host && origin.includes(host));

      if (isAllowed) {
        response.headers.set("Access-Control-Allow-Origin", origin);
        response.headers.set("Access-Control-Allow-Credentials", "true");
        response.headers.set(
          "Access-Control-Allow-Methods",
          "GET, POST, PUT, DELETE, PATCH, OPTIONS"
        );
        response.headers.set(
          "Access-Control-Allow-Headers",
          "Content-Type, Authorization, X-Requested-With, X-RateLimit-Limit"
        );
      }
    }

    // Se for pre-flight OPTIONS, encerra com status 204
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: response.headers,
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Aplica o middleware a todas as rotas exceto arquivos estáticos e imagens
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/).*)",
  ],
};
