"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  Save,
  CreditCard,
  Link2,
  ShieldCheck,
  KeySquare,
  Server,
  ShieldAlert,
  Activity,
  UserPlus,
  ChevronDown,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Plus,
  Webhook,
  Zap,
  Bot,
  Copy,
  Send,
  Sliders,
  FileSpreadsheet,
  Download,
  CalendarCheck,
  Check,
  HelpCircle,
  Sparkles,
  BookOpen,
  X,
  Code2,
  Terminal,
  Layers,
  ArrowUpRight
} from "lucide-react";
import { fadeUp, spring, ButtonPrimary, ToggleSwitch, TextInput, CustomSelect } from "../components/SharedUI";
import {
  actionSalvarChavesIntegracao,
  actionCriarServico,
  actionMigrarNomeBloqueios,
  fetchAdminCustomization,
  actionSalvarConfigWebhooksEFluxos,
  actionTestarWebhookFluxoInteligente,
  actionExportarDadosEmpresaCSV
} from "@/actions/adminData";
import { supabase } from "@/lib/supabase";
import { playDopamineSound, triggerHaptic } from "@/lib/dopamine";

// ==========================================
// ITEM ÓRFÃO (RESOLUÇÃO DE NOMES DO ERP)
// ==========================================
const UnmatchedItem = ({ erpName, servicosDisponiveis, onResolve, showToast }) => {
  const [mode, setMode] = useState("idle");
  const [selectedServiceId, setSelectedServiceId] = useState("");

  const handleCreate = async () => {
    setMode("processing");
    try {
      await actionCriarServico({
        nome: erpName,
        tipo: "Consulta",
        ativo: true,
        preco: 0,
        dias_bloqueio_padrao: 0
      });
      showToast(`Profissional "${erpName}" cadastrado!`);
      setMode("resolved");
      setTimeout(() => onResolve(), 800);
    } catch (e) {
      showToast("Erro ao criar cadastro.", "error");
      setMode("idle");
    }
  };

  const handleLink = async () => {
    if (!selectedServiceId) return;
    setMode("processing");
    try {
      const targetService = servicosDisponiveis.find((s) => s.id === selectedServiceId);
      await actionMigrarNomeBloqueios(erpName, targetService.nome);
      showToast(`Agendas vinculadas a "${targetService.nome}"!`);
      setMode("resolved");
      setTimeout(() => onResolve(), 800);
    } catch (e) {
      showToast("Erro ao associar registros.", "error");
      setMode("idle");
    }
  };

  if (mode === "resolved") {
    return (
      <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center justify-center p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 rounded-2xl h-[72px]">
        <CheckCircle2 className="text-green-500 mr-2" size={20} />
        <span className="text-green-700 dark:text-green-300 font-bold text-sm">Resolvido!</span>
      </motion.div>
    );
  }

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-[#111] border border-amber-200/60 dark:border-amber-900/40 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-500 flex-shrink-0">
          <AlertTriangle size={18} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Desconhecido no ERP</p>
          <p className="font-bold text-zinc-900 dark:text-white">{erpName}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {mode === "idle" && (
          <>
            <button onClick={() => setMode("linking")} className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold text-xs hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2 cursor-pointer">
              <Link2 size={14} /> Associar
            </button>
            <button onClick={handleCreate} className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black font-bold text-xs hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-md cursor-pointer">
              <UserPlus size={14} /> Cadastrar
            </button>
          </>
        )}

        {mode === "linking" && (
          <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-56">
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full appearance-none bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 text-sm font-medium rounded-xl px-4 py-2.5 pr-10 outline-none focus:border-zinc-900 cursor-pointer"
              >
                <option value="" disabled>Selecione o profissional...</option>
                {servicosDisponiveis.map((s) => (
                  <option key={s.id} value={s.id}>{s.nome} ({s.tipo})</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            </div>
            <button onClick={handleLink} disabled={!selectedServiceId} className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-200 text-white flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer">
              <ArrowRight size={16} />
            </button>
            <button onClick={() => setMode("idle")} className="text-xs font-bold text-zinc-400 hover:text-zinc-700 px-2 cursor-pointer">Cancelar</button>
          </motion.div>
        )}

        {mode === "processing" && (
          <div className="h-10 px-6 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 w-full md:w-auto">
            <Activity size={16} className="animate-spin" />
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ==========================================
// MODAL DE DOCUMENTAÇÃO DE API & WEBHOOKS
// ==========================================
const ApiDocumentationModal = ({ isOpen, onClose, originUrl, secret, showToast }) => {
  const [docTab, setDocTab] = useState("webhook_out"); // "webhook_out" | "webhook_in" | "endpoints" | "n8n"

  if (!isOpen) return null;

  const inboundUrl = `${originUrl || "https://rmagenda.com.br"}/api/webhook-resposta`;

  const copyCode = (code, label) => {
    navigator.clipboard.writeText(code);
    playDopamineSound("click");
    triggerHaptic("light");
    if (showToast) showToast(`${label} copiado!`);
  };

  const payloadOutgoingExample = JSON.stringify(
    {
      evento: "disparo_fluxo_inteligente",
      tipo_disparo: "webhook",
      gatilho: "lembrete_3_dias",
      empresa: {
        id: "c4b12a88-7f9e-4b2a-9e12-8876c1234567",
        nome: "Clínica GastroCare",
        slug: "gastrocare"
      },
      agendamento: {
        id: "e891bc44-55aa-4321-9988-112233445566",
        data: "2026-08-30",
        horario: "09:30",
        servico: "Colonoscopia com Sedação",
        especialista: "Dr. Lucas Amorim",
        especialidade: "Gastroenterologia",
        modalidade: "Particular",
        status_atual: "agendado"
      },
      paciente: {
        id: "f1234567-89ab-cdef-0123-456789abcdef",
        nome: "João da Silva Sauro",
        primeiro_nome: "João",
        telefone: "5583999999999",
        cpf: "123.456.789-00",
        email: "joao@exemplo.com",
        enfermidades: ["Refluxo", "Gastrite"]
      },
      mensagem_formatada: "Olá João, seu exame de Colonoscopia está confirmado para 30/08 às 09:30.",
      anexo_url: "https://gastrocare.com.br/preparo-colonoscopia.pdf",
      opcoes_resposta: {
        confirmar: ["1", "sim", "confirmo", "confirmar"],
        cancelar: ["2", "nao", "não", "cancelar", "cancelo"],
        remarcar: ["3", "remarcar", "reagendar"]
      },
      webhook_retorno_url: inboundUrl
    },
    null,
    2
  );

  const payloadInboundExample = JSON.stringify(
    {
      agendamento_id: "e891bc44-55aa-4321-9988-112233445566",
      resposta: "1",
      motivo: "Opcional: motivo caso tenha cancelado",
      nova_data: "2026-09-02",
      novo_horario: "14:00"
    },
    null,
    2
  );

  const curlExample = `curl -X POST "${inboundUrl}" \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: ${secret || "sua_chave_secreta"}" \
  -d '{
    "agendamento_id": "e891bc44-55aa-4321-9988-112233445566",
    "resposta": "1"
  }'`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-[#0e0e12] border border-zinc-200 dark:border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* CABEÇALHO DO MODAL */}
        <div className="p-6 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between bg-zinc-50 dark:bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center border border-amber-200/50">
              <BookOpen size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-zinc-950 dark:text-white">
                Documentação da API & Webhooks
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Guia de integração com n8n, Typebot, Evolution API e Chatbots de IA.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* SUB-ABAS DA DOCUMENTAÇÃO */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 px-6 bg-zinc-100/50 dark:bg-zinc-900/50 overflow-x-auto gap-2 py-2">
          <button
            onClick={() => setDocTab("webhook_out")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              docTab === "webhook_out"
                ? "bg-zinc-950 text-white dark:bg-white dark:text-black shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <Zap size={13} /> 1. Webhook de Disparo (Saída)
          </button>

          <button
            onClick={() => setDocTab("webhook_in")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              docTab === "webhook_in"
                ? "bg-zinc-950 text-white dark:bg-white dark:text-black shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <Bot size={13} /> 2. Webhook de Retorno (Entrada)
          </button>

          <button
            onClick={() => setDocTab("endpoints")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              docTab === "endpoints"
                ? "bg-zinc-950 text-white dark:bg-white dark:text-black shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <Layers size={13} /> 3. Mapa de Endpoints
          </button>

          <button
            onClick={() => setDocTab("n8n")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              docTab === "n8n"
                ? "bg-zinc-950 text-white dark:bg-white dark:text-black shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <Terminal size={13} /> 4. Exemplo cURL / n8n
          </button>
        </div>

        {/* CORPO DA DOCUMENTAÇÃO */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6 text-xs text-zinc-600 dark:text-zinc-300">
          {/* ABA 1: WEBHOOK DE DISPARO */}
          {docTab === "webhook_out" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-black text-zinc-950 dark:text-white flex items-center gap-2">
                  <Zap size={16} className="text-amber-500" /> Disparo do RM Care para seu Bot / n8n (Outgoing)
                </h4>
                <p className="text-xs text-zinc-500 mt-1">
                  Quando uma regra de mensagem com <strong>Tipo: Webhook</strong> é acionada, o sistema envia uma requisição <strong>POST</strong> para a URL configurada contendo todos os dados do paciente e do agendamento.
                </p>
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                <span className="font-mono text-[11px] font-bold text-zinc-400 uppercase">Headers Enviados:</span>
                <ul className="font-mono text-[11px] space-y-1 text-zinc-800 dark:text-zinc-200">
                  <li><strong className="text-blue-500">Content-Type:</strong> application/json</li>
                  <li><strong className="text-blue-500">x-rmcare-event:</strong> disparo_fluxo_inteligente</li>
                  <li><strong className="text-blue-500">x-webhook-secret:</strong> {secret || "(Sua chave secreta)"}</li>
                </ul>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-zinc-400 uppercase">Payload JSON de Exemplo:</span>
                  <button
                    onClick={() => copyCode(payloadOutgoingExample, "Payload JSON de Saída")}
                    className="px-2.5 py-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Copy size={11} /> Copiar JSON
                  </button>
                </div>
                <pre className="p-4 bg-zinc-950 text-emerald-400 font-mono text-[11px] rounded-2xl overflow-x-auto border border-zinc-800 custom-scrollbar">
                  {payloadOutgoingExample}
                </pre>
              </div>
            </div>
          )}

          {/* ABA 2: WEBHOOK DE RETORNO */}
          {docTab === "webhook_in" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-black text-zinc-950 dark:text-white flex items-center gap-2">
                  <Bot size={16} className="text-blue-500" /> Resposta do Bot para o RM Care (Inbound / API)
                </h4>
                <p className="text-xs text-zinc-500 mt-1">
                  Após o paciente responder no WhatsApp, seu fluxo deve enviar uma requisição <strong>POST</strong> para o endpoint da sua clínica. O RM Care atualizará o agendamento imediatamente.
                </p>
              </div>

              <div className="p-4 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 block">URL de Retorno:</span>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono font-bold text-blue-600 dark:text-blue-400 text-xs bg-white dark:bg-black p-2.5 rounded-xl border border-blue-200/60 select-all">
                    {inboundUrl}
                  </code>
                  <button
                    onClick={() => copyCode(inboundUrl, "URL de Retorno")}
                    className="px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer shadow-sm"
                  >
                    <Copy size={13} /> Copiar
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-zinc-400 uppercase">Body JSON de Resposta:</span>
                  <button
                    onClick={() => copyCode(payloadInboundExample, "JSON de Entrada")}
                    className="px-2.5 py-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Copy size={11} /> Copiar JSON
                  </button>
                </div>
                <pre className="p-4 bg-zinc-950 text-amber-300 font-mono text-[11px] rounded-2xl overflow-x-auto border border-zinc-800 custom-scrollbar">
                  {payloadInboundExample}
                </pre>
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                <span className="font-bold text-xs text-zinc-900 dark:text-white block">Ações Executadas Automaticamente:</span>
                <ul className="space-y-1.5 text-[11px]">
                  <li>✅ <strong>Resposta "1" / "sim" / "confirmar":</strong> Define status como <code className="text-emerald-500 font-mono font-bold">confirmado</code> e salva a data/hora de confirmação.</li>
                  <li>❌ <strong>Resposta "2" / "nao" / "cancelar":</strong> Define status como <code className="text-rose-500 font-mono font-bold">cancelado</code> e <strong>libera o horário na agenda</strong>.</li>
                  <li>📅 <strong>Resposta "3" / "remarcar":</strong> Reagenda se nova data for enviada, ou define <code className="text-amber-500 font-mono font-bold">solicitou_remarcacao</code> para atendimento humano.</li>
                </ul>
              </div>
            </div>
          )}

          {/* ABA 3: MAPA DE ENDPOINTS */}
          {docTab === "endpoints" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-black text-zinc-950 dark:text-white flex items-center gap-2">
                  <Layers size={16} className="text-indigo-500" /> Mapa de Todos os Endpoints da Aplicação
                </h4>
                <p className="text-xs text-zinc-500 mt-1">
                  Endpoints HTTP disponíveis no RM Care para automações, sincronizações e webhooks.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono font-bold rounded text-[10px]">POST</span>
                    <code className="font-mono font-bold text-zinc-900 dark:text-white text-xs">/api/webhook-resposta</code>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Escuta e processa respostas de pacientes enviadas pelo WhatsApp/bot (confirmações, cancelamentos e reagendamentos).
                  </p>
                </div>

                <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono font-bold rounded text-[10px]">GET / POST</span>
                    <code className="font-mono font-bold text-zinc-900 dark:text-white text-xs">/api/processar-fila</code>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Cron Job Worker que dispara mensagens e webhooks pendentes e aplica as regras de presença/baixa pós-horário.
                  </p>
                </div>

                <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono font-bold rounded text-[10px]">POST</span>
                    <code className="font-mono font-bold text-zinc-900 dark:text-white text-xs">/api/importar-agenda</code>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Dispara a rotina de sincronização de bloqueios e agendas com o Medicalsys ERP.
                  </p>
                </div>

                <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-mono font-bold rounded text-[10px]">POST</span>
                    <code className="font-mono font-bold text-zinc-900 dark:text-white text-xs">/api/disparar-webhook</code>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Endpoint de teste e disparo manual para servidores de mensageria RM Chat / WhatsApp.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ABA 4: EXEMPLO CURL / N8N */}
          {docTab === "n8n" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-black text-zinc-950 dark:text-white flex items-center gap-2">
                  <Terminal size={16} className="text-emerald-500" /> Exemplo Prático de Teste via cURL & n8n
                </h4>
                <p className="text-xs text-zinc-500 mt-1">
                  Teste o retorno do seu webhook diretamente pelo terminal ou configure um nó HTTP Request no n8n.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-zinc-400 uppercase">Comando cURL:</span>
                  <button
                    onClick={() => copyCode(curlExample, "Comando cURL")}
                    className="px-2.5 py-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Copy size={11} /> Copiar cURL
                  </button>
                </div>
                <pre className="p-4 bg-zinc-950 text-blue-400 font-mono text-[11px] rounded-2xl overflow-x-auto border border-zinc-800 custom-scrollbar">
                  {curlExample}
                </pre>
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                <span className="font-bold text-xs text-zinc-900 dark:text-white block">Como montar o fluxo no n8n:</span>
                <ol className="list-decimal list-inside space-y-1 text-[11px]">
                  <li>Crie um nó <strong>Webhook (POST)</strong> no n8n e cole sua URL no RM Care.</li>
                  <li>No n8n, monte o envio da mensagem WhatsApp com botões interativos (1- Confirmar, 2- Cancelar, 3- Remarcar).</li>
                  <li>Quando o paciente responder, crie um nó <strong>HTTP Request (POST)</strong> apontando para <code className="font-mono">{inboundUrl}</code> com o <code className="font-mono">agendamento_id</code> e a resposta.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* RODAPÉ DO MODAL */}
        <div className="p-4 border-t border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-zinc-950 dark:bg-white text-white dark:text-black font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-black transition-all cursor-pointer shadow-sm"
          >
            Fechar Documentação
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ==========================================
// COMPONENTE PRINCIPAL DE INTEGRAÇÕES & WEBHOOKS
// ==========================================
export default function IntegracoesView({ bloqueios = [], servicos = [], fetchBloqueios, fetchServicos, showToast }) {
  const [subTab, setSubTab] = useState("painel"); // "painel" | "webhooks" | "medicalsys" | "mercadopago" | "exportacao"
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [empresaId, setEmpresaId] = useState(null);
  const [originUrl, setOriginUrl] = useState("");
  const [showDocModal, setShowDocModal] = useState(false);

  const [chaves, setChaves] = useState({
    mp_public_key: "",
    mp_access_token: "",
    medicalsys_enabled: false,
    medicalsys_id_clinica: "9",
    medicalsys_id_medico: "1",
    medicalsys_apikey: "8FxD2eUsODMO8IZWMHZaNpt78av9Vy6k",
    medicalsys_customer_apikey: "SqdACjyxnXuYqL8ilnwTvXHroEOvFHFR",
    auto_sync_cadence: "manual"
  });

  // Configuração de Webhooks & Fluxos Inteligentes
  const [configWebhooks, setConfigWebhooks] = useState({
    webhook_url: "",
    webhook_secret: "",
    webhook_tipo_padrao: "whatsapp",
    respostas_mapping: {
      confirmar: ["1", "sim", "confirmo", "confirmar"],
      cancelar: ["2", "nao", "não", "cancelar", "cancelo"],
      remarcar: ["3", "remarcar", "reagendar"]
    },
    automacoes_presenca: {
      ativo: false,
      acao_padrao: "compareceu",
      tolerancia_minutos: 60
    }
  });

  // Testador de Webhook
  const [testandoWebhook, setTestandoWebhook] = useState(false);
  const [resultadoTeste, setResultadoTeste] = useState(null);

  // Estados de Exportação
  const [exportando, setExportando] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOriginUrl(window.location.origin);
    }

    const fetchDados = async () => {
      const { data } = await supabase.from("empresas").select("id, config_chaves, config_campos, rmchat_webhook_url").limit(1).single();
      if (data) {
        setEmpresaId(data.id);
        if (data.config_chaves) setChaves((prev) => ({ ...prev, ...data.config_chaves }));

        const confCampos = data.config_campos || {};
        const confWeb = confCampos.config_webhooks || data.config_chaves?.config_webhooks || {};

        setConfigWebhooks((prev) => ({
          ...prev,
          ...confWeb,
          webhook_url: confWeb.webhook_url || data.config_chaves?.webhook_url_inteligente || data.rmchat_webhook_url || "",
          webhook_secret: confWeb.webhook_secret || data.config_chaves?.webhook_secret || "",
          respostas_mapping: confWeb.respostas_mapping || prev.respostas_mapping,
          automacoes_presenca: confCampos.automacoes_presenca || confWeb.automacoes_presenca || prev.automacoes_presenca
        }));
      }
    };
    fetchDados();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    playDopamineSound("select");
    triggerHaptic("success");
    try {
      await actionSalvarChavesIntegracao(chaves);
      await actionSalvarConfigWebhooksEFluxos(configWebhooks);
      if (showToast) showToast("Configurações de integração e webhooks salvas com sucesso!");
    } catch (e) {
      console.error(e);
      if (showToast) showToast(`Erro ao salvar: ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleTestarWebhook = async () => {
    if (!configWebhooks.webhook_url || !configWebhooks.webhook_url.startsWith("http")) {
      if (showToast) showToast("Informe uma URL de Webhook válida iniciando com http:// ou https://", "error");
      return;
    }
    setTestandoWebhook(true);
    setResultadoTeste(null);
    playDopamineSound("click");
    try {
      const res = await actionTestarWebhookFluxoInteligente(configWebhooks.webhook_url, configWebhooks.webhook_secret);
      setResultadoTeste({ success: true, status: res.status, resposta: res.resposta });
      if (showToast) showToast(`Teste bem-sucedido! Servidor retornou HTTP ${res.status}`);
    } catch (err) {
      setResultadoTeste({ success: false, error: err.message });
      if (showToast) showToast(`Erro no teste: ${err.message}`, "error");
    } finally {
      setTestandoWebhook(false);
    }
  };

  const handleCopiarUrl = (texto) => {
    navigator.clipboard.writeText(texto);
    playDopamineSound("click");
    triggerHaptic("light");
    if (showToast) showToast("URL copiada para a área de transferência!");
  };

  const handleExportarCSV = async (tipo) => {
    setExportando(tipo);
    playDopamineSound("select");
    triggerHaptic("success");
    try {
      const dados = await actionExportarDadosEmpresaCSV(tipo);
      
      const baixarArquivo = (conteudo, nomeArquivo) => {
        const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", nomeArquivo);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };

      const dataHojeStr = new Date().toISOString().substring(0, 10);

      if (tipo === "tudo") {
        if (dados.pacientes) baixarArquivo(dados.pacientes, `rmcare_pacientes_${dataHojeStr}.csv`);
        if (dados.agendamentos) baixarArquivo(dados.agendamentos, `rmcare_agendamentos_${dataHojeStr}.csv`);
        if (dados.fila_mensagens) baixarArquivo(dados.fila_mensagens, `rmcare_mensagens_${dataHojeStr}.csv`);
        if (dados.servicos) baixarArquivo(dados.servicos, `rmcare_servicos_${dataHojeStr}.csv`);
        if (showToast) showToast("Todas as 4 planilhas foram exportadas com sucesso!");
      } else if (dados[tipo]) {
        baixarArquivo(dados[tipo], `rmcare_${tipo}_${dataHojeStr}.csv`);
        if (showToast) showToast(`Planilha de ${tipo} exportada com sucesso!`);
      }
    } catch (err) {
      if (showToast) showToast(`Erro ao exportar dados: ${err.message}`, "error");
    } finally {
      setExportando(null);
    }
  };

  const handleSyncNow = async () => {
    setSyncLoading(true);
    try {
      const r = await fetch("/api/importar-agenda", { method: "POST" });
      const d = await r.json();
      if (d.success) {
        if (showToast) showToast(d.message);
        if (typeof fetchBloqueios === "function") await fetchBloqueios();
      } else {
        if (showToast) showToast(d.error, "error");
      }
    } catch (e) {
      if (showToast) showToast("Erro de conexão com o servidor.", "error");
    } finally {
      setSyncLoading(false);
    }
  };

  // Profissionais Órfãos do ERP
  const unmatchedProfessionals = useMemo(() => {
    const safeBloqueios = Array.isArray(bloqueios) ? bloqueios : [];
    const safeServicos = Array.isArray(servicos) ? servicos : [];

    const erpNames = [...new Set(safeBloqueios.map((b) => b.medico_profissional).filter(Boolean))];
    const officialNames = safeServicos.map((s) => s.nome.toLowerCase().trim());

    return erpNames.filter((name) => !officialNames.includes(name.toLowerCase().trim()));
  }, [bloqueios, servicos]);

  const handleResolutionComplete = async () => {
    if (typeof fetchServicos === "function") await fetchServicos();
    if (typeof fetchBloqueios === "function") await fetchBloqueios();
  };

  const inboundWebhookUrl = `${originUrl || "https://rmagenda.com.br"}/api/webhook-resposta`;

  return (
    <motion.div key="integracoes" {...fadeUp} className="flex-1 flex flex-col h-full overflow-hidden w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      
      {/* CABEÇALHO UNIFICADO */}
      <div className="mb-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-zinc-200/80 dark:border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 shadow-sm border border-indigo-200/40">
            <Webhook size={22} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
              Central de Integrações & Webhooks
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
              Conecte Webhooks Inteligentes (n8n/Typebot/IA), Medicalsys ERP, Mercado Pago e exporte seus dados.
            </p>
          </div>
        </div>

        {/* SUB-ABAS / SEGMENTED CONTROL */}
        <LayoutGroup>
          <div className="flex p-1 bg-zinc-100/80 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-sm overflow-x-auto w-full sm:w-auto">
            <button
              onClick={() => { playDopamineSound("click"); setSubTab("painel"); }}
              className={`relative px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors z-10 whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                subTab === "painel" ? "text-white dark:text-black" : "text-zinc-500 hover:text-zinc-950 dark:hover:text-white"
              }`}
            >
              {subTab === "painel" && (
                <motion.div layoutId="subtab-int" className="absolute inset-0 bg-zinc-950 dark:bg-white rounded-xl -z-10 shadow-sm" transition={spring} />
              )}
              <Link2 size={13} /> Painel
            </button>

            <button
              onClick={() => { playDopamineSound("click"); setSubTab("webhooks"); }}
              className={`relative px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors z-10 whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                subTab === "webhooks" ? "text-white dark:text-black" : "text-zinc-500 hover:text-zinc-950 dark:hover:text-white"
              }`}
            >
              {subTab === "webhooks" && (
                <motion.div layoutId="subtab-int" className="absolute inset-0 bg-zinc-950 dark:bg-white rounded-xl -z-10 shadow-sm" transition={spring} />
              )}
              <Zap size={13} className="text-amber-500" /> Webhooks & Fluxos
            </button>

            <button
              onClick={() => { playDopamineSound("click"); setSubTab("medicalsys"); }}
              className={`relative px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors z-10 whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                subTab === "medicalsys" ? "text-white dark:text-black" : "text-zinc-500 hover:text-zinc-950 dark:hover:text-white"
              }`}
            >
              {subTab === "medicalsys" && (
                <motion.div layoutId="subtab-int" className="absolute inset-0 bg-zinc-950 dark:bg-white rounded-xl -z-10 shadow-sm" transition={spring} />
              )}
              <Server size={13} /> ERP (Medicalsys)
            </button>

            <button
              onClick={() => { playDopamineSound("click"); setSubTab("mercadopago"); }}
              className={`relative px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors z-10 whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                subTab === "mercadopago" ? "text-white dark:text-black" : "text-zinc-500 hover:text-zinc-950 dark:hover:text-white"
              }`}
            >
              {subTab === "mercadopago" && (
                <motion.div layoutId="subtab-int" className="absolute inset-0 bg-zinc-950 dark:bg-white rounded-xl -z-10 shadow-sm" transition={spring} />
              )}
              <CreditCard size={13} /> Mercado Pago
            </button>

            <button
              onClick={() => { playDopamineSound("click"); setSubTab("exportacao"); }}
              className={`relative px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors z-10 whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                subTab === "exportacao" ? "text-white dark:text-black" : "text-zinc-500 hover:text-zinc-950 dark:hover:text-white"
              }`}
            >
              {subTab === "exportacao" && (
                <motion.div layoutId="subtab-int" className="absolute inset-0 bg-zinc-950 dark:bg-white rounded-xl -z-10 shadow-sm" transition={spring} />
              )}
              <FileSpreadsheet size={13} /> Exportar (LGPD)
            </button>
          </div>
        </LayoutGroup>
      </div>

      {/* CONTEÚDO DAS SUB-ABAS */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-28 pr-1 space-y-6">
        <AnimatePresence mode="wait">
          
          {/* SUB-ABA 1: PAINEL GERAL DE CONEXÕES */}
          {subTab === "painel" && (
            <motion.div key="sub-painel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={spring} className="space-y-6">
              
              {/* CARD WEBHOOKS E FLUXOS INTELIGENTES */}
              <div className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-8 rounded-[2.5rem] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 border border-amber-200/40">
                    <Zap size={28} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black text-zinc-950 dark:text-white">Webhooks & Fluxos Inteligentes</h3>
                      <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                        configWebhooks.webhook_url ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                      }`}>
                        {configWebhooks.webhook_url ? "Ativo" : "Pendente de URL"}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl leading-relaxed">
                      Acione fluxos interativos de IA (n8n, Typebot, chatbots externos) para confirmação, remarcação e cancelamento com escuta ativa via API.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { playDopamineSound("click"); setShowDocModal(true); }}
                    className="px-5 py-3.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <BookOpen size={15} /> Documentação da API
                  </button>

                  <button
                    onClick={() => { playDopamineSound("click"); setSubTab("webhooks"); }}
                    className="px-6 py-3.5 bg-zinc-950 dark:bg-white text-white dark:text-black font-extrabold text-xs uppercase tracking-wider rounded-2xl hover:bg-black transition-all shadow-md self-start lg:self-center cursor-pointer"
                  >
                    Configurar
                  </button>
                </div>
              </div>

              {/* CARD MEDICALSYS */}
              <div className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-8 rounded-[2.5rem] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 border border-blue-200/40">
                    <Server size={28} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black text-zinc-950 dark:text-white">Medicalsys Agenda ERP</h3>
                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300">
                        Conectado
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl leading-relaxed">
                      Sincronize horários indisponíveis, nomes de pacientes e consultas agendadas diretamente com a plataforma Medicalsys.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 flex-shrink-0">
                  <button
                    onClick={handleSyncNow}
                    disabled={syncLoading}
                    className="px-5 py-3 bg-zinc-950 dark:bg-white text-white dark:text-black hover:bg-black font-bold text-xs uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
                  >
                    {syncLoading ? <Activity size={15} className="animate-spin text-blue-500" /> : <RefreshCw size={15} />}
                    Sincronizar Agora
                  </button>
                  <button
                    onClick={() => { playDopamineSound("click"); setSubTab("medicalsys"); }}
                    className="px-4 py-3 border border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold text-xs uppercase tracking-wider rounded-2xl transition-colors cursor-pointer"
                  >
                    Configurar API
                  </button>
                </div>
              </div>

              {/* CARD MERCADO PAGO */}
              <div className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-8 rounded-[2.5rem] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 border border-indigo-200/40">
                    <CreditCard size={28} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black text-zinc-950 dark:text-white">Mercado Pago Checkout</h3>
                      <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                        chaves.mp_public_key ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                      }`}>
                        {chaves.mp_public_key ? "Configurado" : "Pendente"}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl leading-relaxed">
                      Provedor financeiro para recebimento de consultas e exames via cartão de crédito ou Pix instantâneo no checkout do paciente.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => { playDopamineSound("click"); setSubTab("mercadopago"); }}
                  className="px-6 py-3.5 bg-zinc-950 dark:bg-white text-white dark:text-black font-extrabold text-xs uppercase tracking-wider rounded-2xl hover:bg-black transition-all shadow-md self-start lg:self-center cursor-pointer"
                >
                  Credenciais
                </button>
              </div>

            </motion.div>
          )}

          {/* SUB-ABA 2: CONFIGURAÇÃO DE WEBHOOKS & FLUXOS INTELIGENTES */}
          {subTab === "webhooks" && (
            <motion.div key="sub-webhooks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={spring} className="space-y-6">
              
              {/* BOTÃO PARA ABRIR A DOCUMENTAÇÃO INTERATIVA */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-amber-500/[0.06] border border-amber-500/25 rounded-3xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-zinc-950 dark:text-white">
                      Guia de Integração & Documentação da API
                    </h4>
                    <p className="text-xs text-zinc-500">
                      Veja o formato completo dos payloads JSON (envio e retorno), exemplos em cURL e passo a passo para n8n/Typebot.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => { playDopamineSound("click"); setShowDocModal(true); }}
                  className="px-5 py-2.5 bg-zinc-950 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
                >
                  <Code2 size={15} /> Ver Documentação
                </button>
              </div>

              {/* SEÇÃO 1: URL DE DISPARO EXTERNO (OUTGOING) & SECRET */}
              <div className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-8 rounded-[2.5rem] shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-white/5 pb-4">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-black text-zinc-950 dark:text-white">
                      Disparo de Webhook / Início de Fluxo Inteligente
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Quando uma automação estiver configurada como "Tipo: Webhook", o sistema enviará um payload JSON para esta URL.
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest block ml-1">
                      URL de Disparo do Webhook (Ex.: n8n, Typebot, Chatbot Externo) *
                    </label>
                    <input
                      type="url"
                      value={configWebhooks.webhook_url || ""}
                      onChange={(e) => setConfigWebhooks({ ...configWebhooks, webhook_url: e.target.value })}
                      placeholder="https://n8n.suaclinica.com/webhook/confirmacao-ia"
                      className="w-full px-4 py-3.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl text-xs font-mono text-zinc-900 dark:text-white outline-none focus:border-[#9FC131]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest block ml-1 flex items-center gap-1">
                      <KeySquare size={12} /> Chave Secreta / Token de Assinatura (Header x-webhook-secret)
                    </label>
                    <input
                      type="text"
                      value={configWebhooks.webhook_secret || ""}
                      onChange={(e) => setConfigWebhooks({ ...configWebhooks, webhook_secret: e.target.value })}
                      placeholder="Ex.: secret_rmcare_prod_xyz123"
                      className="w-full px-4 py-3.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl text-xs font-mono text-zinc-900 dark:text-white outline-none focus:border-[#9FC131]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <CustomSelect
                      label="Canal de Disparo Padrão para Novas Mensagens"
                      value={configWebhooks.webhook_tipo_padrao || "whatsapp"}
                      onChange={(v) => setConfigWebhooks({ ...configWebhooks, webhook_tipo_padrao: v })}
                      options={[
                        { value: "whatsapp", label: "Mensagem WhatsApp Normal (RM Chat / Texto)" },
                        { value: "webhook", label: "Disparo Webhook (Fluxo Inteligente / Chatbot)" }
                      ]}
                    />
                  </div>
                </div>

                {/* BOTÃO DE TESTAR WEBHOOK */}
                <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded-2xl border border-zinc-200/70 dark:border-zinc-800">
                  <div className="text-xs text-zinc-500">
                    Clique para testar se seu endpoint de webhook está pronto para receber requisições do RM Care.
                  </div>
                  <button
                    type="button"
                    onClick={handleTestarWebhook}
                    disabled={testandoWebhook || !configWebhooks.webhook_url}
                    className="px-5 py-2.5 bg-zinc-950 dark:bg-white text-white dark:text-black font-extrabold text-xs rounded-xl flex items-center gap-2 hover:bg-black transition-all shadow-sm disabled:opacity-40 cursor-pointer"
                  >
                    {testandoWebhook ? <Activity size={14} className="animate-spin text-amber-500" /> : <Send size={14} />}
                    <span>{testandoWebhook ? "Enviando Teste..." : "Testar Webhook Agora"}</span>
                  </button>
                </div>

                {/* RESULTADO DO TESTE */}
                {resultadoTeste && (
                  <div className={`p-4 rounded-2xl border text-xs ${
                    resultadoTeste.success
                      ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                      : "bg-red-50/70 dark:bg-red-950/30 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200"
                  }`}>
                    <div className="flex items-center gap-2 font-bold mb-1">
                      {resultadoTeste.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                      <span>{resultadoTeste.success ? `Webhook Respondeu com Sucesso (HTTP ${resultadoTeste.status})` : "Falha ao Conectar no Webhook"}</span>
                    </div>
                    <p className="font-mono text-[11px] opacity-80 break-all">
                      {resultadoTeste.resposta || resultadoTeste.error}
                    </p>
                  </div>
                )}
              </div>

              {/* SEÇÃO 2: URL INBOUND DE RECEPÇÃO / RESPOSTAS DA API */}
              <div className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-8 rounded-[2.5rem] shadow-sm space-y-5">
                <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-white/5 pb-4">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                    <Bot size={20} />
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-black text-zinc-950 dark:text-white">
                      Escuta Ativa: URL de Retorno (Inbound Webhook / API)
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Configure no seu n8n/Typebot para enviar a resposta do paciente de volta para este endpoint.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-3">
                  <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest block">
                    URL do Endpoint de Resposta da sua Clínica (POST):
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inboundWebhookUrl}
                      className="flex-1 px-4 py-3 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold text-blue-600 dark:text-blue-400 select-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopiarUrl(inboundWebhookUrl)}
                      className="px-4 py-3 bg-zinc-950 dark:bg-white text-white dark:text-black hover:bg-black font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
                    >
                      <Copy size={14} /> Copiar URL
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    💡 O corpo da requisição deve enviar em JSON: <code className="text-zinc-900 dark:text-white font-mono bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded">agendamento_id</code> e <code className="text-zinc-900 dark:text-white font-mono bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded">resposta</code> (ou código numérico mapeado abaixo).
                  </p>
                </div>

                {/* MAPEAMENTO DE CÓDIGOS DE RESPOSTA */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-zinc-950 dark:text-white flex items-center gap-2">
                      <Sliders size={14} /> Mapeamento de Códigos e Palavras de Resposta
                    </h4>
                    <span className="text-[10px] text-zinc-400">Valores separados por vírgula</span>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    {/* CONFIRMAR */}
                    <div className="p-4 bg-emerald-500/[0.04] border border-emerald-500/25 rounded-2xl space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 size={15} /> Confirmar Atendimento
                      </div>
                      <input
                        type="text"
                        value={Array.isArray(configWebhooks.respostas_mapping?.confirmar) ? configWebhooks.respostas_mapping.confirmar.join(", ") : "1, sim, confirmo"}
                        onChange={(e) => {
                          const list = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                          setConfigWebhooks({
                            ...configWebhooks,
                            respostas_mapping: {
                              ...(configWebhooks.respostas_mapping || {}),
                              confirmar: list
                            }
                          });
                        }}
                        placeholder="1, sim, confirmo, confirmar"
                        className="w-full p-2.5 bg-white dark:bg-black border border-emerald-500/30 rounded-xl text-xs font-mono outline-none focus:border-emerald-500"
                      />
                      <span className="text-[10px] text-zinc-400 block">Marca o agendamento como Confirmado</span>
                    </div>

                    {/* CANCELAR */}
                    <div className="p-4 bg-rose-500/[0.04] border border-rose-500/25 rounded-2xl space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-rose-700 dark:text-rose-300">
                        <AlertTriangle size={15} /> Cancelar / Rejeitar
                      </div>
                      <input
                        type="text"
                        value={Array.isArray(configWebhooks.respostas_mapping?.cancelar) ? configWebhooks.respostas_mapping.cancelar.join(", ") : "2, nao, cancelar"}
                        onChange={(e) => {
                          const list = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                          setConfigWebhooks({
                            ...configWebhooks,
                            respostas_mapping: {
                              ...(configWebhooks.respostas_mapping || {}),
                              cancelar: list
                            }
                          });
                        }}
                        placeholder="2, nao, não, cancelar, desmarcar"
                        className="w-full p-2.5 bg-white dark:bg-black border border-rose-500/30 rounded-xl text-xs font-mono outline-none focus:border-rose-500"
                      />
                      <span className="text-[10px] text-zinc-400 block">Cancela e libera o horário no sistema</span>
                    </div>

                    {/* REMARCAR */}
                    <div className="p-4 bg-amber-500/[0.04] border border-amber-500/25 rounded-2xl space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-700 dark:text-amber-300">
                        <Clock size={15} /> Solicitar Remarcação
                      </div>
                      <input
                        type="text"
                        value={Array.isArray(configWebhooks.respostas_mapping?.remarcar) ? configWebhooks.respostas_mapping.remarcar.join(", ") : "3, remarcar, reagendar"}
                        onChange={(e) => {
                          const list = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                          setConfigWebhooks({
                            ...configWebhooks,
                            respostas_mapping: {
                              ...(configWebhooks.respostas_mapping || {}),
                              remarcar: list
                            }
                          });
                        }}
                        placeholder="3, remarcar, reagendar, mudar"
                        className="w-full p-2.5 bg-white dark:bg-black border border-amber-500/30 rounded-xl text-xs font-mono outline-none focus:border-amber-500"
                      />
                      <span className="text-[10px] text-zinc-400 block">Gera status e alerta para a recepção</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 3: AUTOMAÇÃO DE PRESENÇA / BAIXA AUTOMÁTICA PÓS-HORÁRIO */}
              <div className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-8 rounded-[2.5rem] shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-white/5 pb-4">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                    <CalendarCheck size={20} />
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-black text-zinc-950 dark:text-white">
                      Automação de Presença / Baixa Pós-Horário
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Configure o comportamento automático quando o horário agendado passa sem baixa manual do especialista.
                    </p>
                  </div>
                </div>

                <div className="p-5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div>
                      <h4 className="font-extrabold text-xs text-zinc-950 dark:text-white">
                        Ativar Atualização Automática de Status Pós-Horário
                      </h4>
                      <p className="text-[11px] text-zinc-500">
                        Quando ativado, o cron job do sistema atualizará os agendamentos expirados automaticamente.
                      </p>
                    </div>

                    <ToggleSwitch
                      checked={Boolean(configWebhooks.automacoes_presenca?.ativo)}
                      onChange={(v) =>
                        setConfigWebhooks({
                          ...configWebhooks,
                          automacoes_presenca: {
                            ...(configWebhooks.automacoes_presenca || {}),
                            ativo: v
                          }
                        })
                      }
                      label={configWebhooks.automacoes_presenca?.ativo ? "Habilitado" : "Desabilitado"}
                    />
                  </div>

                  {configWebhooks.automacoes_presenca?.ativo && (
                    <div className="grid sm:grid-cols-2 gap-4 pt-3 border-t border-zinc-200/60 dark:border-zinc-800">
                      <CustomSelect
                        label="Ação Padrão para Atendimentos Expirados"
                        value={configWebhooks.automacoes_presenca?.acao_padrao || "compareceu"}
                        onChange={(v) =>
                          setConfigWebhooks({
                            ...configWebhooks,
                            automacoes_presenca: {
                              ...(configWebhooks.automacoes_presenca || {}),
                              acao_padrao: v
                            }
                          })
                        }
                        options={[
                          { value: "compareceu", label: "Marcar Automaticamente como 'Compareceu / Atendido'" },
                          { value: "nao_compareceu", label: "Marcar Automaticamente como 'Não Compareceu / Falta'" }
                        ]}
                      />

                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest block ml-1">
                          Tolerância após o horário (Minutos)
                        </label>
                        <input
                          type="number"
                          min={10}
                          max={1440}
                          value={configWebhooks.automacoes_presenca?.tolerancia_minutos ?? 60}
                          onChange={(e) =>
                            setConfigWebhooks({
                              ...configWebhooks,
                              automacoes_presenca: {
                                ...(configWebhooks.automacoes_presenca || {}),
                                tolerancia_minutos: parseInt(e.target.value || "60", 10)
                              }
                            })
                          }
                          className="w-full px-4 py-3 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </motion.div>
          )}

          {/* SUB-ABA 3: CONFIGURAÇÕES DO MEDICALSYS ERP */}
          {subTab === "medicalsys" && (
            <motion.div key="sub-medicalsys" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={spring} className="space-y-6">
              
              {/* PROFISSIONAIS ÓRFÃOS */}
              {unmatchedProfessionals.length > 0 && (
                <div className="p-6 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 rounded-3xl space-y-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={20} className="text-amber-600" />
                    <h4 className="font-bold text-amber-950 dark:text-amber-300 text-base">
                      {unmatchedProfessionals.length} Profissional(is) não mapeados vindos do ERP
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {unmatchedProfessionals.map((erpName) => (
                      <UnmatchedItem
                        key={`unmatched-${erpName}`}
                        erpName={erpName}
                        servicosDisponiveis={servicos}
                        onResolve={handleResolutionComplete}
                        showToast={showToast}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* TRAVA DE SEGURANÇA E ENVIOS */}
              <div className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-8 rounded-[2.5rem] shadow-sm space-y-8">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
                  <h3 className="text-lg font-black text-zinc-950 dark:text-white flex items-center gap-2">
                    <ShieldAlert size={20} className="text-amber-500" /> Controle de Inclusão de Agendamentos na API
                  </h3>
                </div>

                <div className="p-6 rounded-3xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-4">
                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                    Desabilite para rodar os testes de agendamento no seu ambiente sem enviar requisições reais para a clínica do Medicalsys. Quando desabilitado, os testes rodam com segurança no sistema.
                  </p>
                  <ToggleSwitch
                    checked={Boolean(chaves.medicalsys_enabled)}
                    onChange={(v) => setChaves({ ...chaves, medicalsys_enabled: v })}
                    label={chaves.medicalsys_enabled ? "Envio Automático Ativado (Produção)" : "Envio Desabilitado (Modo de Teste Protegido)"}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6 pt-2">
                  <TextInput
                    label="ID da Clínica no Medicalsys (id_clinica)"
                    placeholder="Ex: 9"
                    value={chaves.medicalsys_id_clinica || ""}
                    onChange={(e) => setChaves({ ...chaves, medicalsys_id_clinica: e.target.value })}
                  />

                  <TextInput
                    label="ID do Médico Padrão (medico)"
                    placeholder="Ex: 1"
                    value={chaves.medicalsys_id_medico || ""}
                    onChange={(e) => setChaves({ ...chaves, medicalsys_id_medico: e.target.value })}
                  />

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Chave API (apikey)</label>
                    <input
                      type="text"
                      value={chaves.medicalsys_apikey || ""}
                      onChange={(e) => setChaves({ ...chaves, medicalsys_apikey: e.target.value })}
                      className="w-full px-4 py-3.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl text-sm font-mono text-zinc-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Chave do Cliente (msys-costumer-apikey)</label>
                    <input
                      type="text"
                      value={chaves.medicalsys_customer_apikey || ""}
                      onChange={(e) => setChaves({ ...chaves, medicalsys_customer_apikey: e.target.value })}
                      className="w-full px-4 py-3.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl text-sm font-mono text-zinc-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

            </motion.div>
          )}

          {/* SUB-ABA 4: MERCADO PAGO */}
          {subTab === "mercadopago" && (
            <motion.div key="sub-mercadopago" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={spring} className="space-y-6">
              <div className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-8 rounded-[2.5rem] shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-zinc-950 dark:text-white">Credenciais do Mercado Pago</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Chaves de integração para pagamentos de cartão e Pix no checkout transparente.
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                      <KeySquare size={14} /> Public Key
                    </label>
                    <input
                      type="text"
                      value={chaves.mp_public_key || ""}
                      onChange={(e) => setChaves({ ...chaves, mp_public_key: e.target.value })}
                      placeholder="APP_USR-xxxxxxxx-xxxx-xxxx..."
                      className="w-full px-4 py-3.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl text-sm font-mono text-zinc-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                      <KeySquare size={14} /> Access Token (Privado)
                    </label>
                    <input
                      type="password"
                      value={chaves.mp_access_token || ""}
                      onChange={(e) => setChaves({ ...chaves, mp_access_token: e.target.value })}
                      placeholder="APP_USR-xxxxxxxx-xxxx-xxxx..."
                      className="w-full px-4 py-3.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl text-sm font-mono text-zinc-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* SUB-ABA 5: PORTABILIDADE & EXPORTAÇÃO DE DADOS EM PLANILHAS (LGPD) */}
          {subTab === "exportacao" && (
            <motion.div key="sub-exportacao" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={spring} className="space-y-6">
              
              <div className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-8 rounded-[2.5rem] shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-white/5 pb-4">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                    <FileSpreadsheet size={20} />
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-black text-zinc-950 dark:text-white">
                      Portabilidade de Dados & Migração Completa (LGPD)
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Exporte todas as informações da sua clínica em planilhas CSV com formatação compatível com Excel, Google Sheets e outros sistemas.
                    </p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* EXPORTAR PACIENTES */}
                  <div className="p-5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-3 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-zinc-950 dark:text-white flex items-center gap-1.5">
                        <FileSpreadsheet size={15} className="text-blue-500" /> Pacientes Cadastrados
                      </h4>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        CPFs, contatos, data de nascimento e lista completa de enfermidades.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleExportarCSV("pacientes")}
                      disabled={exportando !== null}
                      className="w-full py-2.5 px-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs rounded-xl hover:bg-zinc-100 transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      {exportando === "pacientes" ? <Activity size={14} className="animate-spin" /> : <Download size={14} />}
                      <span>Baixar CSV</span>
                    </button>
                  </div>

                  {/* EXPORTAR AGENDAMENTOS */}
                  <div className="p-5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-3 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-zinc-950 dark:text-white flex items-center gap-1.5">
                        <FileSpreadsheet size={15} className="text-emerald-500" /> Agendamentos & Histórico
                      </h4>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        Datas, horários, médicos, procedimentos, status e valores.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleExportarCSV("agendamentos")}
                      disabled={exportando !== null}
                      className="w-full py-2.5 px-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs rounded-xl hover:bg-zinc-100 transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      {exportando === "agendamentos" ? <Activity size={14} className="animate-spin" /> : <Download size={14} />}
                      <span>Baixar CSV</span>
                    </button>
                  </div>

                  {/* EXPORTAR MENSAGENS / WEBHOOKS */}
                  <div className="p-5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-3 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-zinc-950 dark:text-white flex items-center gap-1.5">
                        <FileSpreadsheet size={15} className="text-amber-500" /> Fila & Respostas Webhook
                      </h4>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        Histórico completo de disparos, mensagens, status e respostas recebidas.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleExportarCSV("fila_mensagens")}
                      disabled={exportando !== null}
                      className="w-full py-2.5 px-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs rounded-xl hover:bg-zinc-100 transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      {exportando === "fila_mensagens" ? <Activity size={14} className="animate-spin" /> : <Download size={14} />}
                      <span>Baixar CSV</span>
                    </button>
                  </div>

                  {/* EXPORTAR SERVIÇOS */}
                  <div className="p-5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-3 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-zinc-950 dark:text-white flex items-center gap-1.5">
                        <FileSpreadsheet size={15} className="text-purple-500" /> Corpo Clínico & Serviços
                      </h4>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        Profissionais cadastrados, especialidades, regras de bloqueio e URIs.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleExportarCSV("servicos")}
                      disabled={exportando !== null}
                      className="w-full py-2.5 px-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs rounded-xl hover:bg-zinc-100 transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      {exportando === "servicos" ? <Activity size={14} className="animate-spin" /> : <Download size={14} />}
                      <span>Baixar CSV</span>
                    </button>
                  </div>
                </div>

                {/* BOTÃO EXPORTAR PACOTE COMPLETO */}
                <div className="pt-4 border-t border-zinc-100 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-emerald-500/[0.04] p-5 rounded-2xl border border-emerald-500/20">
                  <div>
                    <h4 className="font-extrabold text-sm text-zinc-950 dark:text-white flex items-center gap-2">
                      <Sparkles size={16} className="text-emerald-500" /> Baixar Pacote Completo de Migração (Todas as Planilhas)
                    </h4>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Gera e faz o download de todas as 4 tabelas de uma só vez para backup ou migração rápida de banco.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleExportarCSV("tudo")}
                    disabled={exportando !== null}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer shrink-0"
                  >
                    {exportando === "tudo" ? <Activity size={15} className="animate-spin" /> : <Download size={15} />}
                    <span>{exportando === "tudo" ? "Exportando..." : "Exportar Todas as Planilhas"}</span>
                  </button>
                </div>
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* MODAL DE DOCUMENTAÇÃO INTERATIVA DE API & WEBHOOKS */}
      <ApiDocumentationModal
        isOpen={showDocModal}
        onClose={() => setShowDocModal(false)}
        originUrl={originUrl}
        secret={configWebhooks.webhook_secret}
        showToast={showToast}
      />

      {/* RODAPÉ FIXO PARA SALVAR CONFIGURAÇÕES */}
      <div className="absolute bottom-0 left-0 right-0 p-5 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-t border-zinc-200/80 dark:border-zinc-800 flex justify-end items-center z-50">
        <ButtonPrimary onClick={handleSave} disabled={loading} icon={Save} className="w-full md:w-auto px-10 py-3.5 text-xs">
          {loading ? "Salvando Integrações..." : "Salvar Configurações de Integração"}
        </ButtonPrimary>
      </div>

    </motion.div>
  );
}
