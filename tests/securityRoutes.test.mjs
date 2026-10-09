import test from "node:test";
import assert from "node:assert/strict";

process.env.ADMIN_SESSION_SECRET = "super-secret-key-with-high-entropy-rmcare-32-chars-long";

const { middleware } = await import("../src/middleware.js");
const { createAdminSession } = await import("../src/lib/session.js");
const { hashPassword, verifyPassword, encryptSensitiveData, decryptSensitiveData } = await import("../src/lib/security.js");

// Mock de requisição Next.js compatível com o middleware
function createMockRequest(urlPath, options = {}) {
  const { cookies = {}, headers = {}, method = "GET" } = options;
  const url = new URL(`http://localhost:3000${urlPath}`);

  return {
    method,
    url: url.toString(),
    nextUrl: url,
    headers: {
      get: (name) => {
        const lower = name.toLowerCase();
        return headers[lower] || headers[name] || null;
      },
    },
    cookies: {
      get: (name) => {
        const val = cookies[name];
        return val ? { name, value: val } : undefined;
      },
    },
  };
}

test("1. BLOQUEIO DE USUÁRIO ANÔNIMO EM ROTA PRIVADA (/admin)", async () => {
  // Simula acesso direto de usuário sem sessão (aba anônima) à rota administrativa
  const reqAnon = createMockRequest("/admin/empresa");
  const resAnon = await middleware(reqAnon);

  // Deve redirecionar para /login com status 307
  assert.equal(resAnon.status, 307, "Acesso anônimo deve receber redirecionamento 307");
  const location = resAnon.headers.get("location");
  assert.ok(location.includes("/login"), "Redirecionamento deve apontar para /login");
  assert.ok(location.includes("redirect=%2Fadmin%2Fempresa"), "Deve preservar a rota de origem");
});

test("2. BLOQUEIO DE USUÁRIO ANÔNIMO EM ENDPOINT PRIVADO (/api/admin)", async () => {
  const reqApi = createMockRequest("/api/admin/metricas");
  const resApi = await middleware(reqApi);

  assert.equal(resApi.status, 401, "Acesso anônimo em API privada deve receber 401 Unauthorized");
  const body = await resApi.json();
  assert.equal(body.success, false);
});

test("3. REJEIÇÃO DE TOKEN ADULTERADO OU INVÁLIDO", async () => {
  const reqTampered = createMockRequest("/admin/empresa", {
    cookies: { rmagenda_auth: "token_forjado_sem_assinatura_valida" },
  });
  const resTampered = await middleware(reqTampered);

  assert.equal(resTampered.status, 307, "Token inválido deve ser bloqueado");
  assert.ok(resTampered.headers.get("location").includes("/login"));
});

test("4. AUTORIZAÇÃO DE SESSÃO ADMINISTRATIVA AUTÊNTICA E VÁLIDA", async () => {
  const validToken = await createAdminSession("admin_clinica");
  const reqAuth = createMockRequest("/admin/empresa", {
    cookies: { rmagenda_auth: validToken },
  });
  const resAuth = await middleware(reqAuth);

  // Deve permitir o acesso com status 200 (NextResponse.next)
  assert.equal(resAuth.status, 200, "Usuário autenticado deve ter passagem autorizada");
});

test("5. CONFERÊNCIA RIGOROSA DE CABEÇALHOS DE SEGURANÇA (SECURITY HEADERS)", async () => {
  const req = createMockRequest("/");
  const res = await middleware(req);

  assert.equal(res.headers.get("X-Frame-Options"), "SAMEORIGIN", "Deve conter X-Frame-Options SAMEORIGIN");
  assert.equal(res.headers.get("X-Content-Type-Options"), "nosniff", "Deve conter nosniff");
  assert.equal(res.headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.ok(res.headers.get("Strict-Transport-Security").includes("max-age=63072000"));
});

test("6. CRIPTOGRAFIA DE SENHAS: HASH SEGURO PBKDF2 E COMPATIBILIDADE", async () => {
  const plainPassword = "SenhaForteDeTeste@2026!";
  const hash = await hashPassword(plainPassword);

  assert.ok(hash.startsWith("$pbkdf2$100000$"), "Hash deve utilizar o padrão PBKDF2 com 100k rounds");

  const verifyOk = await verifyPassword(plainPassword, hash);
  assert.equal(verifyOk.valid, true, "Senha correta deve ser validada");
  assert.equal(verifyOk.needsRehash, false, "Hash moderno não requer rehash");

  const verifyFail = await verifyPassword("senhaErrada", hash);
  assert.equal(verifyFail.valid, false, "Senha incorreta deve ser rejeitada");

  // Compatibilidade com senhas legadas em texto plano (com indicação de auto-upgrade)
  const legacyVerify = await verifyPassword("minhaSenhaAntiga", "minhaSenhaAntiga");
  assert.equal(legacyVerify.valid, true, "Senha legada é aceita sem quebra");
  assert.equal(legacyVerify.needsRehash, true, "Sistema sinaliza necessidade de upgrade de hash");
});

test("7. CRIPTOGRAFIA SIMÉTRICA AES-GCM-256 PARA DADOS SENSÍVEIS (LGPD)", async () => {
  const dadoClinico = "Paciente possui histórico de alergia severa a contraste iodado.";
  const chave = "chave-de-teste-com-32-caracteres-de-comprimento-seguro";

  const criptografado = await encryptSensitiveData(dadoClinico, chave);
  assert.notEqual(criptografado, dadoClinico);

  const descriptografado = await decryptSensitiveData(criptografado, chave);
  assert.equal(descriptografado, dadoClinico, "Dado descriptografado deve ser idêntico ao original");
});
