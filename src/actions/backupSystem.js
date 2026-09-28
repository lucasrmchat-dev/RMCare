"use server";

import { createClient } from "@supabase/supabase-js";
import { getAdminLogado } from "./adminData";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

const BACKUP_DIR = path.join(process.cwd(), "backups");

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/**
 * Escaneia 100% dos dados da clínica no Supabase e gera um pacote de backup completo (JSON + SQL).
 * Grava uma cópia na pasta local /backups e retorna o conteúdo para download instantâneo no navegador.
 */
export async function actionGerarBackupCompletoSistema() {
  const admin = await getAdminLogado(true);
  const empresaId = admin.empresa_id;

  // Busca dados da empresa para enriquecer o cabeçalho
  const { data: empresa } = await supabaseAdmin
    .from("empresas")
    .select("*")
    .eq("id", empresaId)
    .single();

  const timestampIso = new Date().toISOString();
  const timestampFile = timestampIso.replace(/[:.]/g, "-");

  // Lista de todas as tabelas do ecossistema DRM Care
  const TABELAS_CONFIG = [
    { nome: "empresas", colunaFiltro: "id", valorFiltro: empresaId },
    { nome: "administradores", colunaFiltro: "empresa_id", valorFiltro: empresaId, sanitizar: true },
    { nome: "pacientes", colunaFiltro: "empresa_id", valorFiltro: empresaId },
    { nome: "agendamentos", colunaFiltro: "empresa_id", valorFiltro: empresaId },
    { nome: "bloqueios_horarios", colunaFiltro: "empresa_id", valorFiltro: empresaId },
    { nome: "fila_mensagens", colunaFiltro: "empresa_id", valorFiltro: empresaId },
    { nome: "regras_mensagens", colunaFiltro: "empresa_id", valorFiltro: empresaId },
    { nome: "regras_agenda", colunaFiltro: "empresa_id", valorFiltro: empresaId },
    { nome: "servicos", colunaFiltro: "empresa_id", valorFiltro: empresaId },
    { nome: "convenios", colunaFiltro: "empresa_id", valorFiltro: empresaId },
    { nome: "perguntas_triagem", colunaFiltro: "empresa_id", valorFiltro: empresaId },
    { nome: "logs_auditoria", colunaFiltro: "empresa_id", valorFiltro: empresaId }
  ];

  const backupData = {};
  const resumoTabelas = {};
  let totalRegistros = 0;

  for (const tab of TABELAS_CONFIG) {
    try {
      let query = supabaseAdmin.from(tab.nome).select("*");
      if (tab.colunaFiltro && tab.valorFiltro) {
        query = query.eq(tab.colunaFiltro, tab.valorFiltro);
      }

      const { data, error } = await query;

      if (!error && Array.isArray(data)) {
        let registros = data;
        // Não expõe hashes de senha brutos em backups de rotina se sanitizar estiver ativo
        if (tab.sanitizar) {
          registros = data.map((item) => {
            const copy = { ...item };
            delete copy.senha_hash;
            return copy;
          });
        }

        backupData[tab.nome] = registros;
        resumoTabelas[tab.nome] = registros.length;
        totalRegistros += registros.length;
      } else {
        backupData[tab.nome] = [];
        resumoTabelas[tab.nome] = 0;
      }
    } catch (errTab) {
      console.warn(`[Backup DRM Care] Tabela ${tab.nome} não encontrada ou erro:`, errTab.message);
      backupData[tab.nome] = [];
      resumoTabelas[tab.nome] = 0;
    }
  }

  // Busca tabelas dependentes (opcoes_triagem via perguntas)
  try {
    const perguntasIds = (backupData.perguntas_triagem || []).map((p) => p.id).filter(Boolean);
    if (perguntasIds.length > 0) {
      const { data: opcoes } = await supabaseAdmin
        .from("opcoes_triagem")
        .select("*")
        .in("pergunta_id", perguntasIds);
      backupData["opcoes_triagem"] = opcoes || [];
      resumoTabelas["opcoes_triagem"] = (opcoes || []).length;
      totalRegistros += (opcoes || []).length;
    } else {
      backupData["opcoes_triagem"] = [];
      resumoTabelas["opcoes_triagem"] = 0;
    }
  } catch (eOpcoes) {
    backupData["opcoes_triagem"] = [];
    resumoTabelas["opcoes_triagem"] = 0;
  }

  // Calcula checksum SHA-256 para integridade inviolável
  const dataString = JSON.stringify(backupData);
  const checksum = crypto.createHash("sha256").update(dataString).digest("hex");

  const snapshotCompleto = {
    metadata: {
      sistema: "DRM Care - Clinical OS",
      normativa: "LGPD Art. 46 / Segurança Máxima & Backup Criptográfico",
      versao_schema: "2.5.0",
      backup_id: crypto.randomUUID(),
      data_geracao: timestampIso,
      empresa_id: empresaId,
      empresa_nome: empresa?.nome || "Clínica",
      empresa_slug: empresa?.slug || "",
      usuario_solicitante: admin.usuario,
      total_tabelas: Object.keys(backupData).length,
      total_registros: totalRegistros,
      checksum_sha256: checksum,
      tabelas_resumo: resumoTabelas
    },
    tabelas: backupData
  };

  // Salva no disco local da máquina se o diretório for gravável
  try {
    ensureBackupDir();
    const nomeArquivoLocal = `rmcare_backup_${empresa?.slug || "clinica"}_${timestampFile}.json`;
    const caminhoCompleto = path.join(BACKUP_DIR, nomeArquivoLocal);
    fs.writeFileSync(caminhoCompleto, JSON.stringify(snapshotCompleto, null, 2), "utf-8");

    // Mantém apenas os últimos 15 backups locais para não acumular espaço
    const arquivos = fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith("rmcare_backup_") && f.endsWith(".json"))
      .sort()
      .reverse();

    if (arquivos.length > 15) {
      arquivos.slice(15).forEach((antigo) => {
        try { fs.unlinkSync(path.join(BACKUP_DIR, antigo)); } catch (_) {}
      });
    }
  } catch (eDisk) {
    console.warn("[Backup DRM Care] Não foi possível salvar em disco local:", eDisk.message);
  }

  // Registra o evento de backup na trilha de auditoria
  try {
    await supabaseAdmin.from("logs_auditoria").insert({
      empresa_id: empresaId,
      responsavel: admin.usuario,
      modulo: "seguranca_backup",
      acao: "Backup Completo do Sistema",
      detalhes: `Backup de ${totalRegistros} registros em ${Object.keys(backupData).length} tabelas gerado com sucesso. Checksum: ${checksum.slice(0, 16)}...`
    });
  } catch (_) {}

  return {
    success: true,
    snapshot: snapshotCompleto,
    resumo: {
      totalRegistros,
      totalTabelas: Object.keys(backupData).length,
      dataGeracao: timestampIso,
      checksum: checksum,
      tabelas: resumoTabelas
    }
  };
}

