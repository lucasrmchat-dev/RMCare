import test from "node:test";
import assert from "node:assert/strict";

process.env.ADMIN_SESSION_SECRET = "test-secret-with-enough-entropy";
const { createAdminSession, verifyAdminSession } = await import("../src/lib/session.js");

test("cria e valida uma sessão administrativa assinada", async () => {
  const token = await createAdminSession("admin", 1_000);
  assert.equal((await verifyAdminSession(token, 2_000)).sub, "admin");
});

test("rejeita sessão adulterada e sessão expirada", async () => {
  const token = await createAdminSession("admin", 1_000);
  assert.equal(await verifyAdminSession(`${token}x`, 2_000), null);
  assert.equal(await verifyAdminSession(token, 99_999_999), null);
});

