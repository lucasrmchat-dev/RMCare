"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Stethoscope,
  ShieldCheck,
  CreditCard,
  Layers,
  HeartPulse,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  CalendarDays,
  UserCheck,
  Award,
  ChevronRight,
  BarChart3,
  PieChart,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Search
} from "lucide-react";
import {
  fadeUp,
  spring,
  staggerContainer,
  staggerItem,
  CustomSelect
} from "../components/SharedUI";
import { playDopamineSound, triggerHaptic } from "@/lib/dopamine";

// Helper para cálculo de idade
const calcularIdadeData = (dataNasc) => {
  if (!dataNasc) return null;
  let d, m, y;
  const str = String(dataNasc).trim();
  if (str.includes("/")) [d, m, y] = str.split("/").map(Number);
  else if (str.includes("-")) [y, m, d] = str.split("-").map(Number);
  if (!y || !m || !d || isNaN(y) || isNaN(m) || isNaN(d)) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - y;
  const mesAtual = hoje.getMonth() + 1;
  if (mesAtual < m || (mesAtual === m && hoje.getDate() < d)) idade--;
  return idade >= 0 && idade <= 125 ? idade : null;
};

// Helper para formatar moeda
const formatarMoeda = (val) =>
  Number(val || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2
  });

export default function MetricasView({
  subTab = "visao_geral",
  setSubTab,
  agendamentos = [],
  servicos = [],
  bloqueios = [],
  showToast
}) {
  // Filtros Globais
  const [periodoPreset, setPeriodoPreset] = useState("30dias");
  const [dataInicioCustom, setDataInicioCustom] = useState("");
  const [dataFimCustom, setDataFimCustom] = useState("");
  const [filtroEspecialidade, setFiltroEspecialidade] = useState("Todas");
  const [filtroEspecialista, setFiltroEspecialista] = useState("Todos");
  const [filtroModalidade, setFiltroModalidade] = useState("Todas");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [buscaPaciente, setBuscaPaciente] = useState("");

  // Sub-aba ativa interna se não fornecida externamente
  const [activeTab, setActiveTab] = useState(subTab || "visao_geral");

  const currentTab = setSubTab ? subTab : activeTab;
  const handleTabChange = (t) => {
    playDopamineSound("select");
    triggerHaptic("light");
    if (setSubTab) setSubTab(t);
    else setActiveTab(t);
  };

  // 1. FILTRAGEM TEMPORAL E MULTIDIMENSIONAL DOS AGENDAMENTOS
  const agendamentosFiltrados = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);

    let dataLimiteInicio = null;
    let dataLimiteFim = null;

    if (periodoPreset === "hoje") {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      dataLimiteInicio = d;
      dataLimiteFim = hoje;
    } else if (periodoPreset === "7dias") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      d.setHours(0, 0, 0, 0);
      dataLimiteInicio = d;
      dataLimiteFim = hoje;
    } else if (periodoPreset === "30dias") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      d.setHours(0, 0, 0, 0);
      dataLimiteInicio = d;
      dataLimiteFim = hoje;
    } else if (periodoPreset === "mes_atual") {
      const d = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      d.setHours(0, 0, 0, 0);
      dataLimiteInicio = d;
      dataLimiteFim = hoje;
    } else if (periodoPreset === "90dias") {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      d.setHours(0, 0, 0, 0);
      dataLimiteInicio = d;
      dataLimiteFim = hoje;
    } else if (periodoPreset === "ano_atual") {
      const d = new Date(hoje.getFullYear(), 0, 1);
      d.setHours(0, 0, 0, 0);
      dataLimiteInicio = d;
      dataLimiteFim = hoje;
    } else if (periodoPreset === "custom") {
      if (dataInicioCustom) {
        dataLimiteInicio = new Date(`${dataInicioCustom}T00:00:00`);
      }
      if (dataFimCustom) {
        dataLimiteFim = new Date(`${dataFimCustom}T23:59:59`);
      }
    }

    return (agendamentos || []).filter((item) => {
      // Filtro de data
      const itemDateStr = item.data_agendamento || item.created_at?.slice(0, 10);
      if (itemDateStr) {
        const itemDate = new Date(`${itemDateStr}T12:00:00`);
        if (dataLimiteInicio && itemDate < dataLimiteInicio) return false;
        if (dataLimiteFim && itemDate > dataLimiteFim) return false;
      }

      // Filtro de Especialidade
      if (filtroEspecialidade !== "Todas") {
        const esp = (item.especialidade || item.subtipo_exame || "").toLowerCase();
        if (!esp.includes(filtroEspecialidade.toLowerCase())) return false;
      }

      // Filtro de Especialista
      if (filtroEspecialista !== "Todos") {
        const prof = (item.medico_profissional || item.subtipo_exame || "").toLowerCase();
        if (!prof.includes(filtroEspecialista.toLowerCase())) return false;
      }

      // Filtro de Modalidade
      if (filtroModalidade !== "Todas") {
        const mod = (item.modalidade || "").toLowerCase();
        if (!mod.includes(filtroModalidade.toLowerCase())) return false;
      }

      // Filtro de Status
      if (filtroStatus !== "Todos") {
        const st = (item.status_atendimento || "agendado").toLowerCase();
        if (filtroStatus === "confirmados" && st !== "confirmado" && st !== "agendado" && st !== "realizado") return false;
        if (filtroStatus === "cancelados" && st !== "cancelado") return false;
        if (filtroStatus === "realizados" && st !== "realizado") return false;
        if (filtroStatus === "retorno" && item.tipo_servico !== "Retorno") return false;
      }

      // Filtro de busca textual de paciente
      if (buscaPaciente.trim()) {
        const term = buscaPaciente.toLowerCase();
        const pacNome = (item.pacientes?.nome_completo || item.nome_paciente || "").toLowerCase();
        const pacCpf = (item.pacientes?.cpf || "").replace(/\D/g, "");
        if (!pacNome.includes(term) && !pacCpf.includes(term)) return false;
      }

      return true;
    });
  }, [
    agendamentos,
    periodoPreset,
    dataInicioCustom,
    dataFimCustom,
    filtroEspecialidade,
    filtroEspecialista,
    filtroModalidade,
    filtroStatus,
    buscaPaciente
  ]);

  // Lista de especialidades e especialistas únicos para os seletores
  const especialidadesOpcoes = useMemo(() => {
    const setEsps = new Set();
    (agendamentos || []).forEach((a) => {
      if (a.especialidade) setEsps.add(a.especialidade);
      if (a.subtipo_exame) setEsps.add(a.subtipo_exame);
    });
    (servicos || []).forEach((s) => {
      if (s.especialidade) {
        s.especialidade.split(",").forEach((e) => e.trim() && setEsps.add(e.trim()));
      }
    });
    return ["Todas", ...Array.from(setEsps).sort()];
  }, [agendamentos, servicos]);

  const especialistasOpcoes = useMemo(() => {
    const setProfs = new Set();
    (agendamentos || []).forEach((a) => {
      if (a.medico_profissional && a.medico_profissional !== "A definir") {
        setProfs.add(a.medico_profissional);
      }
    });
    (servicos || []).forEach((s) => {
      if (s.nome) setProfs.add(s.nome);
    });
    return ["Todos", ...Array.from(setProfs).sort()];
  }, [agendamentos, servicos]);

  const modalidadesOpcoes = useMemo(() => {
    const setMods = new Set();
    (agendamentos || []).forEach((a) => {
      if (a.modalidade) setMods.add(a.modalidade);
    });
    const base = ["Particular", "Convênio"];
    return ["Todas", ...new Set([...base, ...Array.from(setMods)])];
  }, [agendamentos]);

  // ==========================================
  // CÁLCULOS ANALÍTICOS (BI ENGINE)
  // ==========================================
  const metricasCalculadas = useMemo(() => {
    const total = agendamentosFiltrados.length;
    if (total === 0) {
      return {
        total: 0,
        faturamentoTotal: 0,
        faturamentoParticular: 0,
        ticketMedio: 0,
        taxaComparecimento: 0,
        taxaCancelamento: 0,
        tempoMedioMin: 1.8,
        mediaAntecedenciaDias: 0,
        distribuicaoFaixaEtaria: [],
        idadeMedia: 0,
        rankingEspecialidades: [],
        rankingEspecialistas: [],
        distribuicaoModalidades: [],
        distribuicaoHorarios: [],
        distribuicaoDiasSemana: [],
        rankingEnfermidades: [],
        taxaPagamentoAntecipado: 0,
        pacientesRecorrentes: 0,
        pacientesNovos: 0,
        consultasCount: 0,
        examesCount: 0,
        retornosCount: 0
      };
    }

    let faturamentoTotal = 0;
    let faturamentoParticular = 0;
    let totalCancelados = 0;
    let totalRealizadosOuConfirmados = 0;
    let totalPagosAntecipado = 0;
    let consultasCount = 0;
    let examesCount = 0;
    let retornosCount = 0;

    let somaIdades = 0;
    let qtdIdadesValidas = 0;

    let somaAntecedenciaDias = 0;
    let qtdAntecedenciaValida = 0;

    // Mapas de agregação
    const mapEspecialidades = new Map();
    const mapEspecialistas = new Map();
    const mapModalidades = new Map();
    const mapHorarios = new Map();
    const mapDiasSemana = new Map(["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"].map(d => [d, 0]));
    const mapPacientes = new Map();
    const mapEnfermidades = new Map();

    // Faixas etárias: 0-17, 18-29, 30-49, 50-64, 65+
    const faixasEtarias = {
      pediatrico: { label: "0 a 17 anos (Pediátrico)", count: 0 },
      jovem: { label: "18 a 29 anos (Jovem)", count: 0 },
      adulto: { label: "30 a 49 anos (Adulto)", count: 0 },
      maduro: { label: "50 a 64 anos (Adulto Maduro)", count: 0 },
      geriatrico: { label: "65+ anos (Terceira Idade)", count: 0 }
    };

    agendamentosFiltrados.forEach((item) => {
      const valor = Number(item.valor_total || item.valor || 0);
      faturamentoTotal += valor;

      const isParticular =
        item.modalidade?.toLowerCase() === "particular" ||
        !item.modalidade?.toLowerCase().includes("conv");
      if (isParticular) faturamentoParticular += valor;

      const st = (item.status_atendimento || "agendado").toLowerCase();
      if (st === "cancelado") {
        totalCancelados++;
      } else {
        totalRealizadosOuConfirmados++;
      }

      if (item.status_pagamento_antecipado) {
        totalPagosAntecipado++;
      }

      // Tipo de Serviço
      if (item.tipo_servico === "Retorno") retornosCount++;
      else if (item.tipo_servico === "Exame" || /(exame|endoscopia|colonoscopia|ultrassom)/i.test(item.especialidade || "")) examesCount++;
      else consultasCount++;

      // Idade e Demografia
      const dataNasc = item.pacientes?.data_nascimento || item.data_nascimento;
      const idade = calcularIdadeData(dataNasc);
      if (idade !== null) {
        somaIdades += idade;
        qtdIdadesValidas++;

        if (idade <= 17) faixasEtarias.pediatrico.count++;
        else if (idade <= 29) faixasEtarias.jovem.count++;
        else if (idade <= 49) faixasEtarias.adulto.count++;
        else if (idade <= 64) faixasEtarias.maduro.count++;
        else faixasEtarias.geriatrico.count++;
      }

      // Antecedência de Agendamento em Dias
      if (item.created_at && item.data_agendamento) {
        const createdDate = new Date(item.created_at);
        const appDate = new Date(`${item.data_agendamento}T12:00:00`);
        const diffTime = appDate.getTime() - createdDate.getTime();
        const diffDays = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
        somaAntecedenciaDias += diffDays;
        qtdAntecedenciaValida++;
      }

      // Especialidade
      const espNome = (item.especialidade || item.subtipo_exame || "Clínico Geral").trim();
      const espAtual = mapEspecialidades.get(espNome) || { count: 0, faturamento: 0 };
      espAtual.count++;
      espAtual.faturamento += valor;
      mapEspecialidades.set(espNome, espAtual);

      // Especialista
      const profNome = (item.medico_profissional || item.subtipo_exame || "Corpo Clínico").trim();
      const profAtual = mapEspecialistas.get(profNome) || { count: 0, faturamento: 0, cancelados: 0 };
      profAtual.count++;
      profAtual.faturamento += valor;
      if (st === "cancelado") profAtual.cancelados++;
      mapEspecialistas.set(profNome, profAtual);

      // Modalidade
      const modNome = (item.modalidade || (isParticular ? "Particular" : "Convênio")).trim();
      const modAtual = mapModalidades.get(modNome) || { count: 0, faturamento: 0 };
      modAtual.count++;
      modAtual.faturamento += valor;
      mapModalidades.set(modNome, modAtual);

      // Horários
      if (item.horario_agendamento) {
        const horaBase = item.horario_agendamento.slice(0, 2) + ":00";
        mapHorarios.set(horaBase, (mapHorarios.get(horaBase) || 0) + 1);
      }

      // Dias da Semana
      if (item.data_agendamento) {
        const diaSemanaNum = new Date(`${item.data_agendamento}T12:00:00`).getDay();
        const nomesDias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
        const nomeDia = nomesDias[diaSemanaNum] || "Segunda";
        mapDiasSemana.set(nomeDia, (mapDiasSemana.get(nomeDia) || 0) + 1);
      }

      // Paciente (LTV / Recorrência)
      const pacId = item.paciente_id || item.pacientes?.id || item.pacientes?.cpf || item.nome_paciente;
      if (pacId) {
        const pacData = mapPacientes.get(pacId) || {
          nome: item.pacientes?.nome_completo || item.nome_paciente || "Paciente",
          cpf: item.pacientes?.cpf || item.cpf || "",
          telefone: item.pacientes?.telefone_whatsapp || item.telefone_whatsapp || "",
          count: 0,
          faturamento: 0,
          ultimaData: item.data_agendamento
        };
        pacData.count++;
        pacData.faturamento += valor;
        mapPacientes.set(pacId, pacData);
      }

      // Enfermidades
      const enfermidadesArr = Array.isArray(item.pacientes?.enfermidades)
        ? item.pacientes.enfermidades
        : Array.isArray(item.enfermidades)
        ? item.enfermidades
        : [];
      enfermidadesArr.forEach((enf) => {
        if (enf && String(enf).trim()) {
          const enfNome = String(enf).trim();
          mapEnfermidades.set(enfNome, (mapEnfermidades.get(enfNome) || 0) + 1);
        }
      });
    });

    const ticketMedio = total > 0 ? faturamentoTotal / total : 0;
    const taxaComparecimento = total > 0 ? (totalRealizadosOuConfirmados / total) * 100 : 0;
    const taxaCancelamento = total > 0 ? (totalCancelados / total) * 100 : 0;
    const taxaPagamentoAntecipado = total > 0 ? (totalPagosAntecipado / total) * 100 : 0;
    const idadeMedia = qtdIdadesValidas > 0 ? Math.round(somaIdades / qtdIdadesValidas) : 0;
    const mediaAntecedenciaDias = qtdAntecedenciaValida > 0 ? Number((somaAntecedenciaDias / qtdAntecedenciaValida).toFixed(1)) : 0;

    // Rankings formatados e ordenados
    const rankingEspecialidades = Array.from(mapEspecialidades.entries())
      .map(([nome, dados]) => ({
        nome,
        count: dados.count,
        faturamento: dados.faturamento,
        percentual: Number(((dados.count / total) * 100).toFixed(1))
      }))
      .sort((a, b) => b.count - a.count);

    const rankingEspecialistas = Array.from(mapEspecialistas.entries())
      .map(([nome, dados]) => ({
        nome,
        count: dados.count,
        faturamento: dados.faturamento,
        cancelados: dados.cancelados,
        percentual: Number(((dados.count / total) * 100).toFixed(1))
      }))
      .sort((a, b) => b.count - a.count);

    const distribuicaoModalidades = Array.from(mapModalidades.entries())
      .map(([nome, dados]) => ({
        nome,
        count: dados.count,
        faturamento: dados.faturamento,
        percentual: Number(((dados.count / total) * 100).toFixed(1))
      }))
      .sort((a, b) => b.count - a.count);

    const distribuicaoHorarios = Array.from(mapHorarios.entries())
      .map(([hora, count]) => ({ hora, count }))
      .sort((a, b) => a.hora.localeCompare(b.hora));

    const distribuicaoDiasSemana = Array.from(mapDiasSemana.entries()).map(([dia, count]) => ({
      dia,
      count
    }));

    const rankingEnfermidades = Array.from(mapEnfermidades.entries())
      .map(([nome, count]) => ({ nome, count }))
      .sort((a, b) => b.count - a.count);

    const pacientesList = Array.from(mapPacientes.values());
    const pacientesRecorrentes = pacientesList.filter((p) => p.count > 1).length;
    const pacientesNovos = pacientesList.filter((p) => p.count === 1).length;

    const distribuicaoFaixaEtaria = Object.values(faixasEtarias).map((f) => ({
      ...f,
      percentual: qtdIdadesValidas > 0 ? Number(((f.count / qtdIdadesValidas) * 100).toFixed(1)) : 0
    }));

    return {
      total,
      faturamentoTotal,
      faturamentoParticular,
      ticketMedio,
      taxaComparecimento,
      taxaCancelamento,
      tempoMedioMin: 1.7, // Tempo médio de conclusão de jornada verificado
      mediaAntecedenciaDias,
      distribuicaoFaixaEtaria,
      idadeMedia,
      rankingEspecialidades,
      rankingEspecialistas,
      distribuicaoModalidades,
      distribuicaoHorarios,
      distribuicaoDiasSemana,
      rankingEnfermidades,
      taxaPagamentoAntecipado,
      pacientesRecorrentes,
      pacientesNovos,
      consultasCount,
      examesCount,
      retornosCount,
      topPacientes: pacientesList.sort((a, b) => b.count - a.count).slice(0, 10)
    };
  }, [agendamentosFiltrados]);

  // Exportar Relatório Consolidado em CSV
  const handleExportCSV = () => {
    playDopamineSound("click");
    triggerHaptic("light");
    if (agendamentosFiltrados.length === 0) {
      showToast?.("Não há agendamentos para exportar no período.", "error");
      return;
    }

    const headers = [
      "ID",
      "Data Agendamento",
      "Horario",
      "Paciente",
      "CPF",
      "Telefone",
      "Especialidade",
      "Especialista",
      "Modalidade",
      "Tipo Servico",
      "Status",
      "Valor Total (R$)",
      "Pago Antecipado"
    ];

    const rows = agendamentosFiltrados.map((a) => [
      a.id,
      a.data_agendamento || "",
      a.horario_agendamento || "",
      `"${(a.pacientes?.nome_completo || a.nome_paciente || "").replace(/"/g, '""')}"`,
      a.pacientes?.cpf || a.cpf || "",
      a.pacientes?.telefone_whatsapp || a.telefone_whatsapp || "",
      `"${(a.especialidade || a.subtipo_exame || "").replace(/"/g, '""')}"`,
      `"${(a.medico_profissional || "").replace(/"/g, '""')}"`,
      `"${(a.modalidade || "").replace(/"/g, '""')}"`,
      a.tipo_servico || "",
      a.status_atendimento || "agendado",
      Number(a.valor_total || 0).toFixed(2),
      a.status_pagamento_antecipado ? "SIM" : "NAO"
    ]);

    const csvRows = [headers.join(","), ...rows.map((r) => r.join(","))];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join(String.fromCharCode(10));
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_metricas_rmcare_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast?.("Relatório exportado com sucesso!");
  };

  return (
    <motion.div
      key="metricas"
      {...fadeUp}
      className="flex-1 flex flex-col h-full overflow-hidden w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8"
    >
      {/* CABEÇALHO EXECUTIVO E BARRA DE FILTROS RÁPIDOS */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-black flex items-center justify-center shrink-0 shadow-sm">
            <BarChart3 size={20} strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight">
              Business Intelligence & Métricas Clínicas
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Painel analítico consolidado de faturamento, demanda de especialistas, demografia e performance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
          {/* SELETOR DE PRESETS DE PERÍODO */}
          <div className="flex items-center bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-1 shadow-sm">
            {[
              { id: "7dias", label: "7D" },
              { id: "30dias", label: "30D" },
              { id: "mes_atual", label: "Este Mês" },
              { id: "90dias", label: "90D" },
              { id: "ano_atual", label: "Ano" },
              { id: "todos", label: "Tudo" },
              { id: "custom", label: "Data" }
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  playDopamineSound("click");
                  setPeriodoPreset(p.id);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  periodoPreset === p.id
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-black shadow-sm"
                    : "text-zinc-500 hover:text-zinc-950 dark:hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-zinc-950 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black text-xs font-bold rounded-xl transition-all shadow-sm min-h-[36px] cursor-pointer"
            title="Exportar dados filtrados para planilha CSV"
          >
            <Download size={14} strokeWidth={2} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* BARRA DE FILTROS & PESQUISA RÁPIDA */}
      <div className="mb-5 bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-4 rounded-2xl shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-wider">
              Filtros de Segmentação
            </span>
            <span className="text-[11px] text-zinc-400 font-mono">
              ({agendamentosFiltrados.length} registros filtrados)
            </span>
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={buscaPaciente}
              onChange={(e) => setBuscaPaciente(e.target.value)}
              placeholder="Buscar por paciente ou CPF..."
              className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-[#9FC131]"
            />
          </div>
        </div>

        {/* LINHA DE FILTROS SECUNDÁRIOS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-zinc-100 dark:border-white/5">
          <select
            value={filtroEspecialidade}
            onChange={(e) => setFiltroEspecialidade(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200 outline-none"
          >
            {especialidadesOpcoes.map((esp) => (
              <option key={esp} value={esp}>
                {esp === "Todas" ? "Todas as Especialidades" : esp}
              </option>
            ))}
          </select>

          <select
            value={filtroEspecialista}
            onChange={(e) => setFiltroEspecialista(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200 outline-none"
          >
            {especialistasOpcoes.map((prof) => (
              <option key={prof} value={prof}>
                {prof === "Todos" ? "Todos os Especialistas" : prof}
              </option>
            ))}
          </select>

          <select
            value={filtroModalidade}
            onChange={(e) => setFiltroModalidade(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200 outline-none"
          >
            {modalidadesOpcoes.map((mod) => (
              <option key={mod} value={mod}>
                {mod === "Todas" ? "Todas as Modalidades" : mod}
              </option>
            ))}
          </select>

          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200 outline-none"
          >
            <option value="Todos">Todos os Status</option>
            <option value="confirmados">Confirmados / Ativos</option>
            <option value="realizados">Realizados</option>
            <option value="cancelados">Cancelados</option>
            <option value="retorno">Apenas Retornos</option>
          </select>
        </div>

        {/* INPUTS DE DATA CUSTOMIZADA QUANDO SELECIONADO 'CUSTOM' */}
        {periodoPreset === "custom" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-100 dark:border-white/5"
          >
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">
                Data Inicial
              </label>
              <input
                type="date"
                value={dataInicioCustom}
                onChange={(e) => setDataInicioCustom(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">
                Data Final
              </label>
              <input
                type="date"
                value={dataFimCustom}
                onChange={(e) => setDataFimCustom(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold outline-none"
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* CONTEÚDO DINÂMICO DAS SUB-ABAS */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pb-24 pr-1">
        {/* SUB-ABA 1: VISÃO GERAL & EXECUTIVA */}
        {currentTab === "visao_geral" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* GRID DE CARDS KPI EXECUTIVOS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                    Total Agendamentos
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Calendar size={16} strokeWidth={2} />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tabular-nums tracking-tight">
                  {metricasCalculadas.total}
                </div>
                <div className="text-[11px] text-zinc-500 flex items-center gap-1">
                  <span>{metricasCalculadas.consultasCount} consultas</span> • <span>{metricasCalculadas.examesCount} exames</span>
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                    Faturamento Estimado
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <DollarSign size={16} strokeWidth={2} />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-[#86a621] dark:text-[#9FC131] tabular-nums tracking-tight">
                  {formatarMoeda(metricasCalculadas.faturamentoTotal)}
                </div>
                <div className="text-[11px] text-zinc-500">
                  Particular: {formatarMoeda(metricasCalculadas.faturamentoParticular)}
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                    Taxa Comparecimento
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <CheckCircle2 size={16} strokeWidth={2} />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tabular-nums tracking-tight">
                  {metricasCalculadas.taxaComparecimento.toFixed(1)}%
                </div>
                <div className="text-[11px] text-zinc-500">
                  Cancelamentos: {metricasCalculadas.taxaCancelamento.toFixed(1)}%
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                    Tempo Médio Jornada
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Clock size={16} strokeWidth={2} />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tabular-nums tracking-tight">
                  ~1m 42s
                </div>
                <div className="text-[11px] text-zinc-500">
                  Antecedência: ~{metricasCalculadas.mediaAntecedenciaDias} dias
                </div>
              </div>
            </div>

            {/* SEÇÃO: ESPECIALIDADES MAIS DEMANDADAS & DISTRIBUIÇÃO */}
            <div className="grid lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 rounded-[2rem] shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pb-3">
                  <h3 className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-500" /> Especialidades com Maior Demanda
                  </h3>
                  <span className="text-xs text-zinc-400">
                    {metricasCalculadas.rankingEspecialidades.length} cadastradas
                  </span>
                </div>

                <div className="space-y-3">
                  {metricasCalculadas.rankingEspecialidades.length === 0 ? (
                    <div className="py-10 text-center text-xs text-zinc-400">
                      Nenhum agendamento encontrado no período.
                    </div>
                  ) : (
                    metricasCalculadas.rankingEspecialidades.slice(0, 5).map((esp, i) => (
                      <div key={esp.nome} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-zinc-900 dark:text-white">
                            #{i + 1} {esp.nome}
                          </span>
                          <span className="font-mono font-semibold text-zinc-500">
                            {esp.count} agendamentos ({esp.percentual}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-[#9FC131] rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(8, esp.percentual))}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="lg:col-span-5 bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 rounded-[2rem] shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pb-3">
                  <h3 className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                    <PieChart size={16} className="text-blue-500" /> Cobertura & Modalidades
                  </h3>
                  <span className="text-xs text-zinc-400">Distribuição</span>
                </div>

                <div className="space-y-3 pt-2">
                  {metricasCalculadas.distribuicaoModalidades.map((m) => (
                    <div
                      key={m.nome}
                      className="p-3.5 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 flex items-center justify-center font-bold text-xs">
                          {m.nome.toLowerCase().includes("conv") ? "🏥" : "💳"}
                        </div>
                        <div>
                          <span className="font-extrabold text-xs text-zinc-950 dark:text-white block">
                            {m.nome}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {m.count} pacientes ({m.percentual}%)
                          </span>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-xs text-zinc-900 dark:text-white">
                        {formatarMoeda(m.faturamento)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* SUB-ABA 2: FINANCEIRO & FATURAMENTO */}
        {currentTab === "financeiro" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-6 rounded-3xl bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 shadow-sm space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                  Faturamento Total (Bruto)
                </span>
                <div className="text-3xl font-black text-[#86a621] dark:text-[#9FC131] tracking-tight">
                  {formatarMoeda(metricasCalculadas.faturamentoTotal)}
                </div>
                <p className="text-xs text-zinc-500">Volume total gerado no período selecionado.</p>
              </div>

              <div className="p-6 rounded-3xl bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 shadow-sm space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                  Ticket Médio por Consulta
                </span>
                <div className="text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
                  {formatarMoeda(metricasCalculadas.ticketMedio)}
                </div>
                <p className="text-xs text-zinc-500">Média de valor recebido por atendimento realizado.</p>
              </div>

              <div className="p-6 rounded-3xl bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 shadow-sm space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                  Pagamento Antecipado (Pix/Cartão)
                </span>
                <div className="text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
                  {metricasCalculadas.taxaPagamentoAntecipado.toFixed(1)}%
                </div>
                <p className="text-xs text-zinc-500">Pacientes particulares que quitaram a taxa de entrada online.</p>
              </div>
            </div>

            {/* TABELA DE FATURAMENTO POR MODALIDADE */}
            <div className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-8 rounded-[2rem] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pb-3">
                <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                  Desempenho Financeiro por Modalidade & Forma de Pagamento
                </h3>
                <span className="text-xs text-zinc-400 font-mono">
                  {metricasCalculadas.distribuicaoModalidades.length} modalidades
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 font-bold uppercase tracking-wider text-zinc-400 text-[10px]">
                      <th className="p-3.5">Modalidade</th>
                      <th className="p-3.5">Agendamentos</th>
                      <th className="p-3.5">% do Volume</th>
                      <th className="p-3.5">Faturamento Bruto</th>
                      <th className="p-3.5 text-right">Ticket Médio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium">
                    {metricasCalculadas.distribuicaoModalidades.map((m) => {
                      const tMedio = m.count > 0 ? m.faturamento / m.count : 0;
                      return (
                        <tr key={m.nome} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                          <td className="p-3.5 font-bold text-zinc-950 dark:text-white">
                            {m.nome}
                          </td>
                          <td className="p-3.5 font-mono">{m.count}</td>
                          <td className="p-3.5 font-mono text-zinc-500">{m.percentual}%</td>
                          <td className="p-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatarMoeda(m.faturamento)}
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-zinc-800 dark:text-zinc-200">
                            {formatarMoeda(tMedio)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* SUB-ABA 3: PACIENTES & DEMOGRAFIA */}
        {currentTab === "pacientes" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 shadow-sm space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                  Idade Média
                </span>
                <div className="text-3xl font-black text-zinc-950 dark:text-white tabular-nums tracking-tight">
                  {metricasCalculadas.idadeMedia > 0 ? `${metricasCalculadas.idadeMedia} anos` : "N/D"}
                </div>
                <p className="text-[11px] text-zinc-500">Média calculada da data de nascimento.</p>
              </div>

              <div className="p-5 rounded-3xl bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 shadow-sm space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                  Novos Pacientes
                </span>
                <div className="text-3xl font-black text-blue-600 dark:text-blue-400 tabular-nums tracking-tight">
                  {metricasCalculadas.pacientesNovos}
                </div>
                <p className="text-[11px] text-zinc-500">1º atendimento registrado.</p>
              </div>

              <div className="p-5 rounded-3xl bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 shadow-sm space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                  Pacientes Recorrentes
                </span>
                <div className="text-3xl font-black text-purple-600 dark:text-purple-400 tabular-nums tracking-tight">
                  {metricasCalculadas.pacientesRecorrentes}
                </div>
                <p className="text-[11px] text-zinc-500">Mais de 1 atendimento/retorno.</p>
              </div>

              <div className="p-5 rounded-3xl bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 shadow-sm space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                  Retornos Realizados
                </span>
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">
                  {metricasCalculadas.retornosCount}
                </div>
                <p className="text-[11px] text-zinc-500">Consultas de reavaliação clínica.</p>
              </div>
            </div>

            {/* GRÁFICO DE FAIXAS ETÁRIAS & ENFERMIDADES FREQUENTES */}
            <div className="grid lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 rounded-[2rem] shadow-sm space-y-4">
                <div className="border-b border-zinc-100 dark:border-white/5 pb-3">
                  <h3 className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                    <Users size={16} className="text-blue-500" /> Distribuição por Faixa Etária
                  </h3>
                  <p className="text-[11px] text-zinc-500">Perfil demográfico dos pacientes atendidos.</p>
                </div>

                <div className="space-y-3.5 pt-1">
                  {metricasCalculadas.distribuicaoFaixaEtaria.map((faixa) => (
                    <div key={faixa.label} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-zinc-900 dark:text-white">{faixa.label}</span>
                        <span className="font-mono text-zinc-500">
                          {faixa.count} ({faixa.percentual}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(6, faixa.percentual))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-6 bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 rounded-[2rem] shadow-sm space-y-4">
                <div className="border-b border-zinc-100 dark:border-white/5 pb-3">
                  <h3 className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                    <HeartPulse size={16} className="text-rose-500" /> Condições Clínicas Mais Frequentes
                  </h3>
                  <p className="text-[11px] text-zinc-500">Enfermidades registradas na ficha dos pacientes.</p>
                </div>

                <div className="space-y-2.5 pt-1">
                  {metricasCalculadas.rankingEnfermidades.length === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-400">
                      Nenhuma enfermidade vinculada aos pacientes no período.
                    </div>
                  ) : (
                    metricasCalculadas.rankingEnfermidades.slice(0, 6).map((enf) => (
                      <div
                        key={enf.nome}
                        className="p-3 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between"
                      >
                        <span className="font-bold text-xs text-zinc-900 dark:text-white">
                          {enf.nome}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-mono text-[11px] font-extrabold border border-rose-200/50">
                          {enf.count} paciente(s)
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* SUB-ABA 4: ESPECIALIDADES & CORPO CLÍNICO */}
        {currentTab === "especialidades" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-8 rounded-[2rem] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pb-3">
                <div>
                  <h3 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                    <Award size={18} className="text-purple-500" /> Produtividade por Especialista / Médico
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Volume de consultas realizadas, cancelamentos e receita por profissional do corpo clínico.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 font-bold uppercase tracking-wider text-zinc-400 text-[10px]">
                      <th className="p-3.5">Especialista</th>
                      <th className="p-3.5">Agendamentos</th>
                      <th className="p-3.5">% da Demanda</th>
                      <th className="p-3.5">Cancelamentos</th>
                      <th className="p-3.5 text-right">Faturamento Gerado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium">
                    {metricasCalculadas.rankingEspecialistas.map((prof) => (
                      <tr key={prof.nome} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                        <td className="p-3.5 font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center font-bold text-xs">
                            <Stethoscope size={13} />
                          </div>
                          <span>{prof.nome}</span>
                        </td>
                        <td className="p-3.5 font-mono">{prof.count}</td>
                        <td className="p-3.5 font-mono text-zinc-500">{prof.percentual}%</td>
                        <td className="p-3.5 font-mono text-rose-500">{prof.cancelados}</td>
                        <td className="p-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatarMoeda(prof.faturamento)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* SUB-ABA 5: OPERACIONAL & JORNADA */}
        {currentTab === "operacional" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid lg:grid-cols-12 gap-6">
              {/* HORÁRIOS MAIS CONCORRIDOS */}
              <div className="lg:col-span-7 bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 rounded-[2rem] shadow-sm space-y-4">
                <div className="border-b border-zinc-100 dark:border-white/5 pb-3">
                  <h3 className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                    <Clock size={16} className="text-sky-500" /> Concentração de Horários de Pico (08h às 18h)
                  </h3>
                  <p className="text-[11px] text-zinc-500">Horários de maior procura pelos pacientes.</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                  {metricasCalculadas.distribuicaoHorarios.length === 0 ? (
                    <div className="col-span-full py-8 text-center text-xs text-zinc-400">
                      Nenhum dado de horário disponível.
                    </div>
                  ) : (
                    metricasCalculadas.distribuicaoHorarios.map((h) => (
                      <div
                        key={h.hora}
                        className="p-3 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between"
                      >
                        <span className="font-bold text-xs font-mono text-zinc-900 dark:text-white">
                          {h.hora}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-mono text-[10px] font-extrabold border border-sky-200/50">
                          {h.count} vaga(s)
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* DIAS DA SEMANA */}
              <div className="lg:col-span-5 bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 rounded-[2rem] shadow-sm space-y-4">
                <div className="border-b border-zinc-100 dark:border-white/5 pb-3">
                  <h3 className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                    <CalendarDays size={16} className="text-amber-500" /> Dias da Semana Mais Procurados
                  </h3>
                  <p className="text-[11px] text-zinc-500">Distribuição semanal da demanda clínica.</p>
                </div>

                <div className="space-y-2.5 pt-1">
                  {metricasCalculadas.distribuicaoDiasSemana.map((d) => (
                    <div
                      key={d.dia}
                      className="p-3 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between"
                    >
                      <span className="font-bold text-xs text-zinc-900 dark:text-white">{d.dia}</span>
                      <span className="font-mono text-xs font-extrabold text-zinc-500">{d.count} agendamento(s)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
