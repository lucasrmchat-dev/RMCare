import { NextResponse } from "next/server";
import { actionGerarBackupCompletoSistema } from "@/actions/backupSystem";

export async function GET(request) {
  try {
    const res = await actionGerarBackupCompletoSistema();

    if (!res.success) {
      return NextResponse.json({ error: "Falha ao gerar backup" }, { status: 500 });
    }

    const jsonStr = JSON.stringify(res.snapshot, null, 2);
    const slug = res.snapshot?.metadata?.empresa_slug || "clinica";
    const dataStr = new Date().toISOString().substring(0, 10);
    const fileName = `rmcare_backup_${slug}_${dataStr}.json`;

    return new NextResponse(jsonStr, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate"
      }
    });
  } catch (error) {
    console.error("[API Backup Error]:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno ao processar backup do sistema." },
      { status: 401 }
    );
  }
}

export async function POST() {
  try {
    const res = await actionGerarBackupCompletoSistema();
    return NextResponse.json(res);
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Erro ao executar rotina de backup." },
      { status: 500 }
    );
  }
}
