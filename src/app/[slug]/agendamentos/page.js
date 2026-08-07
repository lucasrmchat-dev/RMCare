"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase";
import { ArrowRight, CheckCircle, AlertTriangle, Activity, Pencil, ChevronLeft } from "lucide-react";

import SidebarPremium from "@/components/SidebarPremium";
import Navbar from "@/components/Navbar";
import { AgendamentoContext } from "./context";
import { MODULE_REGISTRY } from "./modules";
import {
  schema, helpers, masks, calcularDataLimite, mapaMedicos, 
  processarMensagensDinamicas, enviarParaMedicalsysSeHabilitado
} from "./utils";
import { validateReturnEligibility } from "@/lib/appointmentRules";
import { buildJourney, DEFAULT_JOURNEY, isDraftFresh } from "@/lib/journey";
import { getAppointmentForReschedule, remarcarAgendamentoPaciente } from "@/actions/appointments";

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

  function AgendamentoOrquestrador() {
    const params = useParams();
    const searchParams = useSearchParams();
    const slug = params?.slug;

    const modulosBase = DEFAULT_JOURNEY;
    const [modulosAtivos, setModulosAtivos] = useState(modulosBase);
    
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const currentStepRef = useRef(0);
    currentStepRef.current = currentStepIndex;
    const [minStepIndex, setMinStepIndex] = useState(0); 

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
    
    const [regrasGlobais, setRegrasGlobais] = useState([]);
    
    const [pixData, setPixData] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const checkingRef = useRef(false);
    const restoringDraftRef = useRef(false);
    const timeLeftRef = useRef(timeLeft);

    useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
    
    const [context, setContext] = useState({ isSmartLink: false, personalizedName: "", dataUltimaConsulta: null, userFound: false, checkingUser: false });
    const [calendarMonth, setCalendarMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const [agenda, setAgenda] = useState({ ocupados: [], buscando: false });
    const [rescheduleContext, setRescheduleContext] = useState(null);

    const [flags, setFlags] = useState({
      cpfUrl: false, nomeUrl: false, sobrenomeUrl: false, telUrl: false, emailUrl: false, nascUrl: false,
      unlockedAll: false, exibirConfUri: false, confirmouUri: false
    });

    const formMethods = useForm({ resolver: zodResolver(schema), mode: "onChange" });
    const { register, watch, trigger, setValue, formState: { errors }, reset } = formMethods;
    const formData = watch();
    const draftKey = slug ? `rmcare_jornada:${slug}` : null;

    useEffect(() => {
      const fetchEmpresaConfigAndData = async () => {
        setLoadingConfig(true);
        if (!slug) { setLoadingConfig(false); return; }
        
        try {
          const { data: empresa } = await supabase.from("empresas").select("*").eq("slug", slug).maybeSingle();
          if (!empresa) { 
            setEmpresaDados(null); 
            setLoadingConfig(false); 
            return; 
          }
          
          setEmpresaDados(empresa);
          localStorage.setItem('rmcare_last_slug', slug);
          
          const conf = empresa.config_campos || {};
          let jornada = buildJourney(conf, false);

          const urlModalidadeRaw = searchParams.get("modalidade");
          const mapaMod = { "1": "Convênio", "2": "Particular" };
          const urlModalidade = mapaMod[urlModalidadeRaw] || urlModalidadeRaw;
          const hideFlag = searchParams.get("hide") === "true";
          
          if (urlModalidade) {
            setValue("modalidade", urlModalidade);
            if (hideFlag) jornada = jornada.filter(m => m !== "modalidade");
          } else if (conf.ocultar_modalidade) {
            setValue("modalidade", conf.modalidade_padrao || "Particular");
          }

          setModulosAtivos(jornada);
          
          const [{ data: srvs }, { data: pergs }, { data: ops }, { data: regrasDB }] = await Promise.all([
            supabase.from("servicos").select("*").eq("ativo", true).eq("empresa_id", empresa.id),
            supabase.from("perguntas_triagem").select("*").eq("ativa", true).eq("empresa_id", empresa.id),
            supabase.from("opcoes_triagem").select("*"),
            supabase.from("regras_agenda").select("*").eq("ativo", true).eq("empresa_id", empresa.id)
          ]);
          
          if (srvs) setServicosDB(srvs);
          if (regrasDB) setRegrasGlobais(regrasDB);
          if (pergs && ops) {
            const pergsFull = pergs.map(p => ({
              ...p, opcoes: ops.filter(o => o.pergunta_id === p.id)
            }));
            setPerguntasDB(pergsFull);
          }

          const rescheduleId = searchParams.get("reagendar");
          const rescheduleToken = searchParams.get("token");
          if (rescheduleId && rescheduleToken) {
            const result = await getAppointmentForReschedule({ id: rescheduleId, token: rescheduleToken });
            if (!result.success || result.appointment.empresa_id !== empresa.id) throw new Error(result.error || "Agendamento inválido para esta clínica.");
            const appointment = result.appointment;
            const patient = appointment.pacientes || {};
            const names = (patient.nome_completo || "").trim().split(" ");
            reset({ cpf: patient.cpf || "", nome: names[0] || "", sobrenome: names.slice(1).join(" "), data_nascimento: patient.data_nascimento?.split("-").reverse().join("/") || "", tipo_servico: appointment.tipo_servico, subtipo_exame: appointment.subtipo_exame || "", medico_profissional: appointment.medico_profissional || "", modalidade: appointment.modalidade || "", data_agendamento: "", horario_agendamento: "" });
            setRescheduleContext({ id: rescheduleId, token: rescheduleToken });
            const agendaIndex = jornada.indexOf("agenda");
            setCurrentStepIndex(agendaIndex >= 0 ? agendaIndex : 0);
            setMinStepIndex(Math.max(0, jornada.indexOf("especialidade")));
          }

          // Retoma rascunho de no máximo 10 minutos
          if (!searchParams.toString() && typeof window !== "undefined") {
            try {
              const saved = JSON.parse(localStorage.getItem(`rmcare_jornada:${slug}`) || "null");
              if (isDraftFresh(saved)) {
                restoringDraftRef.current = true;
                reset(saved.formData || {});
                setRespostasTriagem(saved.respostasTriagem || {});
                const savedServiceName = saved.formData?.tipo_servico === "Exame" ? saved.formData?.subtipo_exame : saved.formData?.medico_profissional;
                const savedService = srvs?.find((service) => service.nome === savedServiceName);
                const hasQuestions = pergs?.some((question) => !question.servico_id || question.servico_id === savedService?.id);
                const restoredJourney = buildJourney(conf, hasQuestions);
                setModulosAtivos(restoredJourney);
                const restoredIndex = restoredJourney.indexOf(saved.step);
                if (restoredIndex >= 0 && saved.step !== "concluido") setCurrentStepIndex(restoredIndex);
                setIslandMessage("Continuamos de onde você parou.");
                setIslandState("success");
                setTimeout(() => setIslandState("default"), 2400);
              } else {
                localStorage.removeItem(`rmcare_jornada:${slug}`);
              }
            } catch { localStorage.removeItem(`rmcare_jornada:${slug}`); }
          }

        } catch (err) { console.error("Erro ao carregar dados:", err); } finally { setLoadingConfig(false); }
      };

      fetchEmpresaConfigAndData();
    }, [slug, searchParams]);

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
    const perguntasAtuais = perguntasDB.filter(p => !p.servico_id || p.servico_id === selectedSrv?.id);

    useEffect(() => {
      if (loadingConfig || !empresaDados) return;
      setModulosAtivos((previous) => {
        const currentKey = previous[currentStepRef.current];
        const triageEnabled = empresaDados.config_campos?.ocultar_triagem !== true && perguntasAtuais.length > 0;
        const next = buildJourney(empresaDados.config_campos || {}, triageEnabled);
        if (next.join("|") === previous.join("|")) return previous;
        const nextIndex = next.indexOf(currentKey);
        if (nextIndex >= 0) queueMicrotask(() => setCurrentStepIndex(nextIndex));
        return next;
      });
    }, [perguntasAtuais.length, loadingConfig, empresaDados]);

    useEffect(() => {
      if (!draftKey || loadingConfig || !empresaDados) return;
      const step = modulosAtivos[currentStepIndex];
      if (step === "concluido") { localStorage.removeItem(draftKey); return; }
      const timeout = setTimeout(() => {
        localStorage.setItem(draftKey, JSON.stringify({ version: 1, savedAt: Date.now(), step, formData, respostasTriagem }));
      }, 250);
      return () => clearTimeout(timeout);
    }, [draftKey, loadingConfig, empresaDados, currentStepIndex, modulosAtivos, formData, respostasTriagem]);

    const showIsland = (msg, type = "error") => {
      setIslandMessage(msg); setIslandState(type);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      const currentModule = modulosAtivos[currentStepIndex];
      if (!["loading", "success"].includes(type) && currentModule !== "concluido") {
        timeoutRef.current = setTimeout(() => setIslandState("default"), 3000);
      }
    };

    useEffect(() => {
      if (!empresaDados || loadingConfig) return;

      const nomeUrlRaw = searchParams.get("nome");
      const sobrenomeUrlRaw = searchParams.get("sobrenome");
      const cpfUrl = searchParams.get("cpf");
      const medicoUrl = searchParams.get("medico");
      const wppUrl = searchParams.get("whatsapp");
      const emailUrl = searchParams.get("email");
      const nascUrl = searchParams.get("nascimento");
      
      const espRaw = searchParams.get("especialidade");
      const mapaEsp = {
        "1": "Gastroenterologista", "2": "Cirurgião do Aparelho Digestivo", 
        "3": "Cirurgia Geral", "4": "Psicologia", "5": "Endoscopia", 
        "6": "Colonoscopia", "7": "Endoscopia + Colonoscopia"
      };
      const especialidadeUrl = mapaEsp[espRaw] || espRaw;
      const hideFlag = searchParams.get("hide") === "true";
      
      if ((nomeUrlRaw !== null || cpfUrl !== null || medicoUrl !== null || wppUrl !== null) && !context.isSmartLink) {
        
        if (nomeUrlRaw) {
           setValue("nome", nomeUrlRaw);
           if (sobrenomeUrlRaw) {
               setValue("sobrenome", sobrenomeUrlRaw);
           } else {
               const parts = nomeUrlRaw.trim().split(" ");
               setValue("nome", parts[0] || "");
               setValue("sobrenome", parts.slice(1).join(" ") || "");
           }
        }

        if (cpfUrl) setValue("cpf", masks.cpf(cpfUrl));
        
        let limpaWpp = wppUrl ? wppUrl.replace(/\D/g, "") : "";
        if (limpaWpp.startsWith("55") && (limpaWpp.length === 12 || limpaWpp.length === 13)) limpaWpp = limpaWpp.substring(2);
        if (limpaWpp) setValue("telefone_whatsapp", masks.phone(limpaWpp));
        
        if (emailUrl) setValue("email", emailUrl);
        if (nascUrl) setValue("data_nascimento", masks.date(nascUrl));
        if (especialidadeUrl) setValue("especialidade", especialidadeUrl);
        
        const hasCpf = !!(cpfUrl && cpfUrl.trim() !== "");
        const hasTel = !!(limpaWpp && limpaWpp.trim() !== "");
        const hasMedico = !!(medicoUrl && medicoUrl.trim() !== "");
        
        setFlags(f => ({ 
          ...f, 
          cpfUrl: hasCpf, 
          nomeUrl: !!nomeUrlRaw, 
          sobrenomeUrl: !!nomeUrlRaw, 
          telUrl: hasTel, 
          emailUrl: !!emailUrl, 
          nascUrl: !!nascUrl, 
          exibirConfUri: hasMedico && !hideFlag
        }));
        
        setContext(c => ({ ...c, isSmartLink: true, personalizedName: nomeUrlRaw ? nomeUrlRaw.trim().split(" ")[0] : "" }));
        
        let urlSrvId = null;
        if (hasMedico) {
          const mapped = mapaMedicos[medicoUrl];
          if (mapped) { 
            setValue("tipo_servico", mapped.tipo); 
            setValue(mapped.tipo === "Consulta" ? "medico_profissional" : "subtipo_exame", mapped.nome); 
            const found = servicosDB.find(s => s.nome.toLowerCase().includes(mapped.nome.toLowerCase()));
            if(found) urlSrvId = found.id;
          } else if (servicosDB.length > 0) {
            const srv = servicosDB.find(s => s.nome.toLowerCase().includes(medicoUrl.toLowerCase()));
            if (srv) { 
              setValue("tipo_servico", srv.tipo); 
              setValue(srv.tipo === "Consulta" ? "medico_profissional" : "subtipo_exame", srv.nome);
              urlSrvId = srv.id;
            } else {
              setValue("medico_profissional", medicoUrl);
            }
          }
        }
        
        const hasPerguntas = urlSrvId ? perguntasDB.some(p => p.servico_id === urlSrvId) : false;
        const cpfValid = cpfUrl && cpfUrl.replace(/\D/g, "").length === 11;
        const telValid = limpaWpp.length >= 10;
        
        const canSkipIdentificacao = cpfValid && telValid && !!nomeUrlRaw;
        
        if (canSkipIdentificacao) {
          let jumpTo = "especialidade";
          
          if (hasMedico && hideFlag) {
            if (modulosAtivos.includes("triagem") && hasPerguntas) jumpTo = "triagem";
            else if (modulosAtivos.includes("modalidade")) jumpTo = "modalidade";
            else jumpTo = "agenda";
          }
          
          const jumpIndex = modulosAtivos.indexOf(jumpTo);
          if(jumpIndex !== -1) {
            setCurrentStepIndex(jumpIndex); 
            setMinStepIndex(jumpIndex); 
          }
        } else {
          const jumpIndex = modulosAtivos.indexOf("identificacao");
          if(jumpIndex !== -1) {
            setCurrentStepIndex(jumpIndex); 
            setMinStepIndex(jumpIndex);
          }
        }
      }
    }, [searchParams, context.isSmartLink, servicosDB, perguntasDB, setValue, loadingConfig, modulosAtivos, empresaDados]);

    const handleCpfLookup = async () => {
      if (formData.cpf?.length !== 14) return;
      setContext(c => ({ ...c, checkingUser: true }));
      if (restoringDraftRef.current) {
        restoringDraftRef.current = false;
      } else if (!context.isSmartLink || flags.unlockedAll) {
        ["nome", "sobrenome", "telefone_whatsapp", "email", "data_nascimento"].forEach(f => setValue(f, ""));
      }
      
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
      if (!formData.data_agendamento || !empresaDados) return;
      const prof = formData.tipo_servico === "Exame" ? formData.subtipo_exame : formData.medico_profissional;
      if (!prof) return;

      let isMounted = true;
      const requestStartedAt = Date.now();
      setAgenda(a => ({ ...a, buscando: true }));
      
      const fetchAgenda = async () => {
        try {
          const [{ data: ag }, { data: bl }] = await Promise.all([
            supabase.from("agendamentos").select("id,horario_agendamento, medico_profissional, subtipo_exame,status_atendimento").eq("data_agendamento", formData.data_agendamento).eq("empresa_id", empresaDados.id).neq("status_atendimento", "cancelado"),
            supabase.from("bloqueios_horarios").select("horario, medico_profissional").eq("data", formData.data_agendamento).eq("empresa_id", empresaDados.id)
          ]);

          const formatTime = (timeStr) => {
            if (!timeStr) return "";
            const parts = timeStr.trim().split(":");
            const h = parts[0].padStart(2, "0");
            const m = (parts[1] || "00").substring(0, 2);
            return `${h}:${m}`;
          };

          const match = (nDB) => {
            if (!nDB) return false;
            if (nDB === "Todos") return true;
            
            const pNorm = prof.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/dra\.|dr\./g, "").trim();
            const nNorm = nDB.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
            
            return nNorm.includes(pNorm) || pNorm.includes(nNorm) || nNorm.includes(pNorm.split(" ")[0]);
          };

          const slots = [
            ...(ag?.filter(a => match(a.medico_profissional) || match(a.subtipo_exame)).map(a => formatTime(a.horario_agendamento)) || []),
            ...(bl?.filter(b => match(b.medico_profissional)).map(b => formatTime(b.horario)) || [])
          ];
          
          if (isMounted) setAgenda({ ocupados: [...new Set(slots)], buscando: false, agora: requestStartedAt });
        } catch (e) { 
          if (isMounted) setAgenda(a => ({ ...a, buscando: false })); 
        }
      };

      fetchAgenda();
      return () => { isMounted = false; };
    }, [formData.data_agendamento, formData.medico_profissional, formData.subtipo_exame, formData.tipo_servico, setValue, empresaDados]);

    const salvarNoBanco = async (pago) => {
      try {
        if (rescheduleContext) {
          const result = await remarcarAgendamentoPaciente({ id: rescheduleContext.id, token: rescheduleContext.token, data: formData.data_agendamento, horario: formData.horario_agendamento });
          if (!result.success) { showIsland(result.error); return false; }
          return { id: result.appointmentId, rescheduled: true };
        }
        let pacienteId = (await supabase.from("pacientes").select("id").eq("cpf", formData.cpf).maybeSingle()).data?.id;

        const pacienteData = { 
          nome_completo: `${formData.nome} ${formData.sobrenome}`.trim(), 
          telefone_whatsapp: formData.telefone_whatsapp, 
          email: formData.email, 
          data_nascimento: helpers.toDBDate(formData.data_nascimento),
          empresa_id: empresaDados.id
        };
        
        if (pacienteId) {
          const { error: errUpdate } = await supabase.from("pacientes").update(pacienteData).eq("id", pacienteId);
          if (errUpdate) throw errUpdate;
        } else {
          const { data: novoPac, error: errInsert } = await supabase.from("pacientes").insert({ cpf: formData.cpf, ...pacienteData }).select().single();
          if (errInsert) throw errInsert;
          pacienteId = novoPac.id;
        }
        
        let consultaInicialId = null;
        if (formData.tipo_servico === "Retorno") {
          const { data: anteriores, error: retornoError } = await supabase.from("agendamentos")
            .select("id,tipo_servico,data_agendamento,status_pagamento_antecipado")
            .eq("paciente_id", pacienteId).eq("empresa_id", empresaDados.id)
            .lte("data_agendamento", formData.data_agendamento);
          if (retornoError) throw retornoError;
          const policy = empresaDados.config_regras || {};
          const eligibility = validateReturnEligibility(anteriores, formData.data_agendamento, {
            windowDays: policy.retorno_prazo_dias,
            requirePayment: policy.retorno_exige_pagamento
          });
          if (!eligibility.valid) { showIsland(eligibility.error); return false; }
          consultaInicialId = eligibility.initialAppointment.id;
        }

        const { data: savedAppointment, error: errAgendamento } = await supabase.from("agendamentos").insert({
          paciente_id: pacienteId, 
          empresa_id: empresaDados.id, 
          tipo_servico: formData.tipo_servico, 
          subtipo_exame: formData.subtipo_exame || null,
          medico_profissional: formData.medico_profissional || "A definir", 
          modalidade: formData.modalidade || "Não se aplica",
          data_agendamento: formData.data_agendamento, 
          horario_agendamento: formData.horario_agendamento, 
          status_pagamento_antecipado: pago, 
          valor_total: valorEntrada * 2,
          categoria_atendimento: formData.tipo_servico === "Retorno" ? "retorno" : "inicial",
          consulta_inicial_id: consultaInicialId
        }).select("id").single();
        
        if (errAgendamento) throw errAgendamento;

        // Dispara envio para Medicalsys se estiver habilitado na empresa
        await enviarParaMedicalsysSeHabilitado(formData, empresaDados, savedAppointment.id);

        return savedAppointment;
      } catch (error) {
        console.error("ERRO DETALHADO AO SALVAR NO SUPABASE:", error);
        return false; 
      }
    };

    const isModuleValid = (moduleKey) => {
      const cFields = empresaDados?.config_campos || { mostrar_cpf: true, mostrar_email: true, mostrar_nascimento: true };
      switch (moduleKey) {
        case "boas_vindas": return true;
        case "identificacao": 
          if (!formData.nome || formData.nome.length < 2) return false;
          if (cFields.mostrar_cpf !== false && (!formData.cpf || formData.cpf.length !== 14)) return false;
          if (cFields.mostrar_email !== false && (!formData.email || !formData.email.includes('@'))) return false;
          if (cFields.mostrar_nascimento !== false && !helpers.isValidDate(formData.data_nascimento)) return false;
          return true;
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

    // Ação do Botão Voltar: Se voltar para 'especialidade', limpa para pedir especialidade primeiro
    const handleGoBack = () => {
      if (currentStepIndex > minStepIndex) {
        const prevModule = modulosAtivos[currentStepIndex - 1];
        if (prevModule === "especialidade") {
          setValue("especialidade", "");
          setValue("medico_profissional", "");
          setValue("subtipo_exame", "");
        }
        setCurrentStepIndex(p => p - 1);
      }
    };

    const nextStep = async () => {
      setLoading(true); showIsland("Processando...", "loading");
      const currentModule = modulosAtivos[currentStepIndex];

      try {
        if (currentModule === "identificacao") {
          const isStepValid = await trigger();
          if (!isStepValid) return showIsland("Verifique os dados informados.");
        }

        if (currentModule === "especialidade") {
          if (flags.exibirConfUri && flags.confirmouUri) {
            const idxTriagem = modulosAtivos.indexOf("triagem");
            const idxModalidade = modulosAtivos.indexOf("modalidade");
            if (idxTriagem > currentStepIndex && perguntasAtuais.length > 0) return setCurrentStepIndex(idxTriagem);
            if (idxModalidade > currentStepIndex) return setCurrentStepIndex(idxModalidade);
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
          const correctionDelay = Number(empresaDados?.config_regras?.delay_confirmacao_segundos || 0);
          if (correctionDelay > 0) {
            showIsland(`Aguarde ${correctionDelay}s para revisar os dados antes da confirmação.`, "loading");
            await new Promise((resolve) => setTimeout(resolve, correctionDelay * 1000));
            if (currentStepRef.current !== currentStepIndex) return showIsland("Confirmação cancelada para você corrigir os dados.");
          }
          
          const temCheckout = modulosAtivos.includes("checkout") && modulosAtivos.indexOf("checkout") > currentStepIndex;
          if (formData.tipo_servico === "Retorno" || formData.modalidade === "Convênio" || !temCheckout) {
            const saved = await salvarNoBanco(false);
            if (saved) { 
              await processarMensagensDinamicas(formData, empresaDados, saved.id);
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
          
          const mpKeys = empresaDados?.config_chaves || {};
          
          const res = await fetch("/api/pagamento", { 
            method: "POST", 
            headers: { 
              "Content-Type": "application/json",
              "X-MP-Access-Token": mpKeys.mp_access_token || ""
            }, 
            body: JSON.stringify(payload) 
          });
          const data = await res.json();
          
          if (data.success && ["approved", "in_process", "pending"].includes(data.status)) { 
            const isPix = data.status === "pending";
            const saved = await salvarNoBanco(!isPix);
            if (!saved) { showIsland("Erro ao gerar agendamento."); return resolve(); }
            
            if (!isPix) {
              await processarMensagensDinamicas(formData, empresaDados, saved.id);
              showIsland("Pagamento Aprovado", "success");
            } else {
              if (data.transaction_data) {
                setPixData({ ...data.transaction_data, payment_id: data.id, appointment_id: saved.id }); setTimeLeft(300);
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
        const mpKeys = empresaDados?.config_chaves || {};
        const res = await fetch(`/api/verificar-pagamento?id=${paymentId}`, {
          headers: { "X-MP-Access-Token": mpKeys.mp_access_token || "" }
        });
        const result = await res.json();
        if (result.success && result.status === "approved") {
          const { data: paciente } = await supabase.from("pacientes").select("id").eq("cpf", formData.cpf).maybeSingle();
          if (paciente) {
            await supabase.from("agendamentos").update({ status_pagamento_antecipado: true }).eq("paciente_id", paciente.id).eq("data_agendamento", formData.data_agendamento).eq("horario_agendamento", formData.horario_agendamento);
          }
          await processarMensagensDinamicas(formData, empresaDados, pixData?.appointment_id || null);
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
      nextStep, isModuleValid, showIsland, modulosAtivos, currentStepIndex, setCurrentStepIndex, selectedSrv, timeSlotsRef, renderLockedOrInput, onSubmitMP, loading,
      regrasGlobais 
    };

    if (loadingConfig) return <div className="text-zinc-500 mt-20 flex flex-col items-center"><Activity className="animate-spin mb-4"/> Carregando sistema da clínica...</div>;
    
    if (!empresaDados) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 z-10 relative text-center mt-20">
          <AlertTriangle size={64} className="text-zinc-300 dark:text-zinc-700 mb-6" />
          <h2 className="text-3xl font-medium text-zinc-900 dark:text-white">Clínica não encontrada</h2>
          <p className="text-zinc-500 mt-2 max-w-md">O link que você tentou acessar não é válido ou a clínica não está mais disponível em nossa plataforma.</p>
          <button onClick={() => window.location.href = "/"} className="mt-8 bg-zinc-900 dark:bg-white text-white dark:text-black px-8 py-4 rounded-full font-bold text-sm transition-transform hover:scale-105 shadow-xl">
            Buscar Clínicas na RM Care
          </button>
        </div>
      );
    }

    const currentModuleKey = modulosAtivos[currentStepIndex];
    const CurrentComponent = MODULE_REGISTRY[currentModuleKey];
    const stepLabels = { boas_vindas: "Boas-vindas", identificacao: "Seus dados", especialidade: "Atendimento", triagem: "Cuidados", modalidade: "Cobertura", agenda: "Data e horário", checkout: "Pagamento", concluido: "Tudo certo" };

    return (
      <AgendamentoContext.Provider value={contextValue}>
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_70%_10%,rgba(159,193,49,.10),transparent_32%),linear-gradient(180deg,#fafafa,#f4f4f5)] dark:bg-[radial-gradient(circle_at_70%_10%,rgba(159,193,49,.08),transparent_30%),linear-gradient(180deg,#050505,#000)] -z-20 pointer-events-none" />
        
        {/* DYNAMIC ISLAND HEADER */}
        <div className="absolute top-3 md:top-6 left-0 right-0 w-full z-[9999] px-4 flex justify-center pointer-events-none">
          <motion.div layout className={`pointer-events-auto rounded-full px-4 sm:px-5 py-2 sm:py-2.5 max-w-md flex items-center justify-center transition-all shadow-[0_8px_30px_rgb(0,0,0,0.12)] ${
            islandState === "error" ? "bg-red-500 text-white" : islandState === "success" ? "bg-[#9FC131] text-black font-medium" : islandState === "loading" ? "bg-zinc-900 text-white" : "bg-zinc-900/90 dark:bg-white/90 backdrop-blur-xl text-white dark:text-black border border-white/10 dark:border-black/10"
          }`}>
            <AnimatePresence mode="wait">
               {islandState === "error" && <motion.div key="e" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex items-center gap-2 text-xs font-semibold"><AlertTriangle size={14} />{islandMessage}</motion.div>}
               {islandState === "success" && <motion.div key="s" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex items-center gap-2 text-xs font-semibold"><CheckCircle size={14} />{islandMessage}</motion.div>}
               {islandState === "loading" && <motion.div key="l" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex items-center gap-2.5 text-xs font-semibold"><Activity size={14} className="animate-spin opacity-80" />{islandMessage || "Processando"}</motion.div>}
               {islandState === "default" && (
                  <motion.div key="d" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex items-center gap-3 sm:gap-4">
                    <div className="flex gap-1.5 items-center">
                      {modulosAtivos.filter(m => m !== "concluido").map((_, i) => (
                        <div key={i} className={`h-1.5 rounded-full transition-all ${currentStepIndex === i ? "w-4 bg-white dark:bg-black" : currentStepIndex > i ? "w-1.5 bg-white/40 dark:bg-black/40" : "w-1.5 bg-white/10 dark:bg-black/10"}`}/>
                      ))}
                    </div>
                    <div className="text-[10px] font-bold tracking-widest text-zinc-300 dark:text-zinc-600 border-l border-zinc-700 dark:border-zinc-300 pl-3 uppercase whitespace-nowrap">
                      {stepLabels[currentModuleKey] || currentModuleKey}
                    </div>
                  </motion.div>
               )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* CONTAINER DA JORNADA */}
        <div className="w-full h-[100dvh] flex flex-col items-center justify-start md:justify-center p-0 md:p-8 md:pt-[90px] pb-24 md:pb-8 z-10 relative">
          <motion.div layout transition={{ type: "spring", stiffness: 420, damping: 36 }} className="w-full max-w-[860px] flex-1 md:flex-none md:h-[85vh] md:max-h-[780px] bg-[#fbfbfc] dark:bg-[#080808] md:rounded-[36px] border-0 md:border border-zinc-200/80 dark:border-zinc-800 flex flex-col overflow-hidden md:shadow-[0_30px_90px_rgba(0,0,0,0.10)] dark:md:shadow-[0_30px_90px_rgba(0,0,0,0.45)] relative">
            
            {/* PAINEL DE AÇÕES DE PASSO (VOLTAR / CONTINUAR) - SEM TEXTO DUPLICADO */}
            {modulosAtivos[currentStepIndex] !== "concluido" && (
              <div className="order-2 md:order-none flex-none flex items-center justify-between px-4 md:px-8 py-3.5 md:py-4 border-t md:border-t-0 md:border-b border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-[#0A0A0A]/95 backdrop-blur-2xl z-20">
                <div className="flex justify-start">
                  {currentStepIndex > minStepIndex ? (
                    <button onClick={handleGoBack} className="min-h-11 flex items-center gap-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white text-[13px] font-semibold transition-colors">
                      <ChevronLeft size={18} /> Voltar
                    </button>
                  ) : <div />}
                </div>

                <div className="flex justify-end">
                  {modulosAtivos[currentStepIndex] !== "checkout" && !(modulosAtivos[currentStepIndex] === "especialidade" && flags.exibirConfUri && !flags.confirmouUri) ? (
                    <motion.button whileTap={{scale:.94}} onClick={nextStep} disabled={loading || !isModuleValid(modulosAtivos[currentStepIndex])} className={`min-h-11 font-semibold text-[13px] px-6 py-2.5 rounded-full flex items-center justify-center gap-1.5 transition-all duration-300 shadow-sm whitespace-nowrap ${isModuleValid(modulosAtivos[currentStepIndex]) ? "bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black shadow-zinc-900/15" : "bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600"}`}>
                      {loading ? "Processando" : (modulosAtivos[currentStepIndex] === "agenda" && (formData.modalidade === "Convênio" || formData.tipo_servico === "Retorno") ? "Finalizar" : "Continuar")}
                      {!loading && <ArrowRight size={14}/>}
                    </motion.button>
                  ) : <div />}
                </div>
              </div>
            )}

            {/* CORPO DO MÓDULO - SEM PONTOS DUPLICADOS */}
            <div className="order-1 md:order-none flex-1 overflow-y-auto custom-scrollbar px-5 pt-12 pb-8 sm:p-7 md:p-12 md:pb-12 overscroll-contain">
              <AnimatePresence mode="wait" initial={false}>
                 {CurrentComponent ? <motion.div key={currentModuleKey} initial={{opacity:0,x:18,filter:"blur(5px)"}} animate={{opacity:1,x:0,filter:"blur(0px)"}} exit={{opacity:0,x:-14,filter:"blur(4px)"}} transition={{type:"spring",stiffness:360,damping:32}}><CurrentComponent /></motion.div> : <div>Módulo indisponível</div>}
              </AnimatePresence>
            </div>

          </motion.div>
        </div>
      </AgendamentoContext.Provider>
    );
  }
}
