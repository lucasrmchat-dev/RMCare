import { bloqueioOcupaHorario } from "./medicalsysSituacao.js";

/**
 * Cálculo puro de ocupação da agenda de um dia (agenda compartilhada, durações e intervalos).
 * Reutilizado pelo fluxo de agendamento público e pela tela de confirmação/remarcação.
 * `ag` = agendamentos não cancelados do dia; `bl` = bloqueios_horarios do dia.
 */
export function calcularOcupacaoAgenda({ ag, bl, formData, regrasGlobais, selectedSrv, servicosDB, empresaDados }) {
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

  const normalizeText = (t) =>
    String(t || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const espNorm = normalizeText(formData.especialidade);
  const subNorm = normalizeText(formData.subtipo_exame);
  const profNorm = normalizeText(formData.medico_profissional);

  // 1. Identificar regras da agenda compartilhada que englobam a especialidade atual ou o médico selecionado
  const sharedRules = (regrasGlobais || []).filter((r) => {
    if (r.ativo === false) return false;
    if (r.servico_id && selectedSrv?.id && r.servico_id === selectedSrv.id) return true;

    const permitidos = (r.tipos_permitidos || []).map(normalizeText);
    const rEsp = normalizeText(r.especialidade);

    const matchQuery = (target) => {
      if (!target) return false;
      return (
        permitidos.some((p) => p === target || p.includes(target) || target.includes(p)) ||
        (rEsp && (rEsp === target || rEsp.includes(target) || target.includes(rEsp)))
      );
    };

    return matchQuery(espNorm) || matchQuery(subNorm);
  });

  // 2. Montar pool de todas as especialidades vinculadas à mesma agenda compartilhada
  const poolEspecialidades = new Set([
    espNorm,
    subNorm,
    ...sharedRules.flatMap((r) => [
      ...(r.tipos_permitidos || []).map(normalizeText),
      ...(r.especialidade ? r.especialidade.split(",").map(normalizeText) : [])
    ])
  ]);
  poolEspecialidades.delete("");

  const cleanPool = Array.from(poolEspecialidades);

  const matchesPool = (val) => {
    if (!val) return false;
    const n = normalizeText(val);
    if (!n) return false;
    return cleanPool.some((p) => p === n || n.includes(p) || p.includes(n));
  };

  const confEsps = empresaDados?.config_campos?.especialidades_categorizadas || [];

  const getDurationForAppointment = (itemEsp, itemSub) => {
    const iEsp = normalizeText(itemEsp);
    const iSub = normalizeText(itemSub);

    // 1. Especialidades categorizadas cadastradas na clínica (correspondência bidirecional)
    const found = confEsps.find((e) => {
      const n = normalizeText(e.nome);
      if (!n) return false;
      if (n === iEsp || n === iSub) return true;
      if (iSub && (n.includes(iSub) || iSub.includes(n))) return true;
      if (iEsp && (n.includes(iEsp) || iEsp.includes(n))) return true;
      return false;
    });
    if (found?.duracao_minutos && Number(found.duracao_minutos) > 0) {
      return Number(found.duracao_minutos);
    }

    // 2. Serviços / Corpo Clínico
    const foundSrv = (servicosDB || []).find((s) => {
      const sn = normalizeText(s.nome);
      const se = normalizeText(s.especialidade);
      if (sn && (sn === iSub || sn === iEsp || (iSub && (sn.includes(iSub) || iSub.includes(sn))))) return true;
      if (se && (se === iEsp || (iEsp && (se.includes(iEsp) || iEsp.includes(se))))) return true;
      return false;
    });
    if (foundSrv?.duracao_minutos && Number(foundSrv.duracao_minutos) > 0) {
      return Number(foundSrv.duracao_minutos);
    }

    // 3. Regra explícita da agenda compartilhada
    const ruleMatch = sharedRules.find((r) => r.duracao_slot_minutos > 0);
    if (ruleMatch) {
      return Number(ruleMatch.duracao_slot_minutos);
    }

    return 30;
  };

  const getIntervalForAppointment = (itemEsp, itemSub) => {
    const iEsp = normalizeText(itemEsp);
    const iSub = normalizeText(itemSub);

    const found = confEsps.find((e) => {
      const n = normalizeText(e.nome);
      if (!n) return false;
      if (n === iEsp || n === iSub) return true;
      if (iSub && (n.includes(iSub) || iSub.includes(n))) return true;
      if (iEsp && (n.includes(iEsp) || iEsp.includes(n))) return true;
      return false;
    });
    if (found?.intervalo_minutos !== undefined && found?.intervalo_minutos !== null && Number(found.intervalo_minutos) >= 0) {
      return Number(found.intervalo_minutos);
    }

    const ruleMatch = sharedRules.find((r) => r.intervalo_slot_minutos !== undefined && r.intervalo_slot_minutos !== null && Number(r.intervalo_slot_minutos) > 0);
    if (ruleMatch) {
      return Number(ruleMatch.intervalo_slot_minutos);
    }

    return Number(empresaDados?.config_campos?.intervalo_exames_padrao_minutos) || 0;
  };

  const duracaoPacienteAtual = getDurationForAppointment(formData.especialidade, formData.subtipo_exame);
  const intervaloPacienteAtual = getIntervalForAppointment(formData.especialidade, formData.subtipo_exame);

  const occupiedIntervals = [];
  const slots = [];

  (ag || []).forEach((a) => {
    const aProf = normalizeText(a.medico_profissional);
    const aSub = normalizeText(a.subtipo_exame);
    const aEsp = normalizeText(a.especialidade);

    const matchProf = profNorm && (aProf.includes(profNorm) || profNorm.includes(aProf));
    const matchShared = matchesPool(aEsp) || matchesPool(aSub) || matchesPool(a.tipo_servico);

    // Se o agendamento coincide com o médico ou com qualquer especialidade da agenda compartilhada
    if (matchProf || matchShared || (!profNorm && cleanPool.length === 0)) {
      const startMin = timeToMin(a.horario_agendamento);
      const dur = getDurationForAppointment(a.especialidade, a.subtipo_exame);
      const intervalo = getIntervalForAppointment(a.especialidade, a.subtipo_exame);
      // O intervalo ocupado inclui a duração do exame + o intervalo/buffer pós-procedimento
      const endMin = startMin + dur + intervalo;
      const formattedH = formatTime(a.horario_agendamento);
      occupiedIntervals.push({ startMin, endMin, hora: formattedH, duracao: dur, intervalo });
      slots.push(formattedH);
    }
  });

  (bl || []).filter(bloqueioOcupaHorario).forEach((b) => {
    const bProf = normalizeText(b.medico_profissional);
    const bEsp = normalizeText(b.especialidade);

    const matchProf =
      !b.medico_profissional ||
      b.medico_profissional === "Todos" ||
      (profNorm && (bProf.includes(profNorm) || profNorm.includes(bProf)));

    const matchShared = !b.especialidade || matchesPool(bEsp);

    if (matchProf || matchShared) {
      const startMin = timeToMin(b.horario);
      let dur = 0;
      if (b.horario_fim) {
        const fimMin = timeToMin(b.horario_fim);
        if (fimMin > startMin) dur = fimMin - startMin;
      }
      if (!dur || dur <= 0) {
        dur = getDurationForAppointment(b.especialidade, null);
      }
      const intervalo = getIntervalForAppointment(b.especialidade, null);
      const endMin = startMin + dur + intervalo;
      const formattedH = formatTime(b.horario);
      occupiedIntervals.push({ startMin, endMin, hora: formattedH, duracao: dur, intervalo });
      slots.push(formattedH);
    }
  });

  // Passo da grade de liberação dos horários (padrão de 15 em 15 minutos)
  const ruleMatchGrade = sharedRules.find((r) => r.passo_grade_minutos !== undefined && r.passo_grade_minutos !== null);
  const passoGrade = ruleMatchGrade?.passo_grade_minutos !== undefined
    ? Number(ruleMatchGrade.passo_grade_minutos)
    : Number(empresaDados?.config_campos?.passo_grade_liberacao_minutos) || 15;

  return {
    ocupados: [...new Set(slots)],
    occupiedIntervals,
    duracaoAtual: duracaoPacienteAtual,
    intervaloAtual: intervaloPacienteAtual,
    passoGrade,
    sharedPool: Array.from(poolEspecialidades)
  };
}

// Resolução inteligente do serviço/especialista selecionado (código URI, número, id ou nome aproximado)
export function resolverServicoSelecionado(formData, servicosDB = []) {
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
}
