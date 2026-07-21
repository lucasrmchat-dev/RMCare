"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase"; 
import { 
  ArrowRight, CheckCircle, AlertTriangle, Activity, Pencil, ChevronLeft
} from "lucide-react";

import Navbar from "@/components/Navbar";
import SidebarPremium from "@/components/SidebarPremium";

// Importações Locais Refatoradas
import { AgendamentoContext } from "./context";
import { MODULE_REGISTRY } from "./modules";
import { 
  schema, helpers, masks, gerarMensagemConfirmacao, calcularDataLimite, 
  mapaMedicos, dispararPushRmChat, programarMensagensMedicas 
} from "./utils";

export default function AgendamentoPremium() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  return (
    <div className="flex min-h-[100dvh] w-full bg-[#FAFAFA] dark:bg-black text-zinc-900 dark:text-zinc-50 transition-colors duration-500 font-sans antialiased">
      <SidebarPremium isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />
      <Navbar />
      <main className={`flex-1 relative flex flex-col items-center transition-[margin] duration-500 ease-in-out w-full min-h-[100dvh] overflow-hidden ${isSidebarExpanded ? "md:ml-[260px]" : "md:ml-[88px]"}`}>
        <Suspense fallback={<div className="min-h-[100dvh] flex items-center justify-center w-full"><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-8 h-8 border-[3px] border-zinc-900 dark:border-white border-t-transparent rounded-full" /></div>}>
          <AgendamentoOrquestrador />
        </Suspense>
      </main>
    </div>
  );
}

