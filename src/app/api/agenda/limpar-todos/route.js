import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminSession } from "@/lib/auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const authCookie =
      cookieStore.get("rmagenda_auth") ||
      cookieStore.get("rmcare_auth") ||
      cookieStore.get("admin_session") ||
      cookieStore.get("auth_token");

    let usuarioLogado = null;
    if (authCookie?.value) {
      try {
        const session = await verifyAdminSession(authCookie.value);
        usuarioLogado = session?.sub || authCookie.value;
      } catch (_) {
        usuarioLogado = authCookie.value;
      }
    }

    let empresaId = null;
    let usuarioNome = "admin";

    if (usuarioLogado) {
      const { data: admin } = await supabaseAdmin
        .from("administradores")
        .select("id, role, empresa_id, usuario")
        .eq("usuario", usuarioLogado)
        .maybeSingle();

      if (admin) {
        empresaId = admin.empresa_id;
        usuarioNome = admin.usuario;
      }
    }

    if (!empresaId) {
      return NextResponse.json(
        { success: false, error: "Acesso não autorizado: nenhuma clínica vinculada a esta conta." },
        { status: 403 }
      );
    }

    // 1. Identificar agendamentos da empresa
    const { data: ags } = await supabaseAdmin
      .from("agendamentos")
      .select("id")
      .eq("empresa_id", empresaId);

    const agIds = (ags || []).map((a) => a.id).filter(Boolean);

    // 2. Limpar mensagens da fila (fila_mensagens) para evitar violação de Foreign Key
    await supabaseAdmin
      .from("fila_mensagens")
      .delete()
      .eq("empresa_id", empresaId);

    if (agIds.length > 0) {
      for (let i = 0; i < agIds.length; i += 100) {
        const chunk = agIds.slice(i, i + 100);
        await supabaseAdmin
          .from("fila_mensagens")
          .delete()
          .in("agendamento_id", chunk);
      }
    }

    // 3. Quebrar auto-referência em agendamentos (consulta_inicial_id)
    await supabaseAdmin
      .from("agendamentos")
      .update({ consulta_inicial_id: null })
      .eq("empresa_id", empresaId);

    // 4. Excluir todos os agendamentos da clínica
    const { error: errAg } = await supabaseAdmin
      .from("agendamentos")
      .delete()
      .eq("empresa_id", empresaId);

    if (errAg) {
      console.error("[API Limpar Agenda] Erro agendamentos:", errAg.message);
      return NextResponse.json(
        { success: false, error: "Erro ao excluir agendamentos: " + errAg.message },
        { status: 500 }
      );
    }

    // 5. Excluir bloqueios e horários da clínica
    const { error: errBlk } = await supabaseAdmin
      .from("bloqueios_horarios")
      .delete()
      .eq("empresa_id", empresaId);

    if (errBlk) {
      console.error("[API Limpar Agenda] Erro bloqueios:", errBlk.message);
      return NextResponse.json(
        { success: false, error: "Erro ao excluir bloqueios: " + errBlk.message },
        { status: 500 }
      );
    }

    // 6. Registrar auditoria se existir a tabela
    try {
      await supabaseAdmin.from("auditoria").insert({
        empresa_id: empresaId,
        modulo: "agenda",
        acao: "Limpeza Total de Agendamentos",
        detalhes: `Todos os agendamentos e bloqueios foram excluídos por ${usuarioNome} para nova sincronização do zero.`,
        alterado_por: usuarioNome
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: "Todos os agendamentos e bloqueios foram excluídos com sucesso."
    });
  } catch (error) {
    console.error("[API Limpar Agenda] Erro inesperado:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno ao processar a limpeza da agenda." },
      { status: 500 }
    );
  }
}
