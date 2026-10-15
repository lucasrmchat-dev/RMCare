/**
 * Link público e único de confirmação de presença (confirmar / remarcar / cancelar).
 *
 * Formato do token: <uuid do agendamento em base64url (16 bytes)>.<HMAC-SHA256 truncado em 16 bytes>
 * - Curto (~45 caracteres) para caber bem em mensagens de WhatsApp.
 * - Sem expiração embutida: a validade é decidida pelo estado atual do agendamento no banco
 *   (data já passou, cancelado etc.), então o mesmo link continua válido após uma remarcação.
 * - Só pode ser gerado no servidor (exige o segredo). Nunca exponha a geração em ação pública.
 */

import { formatarTelefoneEnvio } from "./phoneUtils.js";

const encoder = new TextEncoder();
const SIGNATURE_BYTES = 16;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const secret = () =>
  process.env.APPOINTMENT_CONFIRM_SECRET ||
  process.env.APPOINTMENT_ACCESS_SECRET ||
  process.env.ADMIN_SESSION_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

async function key() {
  const value = secret();
  if (!value) throw new Error("Chave de assinatura do link de confirmação não configurada.");
  return crypto.subtle.importKey("raw", encoder.encode(`confirmacao:${value}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

const uuidToBytes = (uuid) => Buffer.from(uuid.replace(/-/g, ""), "hex");
const bytesToUuid = (bytes) => {
  const hex = Buffer.from(bytes).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

async function sign(idPart) {
  const signature = await crypto.subtle.sign("HMAC", await key(), encoder.encode(idPart));
  return Buffer.from(signature).subarray(0, SIGNATURE_BYTES).toString("base64url");
}

export async function criarTokenConfirmacao(agendamentoId) {
  if (!UUID_RE.test(String(agendamentoId || ""))) throw new Error("ID de agendamento inválido para o link de confirmação.");
  const idPart = uuidToBytes(agendamentoId).toString("base64url");
  return `${idPart}.${await sign(idPart)}`;
}

/** Retorna o ID do agendamento quando o token é autêntico; caso contrário, null. */
export async function verificarTokenConfirmacao(token) {
  try {
    const [idPart, signature] = String(token || "").split(".");
    if (!idPart || !signature) return null;
    const bytes = Buffer.from(idPart, "base64url");
    if (bytes.length !== 16) return null;
    const expected = Buffer.from(await sign(idPart));
    const received = Buffer.from(signature);
    if (expected.length !== received.length) return null;
    // Comparação em tempo constante
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ received[i];
    return diff === 0 ? bytesToUuid(bytes) : null;
  } catch {
    return null;
  }
}

const normalizarBaseUrl = (valor) => {
  const v = String(valor || "").trim();
  if (!v) return "";
  return (/^https?:\/\//i.test(v) ? v : `https://${v}`).replace(/\/+$/, "");
};

// Endereço pelo qual o sistema está sendo acessado (página de agendamento, painel ou rota da fila)
async function baseUrlDaRequisicao() {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host");
    if (!host) return "";
    const proto = h.get("x-forwarded-proto") || (/^(localhost|127\.|10\.|192\.168\.|\[::1\])/.test(host) ? "http" : "https");
    return `${proto.split(",")[0].trim()}://${host.split(",")[0].trim()}`;
  } catch {
    return ""; // fora de uma requisição (ex.: testes)
  }
}

/**
 * Domínio público dos links enviados ao paciente:
 * 1) base explícita, 2) NEXT_PUBLIC_APP_URL, 3) endereço da requisição atual.
 * Sem domínio fixo de fallback: um domínio errado gera links quebrados (e o WhatsApp
 * entrega a mensagem em branco ao tentar montar a prévia do link).
 */
export async function resolverBaseUrl(baseUrl) {
  return normalizarBaseUrl(baseUrl) || normalizarBaseUrl(process.env.NEXT_PUBLIC_APP_URL) || (await baseUrlDaRequisicao());
}

export async function montarLinkConfirmacao({ slug, agendamentoId, baseUrl }) {
  if (!slug || !agendamentoId) return "";
  const base = await resolverBaseUrl(baseUrl);
  if (!base) return "";
  return `${base}/${encodeURIComponent(slug)}/confirmar/${await criarTokenConfirmacao(agendamentoId)}`;
}

export const PLACEHOLDER_LINK_CONFIRMACAO = "{link_confirmacao}";

const ehTelefoneDoPaciente = (destino, ...telefonesDoPaciente) => {
  const alvo = formatarTelefoneEnvio(destino);
  return Boolean(alvo) && telefonesDoPaciente.some((tel) => formatarTelefoneEnvio(tel) === alvo);
};

/**
 * Gera o link de confirmação somente quando o agendamento pertence à clínica E o telefone de
 * destino é o do próprio paciente (as rotas de disparo/fila aceitam dados vindos do navegador).
 * Retorna "" quando não for seguro gerar. Nunca lança erro.
 */
export async function resolverLinkConfirmacaoSeguro({ db, agendamentoId, empresaId, slug, telefone, baseUrl }) {
  try {
    if (!db || !agendamentoId || !empresaId || !telefone) return "";

    // Consultas separadas (sem join embutido): o relacionamento agendamentos→pacientes
    // nem sempre está exposto no PostgREST deste banco, e o join derrubava a busca.
    const { data: ag } = await db
      .from("agendamentos")
      .select("*")
      .eq("id", agendamentoId)
      .eq("empresa_id", empresaId)
      .maybeSingle();
    if (!ag) return "";

    let telPaciente = null;
    if (ag.paciente_id) {
      const { data: pac } = await db.from("pacientes").select("telefone_whatsapp").eq("id", ag.paciente_id).maybeSingle();
      telPaciente = pac?.telefone_whatsapp || null;
    }
    if (!ehTelefoneDoPaciente(telefone, telPaciente, ag.telefone_whatsapp)) return "";

    let slugFinal = slug;
    if (!slugFinal) {
      const { data: emp } = await db.from("empresas").select("slug").eq("id", empresaId).maybeSingle();
      slugFinal = emp?.slug;
    }
    return slugFinal ? await montarLinkConfirmacao({ slug: slugFinal, agendamentoId: ag.id, baseUrl }) : "";
  } catch (error) {
    console.warn("Aviso ao gerar link de confirmação:", error?.message);
    return "";
  }
}

/** Página pública onde o paciente gerencia seus agendamentos (fallback quando o link pessoal não pode ser gerado). */
export async function linkConsultaPublica(baseUrl) {
  const base = await resolverBaseUrl(baseUrl);
  return base ? `${base}/consultar` : "";
}

/**
 * Substitui {link_confirmacao} em um texto de mensagem já formatado.
 * Mensagens montadas no navegador mantêm o placeholder intacto (parseTemplate preserva chaves
 * desconhecidas), e o servidor injeta o link assinado no momento do disparo.
 * Se o link pessoal não puder ser gerado com segurança, usa a página pública de consulta —
 * a mensagem nunca sai com a variável crua nem vazia.
 */
export async function injetarLinkConfirmacaoSeguro(texto, contexto = {}) {
  if (!texto || !String(texto).includes(PLACEHOLDER_LINK_CONFIRMACAO)) return texto;
  const link = (await resolverLinkConfirmacaoSeguro(contexto)) || (await linkConsultaPublica(contexto.baseUrl));
  // Sem domínio configurado, remove a variável e a linha fica sem link — nunca a chave crua
  return String(texto).replaceAll(PLACEHOLDER_LINK_CONFIRMACAO, link).replace(/[ \t]+$/gm, "");
}
