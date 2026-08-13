"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Trash2, ClipboardCheck, CheckCircle2, ShieldAlert, Sparkles } from "lucide-react";
import { fadeUp, staggerContainer, staggerItem, TextInput, CustomSelect, ButtonPrimary, ToggleSwitch } from "../components/SharedUI";
import { actionSalvarTriagem, actionDeletarTriagem } from "@/actions/adminData";

export default function TriagemView({ perguntas = [], servicos = [], fetchPerguntas, showToast }) {
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

  // Lista de especialidades únicas derivadas dos serviços da clínica e procedimentos médicos
  const especialidadesDisponiveis = useMemo(() => {
    const unicas = (servicos || [])
      .filter((s) => s.especialidade)
      .flatMap((s) => s.especialidade.split(",").map((e) => e.trim()));

    const exames = (servicos || [])
      .filter((s) => s.tipo === "Exame")
      .map((s) => s.nome.trim());

    const base = [
      "Colonoscopia",
      "Endoscopia",
      "Gastroenterologia",
      "Cirurgia Geral",
      "Clínico Geral",
      "Psicologia",
      ...unicas,
      ...exames
    ];

    return [...new Set(base)].filter(Boolean).sort();
  }, [servicos]);

  const especialidadesOptions = useMemo(() => [
    { value: "Todas", label: "Todas as Especialidades (Geral)" },
    ...especialidadesDisponiveis.map((e) => ({ value: e, label: e }))
  ], [especialidadesDisponiveis]);

  const adicionarOpcaoLocal = () => {
    if (!novaOpcao.texto_opcao.trim()) return showToast("Digite um texto para a opção", "error");
    setNovaTriagem((p) => ({
      ...p,
      opcoes: [...p.opcoes, { ...novaOpcao, texto_opcao: novaOpcao.texto_opcao.trim(), id: Date.now() }]
    }));
    setNovaOpcao({ texto_opcao: "", regra_bloqueio_dias: 0, tipo_contagem_dias: "corridos" });
  };
  
  const removerOpcaoLocal = (id) => {
    setNovaTriagem((p) => ({ ...p, opcoes: p.opcoes.filter((o) => o.id !== id) }));
  };
  
  const salvarNovaTriagem = async () => {
    if (!novaTriagem.pergunta.trim() || novaTriagem.opcoes.length === 0) {
      return showToast("Preencha a pergunta e adicione pelo menos uma opção de resposta.", "error");
    }
    setLoading(true);
    
    try {
      await actionSalvarTriagem(novaTriagem);
      showToast("Pergunta clínica cadastrada com sucesso!"); 
      setIsAddingTriagem(false); 
      setNovaTriagem({ especialidade: "Todas", obrigatoria: true, pergunta: "", opcoes: [] }); 
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
    <motion.div key="triagem" {...fadeUp} className="p-6 md:p-10 mx-auto w-full max-w-5xl overflow-y-auto h-full custom-scrollbar pb-32 space-y-8">
      
      {/* CABEÇALHO UNIFICADO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 shadow-sm">
            <ClipboardCheck size={24} />
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
            Formulários Clínicos por Especialidade
          </h2>
          <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl">
            Configure perguntas pré-agendamento mapeadas por especialidade clínica e defina se são obrigatórias ou opcionais.
          </p>
        </div>
        {!isAddingTriagem && (
          <ButtonPrimary onClick={() => setIsAddingTriagem(true)} icon={Plus} className="px-6 py-3.5 text-xs">
            Adicionar Pergunta
          </ButtonPrimary>
        )}
      </div>

      {/* FORMULÁRIO DE NOVA PERGUNTA */}
      <AnimatePresence>
        {isAddingTriagem && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="bg-white dark:bg-[#111] border border-zinc-200/80 dark:border-zinc-800 p-8 rounded-[2.5rem] shadow-xl space-y-8"
          >
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div>
                <h3 className="font-black text-xl text-zinc-900 dark:text-white">Nova Pergunta Clínica</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Defina a especialidade médica e se a resposta é mandatória.</p>
              </div>
              <button
                onClick={() => setIsAddingTriagem(false)}
                className="w-10 h-10 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-red-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* MAPEAR POR ESPECIALIDADE (NÃO MAIS POR MÉDICO ESPECÍFICO) */}
              <div className="space-y-2">
                <CustomSelect
                  label="Especialidade / Procedimento Alvo"
                  value={novaTriagem.especialidade}
                  onChange={(val) => setNovaTriagem({ ...novaTriagem, especialidade: val })}
                  options={especialidadesOptions}
                />
                <p className="text-[11px] text-zinc-400">
                  A pergunta será apresentada a todos os pacientes que agendarem esta especialidade.
                </p>
              </div>

              {/* TOGGLE: OBRIGATÓRIA OU OPCIONAL */}
              <div className="space-y-3 p-5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl flex flex-col justify-between">
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
                  label={novaTriagem.obrigatoria ? "Pergunta Obrigatória (Bloqueia avanço)" : "Pergunta Opcional (Permite pular)"}
                />
              </div>

              {/* TEXTO DA PERGUNTA */}
              <div className="md:col-span-2">
                <TextInput
                  label="Pergunta apresentada ao paciente"
                  placeholder="Ex.: Fez uso de caneta emagrecedora nos últimos 15 dias?"
                  value={novaTriagem.pergunta}
                  onChange={(e) => setNovaTriagem({ ...novaTriagem, pergunta: e.target.value })}
                />
              </div>
            </div>

            {/* MAPEAMENTO DE OPÇÕES DE RESPOSTA E REGRAS DE ESPERA */}
            <div className="bg-zinc-50/70 dark:bg-zinc-900/60 p-6 border border-zinc-200/60 dark:border-zinc-800 rounded-3xl space-y-4">
              <h4 className="text-xs font-black uppercase text-zinc-400 tracking-widest ml-1">
                Opções de Resposta e Bloqueio de Dias
              </h4>
              
              <div className="flex flex-col lg:flex-row gap-4 items-end">
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
                    onChange={(e) => setNovaOpcao({ ...novaOpcao, regra_bloqueio_dias: e.target.value })}
                  />
                </div>
                <div className="w-full lg:w-48">
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
                  className="w-full lg:w-auto h-[52px] px-6 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all shadow-md flex-shrink-0"
                >
                  <Plus size={18} /> Adicionar Opção
                </button>
              </div>

              {novaTriagem.opcoes.length > 0 && (
                <div className="mt-4 space-y-2.5">
                  {novaTriagem.opcoes.map((op) => (
                    <div
                      key={op.id}
                      className="flex justify-between items-center bg-white dark:bg-[#111] p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-zinc-900 dark:text-white text-sm">{op.texto_opcao}</span>
                        <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10px] font-black uppercase px-2.5 py-1 rounded-md">
                          {Number(op.regra_bloqueio_dias) > 0 ? `Impede ${op.regra_bloqueio_dias} dias ${op.tipo_contagem_dias}` : "Sem bloqueio"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removerOpcaoLocal(op.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <ButtonPrimary disabled={loading} onClick={salvarNovaTriagem} className="w-full py-5 text-sm">
              {loading ? "Salvando Pergunta..." : "Salvar Pergunta no Formulário"}
            </ButtonPrimary>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* LISTA DE PERGUNTAS CADASTRADAS */}
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {perguntas.length === 0 ? (
          <div className="col-span-2 py-16 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/30">
            <ClipboardCheck size={36} className="mx-auto text-zinc-400 mb-3" />
            <h4 className="font-bold text-zinc-800 dark:text-zinc-200">Nenhum formulário clínico cadastrado</h4>
            <p className="text-xs text-zinc-500 mt-1">Adicione perguntas para triagem de pacientes antes do agendamento.</p>
          </div>
        ) : (
          perguntas.map((perg) => (
            <motion.div
              variants={staggerItem}
              key={perg.id}
              className="bg-white dark:bg-[#111] border border-zinc-200/80 dark:border-zinc-800 p-8 rounded-[2.5rem] shadow-sm relative group flex flex-col justify-between h-full space-y-6"
            >
              <button
                onClick={() => apagarTriagem(perg.id)}
                className="absolute top-6 right-6 w-9 h-9 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shadow-sm"
                title="Excluir Pergunta"
              >
                <Trash2 size={15} />
              </button>

              <div className="space-y-3 pr-8">
                {/* BADGES: ESPECIALIDADE E OBRIGATORIEDADE */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-[10px] font-black uppercase tracking-widest rounded-lg">
                    {perg.especialidade || (perg.servicos?.nome ? `Serviço: ${perg.servicos.nome}` : "Todas as Especialidades")}
                  </span>
                  
                  {perg.obrigatoria !== false ? (
                    <span className="px-2.5 py-1 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-[10px] font-black uppercase tracking-widest rounded-lg">
                      Obrigatória
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-widest rounded-lg">
                      Opcional
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-lg text-zinc-900 dark:text-white leading-snug">
                  {perg.pergunta}
                </h3>
              </div>

              {/* OPÇÕES DE RESPOSTA */}
              <div className="grid gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                {perg.opcoes.map((op) => (
                  <div
                    key={op.id}
                    className="flex justify-between items-center p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 rounded-xl text-xs"
                  >
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">{op.texto_opcao}</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase bg-white dark:bg-black border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 rounded shadow-sm">
                      {Number(op.regra_bloqueio_dias) > 0 ? `+${op.regra_bloqueio_dias}d ${op.tipo_contagem_dias || "corridos"}` : "Sem espera"}
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