function AgendamentoOrquestrador() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug; 
  
  const [modulosAtivos, setModulosAtivos] = useState(["boas_vindas", "identificacao", "especialidade", "triagem", "modalidade", "agenda", "checkout", "concluido"]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  const [empresaDados, setEmpresaDados] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loading, setLoading] = useState(false);
  const [islandState, setIslandState] = useState("default");
  const [islandMessage, setIslandMessage] = useState("");
  const timeoutRef = useRef(null);
  const timeSlotsRef = useRef(null); 
  
  const [servicosDB, setServicosDB] = useState([]);
  const [perguntasDB, setPerguntasDB] = useState([]);
  const [respostasTriagem, setRespostasTriagem] = useState({});
  const [bloqueioExtraCalculado, setBloqueioExtraCalculado] = useState(null);

  const [pixData, setPixData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const checkingRef = useRef(false);
  const timeLeftRef = useRef(timeLeft);

  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  const [context, setContext] = useState({ isSmartLink: false, personalizedName: "", dataUltimaConsulta: null, userFound: false, checkingUser: false });
  const [calendarMonth, setCalendarMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [agenda, setAgenda] = useState({ ocupados: [], buscando: false });
  
  const [flags, setFlags] = useState({
    cpfUrl: false, nomeUrl: false, sobrenomeUrl: false, telUrl: false, emailUrl: false, nascUrl: false,
    unlockedAll: false, exibirConfUri: false, confirmouUri: false
  });

  const formMethods = useForm({ resolver: zodResolver(schema), mode: "onChange" });
  const { register, watch, trigger, setValue, formState: { errors }, reset } = formMethods;
  const formData = watch();

  useEffect(() => {
    const fetchEmpresaConfigAndData = async () => {
      setLoadingConfig(true);
      if (!slug) { setLoadingConfig(false); return; }

      try {
        const { data: empresa } = await supabase.from("empresas").select("*").eq("slug", slug).maybeSingle();
        if (!empresa) { showIsland("Link de agendamento inválido.", "error"); setLoadingConfig(false); return; }
        setEmpresaDados(empresa);

        const { data: config } = await supabase.from("empresa_modulos").select("ordem_modulos").eq("empresa_id", empresa.id).maybeSingle();
        if (config && config.ordem_modulos && config.ordem_modulos.length > 0) {
          setModulosAtivos(config.ordem_modulos);
        }

        const [{ data: srvs }, { data: pergs }, { data: ops }] = await Promise.all([
          supabase.from("servicos").select("*").eq("ativo", true).eq("empresa_id", empresa.id),
          supabase.from("perguntas_triagem").select("*").eq("ativa", true).eq("empresa_id", empresa.id),
          supabase.from("opcoes_triagem").select("*")
        ]);
        
        if (srvs) setServicosDB(srvs);
        if (pergs && ops) {
          const pergsFull = pergs.map(p => ({
            ...p, opcoes: ops.filter(o => o.pergunta_id === p.id)
          }));
          setPerguntasDB(pergsFull);
        }
      } catch (err) { console.error("Erro ao carregar dados da clínica:", err); } finally { setLoadingConfig(false); }
    };
    fetchEmpresaConfigAndData();
  }, [slug]);

  const getSelectedService = () => {
    if (!formData.tipo_servico) return null;
    const nomeBusca = formData.tipo_servico === "Exame" ? formData.subtipo_exame : formData.medico_profissional;
    if (!nomeBusca) return null;
    let srv = servicosDB.find(s => s.nome.trim().toLowerCase() === nomeBusca.trim().toLowerCase());
    if (!srv) {
      const nomeLimpo = nomeBusca.toLowerCase().replace(/dra\.|dr\./g, "").trim();
      srv = servicosDB.find(s => s.nome.toLowerCase().includes(nomeLimpo));
    }
    return srv;
  };
  
  const selectedSrv = getSelectedService();
  const valorEntrada = selectedSrv ? (selectedSrv.preco / 2) : 0;
  const perguntasAtuais = selectedSrv ? perguntasDB.filter(p => p.servico_id === selectedSrv.id) : [];

  const showIsland = (msg, type = "error") => {
    setIslandMessage(msg); setIslandState(type);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const currentModule = modulosAtivos[currentStepIndex];
    if (!["loading", "success"].includes(type) && currentModule !== "concluido") {
      timeoutRef.current = setTimeout(() => setIslandState("default"), 3000);
    }
  };

  useEffect(() => {
    const nomeUrl = searchParams.get("nome");
    const cpfUrl = searchParams.get("cpf");
    const medicoUrl = searchParams.get("medico");
    const wppUrl = searchParams.get("whatsapp");
    const emailUrl = searchParams.get("email");
    const nascUrl = searchParams.get("nascimento");

    if ((nomeUrl !== null || cpfUrl !== null || medicoUrl !== null || wppUrl !== null) && !context.isSmartLink && !loadingConfig) {
      if (nomeUrl) { const parts = nomeUrl.trim().split(" "); setValue("nome", parts[0] || ""); setValue("sobrenome", parts.slice(1).join(" ") || ""); }
      if (cpfUrl) setValue("cpf", masks.cpf(cpfUrl));
      
      let limpaWpp = wppUrl ? wppUrl.replace(/\D/g, "") : "";
      if (limpaWpp.startsWith("55") && (limpaWpp.length === 12 || limpaWpp.length === 13)) limpaWpp = limpaWpp.substring(2);
      if (limpaWpp) setValue("telefone_whatsapp", masks.phone(limpaWpp));
      
      if (emailUrl) setValue("email", emailUrl);
      if (nascUrl) setValue("data_nascimento", masks.date(nascUrl));

      const hasCpf = !!(cpfUrl && cpfUrl.trim() !== "");
      const hasNome = !!(nomeUrl && nomeUrl.trim() !== "");
      const hasTel = !!(limpaWpp && limpaWpp.trim() !== "");
      const hasEmail = !!(emailUrl && emailUrl.trim() !== "");
      const hasNasc = !!(nascUrl && nascUrl.trim() !== "");
      const hasMedico = !!(medicoUrl && medicoUrl.trim() !== "");

      setFlags(f => ({ 
        ...f, cpfUrl: hasCpf, nomeUrl: hasNome, sobrenomeUrl: hasNome && nomeUrl.trim().split(" ").length > 1, 
        telUrl: hasTel, emailUrl: hasEmail, nascUrl: hasNasc, exibirConfUri: hasMedico
      }));
      
      setContext(c => ({ ...c, isSmartLink: true, personalizedName: nomeUrl ? nomeUrl.trim().split(" ")[0] : "" }));
      
      if (hasMedico) {
        const mapped = mapaMedicos[medicoUrl];
        if (mapped) { setValue("tipo_servico", mapped.tipo); setValue(mapped.tipo === "Consulta" ? "medico_profissional" : "subtipo_exame", mapped.nome); }
        else if (servicosDB.length > 0) {
          const srv = servicosDB.find(s => s.nome.toLowerCase().includes(medicoUrl.toLowerCase()));
          if (srv) { setValue("tipo_servico", srv.tipo); setValue(srv.tipo === "Consulta" ? "medico_profissional" : "subtipo_exame", srv.nome); }
          else setValue("medico_profissional", medicoUrl);
        }
      }

      const cpfValid = cpfUrl && cpfUrl.replace(/\D/g, "").length === 11;
      const telValid = limpaWpp.length >= 10;
      const nomeValid = nomeUrl && nomeUrl.trim().split(" ").length > 1;

      if (cpfValid && telValid && nomeValid && hasEmail && hasNasc) {
        const jumpIndex = modulosAtivos.indexOf("especialidade");
        if(jumpIndex !== -1) setCurrentStepIndex(jumpIndex); 
      } else {
        const jumpIndex = modulosAtivos.indexOf("identificacao");
        if(jumpIndex !== -1) setCurrentStepIndex(jumpIndex); 
      }
    }
  }, [searchParams, context.isSmartLink, servicosDB, setValue, loadingConfig, modulosAtivos]);

  const handleCpfLookup = async () => {
    if (formData.cpf?.length !== 14) return;
    setContext(c => ({ ...c, checkingUser: true }));
    if (!context.isSmartLink || flags.unlockedAll) ["nome", "sobrenome", "telefone_whatsapp", "email", "data_nascimento"].forEach(f => setValue(f, ""));

    try {
      const { data } = await supabase.from("pacientes").select("*").eq("cpf", formData.cpf).maybeSingle();
      if (data) {
        if (data.nome_completo) { const p = data.nome_completo.trim().split(" "); setValue("nome", p[0] || ""); setValue("sobrenome", p.slice(1).join(" ") || ""); }
        setValue("telefone_whatsapp", data.telefone_whatsapp || "");
        setValue("email", data.email || "");
        if (data.data_nascimento) setValue("data_nascimento", data.data_nascimento.split('-').reverse().join('/'));
        
        setContext(c => ({ ...c, userFound: true }));
        showIsland("Bem-vindo de volta!", "success");
        setTimeout(() => setIslandState("default"), 2000);
      } else setContext(c => ({ ...c, userFound: false }));
    } finally { setTimeout(() => setContext(c => ({ ...c, checkingUser: false })), 500); }
  };

  useEffect(() => { 
    if (formData.cpf?.length === 14 && !context.userFound && modulosAtivos[currentStepIndex] === "identificacao" && !context.checkingUser) handleCpfLookup(); 
  }, [formData.cpf, currentStepIndex]);

  useEffect(() => {
    if (!formData.data_agendamento) return;
    const prof = formData.tipo_servico === "Exame" ? formData.subtipo_exame : formData.medico_profissional;
    if (!prof) return;

    setAgenda(a => ({ ...a, buscando: true }));
    setValue("horario_agendamento", "");

    const fetchAgenda = async () => {
      try {
        const [{ data: ag }, { data: bl }] = await Promise.all([
          supabase.from("agendamentos").select("horario_agendamento, medico_profissional, subtipo_exame").eq("data_agendamento", formData.data_agendamento),
          supabase.from("bloqueios_horarios").select("horario, medico_profissional").eq("data", formData.data_agendamento)
        ]);
        const match = (nDB) => {
          if (!nDB) return false;
          if (nDB === "Todos") return true;
          const pNorm = prof.toLowerCase().replace(/dra\.|dr\./g, "").trim();
          return nDB.toLowerCase().includes(pNorm) || pNorm.includes(nDB.toLowerCase()) || nDB.toLowerCase().includes(pNorm.split(" ")[0]);
        };
        const slots = [...(ag?.filter(a => match(a.medico_profissional) || match(a.subtipo_exame)).map(a => a.horario_agendamento.substring(0,5)) || []), ...(bl?.filter(b => match(b.medico_profissional)).map(b => b.horario.substring(0,5)) || [])];
        setAgenda({ ocupados: [...new Set(slots)], buscando: false });
      } catch (e) { setAgenda(a => ({ ...a, buscando: false })); }
    };
    fetchAgenda();
  }, [formData.data_agendamento, formData.medico_profissional, formData.subtipo_exame, formData.tipo_servico, setValue]);

  const salvarNoBanco = async (pago) => {
    try {
      let pacienteId = (await supabase.from("pacientes").select("id").eq("cpf", formData.cpf).maybeSingle()).data?.id;
      const pacienteData = { nome_completo: `${formData.nome} ${formData.sobrenome}`.trim(), telefone_whatsapp: formData.telefone_whatsapp, email: formData.email, data_nascimento: helpers.toDBDate(formData.data_nascimento) };
      if (pacienteId) await supabase.from("pacientes").update(pacienteData).eq("id", pacienteId);
      else pacienteId = (await supabase.from("pacientes").insert({ cpf: formData.cpf, ...pacienteData }).select().single()).data.id;

      await supabase.from("agendamentos").insert({
        paciente_id: pacienteId, tipo_servico: formData.tipo_servico, subtipo_exame: formData.subtipo_exame || null,
        medico_profissional: formData.medico_profissional || "A definir", modalidade: formData.modalidade || "Não se aplica",
        data_agendamento: formData.data_agendamento, horario_agendamento: formData.horario_agendamento, status_pagamento_antecipado: pago, valor_total: valorEntrada * 2
      });
      return true;
    } catch { return false; }
  };

  const dispararWebhook = async (pago) => {
    if (!process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL) return;
    try {
      await fetch(process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...formData, nome_completo: `${formData.nome} ${formData.sobrenome}`.trim(), status_pagamento: pago, data_criacao: new Date().toISOString() }) });
    } catch {}
  };

  const isModuleValid = (moduleKey) => {
    switch (moduleKey) {
      case "boas_vindas": return true;
      case "identificacao": return formData.cpf?.length === 14 && formData.nome?.length >= 2 && formData.sobrenome?.length >= 2 && formData.telefone_whatsapp?.length >= 14 && helpers.isValidDate(formData.data_nascimento) && formData.email?.includes('@');
      case "especialidade":
        if (flags.exibirConfUri && !flags.confirmouUri) return false;
        if (!formData.tipo_servico) return false;
        if (["Consulta", "Retorno"].includes(formData.tipo_servico) && !formData.medico_profissional) return false;
        if (formData.tipo_servico === "Exame" && !formData.subtipo_exame) return false;
        return true;
      case "triagem": return perguntasAtuais.every(p => respostasTriagem[p.id]);
      case "modalidade": return !!formData.modalidade || formData.tipo_servico === "Retorno";
      case "agenda": return !!(formData.data_agendamento && formData.horario_agendamento);
      case "checkout":
      case "concluido": return true;
      default: return false; 
    }
  };

  const nextStep = async () => {
    setLoading(true); showIsland("Processando...", "loading");
    const currentModule = modulosAtivos[currentStepIndex];
    try {
      if (currentModule === "identificacao") {
        const isStepValid = await trigger(["cpf", "nome", "sobrenome", "telefone_whatsapp", "data_nascimento", "email"]);
        if (!isStepValid) return showIsland("Verifique os dados informados.");
      }
      if (currentModule === "especialidade") {
        if (flags.exibirConfUri && flags.confirmouUri) {
          const idxTriagem = modulosAtivos.indexOf("triagem");
          const idxModalidade = modulosAtivos.indexOf("modalidade");
          if (idxTriagem > currentStepIndex && perguntasAtuais.length > 0) return setCurrentStepIndex(idxTriagem);
          if (idxModalidade > currentStepIndex) return setCurrentStepIndex(idxModalidade);
        }
        if (formData.medico_profissional === "Dra. Simone" || formData.tipo_servico === "Retorno") {
          const pid = (await supabase.from("pacientes").select("id").eq("cpf", formData.cpf).maybeSingle()).data?.id;
          if (!pid) return showIsland(formData.tipo_servico === "Retorno" ? "Cadastro não encontrado." : "A Dra. Simone atende apenas retornos.");
          const ult = await supabase.from("agendamentos").select("data_agendamento").eq("paciente_id", pid).eq("tipo_servico", "Consulta").order("data_agendamento", { ascending: false }).limit(1).maybeSingle();
          if (!ult.data) return showIsland("Sem histórico de consulta.");
          if (formData.tipo_servico === "Retorno") setContext(c => ({ ...c, dataUltimaConsulta: new Date(ult.data.data_agendamento) }));
        }
        const proximo = modulosAtivos[currentStepIndex + 1];
        if (proximo === "triagem" && perguntasAtuais.length === 0) { setCurrentStepIndex(currentStepIndex + 2); setIslandState("default"); return; }
      }
      if (currentModule === "triagem") {
        if (!isModuleValid("triagem")) return showIsland("Responda todas as perguntas obrigatórias da triagem.");
        let maiorBloqueioTriagem = null;
        Object.values(respostasTriagem).forEach(opt => {
          if (opt && opt.regra_bloqueio_dias > 0) {
            const tempDate = calcularDataLimite(new Date(), opt.regra_bloqueio_dias, opt.tipo_contagem_dias || "corridos");
            if (!maiorBloqueioTriagem || tempDate > maiorBloqueioTriagem) maiorBloqueioTriagem = tempDate;
          }
        });
        setBloqueioExtraCalculado(maiorBloqueioTriagem);
      }
      if (currentModule === "agenda") {
        if (!formData.data_agendamento || !formData.horario_agendamento) return showIsland("Escolha uma data e horário.");
        if (formData.tipo_servico === "Retorno" && context.dataUltimaConsulta && Math.ceil(Math.abs(new Date(formData.data_agendamento) - context.dataUltimaConsulta) / 86400000) > 30) return showIsland("Prazo excedido (> 30 dias).");
        
        const temCheckout = modulosAtivos.includes("checkout") && modulosAtivos.indexOf("checkout") > currentStepIndex;
        if (formData.tipo_servico === "Retorno" || formData.modalidade === "Convênio" || !temCheckout) {
          if (await salvarNoBanco(false)) { 
            await dispararWebhook(false); 
            await programarMensagensMedicas(formData); 
            const nomePaciente = `${formData.nome} ${formData.sobrenome}`.trim();
            const profName = formData.tipo_servico === "Exame" ? formData.subtipo_exame : formData.medico_profissional;
            const dataFormatada = formData.data_agendamento.split("-").reverse().join("/");
            const msgConfirmacao = gerarMensagemConfirmacao(nomePaciente, profName, dataFormatada, formData.horario_agendamento, helpers.calcAge(formData.data_nascimento));
            await dispararPushRmChat(formData.telefone_whatsapp, nomePaciente, msgConfirmacao);
            showIsland("Agendamento Finalizado", "success"); 
            const idxConcluido = modulosAtivos.indexOf("concluido");
            return setCurrentStepIndex(idxConcluido !== -1 ? idxConcluido : modulosAtivos.length - 1); 
          }
          return showIsland("Erro ao salvar.");
        }
      }
      if (currentStepIndex < modulosAtivos.length - 1) { setCurrentStepIndex(p => p + 1); setIslandState("default"); }
    } finally { setLoading(false); if (islandState === "loading") setIslandState("default"); }
  };

  const onSubmitMP = async (param) => {
    return new Promise(async (resolve) => {
      showIsland("Processando pagamento...", "loading");
      try {
        const mpPayer = param.formData?.payer || {};
        const payload = { ...param.formData, amount: Number(valorEntrada.toFixed(2)), description: `Entrada - ${formData.medico_profissional || formData.subtipo_exame}`,
          payer: { ...mpPayer, email: mpPayer.email || formData.email, first_name: mpPayer.first_name || formData.nome, last_name: mpPayer.last_name || formData.sobrenome, identification: mpPayer.identification || { type: "CPF", number: formData.cpf ? formData.cpf.replace(/\D/g, "") : "" } }
        };
        const res = await fetch("/api/pagamento", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const data = await res.json();
        
        if (data.success && ["approved", "in_process", "pending"].includes(data.status)) {
           const isPix = data.status === "pending";
           if (!(await salvarNoBanco(!isPix))) { showIsland("Erro ao gerar agendamento."); return resolve(); }

           const telefonePaciente = formData.telefone_whatsapp;
           const nomePaciente = `${formData.nome} ${formData.sobrenome}`.trim();
           const dataFormatada = formData.data_agendamento.split("-").reverse().join("/");
           const profName = formData.tipo_servico === "Exame" ? formData.subtipo_exame : formData.medico_profissional;

           if (!isPix) {
             await dispararWebhook(true);
             await programarMensagensMedicas(formData);
             const msgConfirmacao = gerarMensagemConfirmacao(nomePaciente, profName, dataFormatada, formData.horario_agendamento, helpers.calcAge(formData.data_nascimento));
             await dispararPushRmChat(telefonePaciente, nomePaciente, `✅ Pagamento recebido com sucesso!\n\n` + msgConfirmacao);
             showIsland("Pagamento Aprovado", "success");
           } else {
             if (data.transaction_data) {
               setPixData({ ...data.transaction_data, payment_id: data.id }); setTimeLeft(300);
               const limitDate = new Date(Date.now() + 5 * 60000);
               const hora_limite = `${String(limitDate.getHours()).padStart(2, '0')}:${String(limitDate.getMinutes()).padStart(2, '0')}`;
               const valorFormatado = valorEntrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
               await dispararPushRmChat(telefonePaciente, nomePaciente, `Olá, ${nomePaciente}! ⏳ Falta pouco para garantir seu agendamento de ${profName}.\n\nPor favor, realize o pagamento via Pix no valor de *R$ ${valorFormatado}* em até 5 minutos (até as ${hora_limite} para finalizar).\n\n🔹 *Chave Pix (Copia e Cola):*\n${data.transaction_data.qr_code}\n\nAssim que o pagamento for processado, você receberá a confirmação automática.`);
             }
             showIsland("Pix gerado com sucesso!", "success");
           }
           const idxConcluido = modulosAtivos.indexOf("concluido");
           if (idxConcluido !== -1) setCurrentStepIndex(idxConcluido);
        } else { showIsland("Pagamento recusado."); }
      } catch (err) { showIsland("Erro de conexão.", "error"); }
      resolve();
    });
  };

  const verificarPagamentoPixAutomatico = async (paymentId) => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    try {
      const res = await fetch(`/api/verificar-pagamento?id=${paymentId}`);
      const result = await res.json();
      if (result.success && result.status === "approved") {
        const { data: paciente } = await supabase.from("pacientes").select("id").eq("cpf", formData.cpf).maybeSingle();
        if (paciente) {
          await supabase.from("agendamentos").update({ status_pagamento_antecipado: true }).eq("paciente_id", paciente.id).eq("data_agendamento", formData.data_agendamento).eq("horario_agendamento", formData.horario_agendamento);
        }
        await programarMensagensMedicas(formData);
        const nomePaciente = `${formData.nome} ${formData.sobrenome}`.trim();
        const dataFormatada = formData.data_agendamento.split("-").reverse().join("/");
        const profName = formData.tipo_servico === "Exame" ? formData.subtipo_exame : formData.medico_profissional;
        const msgConfirmacao = gerarMensagemConfirmacao(nomePaciente, profName, dataFormatada, formData.horario_agendamento, helpers.calcAge(formData.data_nascimento));
        await dispararPushRmChat(formData.telefone_whatsapp, nomePaciente, `✅ Pagamento Pix confirmado!\n\n` + msgConfirmacao);
        setPixData(null); setTimeLeft(0); showIsland("Pagamento Confirmado!", "success");
      }
    } catch (e) { console.error("Erro no polling:", e); } finally { checkingRef.current = false; }
  };

  useEffect(() => {
    if (!pixData?.payment_id) return;
    const pollInterval = setInterval(() => { if (timeLeftRef.current > 0 && !checkingRef.current) verificarPagamentoPixAutomatico(pixData.payment_id); }, 10000); 
    return () => clearInterval(pollInterval);
  }, [pixData?.payment_id]);

  const renderLockedOrInput = (formKey, label, value, isLocked, maskFn, placeholder, maxLength, type = "text") => {
    const cnInputWrap = "relative rounded-2xl bg-zinc-50/50 dark:bg-[#111111]/50 border border-zinc-200/80 dark:border-zinc-800/80 transition-all duration-300 focus-within:border-zinc-900 dark:focus-within:border-white focus-within:bg-white dark:focus-within:bg-[#0A0A0A] focus-within:shadow-[0_4px_20px_rgba(0,0,0,0.03)] focus-within:ring-1 focus-within:ring-zinc-900 dark:focus-within:ring-white overflow-hidden";
    const cnInput = "w-full p-4 pt-7 bg-transparent outline-none text-zinc-900 dark:text-white font-medium text-[16px] peer placeholder-transparent";
    const cnLabel = "absolute left-4 top-2 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest transition-all duration-300 peer-placeholder-shown:top-4.5 peer-placeholder-shown:text-[14px] peer-placeholder-shown:font-normal peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:text-zinc-900 dark:peer-focus:text-white pointer-events-none";

    if (isLocked && value) {
       return (
          <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 py-3 last:border-0">
             <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase block tracking-wider">{label}</span>
                <span className="text-[15px] font-medium text-zinc-900 dark:text-white mt-0.5 block">{value}</span>
             </div>
             <button onClick={() => setFlags(f => ({...f, unlockedAll: true}))} className="p-2.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-full flex items-center justify-center">
               <Pencil size={14}/>
             </button>
          </div>
       );
    }
    return (
       <div className={`${cnInputWrap} my-3 last:mb-0`}>
          <input type={type} {...register(formKey)} onChange={e => { const val = maskFn ? maskFn(e.target.value) : e.target.value; setValue(formKey, val); }} maxLength={maxLength} placeholder={placeholder} className={cnInput} />
          <label className={cnLabel}>{label}</label>
       </div>
    );
  };

  const contextValue = {
    register, watch, trigger, setValue, errors, reset, formData, slug, empresaDados, flags, setFlags, context, setContext,
    servicosDB, perguntasAtuais, respostasTriagem, setRespostasTriagem, bloqueioExtraCalculado, setBloqueioExtraCalculado,
    agenda, setAgenda, calendarMonth, setCalendarMonth, pixData, setPixData, timeLeft, setTimeLeft, valorEntrada,
    nextStep, isModuleValid, showIsland, modulosAtivos, currentStepIndex, setCurrentStepIndex, selectedSrv, timeSlotsRef, renderLockedOrInput, onSubmitMP, loading
  };

  if (loadingConfig) return <div className="text-zinc-500 mt-20 flex flex-col items-center"><Activity className="animate-spin mb-4"/> Carregando sistema da clínica...</div>;

  const CurrentComponent = MODULE_REGISTRY[modulosAtivos[currentStepIndex]];

  return (
    <AgendamentoContext.Provider value={contextValue}>
      <div className="fixed inset-0 bg-[#FAFAFA] dark:bg-black -z-20 pointer-events-none" />
      
      <div className="absolute top-6 left-0 right-0 w-full z-[9999] px-4 flex justify-center pointer-events-none">
        <motion.div layout className={`pointer-events-auto rounded-full px-5 py-2.5 max-w-sm flex transition-colors shadow-[0_8px_30px_rgb(0,0,0,0.12)] ${islandState === "error" ? "bg-red-500 text-white" : islandState === "success" ? "bg-[#9FC131] text-black font-medium" : "bg-black/90 dark:bg-white/90 backdrop-blur-xl text-white dark:text-black border border-transparent dark:border-black/10"}`}>
          <AnimatePresence mode="wait">
             {islandState === "error" && <motion.div key="e" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex items-center gap-2 text-xs"><AlertTriangle size={14} />{islandMessage}</motion.div>}
             {islandState === "success" && <motion.div key="s" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex items-center gap-2 text-xs"><CheckCircle size={14} />{islandMessage}</motion.div>}
             {islandState === "loading" && <motion.div key="l" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex items-center gap-3 text-xs"><Activity size={14} className="animate-spin opacity-80" />{islandMessage || "Processando"}</motion.div>}
             {islandState === "default" && (
                <motion.div key="d" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex items-center gap-4">
                  <div className="flex gap-1.5">
                    {modulosAtivos.filter(m => m !== "concluido" && m !== "boas_vindas").map((_, i) => (
                      <div key={i} className={`h-1.5 rounded-full transition-all ${currentStepIndex - 1 === i ? "w-4 bg-white dark:bg-black" : currentStepIndex - 1 > i ? "w-1.5 bg-white/40 dark:bg-black/40" : "w-1.5 bg-white/10 dark:bg-black/10"}`}/>
                    ))}
                  </div>
                  <div className="text-[10px] tracking-widest text-zinc-400 dark:text-zinc-500 border-l border-zinc-700 dark:border-zinc-300 pl-4 uppercase">
                    {modulosAtivos[currentStepIndex].replace("_", " ")}
                  </div>
                </motion.div>
             )}
          </AnimatePresence>
        </motion.div>
      </div>

      <div className="w-full h-[100dvh] flex flex-col items-center justify-center p-0 md:p-8 pt-[70px] md:pt-[90px] z-10 relative">
        <motion.div layout transition={{ type: "spring", stiffness: 450, damping: 35 }} className="w-full max-w-[800px] flex-1 md:flex-none md:h-[85vh] md:max-h-[750px] bg-white dark:bg-[#0A0A0A] md:rounded-[32px] border-0 md:border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden shadow-2xl md:shadow-[0_20px_60px_rgba(0,0,0,0.06)] dark:md:shadow-[0_20px_60px_rgba(0,0,0,0.3)] relative">
          
          {modulosAtivos[currentStepIndex] !== "concluido" && modulosAtivos[currentStepIndex] !== "boas_vindas" && (
            <div className="flex-none grid grid-cols-3 items-center px-4 md:px-8 py-3 md:py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-[#0A0A0A]/90 backdrop-blur-md z-20">
              <div className="flex justify-start">
                {currentStepIndex > 1 ? (
                  <button onClick={() => setCurrentStepIndex(p => p - 1)} className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white text-[13px] font-medium transition-colors">
                    <ChevronLeft size={18} /> Voltar
                  </button>
                ) : <div />}
              </div>
              <div className="flex justify-center text-[10px] md:text-[11px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
                Etapa {currentStepIndex} de {modulosAtivos.filter(m => m !== "concluido" && m !== "boas_vindas").length}
              </div>
              <div className="flex justify-end">
                {modulosAtivos[currentStepIndex] !== "checkout" && !(modulosAtivos[currentStepIndex] === "especialidade" && flags.exibirConfUri && !flags.confirmouUri) ? (
                  <button onClick={nextStep} disabled={loading || !isModuleValid(modulosAtivos[currentStepIndex])} className={`font-bold text-[12px] px-5 py-2.5 rounded-full flex items-center justify-center gap-1.5 uppercase transition-all duration-300 shadow-sm whitespace-nowrap ${isModuleValid(modulosAtivos[currentStepIndex]) ? "bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black hover:scale-[1.02] active:scale-[0.98]" : "bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600"}`}>
                    {loading ? "Processando" : (modulosAtivos[currentStepIndex] === "agenda" && (formData.modalidade === "Convênio" || formData.tipo_servico === "Retorno") ? "Finalizar" : "Continuar")}
                    {!loading && <ArrowRight size={14}/>}
                  </button>
                ) : <div />}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 pb-16 md:pb-12">
            <AnimatePresence mode="wait">
               {CurrentComponent ? <CurrentComponent key={modulosAtivos[currentStepIndex]} /> : <div>Modulo Indisponível</div>}
            </AnimatePresence>
          </div>

        </motion.div>
      </div>
    </AgendamentoContext.Provider>
  );
}