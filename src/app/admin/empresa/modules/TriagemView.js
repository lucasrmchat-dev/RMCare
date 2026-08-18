"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Trash2,
  ClipboardCheck,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  HeartPulse,
  Tag
} from "lucide-react";
import {
  fadeUp,
  staggerContainer,
  staggerItem,
  TextInput,
  CustomSelect,
  ButtonPrimary,
  ToggleSwitch
} from "../components/SharedUI";
import {
  actionSalvarTriagem,
  actionDeletarTriagem,
  fetchAdminCustomization,
  actionSalvarCatalogoEnfermidades
} from "@/actions/adminData";

export default function TriagemView({
  perguntas = [],
  servicos = [],
  fetchPerguntas,
  showToast
}) {
  const [isAddingTriagem, setIsAddingTriagem] = useState(false);
  const [novaTriagem, setNovaTriagem] = useState({
    especialidade: "Todas",
    obrigatoria: true,
    pergunta: "",
    opcoes: []
  });
  const [novaOpcao, setNovaOpcao] = useState({
    texto_opcao: "",
    regra_bloqueio_dias: 0,
    tipo_contagem_dias: "corridos"
  });
  const [loading, setLoading] = useState(false);

  // Catálogo Geral de Enfermidades
  const [catalogoEnfermidades, setCatalogoEnfermidades] = useState([
    "Refluxo",
    "Gastrite",
    "Hipertensão",
    "Diabetes",
    "Doença Celíaca",
    "Hérnia de Hiato",
    "Esteatose Hepática",
    "Síndrome do Intestino Irritável"
  ]);
  const [novaEnfermidade, setNovaEnfermidade] = useState("");

  useEffect(() => {
    const carregarConfig = async () => {
      try {
        const emp = await fetchAdminCustomization();
        if (emp?.config_campos?.catalogo_enfermidades) {
          setCatalogoEnfermidades(emp.config_campos.catalogo_enfermidades);
        }
      } catch (err) {
        console.error("Erro ao carregar catálogo de enfermidades:", err);
      }
    };
    carregarConfig();
  }, []);

  const handleAddEnfermidade = async () => {
    const limpo = novaEnfermidade.trim();
    if (!limpo) return;
    if (catalogoEnfermidades.some((e) => e.toLowerCase() === limpo.toLowerCase())) {
      showToast("Esta enfermidade já está no catálogo.", "error");
      return;
    }
    const novoCatalogo = [...catalogoEnfermidades, limpo];
    setCatalogoEnfermidades(novoCatalogo);
    setNovaEnfermidade("");
    try {
      await actionSalvarCatalogoEnfermidades(novoCatalogo);
      showToast(`Enfermidade "${limpo}" cadastrada no catálogo!`);
    } catch (e) {
      showToast("Erro ao salvar catálogo.", "error");
    }
  };

  const handleRemoveEnfermidade = async (item) => {
    if (!window.confirm(`Excluir "${item}" do catálogo de enfermidades?`)) return;
    const novoCatalogo = catalogoEnfermidades.filter((e) => e !== item);
    setCatalogoEnfermidades(novoCatalogo);
    try {
      await actionSalvarCatalogoEnfermidades(novoCatalogo);
      showToast(`"${item}" removido do catálogo.`);
    } catch (e) {
      showToast("Erro ao atualizar catálogo.", "error");
    }
  };

  // Lista de especialidades únicas derivadas dos serviços da clínica e procedimentos médicos
  const especialidadesDisponiveis = useMemo(() => {
    const unicas = (servicos || [])
      .filter((s) => s.especialidade)
      .flatMap((s) => s.especialidade.split(",").map((e) => e.trim()));

    const base = [
      "Colonoscopia",
      "Endoscopia",
      "Gastroenterologia",
      "Cirurgia Geral",
      "Clínico Geral",
      "Psicologia",
      ...unicas
    ];

    return [...new Set(base)].filter(Boolean).sort();
  }, [servicos]);

  const especialidadesOptions = useMemo(
    () => [
      { value: "Todas", label: "Todas as Especialidades (Geral)" },
      ...especialidadesDisponiveis.map((e) => ({ value: e, label: e }))
    ],
    [especialidadesDisponiveis]
  );

  const adicionarOpcaoLocal = () => {
    if (!novaOpcao.texto_opcao.trim())
      return showToast("Digite um texto para a opção", "error");
    setNovaTriagem((p) => ({
      ...p,
      opcoes: [
        ...p.opcoes,
        { ...novaOpcao, texto_opcao: novaOpcao.texto_opcao.trim(), id: Date.now() }
      ]
    }));
    setNovaOpcao({
      texto_opcao: "",
      regra_bloqueio_dias: 0,
      tipo_contagem_dias: "corridos"
    });
  };

  const removerOpcaoLocal = (id) => {
    setNovaTriagem((p) => ({ ...p, opcoes: p.opcoes.filter((o) => o.id !== id) }));
  };

  const salvarNovaTriagem = async () => {
    if (!novaTriagem.pergunta.trim() || novaTriagem.opcoes.length === 0) {
      return showToast(
        "Preencha a pergunta e adicione pelo menos uma opção de resposta.",
        "error"
      );
    }
    setLoading(true);

    try {
      const res = await actionSalvarTriagem(novaTriagem);
      if (res && res.success === false) {
        showToast(res.error || "Erro ao salvar pergunta.", "error");
        setLoading(false);
        return;
      }
      showToast("Pergunta clínica cadastrada com sucesso!");
      setIsAddingTriagem(false);
      setNovaTriagem({
        especialidade: "Todas",
        obrigatoria: true,
        pergunta: "",
        opcoes: []
      });
      if (typeof fetchPerguntas === "function") fetchPerguntas();
    } catch (error) {
      showToast(`Erro ao salvar: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const apagarTriagem = async (id) => {
    if (window.confirm("Deseja realmente apagar esta pergunta clínica?")) {
      try {
        await actionDeletarTriagem(id);
        if (typeof fetchPerguntas === "function") fetchPerguntas();
        showToast("Pergunta removida.");
      } catch (error) {
        showToast("Erro ao remover pergunta.", "error");
      }
    }
  };

  return (
    <motion.div
      key="triagem"
      {...fadeUp}
      className="p-4 md:p-8 mx-auto w-full max-w-6xl overflow-y-auto h-full custom-scrollbar pb-32 space-y-8"
    >
      {/* CABEÇALHO UNIFICADO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm">
            <ClipboardCheck size={20} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight">
              Protocolos Clínicos & Enfermidades
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Configure perguntas pré-atendimento por especialidade e gerencie o catálogo de enfermidades da clínica.
            </p>
          </div>
        </div>

        {!isAddingTriagem && (
          <ButtonPrimary
            onClick={() => setIsAddingTriagem(true)}
            icon={Plus}
            className="px-5 py-2 text-xs min-h-[38px] rounded-xl"
          >
            Nova Pergunta Clínica
          </ButtonPrimary>
        )}
      </div>

      {/* SEÇÃO 1: CATÁLOGO GERAL DE ENFERMIDADES */}
      <section className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 md:p-8 rounded-[2rem] shadow-sm space-y-5">
        <div className="border-b border-zinc-100 dark:border-white/5 pb-3">
          <h3 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
            <HeartPulse size={18} className="text-rose-500" strokeWidth={1.5} /> Catálogo de Enfermidades & Condições Clínicas
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Cadastre as condições clínicas mais frequentes (ex: Refluxo, Gastrite, Hipertensão). Elas podem ser vinculadas aos pacientes na agenda e usadas para segmentação de mensagens no WhatsApp.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={novaEnfermidade}
            onChange={(e) => setNovaEnfermidade(e.target.value)}
            placeholder="Ex: Refluxo Gastroesofágico, Gastrite, Diabetes, Hérnia de Hiato..."
            className="flex-1 px-4 py-2.5 bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-[#9FC131]"
            onKeyDown={(e) => e.key === "Enter" && handleAddEnfermidade()}
          />
          <ButtonPrimary
            onClick={handleAddEnfermidade}
            disabled={!novaEnfermidade.trim()}
            icon={Plus}
            className="px-5 py-2.5 text-xs min-h-[38px] rounded-xl"
          >
            Adicionar ao Catálogo
          </ButtonPrimary>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {catalogoEnfermidades.map((enf) => (
            <div
              key={enf}
              className="px-3.5 py-1.5 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 rounded-xl text-xs font-bold text-rose-900 dark:text-rose-200 flex items-center gap-2 shadow-sm"
            >
              <HeartPulse size={12} className="text-rose-500" />
              <span>{enf}</span>
              <button
                onClick={() => handleRemoveEnfermidade(enf)}
                className="text-rose-400 hover:text-rose-700 dark:hover:text-rose-100 transition-colors p-0.5"
                title={`Excluir "${enf}" do catálogo`}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* FORMULÁRIO DE NOVA PERGUNTA */}
      <AnimatePresence>
        {isAddingTriagem && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="bg-white dark:bg-[#0c0c0e] border border-zinc-200/80 dark:border-white/10 p-6 md:p-8 rounded-[2rem] shadow-xl space-y-6"
          >
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-white/5 pb-4">
              <div>
                <h3 className="font-bold text-lg text-zinc-950 dark:text-white">
                  Nova Pergunta Clínica
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Defina a especialidade médica e se a resposta é mandatória.
                </p>
              </div>
              <button
                onClick={() => setIsAddingTriagem(false)}
                className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-red-500 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <CustomSelect
                  label="Especialidade / Procedimento Alvo"
                  value={novaTriagem.especialidade}
                  onChange={(val) => setNovaTriagem({ ...novaTriagem, especialidade: val })}
                  options={especialidadesOptions}
                />
                <p className="text-[11px] text-zinc-400 ml-1">
                  Apresentada aos pacientes que agendarem esta especialidade.
                </p>
              </div>

              <div className="space-y-2 p-4 bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                    Exigência de Resposta
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {novaTriagem.obrigatoria
                      ? "O paciente é obrigado a responder antes de escolher a data/horário."
                      : "O paciente pode optar por responder ou continuar sem responder."}
                  </p>
                </div>
                <ToggleSwitch
                  checked={novaTriagem.obrigatoria}
                  onChange={(v) => setNovaTriagem({ ...novaTriagem, obrigatoria: v })}
                  label={
                    novaTriagem.obrigatoria
                      ? "Pergunta Obrigatória"
                      : "Pergunta Opcional"
                  }
                />
              </div>

              <div className="md:col-span-2">
                <TextInput
                  label="Pergunta apresentada ao paciente"
                  placeholder="Ex.: Fez uso de caneta emagrecedora nos últimos 15 dias?"
                  value={novaTriagem.pergunta}
                  onChange={(e) => setNovaTriagem({ ...novaTriagem, pergunta: e.target.value })}
                />
              </div>
            </div>

            {/* OPÇÕES DE RESPOSTA */}
            <div className="bg-zinc-50/70 dark:bg-zinc-900/60 p-5 border border-zinc-200/60 dark:border-zinc-800 rounded-2xl space-y-4">
              <h4 className="text-xs font-bold uppercase text-zinc-400 tracking-wider ml-1">
                Opções de Resposta e Bloqueio de Dias
              </h4>

              <div className="flex flex-col lg:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                  <TextInput
                    label="Texto da Opção"
                    placeholder="Ex: Sim, usei recentemente"
                    value={novaOpcao.texto_opcao}
                    onChange={(e) => setNovaOpcao({ ...novaOpcao, texto_opcao: e.target.value })}
                  />
                </div>
                <div className="w-full lg:w-36">
                  <TextInput
                    label="Bloqueio (Dias)"
                    type="number"
                    value={novaOpcao.regra_bloqueio_dias}
                    onChange={(e) =>
                      setNovaOpcao({ ...novaOpcao, regra_bloqueio_dias: e.target.value })
                    }
                  />
                </div>
                <div className="w-full lg:w-44">
                  <CustomSelect
                    label="Contagem"
                    value={novaOpcao.tipo_contagem_dias}
                    onChange={(val) => setNovaOpcao({ ...novaOpcao, tipo_contagem_dias: val })}
                    options={[
                      { value: "corridos", label: "Dias Corridos" },
                      { value: "uteis", label: "Dias Úteis" }
                    ]}
                  />
                </div>
                <button
                  type="button"
                  onClick={adicionarOpcaoLocal}
                  className="w-full lg:w-auto min-h-[46px] px-5 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-black transition-all shadow-sm shrink-0"
                >
                  <Plus size={16} /> Adicionar Opção
                </button>
              </div>

              {novaTriagem.opcoes.length > 0 && (
                <div className="mt-3 space-y-2">
                  {novaTriagem.opcoes.map((op) => (
                    <div
                      key={op.id}
                      className="flex justify-between items-center bg-white dark:bg-[#111] p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-zinc-900 dark:text-white text-xs">
                          {op.texto_opcao}
                        </span>
                        <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                          {Number(op.regra_bloqueio_dias) > 0
                            ? `Impede ${op.regra_bloqueio_dias} dias ${op.tipo_contagem_dias}`
                            : "Sem bloqueio"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removerOpcaoLocal(op.id)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <ButtonPrimary
              disabled={loading}
              onClick={salvarNovaTriagem}
              className="w-full py-3.5 text-xs rounded-xl"
            >
              {loading ? "Salvando Pergunta..." : "Salvar Pergunta no Formulário"}
            </ButtonPrimary>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LISTA DE PERGUNTAS CADASTRADAS */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {perguntas.length === 0 ? (
          <div className="col-span-2 py-16 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/30">
            <ClipboardCheck size={36} className="mx-auto text-zinc-400 mb-3" />
            <h4 className="font-bold text-zinc-800 dark:text-zinc-200">
              Nenhum formulário clínico cadastrado
            </h4>
            <p className="text-xs text-zinc-500 mt-1">
              Adicione perguntas para triagem de pacientes antes do agendamento.
            </p>
          </div>
        ) : (
          perguntas.map((perg) => (
            <motion.div
              variants={staggerItem}
              key={perg.id}
              className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 p-6 rounded-[2rem] shadow-sm relative group flex flex-col justify-between h-full space-y-4"
            >
              <button
                onClick={() => apagarTriagem(perg.id)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shadow-sm"
                title="Excluir Pergunta"
              >
                <Trash2 size={14} />
              </button>

              <div className="space-y-2.5 pr-8">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-[10px] font-black uppercase tracking-wider rounded-lg">
                    {perg.especialidade ||
                      (perg.servicos?.nome
                        ? `Serviço: ${perg.servicos.nome}`
                        : "Todas as Especialidades")}
                  </span>

                  {perg.obrigatoria !== false ? (
                    <span className="px-2.5 py-0.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-[10px] font-black uppercase tracking-wider rounded-lg">
                      Obrigatória
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider rounded-lg">
                      Opcional
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-base text-zinc-950 dark:text-white leading-snug">
                  {perg.pergunta}
                </h3>
              </div>

              {/* OPÇÕES DE RESPOSTA */}
              <div className="grid gap-1.5 pt-2 border-t border-zinc-100 dark:border-white/5">
                {perg.opcoes.map((op) => (
                  <div
                    key={op.id}
                    className="flex justify-between items-center p-2.5 bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800 rounded-xl text-xs"
                  >
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">
                      {op.texto_opcao}
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase bg-white dark:bg-black border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 rounded shadow-sm">
                      {Number(op.regra_bloqueio_dias) > 0
                        ? `+${op.regra_bloqueio_dias}d ${op.tipo_contagem_dias || "corridos"}`
                        : "Sem espera"}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))
        )}
      </motion.div>
    </motion.div>
  );
}
