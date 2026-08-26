"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Activity,
  Clock3,
  Check,
  Sun,
  Moon,
  Sparkles
} from "lucide-react";
import { useAgendamento } from "../context";
import { helpers, calcularDataLimite } from "../utils";
import { playDopamineSound, triggerHaptic } from "@/lib/dopamine";
import { SkeletonSlots } from "@/components/SkeletonLoaders";

export default function ModuleAgenda() {
  const {
    formData,
    setValue,
    calendarMonth,
    setCalendarMonth,
    selectedSrv,
    bloqueioExtraCalculado,
    agenda,
    timeSlotsRef,
    regrasGlobais,
    empresaDados
  } = useAgendamento();

  const getDiaSemana = (dataStr) => {
    if (!dataStr) return null;
    const [y, m, d] = dataStr.split("-").map(Number);
    return new Date(y, m - 1, d).getDay();
  };

  const diaSelecionado = getDiaSemana(formData.data_agendamento);

  const timeToMin = (tStr) => {
    if (!tStr) return 0;
    const parts = tStr.trim().split(":");
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || "0", 10);
  };

  const minToTime = (min) => {
    const h = Math.floor(min / 60)
      .toString()
      .padStart(2, "0");
    const m = (min % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
  };

  const normalizeText = (t) =>
    String(t || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  // Identificar termos da seleção atual do paciente
  const especialidadeStr = normalizeText(formData.especialidade);
  const subtipoStr = normalizeText(formData.subtipo_exame);
  const tipoServicoStr = normalizeText(formData.tipo_servico);
  const modalidadeStr = normalizeText(formData.modalidade);

  // Validação estrita se a regra atende aos filtros de modalidade e tipo de atendimento da jornada
  const isRuleValidForCurrentSelection = (r) => {
    if (!r.tipos_permitidos || !Array.isArray(r.tipos_permitidos) || r.tipos_permitidos.length === 0) {
      return true;
    }

    const permitidos = r.tipos_permitidos.map(normalizeText).filter(Boolean);
    const isTodos = permitidos.includes("todos") || permitidos.includes("todas");

    // 1. Checagem de Tipo de Atendimento (Consulta vs Exame vs Retorno)
    const tipoRestrictions = permitidos.filter((p) => ["consulta", "exame", "retorno"].includes(p));
    if (tipoRestrictions.length > 0 && !isTodos) {
      const matchTipo = tipoRestrictions.some((t) => {
        if (t === "consulta" && tipoServicoStr === "consulta") return true;
        if (t === "exame" && tipoServicoStr === "exame") return true;
        if (t === "retorno" && tipoServicoStr === "retorno") return true;
        return false;
      });
      if (!matchTipo) return false;
    }

    // 2. Checagem de Modalidade de Cobertura / Pagamento (Particular vs Convênio)
    const modalidadeRestrictions = permitidos.filter((p) => ["particular", "convenio"].includes(p));
    if (modalidadeRestrictions.length > 0 && !isTodos) {
      const matchMod = modalidadeRestrictions.some((m) => {
        if (m === "particular" && modalidadeStr === "particular") return true;
        if (m === "convenio" && (modalidadeStr === "convenio" || modalidadeStr.includes("conv"))) return true;
        return false;
      });
      if (!matchMod) return false;
    }

    return true;
  };

  const rMedico = (regrasGlobais || []).filter(
    (r) => r.servico_id && r.servico_id === selectedSrv?.id && r.ativo !== false && isRuleValidForCurrentSelection(r)
  );

  const rEspecialidade = (regrasGlobais || []).filter((r) => {
    if (r.servico_id || r.ativo === false) return false;
    if (!isRuleValidForCurrentSelection(r)) return false;

    const permitidos = (r.tipos_permitidos || []).map(normalizeText);
    const rEsp = normalizeText(r.especialidade);
    return (
      (especialidadeStr &&
        (permitidos.some((p) => p === especialidadeStr || p.includes(especialidadeStr) || especialidadeStr.includes(p)) ||
          rEsp === especialidadeStr ||
          rEsp.includes(especialidadeStr) ||
          especialidadeStr.includes(rEsp))) ||
      (subtipoStr &&
        (permitidos.some((p) => p === subtipoStr || p.includes(subtipoStr) || subtipoStr.includes(p)) ||
          rEsp === subtipoStr ||
          rEsp.includes(subtipoStr) ||
          subtipoStr.includes(rEsp)))
    );
  });

  const rGeral = (regrasGlobais || []).filter((r) => {
    if (r.servico_id || r.ativo === false) return false;
    if (r.especialidade && r.especialidade !== "Todas") return false;
    const permitidos = (r.tipos_permitidos || []).map(normalizeText);
    const hasEspTokens = permitidos.some((p) => !["consulta", "exame", "retorno", "particular", "convenio", "todos", "todas"].includes(p));
    if (hasEspTokens) return false;
    return isRuleValidForCurrentSelection(r);
  });

  const aplicarBloqueioTemporario = (limite) => {
    if (!selectedSrv?.agendamento_bloqueado_ate) return limite;
    const bloqueadoAte = new Date(`${selectedSrv.agendamento_bloqueado_ate}T12:00:00`);
    bloqueadoAte.setDate(bloqueadoAte.getDate() + 1);
    return bloqueadoAte > limite ? bloqueadoAte : limite;
  };

  // Regra de interseção estrita (Conjunto Menor / Mais Restritivo):
  // Se médico E especialidade têm regras, o dia e horário devem ser permitidos por AMBOS.
  const isDiaPermitidoPelasRegras = (dataStr) => {
    const diaWeek = getDiaSemana(dataStr);

    const medicoRulesToday = rMedico.filter((r) =>
      (r.dias_semana || []).map((d) => parseInt(d, 10)).includes(diaWeek)
    );
    const espRulesToday = rEspecialidade.filter((r) =>
      (r.dias_semana || []).map((d) => parseInt(d, 10)).includes(diaWeek)
    );
    const geralRulesToday = rGeral.filter((r) =>
      (r.dias_semana || []).map((d) => parseInt(d, 10)).includes(diaWeek)
    );

    // Caso 1: Ambos têm regras cadastradas -> INTERSEÇÃO (Conjunto Menor)
    if (rMedico.length > 0 && rEspecialidade.length > 0) {
      if (medicoRulesToday.length === 0 || espRulesToday.length === 0) return false;
      // Verifica se há pelo menos um par de janelas que se sobrepõe
      return medicoRulesToday.some((dr) =>
        espRulesToday.some((sr) => {
          const s = Math.max(timeToMin(dr.hora_inicio), timeToMin(sr.hora_inicio));
          const e = Math.min(timeToMin(dr.hora_fim), timeToMin(sr.hora_fim));
          return s < e;
        })
      );
    }

    // Caso 2: Apenas o médico tem regra específica
    if (rMedico.length > 0) {
      return medicoRulesToday.length > 0;
    }

    // Caso 3: Apenas a especialidade/grupo compartilhado tem regra
    if (rEspecialidade.length > 0) {
      return espRulesToday.length > 0;
    }

    // Caso 4: Regra geral da clínica
    if (rGeral.length > 0) {
      return geralRulesToday.length > 0;
    }

    // Fallback padrão: Segunda a Sexta
    return [1, 2, 3, 4, 5].includes(diaWeek);
  };

  const lastEvaluatedSrvId = useRef("uninitialized");

  useEffect(() => {
    if (!regrasGlobais) return;
    if (formData.medico_profissional && !selectedSrv) return;

    const currentSrvId = selectedSrv?.id || formData.especialidade || null;
    if (lastEvaluatedSrvId.current === currentSrvId) return;

    const hoje = new Date();
    const minDiasBloqueio = formData.tipo_servico === "Exame" ? 1 : 0;
    const diasBloqueioPadrao = Math.max(selectedSrv?.dias_bloqueio_padrao || 0, minDiasBloqueio);
    const dataSrv = calcularDataLimite(
      hoje,
      diasBloqueioPadrao,
      selectedSrv?.tipo_contagem_dias || "corridos"
    );
    const limiteBase =
      !bloqueioExtraCalculado || dataSrv > bloqueioExtraCalculado
        ? dataSrv
        : bloqueioExtraCalculado;
    const limiteFinalData = aplicarBloqueioTemporario(limiteBase);

    const limiteMidnight = new Date(
      limiteFinalData.getFullYear(),
      limiteFinalData.getMonth(),
      limiteFinalData.getDate()
    );
    let hasAvailableDayInCurrentMonth = false;
    const daysInCurrentMonth = new Date(
      hoje.getFullYear(),
      hoje.getMonth() + 1,
      0
    ).getDate();

    for (let d = hoje.getDate(); d <= daysInCurrentMonth; d++) {
      const dateStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d).padStart(2, "0")}`;
      const cellDate = new Date(hoje.getFullYear(), hoje.getMonth(), d);
      const isPastOrBlocked = cellDate < limiteMidnight || !isDiaPermitidoPelasRegras(dateStr);
      if (!isPastOrBlocked) {
        hasAvailableDayInCurrentMonth = true;
        break;
      }
    }

    if (!hasAvailableDayInCurrentMonth) {
      setCalendarMonth(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1));
    } else {
      setCalendarMonth(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
    }
    lastEvaluatedSrvId.current = currentSrvId;
  }, [
    selectedSrv,
    formData.medico_profissional,
    formData.especialidade,
    regrasGlobais,
    bloqueioExtraCalculado,
    formData.tipo_servico,
    formData.modalidade
  ]);

  // GERAÇÃO DINÂMICA DE HORÁRIOS COM SUPORTE A DURAÇÕES VARIÁVEIS E AGENDA COMPARTILHADA
  const gerarSlotsDinamicos = (
    startStr,
    endStr,
    duracaoMinutos,
    customLastAllowed,
    intervals = []
  ) => {
    let slots = [];
    if (!startStr || !endStr) return slots;

    const startMin = timeToMin(startStr);
    const endMin = timeToMin(endStr);
    const dur = Math.max(parseInt(duracaoMinutos, 10) || 30, 10);

    let lastAllowedMin = endMin - dur;
    if (customLastAllowed) {
      const customMin = timeToMin(customLastAllowed);
      if (customMin > 0) {
        lastAllowedMin = Math.min(lastAllowedMin, customMin);
      }
    }

    const candidatePoints = new Set();
    const step = dur <= 15 ? 15 : 10;

    for (let m = startMin; m <= lastAllowedMin; m += step) {
      candidatePoints.add(m);
    }

    intervals.forEach((iv) => {
      if (iv.endMin >= startMin && iv.endMin <= lastAllowedMin) {
        candidatePoints.add(iv.endMin);
      }
    });

    const sortedCandidates = Array.from(candidatePoints).sort((a, b) => a - b);

    sortedCandidates.forEach((m) => {
      if (m < startMin || m > lastAllowedMin || m + dur > endMin) return;

      const hasCollision = intervals.some((iv) => {
        return Math.max(m, iv.startMin) < Math.min(m + dur, iv.endMin);
      });

      slots.push({
        h: minToTime(m),
        isOccupied: hasCollision
      });
    });

    return slots;
  };

  let slotsRender = [];
  let ocupacaoSeqAtiva = false;

  if (formData.data_agendamento) {
    let slotsGerados = [];
    const intervals = agenda?.occupiedIntervals || [];

    const medicoRulesToday = rMedico.filter((r) =>
      (r.dias_semana || []).map((d) => parseInt(d, 10)).includes(diaSelecionado)
    );
    const espRulesToday = rEspecialidade.filter((r) =>
      (r.dias_semana || []).map((d) => parseInt(d, 10)).includes(diaSelecionado)
    );
    const geralRulesToday = rGeral.filter((r) =>
      (r.dias_semana || []).map((d) => parseInt(d, 10)).includes(diaSelecionado)
    );

    // Lista de janelas de tempo efetivas calculadas pela interseção
    const janelasEfetivas = [];

    if (rMedico.length > 0 && rEspecialidade.length > 0) {
      // Interseção entre as regras do médico e da especialidade (Conjunto Menor)
      medicoRulesToday.forEach((dr) => {
        espRulesToday.forEach((sr) => {
          const sMin = Math.max(timeToMin(dr.hora_inicio), timeToMin(sr.hora_inicio));
          const eMin = Math.min(timeToMin(dr.hora_fim), timeToMin(sr.hora_fim));

          if (sMin < eMin) {
            const drLast = dr.ultimo_horario_agendamento ? timeToMin(dr.ultimo_horario_agendamento) : null;
            const srLast = sr.ultimo_horario_agendamento ? timeToMin(sr.ultimo_horario_agendamento) : null;
            let effLast = null;
            if (drLast !== null && srLast !== null) effLast = Math.min(drLast, srLast);
            else if (srLast !== null) effLast = srLast;
            else if (drLast !== null) effLast = drLast;

            const durSlot =
              sr.duracao_slot_minutos > 0
                ? sr.duracao_slot_minutos
                : dr.duracao_slot_minutos > 0
                ? dr.duracao_slot_minutos
                : agenda?.duracaoAtual || 30;

            const isSeq = Boolean(dr.ocupacao_sequencial || sr.ocupacao_sequencial);

            janelasEfetivas.push({
              startStr: minToTime(sMin),
              endStr: minToTime(eMin),
              duracao: durSlot,
              ultimoHorario: effLast ? minToTime(effLast) : null,
              ocupacaoSequencial: isSeq
            });
          }
        });
      });
    } else if (rMedico.length > 0) {
      medicoRulesToday.forEach((dr) => {
        janelasEfetivas.push({
          startStr: dr.hora_inicio,
          endStr: dr.hora_fim,
          duracao: dr.duracao_slot_minutos > 0 ? dr.duracao_slot_minutos : agenda?.duracaoAtual || 30,
          ultimoHorario: dr.ultimo_horario_agendamento || null,
          ocupacaoSequencial: Boolean(dr.ocupacao_sequencial)
        });
      });
    } else if (rEspecialidade.length > 0) {
      espRulesToday.forEach((sr) => {
        janelasEfetivas.push({
          startStr: sr.hora_inicio,
          endStr: sr.hora_fim,
          duracao: sr.duracao_slot_minutos > 0 ? sr.duracao_slot_minutos : agenda?.duracaoAtual || 30,
          ultimoHorario: sr.ultimo_horario_agendamento || null,
          ocupacaoSequencial: Boolean(sr.ocupacao_sequencial)
        });
      });
    } else if (geralRulesToday.length > 0) {
      geralRulesToday.forEach((gr) => {
        janelasEfetivas.push({
          startStr: gr.hora_inicio,
          endStr: gr.hora_fim,
          duracao: gr.duracao_slot_minutos > 0 ? gr.duracao_slot_minutos : agenda?.duracaoAtual || 30,
          ultimoHorario: gr.ultimo_horario_agendamento || null,
          ocupacaoSequencial: Boolean(gr.ocupacao_sequencial)
        });
      });
    } else {
      let duracaoFallback = 40;
      if (formData.tipo_servico === "Retorno" || formData.modalidade === "Convênio")
        duracaoFallback = 20;
      janelasEfetivas.push(
        { startStr: "08:00", endStr: "12:00", duracao: duracaoFallback, ultimoHorario: null, ocupacaoSequencial: false },
        { startStr: "14:00", endStr: "18:00", duracao: duracaoFallback, ultimoHorario: null, ocupacaoSequencial: false }
      );
    }

    janelasEfetivas.forEach((j) => {
      const gerados = gerarSlotsDinamicos(
        j.startStr,
        j.endStr,
        j.duracao,
        j.ultimoHorario,
        intervals
      );
      slotsGerados.push(...gerados);
      if (j.ocupacaoSequencial) ocupacaoSeqAtiva = true;
    });

    const mapSlots = new Map();
    slotsGerados.forEach((item) => {
      if (!mapSlots.has(item.h) || (mapSlots.get(item.h).isOccupied && !item.isOccupied)) {
        mapSlots.set(item.h, item);
      }
    });

    const uniqueSlots = Array.from(mapSlots.values()).sort((a, b) => a.h.localeCompare(b.h));
    let encontrouPrimeiroLivre = false;

    slotsRender = uniqueSlots.map(({ h, isOccupied }) => {
      const isPastTime =
        formData.data_agendamento === helpers.getToday() &&
        new Date().setHours(...h.split(":"), 0, 0) <=
          (agenda.agora || 0) + 1800000;

      let off = isPastTime || isOccupied;

      if (ocupacaoSeqAtiva) {
        if (!off) {
          if (encontrouPrimeiroLivre) {
            off = true;
          } else {
            encontrouPrimeiroLivre = true;
          }
        }
      }
      return { h, off, isOccupied };
    });
  }

  const handleDateClick = (dateStr) => {
    playDopamineSound("select");
    triggerHaptic("light");
    if (formData.data_agendamento !== dateStr) setValue("horario_agendamento", "");
    setValue("data_agendamento", dateStr);

    setTimeout(() => {
      if (timeSlotsRef?.current) {
        timeSlotsRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest"
        });
      }
    }, 120);
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      exit="exit"
      variants={{
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.08 } },
        exit: { opacity: 0, y: -8 }
      }}
      className="max-w-4xl mx-auto text-left"
    >
      <motion.div
        variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
        className="mb-6 md:mb-8"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[11px] font-bold uppercase tracking-wider mb-2.5 shadow-sm">
          <CalendarIcon size={13} strokeWidth={2} /> Agenda em Tempo Real
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-zinc-950 dark:text-white leading-tight">
          Qual o melhor dia e horário para você?
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
          Selecione a data no calendário para carregar os horários disponíveis e confirmar sua vaga.
        </p>
        {selectedSrv?.agendamento_bloqueado_ate && (
          <p className="mt-3 text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3">
            Agenda liberada a partir de{" "}
            {new Date(
              `${selectedSrv.agendamento_bloqueado_ate}T12:00:00`
            ).toLocaleDateString("pt-BR")}
            {selectedSrv.motivo_bloqueio_agenda
              ? ` · ${selectedSrv.motivo_bloqueio_agenda}`
              : ""}
          </p>
        )}
      </motion.div>

      <motion.div
        variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }}
        className="flex flex-col md:flex-row gap-5 md:gap-8"
      >
        {/* CALENDÁRIO MENSAL */}
        <div className="w-full md:w-1/2 rounded-[2rem] border border-zinc-200/80 dark:border-white/10 p-5 md:p-6 bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => {
                playDopamineSound("click");
                setCalendarMonth(
                  new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)
                );
              }}
              aria-label="Mês anterior"
              className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
            </button>
            <h3 className="font-extrabold text-sm sm:text-base capitalize text-zinc-900 dark:text-white">
              {calendarMonth.toLocaleString("pt-BR", { month: "long", year: "numeric" })}
            </h3>
            <button
              onClick={() => {
                playDopamineSound("click");
                setCalendarMonth(
                  new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)
                );
              }}
              aria-label="Próximo mês"
              className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
            >
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-2.5">
            {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
              <div
                key={i}
                className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-wider"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5 md:gap-2">
            {Array.from({
              length: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay()
            }).map((_, i) => (
              <div key={`e-${i}`} className="aspect-square" />
            ))}
            {Array.from({
              length: new Date(
                calendarMonth.getFullYear(),
                calendarMonth.getMonth() + 1,
                0
              ).getDate()
            }).map((_, i) => {
              const d = i + 1,
                y = calendarMonth.getFullYear(),
                m = calendarMonth.getMonth();
              const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(
                2,
                "0"
              )}`;

              const minDiasBloqueio = formData.tipo_servico === "Exame" ? 1 : 0;
              const diasBloqueioPadrao = Math.max(
                selectedSrv?.dias_bloqueio_padrao || 0,
                minDiasBloqueio
              );
              const dataSrv = calcularDataLimite(
                new Date(),
                diasBloqueioPadrao,
                selectedSrv?.tipo_contagem_dias || "corridos"
              );
              const limiteBase =
                !bloqueioExtraCalculado || dataSrv > bloqueioExtraCalculado
                  ? dataSrv
                  : bloqueioExtraCalculado;
              const limiteFinalData = aplicarBloqueioTemporario(limiteBase);

              const limiteMidnight = new Date(
                limiteFinalData.getFullYear(),
                limiteFinalData.getMonth(),
                limiteFinalData.getDate()
              );
              const cellDate = new Date(y, m, d);

              const isPastOrBlocked =
                cellDate < limiteMidnight || !isDiaPermitidoPelasRegras(dateStr);
              const isSel = formData.data_agendamento === dateStr;

              return (
                <motion.button
                  whileTap={!isPastOrBlocked ? { scale: 0.9 } : {}}
                  key={d}
                  disabled={isPastOrBlocked}
                  onClick={() => handleDateClick(dateStr)}
                  className={`relative aspect-square rounded-2xl text-xs sm:text-sm transition-all duration-200 min-h-[40px] flex items-center justify-center cursor-pointer ${
                    isPastOrBlocked
                      ? "opacity-20 cursor-not-allowed text-zinc-400 dark:text-zinc-600"
                      : isSel
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-black font-black shadow-lg shadow-black/10 dark:shadow-white/10 ring-2 ring-[#9FC131] scale-105"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold"
                  }`}
                >
                  {d}
                  {isSel && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -right-1 -top-1 w-4 h-4 rounded-full bg-[#9FC131] text-black flex items-center justify-center shadow-sm"
                    >
                      <Check size={10} strokeWidth={3} />
                    </motion.span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* GRADE DE HORÁRIOS DISPONÍVEIS */}
        <div
          className="w-full md:w-1/2 rounded-[2rem] border border-zinc-200/80 dark:border-white/10 p-5 md:p-6 bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl shadow-sm flex flex-col justify-between scroll-mt-24"
          ref={timeSlotsRef}
        >
          {formData.data_agendamento ? (
            <div>
              <div className="flex justify-between items-center border-b border-zinc-200/80 dark:border-white/10 pb-4 mb-4">
                <h4 className="font-extrabold text-sm flex items-center gap-2 text-zinc-900 dark:text-white">
                  <Clock3 size={16} className="text-[#9FC131]" /> Horários Disponíveis
                </h4>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-bold capitalize bg-zinc-100 dark:bg-white/[0.06] px-2.5 py-1 rounded-full border border-zinc-200/60 dark:border-white/[0.06]">
                  {new Date(formData.data_agendamento + "T12:00:00").toLocaleDateString("pt-BR", {
                    weekday: "short",
                    day: "numeric",
                    month: "short"
                  })}
                </span>
              </div>

              {agenda.buscando ? (
                <div className="py-6">
                  <SkeletonSlots />
                </div>
              ) : slotsRender.length === 0 ? (
                <div className="py-12 text-center text-zinc-400 text-xs font-medium border border-dashed rounded-2xl border-zinc-200 dark:border-zinc-800 p-6">
                  Nenhum horário disponível para esta data. Selecione outro dia no calendário ao lado.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-[340px] overflow-y-auto custom-scrollbar pr-1 py-1">
                  {slotsRender.map(({ h, off }) => {
                    const isSel = formData.horario_agendamento === h;
                    return (
                      <motion.button
                        whileHover={!off ? { scale: 1.04 } : {}}
                        whileTap={!off ? { scale: 0.95 } : {}}
                        key={h}
                        disabled={off}
                        onClick={() => {
                          playDopamineSound("select");
                          triggerHaptic("medium");
                          setValue("horario_agendamento", h);
                        }}
                        className={`min-h-[48px] py-3 px-2 rounded-2xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                          off
                            ? "opacity-25 cursor-not-allowed bg-zinc-100 dark:bg-zinc-900 text-zinc-400 line-through"
                            : isSel
                            ? "bg-[#9FC131] text-black shadow-lg shadow-[#9FC131]/25 font-black ring-2 ring-[#9FC131] scale-105"
                            : "bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 hover:border-[#9FC131] text-zinc-800 dark:text-zinc-200"
                        }`}
                      >
                        {h}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-8 text-zinc-400">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-3 text-zinc-400">
                <CalendarIcon size={26} strokeWidth={1.5} />
              </div>
              <p className="text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-400 max-w-xs leading-relaxed">
                Selecione uma data no calendário para visualizar os horários de atendimento em tempo real.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
