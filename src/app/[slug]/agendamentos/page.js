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
  schema,
  helpers,
  masks,
  calcularDataLimite,
  processarMensagensDinamicas,
  enviarParaMedicalsysSeHabilitado
} from "./utils";
import { validateReturnEligibility } from "@/lib/appointmentRules";
import { buildJourney, DEFAULT_JOURNEY, isDraftFresh } from "@/lib/journey";
import { getAppointmentForReschedule, remarcarAgendamentoPaciente } from "@/actions/appointments";
import { playDopamineSound, triggerHaptic } from "@/lib/dopamine";

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
    const contentContainerRef = useRef(null);

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

    useEffect(() => {
      timeLeftRef.current = timeLeft;
    }, [timeLeft]);

    // Reseta o scroll para o topo em cada mudança de etapa
    useEffect(() => {
      if (contentContainerRef.current) {
        contentContainerRef.current.scrollTo({ top: 0, behavior: "instant" });
      }
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "instant" });
      }
    }, [currentStepIndex]);

    const [context, setContext] = useState({
      isSmartLink: false,
      personalizedName: "",
      dataUltimaConsulta: null,
      userFound: false,
      checkingUser: false
    });
    const [calendarMonth, setCalendarMonth] = useState(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    );
    const [agenda, setAgenda] = useState({ ocupados: [], buscando: false });
    const [rescheduleContext, setRescheduleContext] = useState(null);

    const [flags, setFlags] = useState({
      cpfUrl: false,
      nomeUrl: false,
      sobrenomeUrl: false,
      telUrl: false,
      emailUrl: false,
      nascUrl: false,
      unlockedAll: false,
      exibirConfUri: false,
      confirmouUri: false
    });

    const formMethods = useForm({ resolver: zodResolver(schema), mode: "onChange" });
    const {
      register,
      watch,
      trigger,
      setValue,
      formState: { errors },
      reset
    } = formMethods;
    const formData = watch();
    const draftKey = slug ? `rmagenda_jornada:${slug}` : null;

    useEffect(() => {
      const fetchEmpresaConfigAndData = async () => {
        setLoadingConfig(true);
        if (!slug) {
          setLoadingConfig(false);
          return;
        }

        try {
          const { data: empresa } = await supabase
            .from("empresas")
            .select("*")
            .eq("slug", slug)
            .maybeSingle();
          if (!empresa) {
            setEmpresaDados(null);
            setLoadingConfig(false);
            return;
          }

          setEmpresaDados(empresa);
          localStorage.setItem("rmagenda_last_slug", slug);

          const conf = empresa.config_campos || {};

          const [{ data: srvs }, { data: pergs }, { data: ops }, { data: regrasDB }] =
            await Promise.all([
              supabase.from("servicos").select("*").eq("ativo", true).eq("empresa_id", empresa.id),
              supabase.from("perguntas_triagem").select("*").eq("ativa", true).eq("empresa_id", empresa.id),
              supabase.from("opcoes_triagem").select("*"),
              supabase.from("regras_agenda").select("*").eq("ativo", true).eq("empresa_id", empresa.id)
            ]);

          const srvsAtivos = (srvs || []).filter((s) => s.ativo !== false);
          setServicosDB(srvsAtivos);
          if (regrasDB) setRegrasGlobais(regrasDB);
          if (pergs && ops) {
            const pergsFull = pergs.map((p) => ({
              ...p,
              opcoes: ops.filter((o) => o.pergunta_id === p.id)
            }));
            setPerguntasDB(pergsFull);
          }

          // Função Universal e Abstrata de Resolução de Especialidade / Exame / Procedimento
          const resolveEspecialidadeUniversal = (inputRaw, confObj, empObj, srvsList) => {
            if (!inputRaw || String(inputRaw).trim() === "") return null;
            const input = String(inputRaw).trim();
            const inputLower = input.toLowerCase();

            const confCats = confObj?.especialidades_categorizadas || [];
            const empEsps = Array.isArray(empObj?.especialidades)
              ? empObj.especialidades.map((e) => (typeof e === "object" ? e.nome : e)).filter(Boolean)
              : [];

            const allKnownEsps = new Set();
            confCats.forEach((c) => c.nome && allKnownEsps.add(c.nome));
            empEsps.forEach((e) => allKnownEsps.add(e));
            (srvsList || []).forEach((s) => {
              if (s.especialidade) {
                s.especialidade.split(",").forEach((e) => e.trim() && allKnownEsps.add(e.trim()));
              }
            });

            const allEspsList = Array.from(allKnownEsps);

            // 1. Busca direta por codigo_uri em especialidades_categorizadas
            const byUri = confCats.find(
              (c) => c.codigo_uri && String(c.codigo_uri).trim().toLowerCase() === inputLower
            );
            if (byUri?.nome) return byUri.nome;

            // 2. Busca exata por nome (case-insensitive)
            const byExactName = allEspsList.find((e) => e.toLowerCase() === inputLower);
            if (byExactName) return byExactName;

            // 3. Se for numérico (ex: "7", "8", 7, 8 - índice 1-based vindo de menus de chatbot)
            if (/^\d+$/.test(input)) {
              const num = parseInt(input, 10);
              if (num > 0) {
                if (confCats[num - 1]?.nome) {
                  return confCats[num - 1].nome;
                }
                if (empEsps[num - 1]) {
                  return empEsps[num - 1];
                }
                if (allEspsList[num - 1]) {
                  return allEspsList[num - 1];
                }
              }
            }

            // 4. Busca por normalização e slugs (ex: "endoscopia-colonoscopia", "endoscopia+colonoscopia")
            const normalizeText = (t) =>
              String(t)
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "");

            const inputNorm = normalizeText(input);
            const byNormalized = allEspsList.find((e) => normalizeText(e) === inputNorm);
            if (byNormalized) return byNormalized;

            // 5. Busca por inclusão parcial inteligente
            const byPartial = allEspsList.find((e) => {
              const n = normalizeText(e);
              return n === inputNorm || (inputNorm.length >= 4 && (n.includes(inputNorm) || inputNorm.includes(n)));
            });
            if (byPartial) return byPartial;

            return input;
          };

          // Leitura dos Parâmetros de URL (Smart Link)
          const nomeUrlRaw = searchParams.get("nome");
          const sobrenomeUrlRaw = searchParams.get("sobrenome");
          const cpfUrl = searchParams.get("cpf");
          const medicoUrl = searchParams.get("medico") || searchParams.get("especialista");
          const wppUrl = searchParams.get("whatsapp");
          const emailUrl = searchParams.get("email");
          const nascUrl = searchParams.get("nascimento");
          const espRaw =
            searchParams.get("especialidade") ||
            searchParams.get("exame") ||
            searchParams.get("procedimento") ||
            searchParams.get("servico");
          const urlModalidadeRaw = searchParams.get("modalidade");
          const hideFlag = searchParams.get("hide") === "true";

          let limpaWpp = wppUrl ? wppUrl.replace(/\D/g, "") : "";
          if (limpaWpp.startsWith("55") && (limpaWpp.length === 12 || limpaWpp.length === 13)) {
            limpaWpp = limpaWpp.substring(2);
          }

          const cpfValid = cpfUrl && cpfUrl.replace(/\D/g, "").length === 11;
          const telValid = limpaWpp.length >= 10;
          const isSmartLinkComDados = !!(nomeUrlRaw && (cpfValid || telValid));

          // 1. Resolução da Modalidade
          let urlModalidade = null;
          if (urlModalidadeRaw) {
            const cleanMod = String(urlModalidadeRaw).trim().toLowerCase();
            const modalidadesOpcoes = conf.modalidades_opcoes || [];
            const matchMod = modalidadesOpcoes.find(
              (m) =>
                (m.codigo_uri && String(m.codigo_uri).trim().toLowerCase() === cleanMod) ||
                (m.id && String(m.id).trim().toLowerCase() === cleanMod) ||
                (m.nome && m.nome.trim().toLowerCase() === cleanMod)
            );

            if (matchMod) {
              urlModalidade = matchMod.nome;
            } else {
              const mapaMod = { 1: "Convênio", 2: "Particular", 3: "Retorno", "1": "Convênio", "2": "Particular", "3": "Retorno" };
              urlModalidade = mapaMod[urlModalidadeRaw] || urlModalidadeRaw;
            }

            if (urlModalidadeRaw === "3" || (urlModalidade && urlModalidade.toLowerCase() === "retorno")) {
              urlModalidade = "Retorno";
              setValue("tipo_servico", "Retorno");
            }
          }

          if (urlModalidade) {
            setValue("modalidade", urlModalidade);
          } else if (conf.ocultar_modalidade) {
            setValue("modalidade", conf.modalidade_padrao || "Convênio");
          } else {
            setValue("modalidade", conf.modalidade_padrao || "Particular");
          }

          // 2. Preenchimento dos dados do paciente recebidos na URL
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
          if (limpaWpp) setValue("telefone_whatsapp", masks.phone(limpaWpp));
          if (emailUrl) setValue("email", emailUrl);
          if (nascUrl) setValue("data_nascimento", masks.date(nascUrl));

          // 3. Resolução Universal da Especialidade / Exame da URL
          let resolvedEspFromUrl = null;
          if (espRaw && String(espRaw).trim() !== "") {
            resolvedEspFromUrl = resolveEspecialidadeUniversal(espRaw, conf, empresa, srvsAtivos);
          }

          // 4. Resolução Estrita do Médico por Código URI / Número nos Serviços ATIVOS
          let foundSrv = null;
          let urlSrvId = null;

          if (medicoUrl && String(medicoUrl).trim() !== "") {
            const cleanTarget = String(medicoUrl).trim().toLowerCase();

            foundSrv = srvsAtivos.find(
              (s) =>
                s.ativo !== false &&
                (String(s.codigo_uri || "").trim().toLowerCase() === cleanTarget ||
                 String(s.numero_especialista || "").trim() === cleanTarget ||
                 String(s.id || "").trim() === cleanTarget)
            );

            if (!foundSrv) {
              const cleanUrlMedico = cleanTarget.replace(/dra\.|dr\./g, "").trim();
              foundSrv = srvsAtivos.find((s) => {
                if (s.ativo === false) return false;
                const cleanDbNome = (s.nome || "").toLowerCase().replace(/dra\.|dr\./g, "").trim();
                return cleanDbNome.includes(cleanUrlMedico) || cleanUrlMedico.includes(cleanDbNome);
              });
            }

            if (foundSrv) {
              urlSrvId = foundSrv.id;
              const medicoEsps = foundSrv.especialidade
                ? foundSrv.especialidade.split(",").map((e) => e.trim()).filter(Boolean)
                : [];

              let especialidadeFinal = resolvedEspFromUrl;
              if (!especialidadeFinal || /^\d+$/.test(especialidadeFinal)) {
                especialidadeFinal = medicoEsps.length > 0 ? medicoEsps[0] : "Consulta";
              }

              const confCategorizadas = conf.especialidades_categorizadas || [];
              const matchCatObj = confCategorizadas.find(
                (c) => c.nome && c.nome.toLowerCase().trim() === especialidadeFinal.toLowerCase().trim()
              );
              let isExame = false;
              if (matchCatObj?.categoria) {
                isExame = matchCatObj.categoria.toLowerCase().includes("exame");
              } else {
                isExame = /(exame|colonoscopia|endoscopia|ultrassom|tomografia|ressonancia|raio-x|biopsia|procedimento)/i.test(
                  especialidadeFinal
                );
              }
              const tipo = isExame ? "Exame" : "Consulta";

              setValue("tipo_servico", tipo);
              setValue("especialidade", especialidadeFinal);
              setValue("medico_profissional", foundSrv.nome);
              setValue("subtipo_exame", isExame ? especialidadeFinal : "");
            }
          } else if (resolvedEspFromUrl) {
            const confCategorizadas = conf.especialidades_categorizadas || [];
            const matchCatObj = confCategorizadas.find(
              (c) => c.nome && c.nome.toLowerCase().trim() === resolvedEspFromUrl.toLowerCase().trim()
            );
            let isExame = false;
            if (matchCatObj?.categoria) {
              isExame = matchCatObj.categoria.toLowerCase().includes("exame");
            } else {
              isExame = /(exame|colonoscopia|endoscopia|ultrassom|tomografia|ressonancia|raio-x|biopsia|procedimento)/i.test(
                resolvedEspFromUrl
              );
            }

            setValue("especialidade", resolvedEspFromUrl);
            setValue("tipo_servico", isExame ? "Exame" : "Consulta");
            setValue("medico_profissional", "");
            setValue("subtipo_exame", isExame ? resolvedEspFromUrl : "");
          }

          // 5. Construção Inteligente da Jornada
          const hasPerguntas = urlSrvId ? (pergs || []).some((p) => p.servico_id === urlSrvId) : false;
          let jornada = buildJourney(conf, hasPerguntas);

          if (isSmartLinkComDados) {
            jornada = jornada.filter((m) => m !== "boas_vindas" && m !== "identificacao");

            if ((foundSrv || resolvedEspFromUrl) && hideFlag) {
              jornada = jornada.filter((m) => m !== "especialidade");
            }

            if (urlModalidade && hideFlag) {
              jornada = jornada.filter((m) => m !== "modalidade");
            }

            let targetStep = "agenda";
            if (jornada.includes("triagem") && hasPerguntas) {
              targetStep = "triagem";
            } else if (jornada.includes("modalidade") && !urlModalidade) {
              targetStep = "modalidade";
            } else if (jornada.includes("especialidade") && !foundSrv && !resolvedEspFromUrl) {
              targetStep = "especialidade";
            } else {
              targetStep = "agenda";
            }

            setModulosAtivos(jornada);
            const targetIdx = Math.max(0, jornada.indexOf(targetStep));
            setCurrentStepIndex(targetIdx);
            currentStepRef.current = targetIdx;
            setMinStepIndex(targetIdx);

            setFlags({
              cpfUrl: !!cpfUrl,
              nomeUrl: !!nomeUrlRaw,
              sobrenomeUrl: !!sobrenomeUrlRaw,
              telUrl: !!limpaWpp,
              emailUrl: !!emailUrl,
              nascUrl: !!nascUrl,
              unlockedAll: false,
              exibirConfUri: false,
              confirmouUri: true
            });

            setContext({
              isSmartLink: true,
              personalizedName: nomeUrlRaw ? nomeUrlRaw.trim().split(" ")[0] : "",
              dataUltimaConsulta: null,
              userFound: false,
              checkingUser: false
            });
          } else {
            setModulosAtivos(jornada);
          }

          // 6. Suporte a Reagendamento
          const rescheduleId = searchParams.get("reagendar");
          const rescheduleToken = searchParams.get("token");
          if (rescheduleId && rescheduleToken) {
            const result = await getAppointmentForReschedule({
              id: rescheduleId,
              token: rescheduleToken
            });
            if (!result.success || result.appointment.empresa_id !== empresa.id)
              throw new Error(result.error || "Agendamento inválido para esta clínica.");
            const appointment = result.appointment;
            const patient = appointment.pacientes || {};
            const names = (patient.nome_completo || "").trim().split(" ");
            reset({
              cpf: patient.cpf || "",
              nome: names[0] || "",
              sobrenome: names.slice(1).join(" "),
              data_nascimento:
                patient.data_nascimento?.split("-").reverse().join("/") || "",
              tipo_servico: appointment.tipo_servico,
              subtipo_exame: appointment.subtipo_exame || "",
              medico_profissional: appointment.medico_profissional || "",
              modalidade: appointment.modalidade || "",
              data_agendamento: "",
              horario_agendamento: ""
            });
            setRescheduleContext({ id: rescheduleId, token: rescheduleToken });
            const agendaIndex = jornada.indexOf("agenda");
            setCurrentStepIndex(agendaIndex >= 0 ? agendaIndex : 0);
            setMinStepIndex(Math.max(0, jornada.indexOf("especialidade")));
          }
        } catch (err) {
          console.error("Erro ao carregar dados:", err);
        } finally {
          setLoadingConfig(false);
        }
      };

      fetchEmpresaConfigAndData();
    }, [slug, searchParams]);

    // Resolução inteligente do serviço/especialista selecionado
    const getSelectedService = () => {
      const nomeProfissional = formData.medico_profissional || formData.subtipo_exame;
      if (!nomeProfissional) {
        return null;
      }

      const cleanTarget = String(nomeProfissional).trim().toLowerCase();

      let srv = servicosDB.find(
        (s) =>
          s.ativo !== false &&
          (String(s.codigo_uri || "").trim().toLowerCase() === cleanTarget ||
           String(s.numero_especialista || "").trim() === cleanTarget ||
           String(s.id || "").trim() === cleanTarget)
      );

      if (!srv) {
        srv = servicosDB.find(
          (s) => s.ativo !== false && s.nome.trim().toLowerCase() === cleanTarget
        );
      }

      if (!srv) {
        const nomeLimpo = cleanTarget.replace(/dra\.|dr\./g, "").trim();
        srv = servicosDB.find((s) => {
          if (s.ativo === false) return false;
          const sNome = s.nome.toLowerCase().replace(/dra\.|dr\./g, "").trim();
          return sNome.includes(nomeLimpo) || nomeLimpo.includes(sNome);
        });
      }

      return srv || null;
    };

    const selectedSrv = getSelectedService();
    const valorEntrada = selectedSrv ? selectedSrv.preco / 2 : 0;

    const perguntasAtuais = (perguntasDB || []).filter((p) => {
      if (!p.especialidade || p.especialidade === "Todas" || p.especialidade === "Geral") {
        return true;
      }

      const espAlvo = p.especialidade.toLowerCase().trim();
      const espForm = (formData?.especialidade || "").toLowerCase().trim();
      const tipoForm = (formData?.tipo_servico || "").toLowerCase().trim();
      const subTipoForm = (formData?.subtipo_exame || "").toLowerCase().trim();
      const profForm = (formData?.medico_profissional || "").toLowerCase().trim();
      const srvEsp = (selectedSrv?.especialidade || "").toLowerCase().trim();
      const srvNome = (selectedSrv?.nome || "").toLowerCase().trim();

      return (
        espForm.includes(espAlvo) ||
        espAlvo.includes(espForm) ||
        tipoForm.includes(espAlvo) ||
        subTipoForm.includes(espAlvo) ||
        profForm.includes(espAlvo) ||
        srvEsp.includes(espAlvo) ||
        srvNome.includes(espAlvo) ||
        (p.servico_id && p.servico_id === selectedSrv?.id)
      );
    });

    useEffect(() => {
      if (!draftKey || loadingConfig || !empresaDados || context.isSmartLink) return;
      const step = modulosAtivos[currentStepIndex];
      if (step === "concluido") {
        localStorage.removeItem(draftKey);
        return;
      }
      const timeout = setTimeout(() => {
        localStorage.setItem(
          draftKey,
          JSON.stringify({
            version: 1,
            savedAt: Date.now(),
            step,
            formData,
            respostasTriagem
          })
        );
      }, 250);
      return () => clearTimeout(timeout);
    }, [draftKey, loadingConfig, empresaDados, currentStepIndex, modulosAtivos, formData, respostasTriagem, context.isSmartLink]);

    const showIsland = (msg, type = "error") => {
      setIslandMessage(msg);
      setIslandState(type);
      if (type === "error") {
        playDopamineSound("error");
        triggerHaptic("error");
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      const currentModule = modulosAtivos[currentStepIndex];
      if (!["loading", "success"].includes(type) && currentModule !== "concluido") {
        timeoutRef.current = setTimeout(() => setIslandState("default"), 3000);
      }
    };

    const lastCheckedCpfRef = useRef("");

    const handleCpfLookup = async (targetCpf) => {
      const cleanCpfInput = (targetCpf || formData.cpf || "").trim();
      if (cleanCpfInput.length !== 14) return;

      setContext((c) => ({ ...c, checkingUser: true }));
      lastCheckedCpfRef.current = cleanCpfInput;

      try {
        let query = supabase
          .from("pacientes")
          .select("*")
          .eq("cpf", cleanCpfInput);

        if (empresaDados?.id) {
          query = query.eq("empresa_id", empresaDados.id);
        }

        let { data } = await query.maybeSingle();

        if (data) {
          if (data.nome_completo) {
            const p = data.nome_completo.trim().split(" ");
            setValue("nome", p[0] || "");
            setValue("sobrenome", p.slice(1).join(" ") || "");
          }
          setValue("telefone_whatsapp", data.telefone_whatsapp || "");
          setValue("email", data.email || "");
          if (data.data_nascimento) {
            setValue("data_nascimento", data.data_nascimento.split("-").reverse().join("/"));
          }

          setContext((c) => ({ ...c, userFound: true }));
          playDopamineSound("unlock");
          triggerHaptic("success");
          showIsland("Bem-vindo de volta! Cadastro identificado.", "success");
          setTimeout(() => setIslandState("default"), 2400);
        } else {
          setContext((c) => ({ ...c, userFound: false }));
          if (!context.isSmartLink || flags.unlockedAll) {
            ["nome", "sobrenome", "telefone_whatsapp", "email", "data_nascimento"].forEach((f) =>
              setValue(f, "")
            );
          }
        }
      } finally {
        setTimeout(() => setContext((c) => ({ ...c, checkingUser: false })), 400);
      }
    };

    useEffect(() => {
      if (modulosAtivos[currentStepIndex] !== "identificacao") return;

      const currentCpf = (formData.cpf || "").trim();

      if (currentCpf.length < 14) {
        if (lastCheckedCpfRef.current !== "") {
          lastCheckedCpfRef.current = "";
          setContext((c) => ({ ...c, userFound: false }));
          if (!context.isSmartLink || flags.unlockedAll) {
            ["nome", "sobrenome", "telefone_whatsapp", "email", "data_nascimento"].forEach((f) =>
              setValue(f, "")
            );
          }
        }
        return;
      }

      if (
        currentCpf.length === 14 &&
        currentCpf !== lastCheckedCpfRef.current &&
        !context.checkingUser
      ) {
        handleCpfLookup(currentCpf);
      }
    }, [formData.cpf, currentStepIndex, modulosAtivos]);

    useEffect(() => {
      if (!formData.data_agendamento || !empresaDados) return;
      const prof =
        formData.tipo_servico === "Exame" ? formData.subtipo_exame : formData.medico_profissional;
      const esp = (formData.especialidade || "").trim();
      if (!prof && !esp) return;

      let isMounted = true;
      const requestStartedAt = Date.now();
      setAgenda((a) => ({ ...a, buscando: true }));

      const fetchAgenda = async () => {
        try {
          const [{ data: ag }, { data: bl }] = await Promise.all([
            supabase
              .from("agendamentos")
              .select(
                "id, horario_agendamento, medico_profissional, subtipo_exame, status_atendimento, tipo_servico, especialidade"
              )
              .eq("data_agendamento", formData.data_agendamento)
              .eq("empresa_id", empresaDados.id)
              .neq("status_atendimento", "cancelado"),
            supabase
              .from("bloqueios_horarios")
              .select("horario, medico_profissional, especialidade")
              .eq("data", formData.data_agendamento)
              .eq("empresa_id", empresaDados.id)
          ]);

          const timeToMin = (tStr) => {
            if (!tStr) return 0;
            const parts = tStr.trim().split(":");
            return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || "0", 10);
          };

          const formatTime = (timeStr) => {
            if (!timeStr) return "";
            const parts = timeStr.trim().split(":");
            const h = parts[0].padStart(2, "0");
            const m = (parts[1] || "00").substring(0, 2);
            return `${h}:${m}`;
          };

          const espNorm = (formData.especialidade || "").toLowerCase().trim();
          const subNorm = (formData.subtipo_exame || "").toLowerCase().trim();
          const profNorm = (formData.medico_profissional || "").toLowerCase().trim();

          const sharedRules = (regrasGlobais || []).filter((r) => {
            if (r.ativo === false) return false;
            if (r.servico_id && selectedSrv?.id && r.servico_id === selectedSrv.id) return true;
            const permitidos = (r.tipos_permitidos || []).map((t) => String(t).toLowerCase().trim());
            const rEsp = (r.especialidade || "").toLowerCase().trim();
            return (
              (espNorm && (permitidos.includes(espNorm) || rEsp === espNorm || rEsp.includes(espNorm) || espNorm.includes(rEsp))) ||
              (subNorm && (permitidos.includes(subNorm) || rEsp === subNorm || rEsp.includes(subNorm) || subNorm.includes(rEsp)))
            );
          });

          const poolEspecialidades = new Set([
            espNorm,
            subNorm,
            ...sharedRules.flatMap((r) => [
              ...(r.tipos_permitidos || []).map((t) => String(t).toLowerCase().trim()),
              ...(r.especialidade ? r.especialidade.split(",").map((e) => e.toLowerCase().trim()) : [])
            ])
          ].filter(Boolean));

          const confEsps = empresaDados?.config_campos?.especialidades_categorizadas || [];

          const getDurationForAppointment = (itemEsp, itemSub) => {
            const iEsp = (itemEsp || "").toLowerCase().trim();
            const iSub = (itemSub || "").toLowerCase().trim();
            const found = confEsps.find((e) => {
              const n = (e.nome || "").toLowerCase().trim();
              return n === iEsp || n === iSub;
            });
            if (found?.duracao_minutos) return Number(found.duracao_minutos);
            const ruleMatch = sharedRules[0];
            return Number(ruleMatch?.duracao_slot_minutos) || 30;
          };

          const duracaoPacienteAtual = getDurationForAppointment(formData.especialidade, formData.subtipo_exame);

          const occupiedIntervals = [];
          const slots = [];

          (ag || []).forEach((a) => {
            const aProf = (a.medico_profissional || "").toLowerCase().trim();
            const aSub = (a.subtipo_exame || "").toLowerCase().trim();
            const aEsp = (a.especialidade || "").toLowerCase().trim();

            const matchProf = profNorm && (aProf.includes(profNorm) || profNorm.includes(aProf));
            const matchShared = poolEspecialidades.has(aEsp) || poolEspecialidades.has(aSub) || poolEspecialidades.has(aProf);

            if (matchProf || matchShared || (!profNorm && poolEspecialidades.size === 0)) {
              const startMin = timeToMin(a.horario_agendamento);
              const dur = getDurationForAppointment(a.especialidade, a.subtipo_exame);
              const endMin = startMin + dur;
              const formattedH = formatTime(a.horario_agendamento);
              occupiedIntervals.push({ startMin, endMin, hora: formattedH });
              slots.push(formattedH);
            }
          });

          (bl || []).forEach((b) => {
            const bProf = (b.medico_profissional || "").toLowerCase().trim();
            const bEsp = (b.especialidade || "").toLowerCase().trim();

            const matchProf = !b.medico_profissional || b.medico_profissional === "Todos" || (profNorm && (bProf.includes(profNorm) || profNorm.includes(bProf)));
            const matchShared = !b.especialidade || poolEspecialidades.has(bEsp);

            if (matchProf || matchShared) {
              const startMin = timeToMin(b.horario);
              const dur = Number(sharedRules[0]?.duracao_slot_minutos) || 30;
              const endMin = startMin + dur;
              const formattedH = formatTime(b.horario);
              occupiedIntervals.push({ startMin, endMin, hora: formattedH });
              slots.push(formattedH);
            }
          });

          if (isMounted) {
            setAgenda({
              ocupados: [...new Set(slots)],
              occupiedIntervals,
              duracaoAtual: duracaoPacienteAtual,
              sharedPool: Array.from(poolEspecialidades),
              buscando: false,
              agora: requestStartedAt
            });
          }
        } catch (e) {
          if (isMounted) setAgenda((a) => ({ ...a, buscando: false }));
        }
      };

      fetchAgenda();
      return () => {
        isMounted = false;
      };
    }, [
      formData.data_agendamento,
      formData.medico_profissional,
      formData.subtipo_exame,
      formData.especialidade,
      formData.tipo_servico,
      setValue,
      empresaDados,
      regrasGlobais
    ]);

    const salvarNoBanco = async (pago) => {
      try {
        if (rescheduleContext) {
          const result = await remarcarAgendamentoPaciente({
            id: rescheduleContext.id,
            token: rescheduleContext.token,
            data: formData.data_agendamento,
            horario: formData.horario_agendamento
          });
          if (!result.success) {
            showIsland(result.error);
            return false;
          }
          return { id: result.appointmentId, rescheduled: true };
        }

        let pacienteId = null;
        try {
          const { data: pExistente } = await supabase
            .from("pacientes")
            .select("id")
            .eq("cpf", formData.cpf)
            .maybeSingle();
          pacienteId = pExistente?.id;
        } catch (errP) {
          console.warn("Aviso ao buscar paciente por CPF:", errP);
        }

        const pacienteData = {
          nome_completo: `${formData.nome} ${formData.sobrenome}`.trim(),
          telefone_whatsapp: formData.telefone_whatsapp,
          email: formData.email,
          data_nascimento: helpers.toDBDate(formData.data_nascimento),
          empresa_id: empresaDados?.id
        };

        if (pacienteId) {
          let { error: errUpdate } = await supabase
            .from("pacientes")
            .update(pacienteData)
            .eq("id", pacienteId);
          if (errUpdate) {
            delete pacienteData.empresa_id;
            const retry = await supabase
              .from("pacientes")
              .update(pacienteData)
              .eq("id", pacienteId);
            if (retry.error) console.warn("Aviso no update do paciente:", retry.error);
          }
        } else {
          let { data: novoPac, error: errInsert } = await supabase
            .from("pacientes")
            .insert({ cpf: formData.cpf, ...pacienteData })
            .select()
            .single();
          if (errInsert) {
            delete pacienteData.empresa_id;
            const retry = await supabase
              .from("pacientes")
              .insert({ cpf: formData.cpf, ...pacienteData })
              .select()
              .single();
            if (retry.data) pacienteId = retry.data.id;
          } else if (novoPac) {
            pacienteId = novoPac.id;
          }
        }

        let consultaInicialId = null;
        if (formData.tipo_servico === "Retorno" && pacienteId) {
          try {
            const { data: anteriores } = await supabase
              .from("agendamentos")
              .select("id,tipo_servico,data_agendamento,status_pagamento_antecipado")
              .eq("paciente_id", pacienteId)
              .lte("data_agendamento", formData.data_agendamento);
            if (anteriores && anteriores.length > 0) {
              const policy = empresaDados.config_regras || {};
              const eligibility = validateReturnEligibility(
                anteriores,
                formData.data_agendamento,
                {
                  windowDays: policy.retorno_prazo_dias,
                  requirePayment: policy.retorno_exige_pagamento
                }
              );
              if (eligibility.valid && eligibility.initialAppointment) {
                consultaInicialId = eligibility.initialAppointment.id;
              }
            }
          } catch (errRet) {
            console.warn("Aviso ao checar elegibilidade de retorno:", errRet);
          }
        }

        const confCampos = empresaDados?.config_campos || {};
        const modalidadeEfetiva =
          formData.modalidade ||
          (confCampos.ocultar_modalidade
            ? confCampos.modalidade_padrao || "Convênio"
            : confCampos.modalidade_padrao || "Particular");

        const appointmentPayload = {
          paciente_id: pacienteId,
          empresa_id: empresaDados?.id,
          tipo_servico: formData.tipo_servico || "Consulta",
          especialidade: formData.especialidade || formData.subtipo_exame || null,
          subtipo_exame: formData.subtipo_exame || formData.especialidade || null,
          medico_profissional: formData.medico_profissional || "A definir",
          modalidade: modalidadeEfetiva,
          data_agendamento: formData.data_agendamento,
          horario_agendamento: formData.horario_agendamento,
          status_pagamento_antecipado: pago,
          valor_total: valorEntrada * 2,
          categoria_atendimento: formData.tipo_servico === "Retorno" ? "retorno" : "inicial",
          consulta_inicial_id: consultaInicialId
        };

        let { data: savedAppointment, error: errAgendamento } = await supabase
          .from("agendamentos")
          .insert(appointmentPayload)
          .select("id")
          .single();

        if (errAgendamento) {
          console.warn("Aviso ao salvar agendamento completo, tentando payload simplificado:", errAgendamento);
          const simplePayload = {
            paciente_id: pacienteId,
            empresa_id: empresaDados?.id,
            tipo_servico: formData.tipo_servico || "Consulta",
            subtipo_exame: formData.subtipo_exame || null,
            medico_profissional: formData.medico_profissional || "A definir",
            modalidade: modalidadeEfetiva,
            data_agendamento: formData.data_agendamento,
            horario_agendamento: formData.horario_agendamento,
            status_pagamento_antecipado: pago
          };

          const retry = await supabase
            .from("agendamentos")
            .insert(simplePayload)
            .select("id")
            .single();

          if (retry.error) {
            console.error("ERRO CRÍTICO AO SALVAR NO SUPABASE (agendamentos):", retry.error);
            throw retry.error;
          }
          savedAppointment = retry.data;
        }

        await enviarParaMedicalsysSeHabilitado(
          { ...formData, modalidade: modalidadeEfetiva },
          empresaDados,
          savedAppointment?.id
        );

        return savedAppointment;
      } catch (error) {
        console.error("ERRO AO SALVAR NO SUPABASE:", error);
        return false;
      }
    };

    const isModuleValid = (moduleKey) => {
      const cFields = empresaDados?.config_campos || {
        mostrar_cpf: true,
        mostrar_email: true,
        mostrar_nascimento: true
      };
      switch (moduleKey) {
        case "boas_vindas":
          return true;
        case "identificacao":
          if (!formData.nome || formData.nome.length < 2) return false;
          if (cFields.mostrar_cpf !== false && (!formData.cpf || formData.cpf.length !== 14))
            return false;
          if (cFields.mostrar_email !== false && (!formData.email || !formData.email.includes("@")))
            return false;
          if (
            cFields.mostrar_nascimento !== false &&
            !helpers.isValidDate(formData.data_nascimento)
          )
            return false;
          return true;
        case "especialidade":
          if (selectedSrv?.redirecionar_whatsapp || selectedSrv?.status_agendamento === "whatsapp") return false;
          if (flags.exibirConfUri && !flags.confirmouUri) return false;
          if (!formData.tipo_servico) return false;
          if (
            ["Consulta", "Retorno"].includes(formData.tipo_servico) &&
            !formData.medico_profissional
          )
            return false;
          if (formData.tipo_servico === "Exame" && !formData.subtipo_exame) return false;
          return true;
        case "triagem":
          return perguntasAtuais
            .filter((p) => p.obrigatoria !== false)
            .every((p) => respostasTriagem[p.id]);
        case "modalidade":
          return !!formData.modalidade || formData.tipo_servico === "Retorno";
        case "agenda":
          return !!(formData.data_agendamento && formData.horario_agendamento);
        case "checkout":
        case "concluido":
          return true;
        default:
          return false;
      }
    };

    const currentModuleKey = modulosAtivos[currentStepIndex];
    const isBoasVindas = currentModuleKey === "boas_vindas";
    const isConcluido = currentModuleKey === "concluido";
    const showActionButtons = !isBoasVindas && !isConcluido;

    // Sub-etapa de especialidade (usuário escolhendo médico/procedimento para a especialidade selecionada)
    const isEspecialidadeSubStep =
      currentModuleKey === "especialidade" && !!formData.especialidade && !flags.exibirConfUri;

    const handleGoBack = () => {
      playDopamineSound("click");
      triggerHaptic("light");

      if (isEspecialidadeSubStep) {
        setValue("especialidade", "");
        setValue("medico_profissional", "");
        setValue("subtipo_exame", "");
        return;
      }

      if (currentStepIndex > minStepIndex) {
        const prevModule = modulosAtivos[currentStepIndex - 1];
        if (prevModule === "especialidade") {
          setValue("especialidade", "");
          setValue("medico_profissional", "");
          setValue("subtipo_exame", "");
        }
        setCurrentStepIndex((p) => p - 1);
      }
    };

    const backButtonLabel = isEspecialidadeSubStep ? "Voltar para Especialidades" : "Voltar";

    const nextStep = async () => {
      setLoading(true);
      showIsland("Processando...", "loading");
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
            if (idxTriagem > currentStepIndex && perguntasAtuais.length > 0)
              return setCurrentStepIndex(idxTriagem);
            if (idxModalidade > currentStepIndex) return setCurrentStepIndex(idxModalidade);
          }
          const proximo = modulosAtivos[currentStepIndex + 1];
          if (proximo === "triagem" && perguntasAtuais.length === 0) {
            playDopamineSound("step");
            triggerHaptic("light");
            setCurrentStepIndex(currentStepIndex + 2);
            setIslandState("default");
            return;
          }
        }

        if (currentModule === "triagem") {
          if (!isModuleValid("triagem"))
            return showIsland("Responda todas as perguntas obrigatórias da triagem.");
          let maiorBloqueioTriagem = null;
          Object.values(respostasTriagem).forEach((opt) => {
            if (opt && opt.regra_bloqueio_dias > 0) {
              const tempDate = calcularDataLimite(
                new Date(),
                opt.regra_bloqueio_dias,
                opt.tipo_contagem_dias || "corridos"
              );
              if (!maiorBloqueioTriagem || tempDate > maiorBloqueioTriagem)
                maiorBloqueioTriagem = tempDate;
            }
          });
          setBloqueioExtraCalculado(maiorBloqueioTriagem);
        }

        if (currentModule === "agenda") {
          if (!formData.data_agendamento || !formData.horario_agendamento)
            return showIsland("Escolha uma data e horário.");
          const correctionDelay = Number(
            empresaDados?.config_regras?.delay_confirmacao_segundos || 0
          );
          if (correctionDelay > 0) {
            showIsland(
              `Aguarde ${correctionDelay}s para revisar os dados antes da confirmação.`,
              "loading"
            );
            await new Promise((resolve) => setTimeout(resolve, correctionDelay * 1000));
            if (currentStepRef.current !== currentStepIndex)
              return showIsland("Confirmação cancelada para você corrigir os dados.");
          }

          const confCampos = empresaDados?.config_campos || {};
          const modalidadeEfetiva =
            formData.modalidade ||
            (confCampos.ocultar_modalidade
              ? confCampos.modalidade_padrao || "Convênio"
              : confCampos.modalidade_padrao || "Particular");
          const isConvenio =
            modalidadeEfetiva === "Convênio" || modalidadeEfetiva.toLowerCase().includes("conv");
          const isRetorno = formData.tipo_servico === "Retorno";
          const temCheckout =
            modulosAtivos.includes("checkout") &&
            modulosAtivos.indexOf("checkout") > currentStepIndex;

          if (isRetorno || isConvenio || !temCheckout || confCampos.ocultar_checkout) {
            const saved = await salvarNoBanco(false);
            if (saved) {
              await processarMensagensDinamicas(
                { ...formData, modalidade: modalidadeEfetiva },
                empresaDados,
                saved.id
              );
              showIsland("Agendamento Finalizado!", "success");
              playDopamineSound("success");

              const idxConcluido = modulosAtivos.indexOf("concluido");
              return setCurrentStepIndex(
                idxConcluido !== -1 ? idxConcluido : modulosAtivos.length - 1
              );
            }
            return showIsland("Erro ao salvar.");
          }
        }

        if (currentStepIndex < modulosAtivos.length - 1) {
          playDopamineSound("step");
          triggerHaptic("light");
          setCurrentStepIndex((p) => p + 1);
          setIslandState("default");
        }
      } finally {
        setLoading(false);
        if (islandState === "loading") setIslandState("default");
      }
    };

    const onSubmitMP = async (param) => {
      return new Promise(async (resolve) => {
        showIsland("Processando pagamento...", "loading");
        try {
          const mpPayer = param.formData?.payer || {};
          const payload = {
            ...param.formData,
            amount: Number(valorEntrada.toFixed(2)),
            description: `Entrada - ${formData.medico_profissional || formData.subtipo_exame}`,
            payer: {
              ...mpPayer,
              email: mpPayer.email || formData.email,
              first_name: mpPayer.first_name || formData.nome,
              last_name: mpPayer.last_name || formData.sobrenome,
              identification: mpPayer.identification || {
                type: "CPF",
                number: formData.cpf ? formData.cpf.replace(/\D/g, "") : ""
              }
            }
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
            if (!saved) {
              showIsland("Erro ao gerar agendamento.");
              return resolve();
            }

            if (!isPix) {
              await processarMensagensDinamicas(formData, empresaDados, saved.id);
              showIsland("Pagamento Aprovado!", "success");
              playDopamineSound("success");
            } else {
              if (data.transaction_data) {
                setPixData({
                  ...data.transaction_data,
                  payment_id: data.id,
                  appointment_id: saved.id
                });
                setTimeLeft(300);
              }
              showIsland("Pix gerado com sucesso!", "success");
              playDopamineSound("unlock");
            }
            const idxConcluido = modulosAtivos.indexOf("concluido");
            if (idxConcluido !== -1) setCurrentStepIndex(idxConcluido);
          } else {
            showIsland("Pagamento recusado.");
          }
        } catch (err) {
          showIsland("Erro de conexão.", "error");
        }
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
          const { data: paciente } = await supabase
            .from("pacientes")
            .select("id")
            .eq("cpf", formData.cpf)
            .maybeSingle();
          if (paciente) {
            await supabase
              .from("agendamentos")
              .update({ status_pagamento_antecipado: true })
              .eq("paciente_id", paciente.id)
              .eq("data_agendamento", formData.data_agendamento)
              .eq("horario_agendamento", formData.horario_agendamento);
          }
          await processarMensagensDinamicas(
            formData,
            empresaDados,
            pixData?.appointment_id || null
          );
          setPixData(null);
          setTimeLeft(0);
          showIsland("Pagamento Confirmado!", "success");
          playDopamineSound("success");
        }
      } catch (e) {
        console.error("Erro no polling:", e);
      } finally {
        checkingRef.current = false;
      }
    };

    useEffect(() => {
      if (!pixData?.payment_id) return;
      const pollInterval = setInterval(() => {
        if (timeLeftRef.current > 0 && !checkingRef.current)
          verificarPagamentoPixAutomatico(pixData.payment_id);
      }, 10000);
      return () => clearInterval(pollInterval);
    }, [pixData?.payment_id]);

    const renderLockedOrInput = (
      formKey,
      label,
      value,
      isLocked,
      maskFn,
      placeholder,
      maxLength,
      type = "text"
    ) => {
      const cnInputWrap =
        "relative rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 transition-all duration-300 focus-within:border-[#9FC131] dark:focus-within:border-[#9FC131] focus-within:ring-2 focus-within:ring-[#9FC131]/20 focus-within:bg-white dark:focus-within:bg-black overflow-hidden shadow-sm";
      const cnInput =
        "w-full min-h-[52px] p-4 pt-6 bg-transparent outline-none text-zinc-950 dark:text-white font-semibold text-sm sm:text-base peer placeholder-transparent";
      const cnLabel =
        "absolute left-4 top-2 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-xs peer-placeholder-shown:font-medium peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:text-[#86a621] dark:peer-focus:text-[#9FC131] pointer-events-none";

      if (isLocked && value) {
        return (
          <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 py-3 last:border-0">
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase block tracking-wider">
                {label}
              </span>
              <span className="text-[15px] font-medium text-zinc-900 dark:text-white mt-0.5 block">
                {value}
              </span>
            </div>
            <button
              onClick={() => {
                playDopamineSound("click");
                setFlags((f) => ({ ...f, unlockedAll: true }));
              }}
              className="p-2.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-full flex items-center justify-center min-w-[44px] min-h-[44px]"
            >
              <Pencil size={14} />
            </button>
          </div>
        );
      }

      return (
        <div className={`${cnInputWrap} my-2.5 last:mb-0`}>
          <input
            type={type}
            {...register(formKey)}
            onChange={(e) => {
              const val = maskFn ? maskFn(e.target.value) : e.target.value;
              setValue(formKey, val);
            }}
            maxLength={maxLength}
            placeholder={placeholder}
            className={cnInput}
          />
          <label className={cnLabel}>{label}</label>
        </div>
      );
    };

    const handleNovoAgendamento = () => {
      playDopamineSound("click");
      triggerHaptic("light");

      if (typeof window !== "undefined") {
        if (slug) {
          localStorage.removeItem(`rmagenda_jornada:${slug}`);
          localStorage.removeItem(`rmcare_jornada:${slug}`);
        }
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith("rmagenda_jornada") || k.startsWith("rmcare_jornada")) {
            localStorage.removeItem(k);
          }
        });

        window.location.href = `/${slug}/agendamentos`;
        return;
      }

      reset({
        cpf: "",
        nome: "",
        sobrenome: "",
        telefone_whatsapp: "",
        data_nascimento: "",
        email: "",
        tipo_servico: "",
        especialidade: "",
        medico_profissional: "",
        subtipo_exame: "",
        modalidade: "",
        data_agendamento: "",
        horario_agendamento: ""
      });

      setRespostasTriagem({});
      setBloqueioExtraCalculado(null);
      setPixData(null);
      setTimeLeft(0);
      lastCheckedCpfRef.current = "";
      setContext({
        isSmartLink: false,
        personalizedName: "",
        dataUltimaConsulta: null,
        userFound: false,
        checkingUser: false
      });
      setFlags({
        cpfUrl: false,
        nomeUrl: false,
        sobrenomeUrl: false,
        telUrl: false,
        emailUrl: false,
        nascUrl: false,
        unlockedAll: false,
        exibirConfUri: false,
        confirmouUri: false
      });

      setCurrentStepIndex(0);
      setMinStepIndex(0);
      setIslandState("default");
    };

    const contextValue = {
      register,
      watch,
      trigger,
      setValue,
      errors,
      reset,
      formData,
      slug,
      empresaDados,
      flags,
      setFlags,
      context,
      setContext,
      servicosDB,
      perguntasAtuais,
      respostasTriagem,
      setRespostasTriagem,
      bloqueioExtraCalculado,
      setBloqueioExtraCalculado,
      agenda,
      setAgenda,
      calendarMonth,
      setCalendarMonth,
      pixData,
      setPixData,
      timeLeft,
      setTimeLeft,
      valorEntrada,
      nextStep,
      isModuleValid,
      showIsland,
      modulosAtivos,
      currentStepIndex,
      setCurrentStepIndex,
      selectedSrv,
      timeSlotsRef,
      renderLockedOrInput,
      onSubmitMP,
      loading,
      regrasGlobais,
      handleNovoAgendamento,
      handleGoBack,
      isEspecialidadeSubStep,
      backButtonLabel
    };

    if (loadingConfig)
      return (
        <div className="text-zinc-500 mt-28 flex flex-col items-center gap-3">
          <Activity className="animate-spin text-[#9FC131]" size={28} />
          <span className="text-sm font-semibold">Carregando portal da clínica...</span>
        </div>
      );

    if (!empresaDados) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 z-10 relative text-center mt-20">
          <AlertTriangle size={64} className="text-zinc-300 dark:text-zinc-700 mb-6" />
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">Clínica não encontrada</h2>
          <p className="text-zinc-500 mt-2 max-w-md">
            O link que você tentou acessar não é válido ou a clínica não está mais disponível em nossa plataforma.
          </p>
          <button
            onClick={() => (window.location.href = "/")}
            className="mt-8 bg-zinc-950 dark:bg-white text-white dark:text-black px-8 py-4 rounded-full font-bold text-sm transition-transform hover:scale-105 shadow-xl min-h-[48px]"
          >
            Buscar Clínicas na RMAgenda
          </button>
        </div>
      );
    }

    const CurrentComponent = MODULE_REGISTRY[currentModuleKey];
    const stepLabels = {
      boas_vindas: "Boas-vindas",
      identificacao: "Seus dados",
      especialidade: "Atendimento",
      triagem: "Cuidados",
      modalidade: "Cobertura",
      agenda: "Data e horário",
      checkout: "Pagamento",
      concluido: "Tudo certo"
    };

    const logoUrl = empresaDados?.logo_url || empresaDados?.config_campos?.logo_url;
    const formatoLogo = empresaDados?.config_campos?.formato_logo || empresaDados?.formato_logo || "arredondada";

    const getHeaderShapeClass = (fmt) => {
      switch (fmt) {
        case "circular":
          return "w-11 h-11 rounded-full";
        case "quadrada":
          return "w-11 h-11 rounded-lg";
        case "original":
          return "w-14 h-10 rounded-xl";
        case "arredondada":
        default:
          return "w-11 h-11 rounded-2xl";
      }
    };

    const headerLogoShapeClass = getHeaderShapeClass(formatoLogo);

    return (
      <AgendamentoContext.Provider value={contextValue}>
        {/* CABEÇALHO DYNAMIC ISLAND */}
        <div
          className={`absolute left-0 right-0 w-full z-[9999] px-4 flex justify-center pointer-events-none transition-all duration-300 ease-out ${
            isBoasVindas ? "top-3.5 sm:top-4 md:top-6" : "top-[70px] sm:top-[74px] md:top-6"
          }`}
        >
          <motion.div
            layout
            transition={{ type: "spring", stiffness: 450, damping: 30 }}
            className={`pointer-events-auto rounded-full px-4 sm:px-5 py-2 sm:py-2.5 max-w-md flex items-center justify-center transition-all shadow-[0_12px_36px_rgba(0,0,0,0.15)] ${
              islandState === "error"
                ? "bg-red-600 text-white"
                : islandState === "success"
                ? "bg-[#9FC131] text-black font-extrabold"
                : islandState === "loading"
                ? "bg-zinc-950 text-white"
                : "bg-white/85 dark:bg-[#121216]/85 backdrop-blur-2xl text-zinc-900 dark:text-white border border-zinc-200/80 dark:border-white/10"
            }`}
          >
            <AnimatePresence mode="wait">
              {islandState === "error" && (
                <motion.div
                  key="e"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-xs font-bold"
                >
                  <AlertTriangle size={15} />
                  {islandMessage}
                </motion.div>
              )}
              {islandState === "success" && (
                <motion.div
                  key="s"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-xs font-bold"
                >
                  <CheckCircle size={15} />
                  {islandMessage}
                </motion.div>
              )}
              {islandState === "loading" && (
                <motion.div
                  key="l"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2.5 text-xs font-bold"
                >
                  <Activity size={14} className="animate-spin opacity-80" />
                  {islandMessage || "Processando"}
                </motion.div>
              )}
              {islandState === "default" && (
                <motion.div
                  key="d"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3 sm:gap-4"
                >
                  <div className="flex gap-1.5 items-center">
                    {modulosAtivos
                      .filter((m) => m !== "concluido")
                      .map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            currentStepIndex === i
                              ? "w-5 bg-[#86a621] dark:bg-[#9FC131] shadow-[0_0_8px_rgba(159,193,49,0.7)]"
                              : currentStepIndex > i
                              ? "w-2 bg-zinc-900/40 dark:bg-white/40"
                              : "w-1.5 bg-zinc-300 dark:bg-white/10"
                          }`}
                        />
                      ))}
                  </div>
                  <div className="text-[10px] font-extrabold tracking-widest text-zinc-600 dark:text-zinc-300 border-l border-zinc-300 dark:border-zinc-700 pl-3 uppercase whitespace-nowrap">
                    {stepLabels[currentModuleKey] || currentModuleKey}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* CONTAINER PRINCIPAL */}
        <div className="w-full h-[100dvh] flex flex-col items-center justify-start md:justify-center p-0 md:p-8 md:pt-[76px] z-10 relative">
          
          {/* HEADER MOBILE COM LOGO E NOME DA CLÍNICA (EXIBIDO APENAS APÓS SAIR DE BOAS-VINDAS) */}
          <AnimatePresence>
            {!isBoasVindas && (
              <motion.div
                key="mobile-header"
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className="md:hidden w-full max-w-[860px] px-5 pt-3 pb-1 flex items-center justify-between z-20"
              >
                <div className="flex items-center gap-3">
                  {logoUrl ? (
                    <div
                      className={`${headerLogoShapeClass} overflow-hidden bg-white dark:bg-[#111116] border border-zinc-200/80 dark:border-white/10 flex items-center justify-center shadow-sm shrink-0`}
                    >
                      <img
                        src={logoUrl}
                        alt={empresaDados?.nome || "Clínica"}
                        className="w-full h-full object-cover select-none"
                      />
                    </div>
                  ) : (
                    <div className="w-11 h-11 rounded-2xl bg-zinc-950 dark:bg-white text-white dark:text-black flex items-center justify-center shadow-sm shrink-0 font-bold">
                      <Activity size={20} strokeWidth={2.2} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="font-black text-sm text-zinc-950 dark:text-white truncate block leading-tight">
                      {empresaDados?.nome || "Portal de Agendamento"}
                    </span>
                    <span className="text-[10px] font-bold text-[#86a621] dark:text-[#9FC131] uppercase tracking-widest block">
                      Agendamento Oficial
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            layout
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="w-full max-w-[860px] flex-1 md:flex-none md:h-[85vh] md:max-h-[780px] bg-white/90 dark:bg-[#0a0a0d]/90 backdrop-blur-3xl saturate-150 md:rounded-[36px] border-0 md:border border-zinc-200/80 dark:border-white/[0.08] flex flex-col overflow-hidden md:shadow-[0_30px_90px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.85)] dark:md:shadow-[0_30px_90px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.06)] relative"
          >
            {/* DESKTOP HEADER ACTION BAR */}
            {showActionButtons && (
              <div className="hidden md:flex flex-none items-center justify-between px-8 py-3.5 border-b border-zinc-200/70 dark:border-white/[0.06] bg-white/70 dark:bg-[#0a0a0d]/70 backdrop-blur-2xl z-20">
                <div className="flex items-center gap-4">
                  {currentStepIndex > minStepIndex || isEspecialidadeSubStep ? (
                    <button
                      onClick={handleGoBack}
                      className="min-h-[40px] px-3.5 flex items-center gap-1.5 text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white text-xs font-bold transition-colors rounded-xl bg-zinc-100/60 dark:bg-white/[0.04] border border-zinc-200/60 dark:border-white/[0.08] cursor-pointer"
                    >
                      <ChevronLeft size={16} strokeWidth={2.5} /> {backButtonLabel}
                    </button>
                  ) : null}

                  <div className="flex items-center gap-2.5 pl-2 border-l border-zinc-200/80 dark:border-white/10">
                    <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate max-w-[220px]">
                      {empresaDados?.nome}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end">
                  {currentModuleKey !== "checkout" &&
                  !(
                    currentModuleKey === "especialidade" &&
                    ((flags.exibirConfUri && !flags.confirmouUri) || selectedSrv?.redirecionar_whatsapp || selectedSrv?.status_agendamento === "whatsapp")
                  ) ? (
                    <motion.button
                      whileHover={
                        isModuleValid(currentModuleKey) && !loading
                          ? { scale: 1.02 }
                          : {}
                      }
                      whileTap={
                        isModuleValid(currentModuleKey) && !loading
                          ? { scale: 0.96 }
                          : {}
                      }
                      onClick={() => {
                        playDopamineSound("click");
                        nextStep();
                      }}
                      disabled={loading || !isModuleValid(currentModuleKey)}
                      className={`min-h-[44px] font-extrabold text-xs px-6 py-2.5 rounded-full flex items-center justify-center gap-2 transition-all duration-300 shadow-md whitespace-nowrap cursor-pointer ${
                        isModuleValid(currentModuleKey)
                          ? "bg-zinc-950 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black shadow-zinc-900/20"
                          : "bg-zinc-200/80 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 opacity-60 cursor-not-allowed"
                      }`}
                    >
                      {loading
                        ? "Processando..."
                        : currentModuleKey === "agenda" &&
                          (formData.modalidade === "Convênio" ||
                            formData.tipo_servico === "Retorno")
                        ? "Finalizar Agendamento"
                        : "Continuar"}
                      {!loading && <ArrowRight size={14} strokeWidth={2.5} />}
                    </motion.button>
                  ) : (
                    <div />
                  )}
                </div>
              </div>
            )}

            {/* ÁREA DE CONTEÚDO COM ESPAÇAMENTO REFINADO PARA O DYNAMIC ISLAND */}
            <div
              ref={contentContainerRef}
              className={`flex-1 overflow-y-auto custom-scrollbar px-5 ${
                isBoasVindas
                  ? "pt-14 sm:pt-16 pb-[84px] sm:pb-24 flex flex-col"
                  : isConcluido
                  ? "pt-16 pb-28"
                  : "pt-[124px] sm:pt-[130px] pb-44"
              } md:p-8 md:pb-10 overscroll-contain`}
            >
              <AnimatePresence mode="wait" initial={false}>
                {CurrentComponent ? (
                  <motion.div
                    key={currentModuleKey}
                    initial={{ opacity: 0, x: 18, filter: "blur(4px)" }}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, x: -14, filter: "blur(4px)" }}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  >
                    <CurrentComponent />
                  </motion.div>
                ) : (
                  <div>Módulo indisponível</div>
                )}
              </AnimatePresence>
            </div>

            {/* BARRA DE AÇÕES FIXADA NA BASE DA TELA NO CELULAR */}
            {showActionButtons && (
              <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-5 py-3.5 bg-white/85 dark:bg-[#0a0a0d]/90 backdrop-blur-3xl saturate-150 border-t border-zinc-200/80 dark:border-white/[0.08] flex items-center justify-between shadow-[0_-10px_30px_rgba(0,0,0,0.08)]">
                <div>
                  {currentStepIndex > minStepIndex || isEspecialidadeSubStep ? (
                    <button
                      onClick={handleGoBack}
                      className="min-h-[46px] px-4 flex items-center gap-1.5 text-zinc-700 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white text-xs font-bold transition-colors rounded-xl bg-zinc-100/80 dark:bg-white/[0.06] border border-zinc-200/60 dark:border-white/[0.08] cursor-pointer"
                    >
                      <ChevronLeft size={16} strokeWidth={2.5} /> {backButtonLabel}
                    </button>
                  ) : (
                    <div />
                  )}
                </div>

                <div>
                  {currentModuleKey !== "checkout" &&
                  !(
                    currentModuleKey === "especialidade" &&
                    ((flags.exibirConfUri && !flags.confirmouUri) || selectedSrv?.redirecionar_whatsapp || selectedSrv?.status_agendamento === "whatsapp")
                  ) ? (
                    <motion.button
                      whileTap={
                        isModuleValid(currentModuleKey) && !loading
                          ? { scale: 0.96 }
                          : {}
                      }
                      onClick={() => {
                        playDopamineSound("click");
                        nextStep();
                      }}
                      disabled={loading || !isModuleValid(currentModuleKey)}
                      className={`min-h-[46px] font-extrabold text-xs px-7 py-3 rounded-full flex items-center justify-center gap-2 transition-all shadow-md whitespace-nowrap cursor-pointer ${
                        isModuleValid(currentModuleKey)
                          ? "bg-zinc-950 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black shadow-zinc-900/20"
                          : "bg-zinc-200/80 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 opacity-60 cursor-not-allowed"
                      }`}
                    >
                      {loading
                        ? "Processando..."
                        : currentModuleKey === "agenda" &&
                          (formData.modalidade === "Convênio" ||
                            formData.tipo_servico === "Retorno")
                        ? "Finalizar Agendamento"
                        : "Continuar"}
                      {!loading && <ArrowRight size={14} strokeWidth={2.5} />}
                    </motion.button>
                  ) : (
                    <div />
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* NAVBAR COM POSICIONAMENTO DINÂMICO CONTEXTUAL */}
        <Navbar hasBottomBar={showActionButtons} />
      </AgendamentoContext.Provider>
    );
  }

export default function AgendamentoPremium() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  return (
    <div className="flex min-h-[100dvh] w-full bg-[#F8FAFC] dark:bg-[#060A12] text-zinc-900 dark:text-zinc-50 transition-colors duration-400 font-sans antialiased">
      <SidebarPremium isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />
      <main
        className={`flex-1 relative flex flex-col items-center transition-[margin] duration-500 ease-out w-full min-h-[100dvh] overflow-hidden ${
          isSidebarExpanded ? "md:ml-[240px]" : "md:ml-[68px]"
        }`}
      >
        <Suspense
          fallback={
            <div className="min-h-[100dvh] flex items-center justify-center w-full">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-8 h-8 border-[3px] border-[#9FC131] border-t-transparent rounded-full"
              />
            </div>
          }
        >
          <AgendamentoOrquestrador />
        </Suspense>
      </main>
    </div>
  );
}