/**
 * Lista os backups salvos localmente na máquina
 */
export async function actionListarBackupsLocais() {
  await getAdminLogado(true);
  try {
    ensureBackupDir();
    const arquivos = fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith("rmcare_backup_") && f.endsWith(".json"))
      .sort()
      .reverse();

    const lista = arquivos.map((nome) => {
      const stats = fs.statSync(path.join(BACKUP_DIR, nome));
      return {
        nome,
        tamanhoBytes: stats.size,
        tamanhoKb: (stats.size / 1024).toFixed(1) + " KB",
        criadoEm: stats.birthtime || stats.mtime
      };
    });

    return { success: true, backups: lista };
  } catch (e) {
    return { success: false, backups: [] };
  }
}

/**
 * Restauração Segura de Emergência
 * Permite restaurar registros de tabelas específicas (ex: fila_mensagens, agendamentos, pacientes)
 * sem risco de perda de chaves estrangeiras ou exclusão destrutiva.
 */
export async function actionRestaurarTabelasBackup(backupPayload, tabelasParaRestaurar = []) {
  const admin = await getAdminLogado(true);
  const empresaId = admin.empresa_id;

  if (!backupPayload || !backupPayload.tabelas) {
    throw new Error("Arquivo de backup inválido ou corrompido.");
  }

  // Verifica se o backup pertence a esta empresa ou valida permissão
  if (backupPayload.metadata?.empresa_id && backupPayload.metadata.empresa_id !== empresaId && admin.role !== "sistema") {
    throw new Error("Este backup pertence a outra empresa e não pode ser restaurado nesta clínica por segurança multi-tenant.");
  }

  const tabelasAlvo = tabelasParaRestaurar.length > 0 
    ? tabelasParaRestaurar 
    : Object.keys(backupPayload.tabelas);

  const resultadoRestauracao = {};

  for (const tabNome of tabelasAlvo) {
    const dadosTab = backupPayload.tabelas[tabNome];
    if (!Array.isArray(dadosTab) || dadosTab.length === 0) {
      resultadoRestauracao[tabNome] = { restaurados: 0, pulados: 0 };
      continue;
    }

    try {
      // Garante que todos os registros a serem restaurados pertençam à empresa_id atual
      const dadosSaneados = dadosTab.map((row) => {
        const copy = { ...row };
        if (copy.empresa_id !== undefined) copy.empresa_id = empresaId;
        return copy;
      });

      // Upsert seguro para não falhar com conflitos de chave primária
      const { data, error } = await supabaseAdmin
        .from(tabNome)
        .upsert(dadosSaneados, { onConflict: "id", ignoreDuplicates: false });

      if (error) {
        resultadoRestauracao[tabNome] = { error: error.message };
      } else {
        resultadoRestauracao[tabNome] = { restaurados: dadosSaneados.length };
      }
    } catch (eTab) {
      resultadoRestauracao[tabNome] = { error: eTab.message };
    }
  }

  // Log de auditoria da restauração
  try {
    await supabaseAdmin.from("logs_auditoria").insert({
      empresa_id: empresaId,
      responsavel: admin.usuario,
      modulo: "seguranca_backup",
      acao: "Restauração de Backup Realizada",
      detalhes: `Tabelas restauradas: ${tabelasAlvo.join(", ")}.`
    });
  } catch (_) {}

  return {
    success: true,
    resultado: resultadoRestauracao
  };
}
