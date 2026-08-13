// src/app/admin/empresa/modules/PersonalizacaoView.js
"use client";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, MessageSquare, LayoutTemplate, Plus, Trash2, Zap, CheckCircle2, ListChecks, Server, Filter } from "lucide-react";
import { fadeUp, ButtonPrimary, ToggleSwitch, CustomSelect, TextInput, spring } from "../components/SharedUI";
import { actionSalvarCustomization, fetchAdminCustomization } from "@/actions/adminData";

export default function PersonalizacaoView({ subTab = "jornada", setSubTab, showToast, servicos = [] }) {
  const [loading, setLoading] = useState(false);
  const [empresaId, setEmpresaId] = useState(null);

  // Filtros de Mensagens
  const [filterEspecialidade, setFilterEspecialidade] = useState("Todas");
  const [filterGatilho, setFilterGatilho] = useState("Todos");
  
  const [campos, setCampos] = useState({
    mostrar_cpf: true, mostrar_sobrenome: true, mostrar_whatsapp: true, mostrar_nascimento: true, mostrar_email: true,
    ocultar_triagem: false, ocultar_modalidade: false, ocultar_checkout: false,
    enviar_mensagens_importados_erp: false,
    modalidade_padrao: "Particular",
    modalidades_opcoes: [
      { id: "1", nome: "Particular", exige_senha: false, senha: "" },
      { id: "2", nome: "Convênio", exige_senha: false, senha: "" }
    ]
  });
  
  const [regrasMensagens, setRegrasMensagens] = useState([]);
  const [especialidadesUnicas, setEspecialidadesUnicas] = useState([]);
  const [servicosAlvo, setServicosAlvo] = useState([]);

  useEffect(() => {
    const fetchDados = async () => {
      const emp = await fetchAdminCustomization();
      const srvs = servicos || [];
      setServicosAlvo(srvs);

      // Puxa as especialidades da tabela 'empresas' E dos 'servicos' combinados
      const unicasFromServicos = srvs
        .filter(s => s.especialidade)
        .flatMap(s => s.especialidade.split(',').map(e => e.trim()));
      const unicasFromEmpresa = Array.isArray(emp?.especialidades) ? emp.especialidades : [];

      const todasEspecialidades = [...new Set([...unicasFromEmpresa, ...unicasFromServicos])]
        .map(e => e.trim())
        .filter(Boolean)
        .sort();

      setEspecialidadesUnicas(todasEspecialidades);

      if (emp) {
        setEmpresaId(emp.id);
        if (emp.config_campos) {
          setCampos(prev => ({ 
            ...prev, 
            ...emp.config_campos,
            modalidades_opcoes: emp.config_campos.modalidades_opcoes || prev.modalidades_opcoes,
            modalidade_padrao: emp.config_campos.modalidade_padrao || prev.modalidade_padrao
          }));
        }
        if (Array.isArray(emp.config_mensagens)) setRegrasMensagens(emp.config_mensagens);
      }
    };
    fetchDados();
  }, [servicos]);

  const handleSave = async () => {
    if (!empresaId) {
      showToast("Erro: ID da clínica não encontrado.", "error");
      return;
    }
    setLoading(true);
    try {
      await actionSalvarCustomization({ config_campos: campos, config_mensagens: regrasMensagens });
      showToast("Painel atualizado com sucesso!");
    } catch (e) {
      console.error(e);
      showToast(`Erro ao salvar: ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Funções de Mensagens
  const adicionarNovaRegra = () => {
    const novaRegra = {
      id: Date.now().toString(),
      alvo: "Todas",
      especialidade: "Todas",
      gatilho: "imediato",
      dias_antes: 1,
      hora_envio: "08:00",
      mensagem: "Olá {nome}, seu agendamento de {servico} com {especialista} está confirmado!"
    };
    setRegrasMensagens([novaRegra, ...regrasMensagens]);
  };

  const atualizarRegra = (id, campo, valor) => setRegrasMensagens(regrasMensagens.map(r => r.id === id ? { ...r, [campo]: valor } : r));
  const removerRegra = (id) => setRegrasMensagens(regrasMensagens.filter(r => r.id !== id));

  // Inserir variável diretamente na mensagem do formulário
  const inserirVariavelNaRegra = (id, tag) => {
    setRegrasMensagens(prev => prev.map(r => {
      if (r.id === id) {
        const msgAtual = r.mensagem || "";
        return { ...r, mensagem: `${msgAtual} ${tag}`.trim() };
      }
      return r;
    }));
  };

  // Funções de Modalidades
  const addModalidade = () => {
    setCampos(prev => ({
      ...prev,
      modalidades_opcoes: [...prev.modalidades_opcoes, { id: Date.now().toString(), nome: "Nova Modalidade", exige_senha: false, senha: "" }]
    }));
  };
  const updateModalidade = (id, field, value) => {
    setCampos(prev => ({
      ...prev,
      modalidades_opcoes: prev.modalidades_opcoes.map(m => m.id === id ? { ...m, [field]: value } : m)
    }));
  };
  const removeModalidade = (id) => {
    setCampos(prev => ({
      ...prev,
      modalidades_opcoes: prev.modalidades_opcoes.filter(m => m.id !== id)
    }));
  };

  // RÓTULOS LIMPOS (Sem o prefixo cru "Serviço ·" e "Especialidade ·")
  const alvoOptions = [
    { value: "Todas", label: "Todos os atendimentos" },
    ...especialidadesUnicas.map(e => ({ value: `especialidade:${e}`, label: e })),
    ...servicosAlvo.map(s => ({ value: `servico:${s.nome}`, label: s.nome })),
    { value: "tipo:Exame", label: "Todos os exames" },
    { value: "tipo:Consulta", label: "Todas as consultas" },
    { value: "tipo:Retorno", label: "Todos os retornos" }
  ];

  const gatilhoOptions = [
    { value: "imediato", label: "Na hora do Agendamento" },
    { value: "agendado", label: "Dias antes do Atendimento" },
    { value: "pos_atendimento", label: "Após Consulta / Exame" },
    { value: "remarcado", label: "Quando Remarcado / Reagendado" },
    { value: "cancelado", label: "Quando Cancelado" },
    { value: "antes_pagamento", label: "Cobrança / Antes do Pagamento (Pendente)" },
    { value: "pagamento_aprovado", label: "Confirmação de Pagamento Aprovado" }
  ];

  const variaveisDisponiveis = [
    { tag: "{nome}", desc: "Nome do paciente" },
    { tag: "{servico}", desc: "Procedimento / Serviço" },
    { tag: "{especialista}", desc: "Nome do profissional" },
    { tag: "{especialidade}", desc: "Especialidade médica" },
    { tag: "{data}", desc: "Data do atendimento" },
    { tag: "{hora}", desc: "Horário agendado" },
    { tag: "{valor}", desc: "Valor a pagar" },
    { tag: "{chave_pix}", desc: "Chave Pix copia e cola" },
    { tag: "{link_pagamento}", desc: "Link direto do checkout" }
  ];

  // Regras de Mensagens Filtradas de Forma Robusta
  const regrasFiltradas = useMemo(() => {
    return regrasMensagens.filter((regra) => {
      // 1. Filtro por Gatilho / Categoria
      if (filterGatilho !== "Todos" && regra.gatilho !== filterGatilho) return false;

      // 2. Filtro por Especialidade / Atendimento
      if (filterEspecialidade !== "Todas") {
        const alvoRaw = (regra.alvo || "").toLowerCase();
        const espRaw = (regra.especialidade || "").toLowerCase();
        const targetClean = filterEspecialidade.toLowerCase().trim();

        const matchAlvo = alvoRaw === "todas" || alvoRaw.includes(targetClean);
        const matchEsp = espRaw === "todas" || espRaw.includes(targetClean);

        if (!matchAlvo && !matchEsp) return false;
      }
      return true;
    });
  }, [regrasMensagens, filterGatilho, filterEspecialidade]);

  return (
    <motion.div key="personalizacao" {...fadeUp} className="flex-1 flex flex-col h-full overflow-hidden w-full max-w-7xl mx-auto relative bg-[#F4F4F5] dark:bg-black p-4 md:p-6 lg:p-8">
      
      {/* PADRÃO UNIFICADO DE CABEÇALHO */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <LayoutTemplate size={24} />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
              Mensagens e Jornada
            </h2>
            <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
              Defina os dados exigidos do paciente, formas de atendimento e automações de WhatsApp.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pb-32">
        
        <AnimatePresence mode="wait">
          
          {/* TAB 1: DADOS DO PACIENTE */}
          {subTab === "jornada" && (
            <motion.div key="jornada" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={spring} className="space-y-8">
              <section className="bg-white dark:bg-[#111] border border-zinc-200/80 dark:border-zinc-800 p-8 rounded-[2.5rem] shadow-sm">
                <h3 className="text-lg font-black text-zinc-900 dark:text-white mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                  Dados Exigidos na Identificação
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  <ToggleSwitch checked={campos.mostrar_cpf} onChange={(v) => setCampos({...campos, mostrar_cpf: v})} label="Exigir CPF" />
                  <ToggleSwitch checked={campos.mostrar_sobrenome} onChange={(v) => setCampos({...campos, mostrar_sobrenome: v})} label="Exigir Sobrenome" />
                  <ToggleSwitch checked={campos.mostrar_nascimento} onChange={(v) => setCampos({...campos, mostrar_nascimento: v})} label="Data de Nascimento" />
                  <ToggleSwitch checked={campos.mostrar_email} onChange={(v) => setCampos({...campos, mostrar_email: v})} label="Exigir E-mail" />
                  <ToggleSwitch checked={campos.mostrar_whatsapp} onChange={(v) => setCampos({...campos, mostrar_whatsapp: v})} label="Exigir WhatsApp" />
                </div>
                
                <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Pular Módulos do Sistema</h4>
                <div className="grid md:grid-cols-2 gap-6 p-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  <ToggleSwitch checked={campos.ocultar_triagem} onChange={(v) => setCampos({...campos, ocultar_triagem: v})} label="Ocultar Etapa de Triagem" />
                  <ToggleSwitch checked={campos.ocultar_modalidade} onChange={(v) => setCampos({...campos, ocultar_modalidade: v})} label="Ocultar Particular/Convênio" />
                  <ToggleSwitch checked={campos.ocultar_checkout} onChange={(v) => setCampos({...campos, ocultar_checkout: v})} label="Ocultar Pagamento (Checkout)" />
                </div>
              </section>
            </motion.div>
          )}

          {/* TAB 2: FORMAS DE ATENDIMENTO */}
          {subTab === "modalidades" && (
            <motion.div key="modalidades" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={spring} className="space-y-8">
              <section className="bg-white dark:bg-[#111] border border-zinc-200/80 dark:border-zinc-800 p-8 rounded-[2.5rem] shadow-sm">
                
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-6">
                  <div>
                    <h3 className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
                      <ListChecks size={18} className="text-indigo-500" /> Modalidades & Coberturas
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                      Defina os métodos aceitos e exija senha para liberar o agendamento em opções restritas.
                    </p>
                  </div>
                  <button onClick={addModalidade} className="flex items-center justify-center gap-2 px-5 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-black transition-transform shadow-md">
                    <Plus size={16} /> Adicionar Método
                  </button>
                </div>

                <div className="mb-10 p-6 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl">
                  <CustomSelect 
                    label="Modalidade Padrão (Fallback)" 
                    value={campos.modalidade_padrao} 
                    onChange={v => setCampos({...campos, modalidade_padrao: v})} 
                    options={campos.modalidades_opcoes.map(m => ({value: m.nome, label: m.nome}))}
                  />
                  <p className="text-xs font-bold text-blue-700/80 dark:text-blue-400 uppercase tracking-widest mt-3">
                    A modalidade padrão será aplicada automaticamente quando a opção Ocultar Particular/Convênio estiver ativa.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <AnimatePresence>
                    {campos.modalidades_opcoes.map((mod) => (
                      <motion.div key={mod.id} initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.95}} className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow rounded-2xl relative group flex flex-col gap-5">
                        
                        <button onClick={() => removeModalidade(mod.id)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white dark:bg-zinc-800 border border-red-100 dark:border-red-900/40 flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 size={14} />
                        </button>

                        <TextInput value={mod.nome} onChange={(e) => updateModalidade(mod.id, 'nome', e.target.value)} label="Nome do Método (Ex: Cartão de Todos)" />
                        
                        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-4">
                          <ToggleSwitch checked={mod.exige_senha} onChange={v => updateModalidade(mod.id, 'exige_senha', v)} label="Exigir Senha de Liberação" />
                          
                          <AnimatePresence>
                            {mod.exige_senha && (
                              <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:"auto"}} exit={{opacity:0, height:0}}>
                                <TextInput type="text" placeholder="Senha do método..." value={mod.senha} onChange={e => updateModalidade(mod.id, 'senha', e.target.value)} label="Senha Obrigatória" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

              </section>
            </motion.div>
          )}

          {/* TAB 3: MENSAGENS AUTOMÁTICAS */}
          {subTab === "mensagens" && (
            <motion.div key="mensagens" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={spring} className="space-y-8">
              <section className="bg-white dark:bg-[#111] border border-zinc-200/80 dark:border-zinc-800 p-8 rounded-[2.5rem] shadow-sm">
                
                {/* TOGGLE PARA MENSAGENS DO ERP MEDICALSYS */}
                <div className="p-6 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-3xl mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-zinc-900 dark:text-white text-base flex items-center gap-2">
                      <Server size={18} className="text-blue-500" /> Gerar Mensagens para Agendamentos do ERP Medicalsys
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed max-w-xl">
                      Se ativado, a importação de agendamentos gerará rascunhos de mensagens para sua conferência. Nenhuma mensagem é enviada sem sua aprovação prévia na Central de Validação da aba Sincronização.
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={Boolean(campos.enviar_mensagens_importados_erp)}
                    onChange={(v) => setCampos({ ...campos, enviar_mensagens_importados_erp: v })}
                    label={campos.enviar_mensagens_importados_erp ? "Geração em Rascunho Ativada" : "Geração de Mensagens Pausada"}
                  />
                </div>


                {/* FILTROS DE MENSAGENS */}
                <div className="p-6 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl mb-8 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                    <Filter size={14} /> Filtrar Mensagens Cadastradas
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <CustomSelect
                      label="Filtrar por Especialidade / Atendimento"
                      value={filterEspecialidade}
                      onChange={setFilterEspecialidade}
                      options={[
                        { value: "Todas", label: "Todas as Especialidades e Serviços" },
                        ...especialidadesUnicas.map(e => ({ value: e, label: e }))
                      ]}
                    />

                    <CustomSelect
                      label="Filtrar por Categoria / Gatilho"
                      value={filterGatilho}
                      onChange={setFilterGatilho}
                      options={[
                        { value: "Todos", label: "Todas as Categorias" },
                        ...gatilhoOptions
                      ]}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-6">
                  <div>
                    <h3 className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
                      <MessageSquare size={18} className="text-green-500" /> Automações de WhatsApp ({regrasFiltradas.length})
                    </h3>
                  </div>
                  <button onClick={adicionarNovaRegra} className="flex items-center justify-center gap-2 px-5 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-black transition-transform shadow-md">
                    <Plus size={16} /> Adicionar mensagem
                  </button>
                </div>

                <div className="space-y-8">
                  <AnimatePresence>
                    {regrasFiltradas.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50 dark:bg-zinc-900">
                        <div className="w-16 h-16 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                          <MessageSquare size={24} className="text-zinc-300 dark:text-zinc-600" />
                        </div>
                        <h4 className="text-zinc-900 dark:text-white font-bold mb-1">Nenhuma automação encontrada</h4>
                        <p className="text-zinc-500 text-sm">Ajuste os filtros de pesquisa acima para visualizar outras regras.</p>
                      </div>
                    ) : (
                      regrasFiltradas.map((regra, index) => (
                        <motion.div key={regra.id} initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, scale:0.95}} className="bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-[1.5rem] p-6 relative group flex flex-col lg:flex-row gap-8">
                          
                          <button onClick={() => removerRegra(regra.id)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white dark:bg-zinc-800 border border-red-100 flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm z-10">
                            <Trash2 size={14} />
                          </button>

                          <div className="flex-1 space-y-5">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="w-6 h-6 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black flex items-center justify-center text-xs font-bold">{index + 1}</span>
                              <h4 className="font-semibold text-zinc-900 dark:text-white text-sm">Quando esta mensagem será usada</h4>
                            </div>
                            
                            <CustomSelect label="Atendimento ou Especialidade que receberá a mensagem" value={regra.alvo || (regra.especialidade === "Todas" ? "Todas" : `especialidade:${regra.especialidade}`)} onChange={(v) => atualizarRegra(regra.id, 'alvo', v)} options={alvoOptions} />
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="col-span-2">
                                <CustomSelect label="Gatilho / Categoria da Mensagem" value={regra.gatilho} onChange={(v) => atualizarRegra(regra.id, 'gatilho', v)} options={gatilhoOptions} />
                              </div>
                              
                              {regra.gatilho === "pos_atendimento" ? (
                                <div className="col-span-2 space-y-4 p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl">
                                  <CustomSelect
                                    label="Momento de Referência do Envio"
                                    value={regra.referencia_pos || "termino"}
                                    onChange={(v) => atualizarRegra(regra.id, 'referencia_pos', v)}
                                    options={[
                                      { value: "termino", label: "A partir do Término do Atendimento / Exame (Considera Duração)" },
                                      { value: "inicio", label: "A partir do Horário de Início Marcado" },
                                      { value: "dias_depois", label: "Dias Depois em Horário Fixo (Ex.: 1 dia após às 08:00)" }
                                    ]}
                                  />

                                  {regra.referencia_pos === "dias_depois" ? (
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1 mb-1.5 block">Quantidade de Dias</label>
                                        <input
                                          type="number"
                                          min="0"
                                          max="30"
                                          value={regra.dias_depois || 1}
                                          onChange={(e) => atualizarRegra(regra.id, 'dias_depois', e.target.value)}
                                          className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-sm font-medium outline-none"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1 mb-1.5 block">Hora de Envio</label>
                                        <input
                                          type="time"
                                          value={regra.hora_envio || "08:00"}
                                          onChange={(e) => atualizarRegra(regra.id, 'hora_envio', e.target.value)}
                                          className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-sm font-medium outline-none"
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      <div className="grid grid-cols-2 gap-3">
                                        <div>
                                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1 mb-1.5 block">Tempo de Espera</label>
                                          <input
                                            type="number"
                                            min="0"
                                            value={regra.offset_valor ?? 0}
                                            onChange={(e) => atualizarRegra(regra.id, 'offset_valor', Number(e.target.value))}
                                            className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-sm font-medium outline-none"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1 mb-1.5 block">Unidade de Tempo</label>
                                          <select
                                            value={regra.offset_unidade || "minutos"}
                                            onChange={(e) => atualizarRegra(regra.id, 'offset_unidade', e.target.value)}
                                            className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-sm font-medium outline-none text-zinc-800 dark:text-zinc-200"
                                          >
                                            <option value="minutos">Minutos</option>
                                            <option value="horas">Horas</option>
                                            <option value="segundos">Segundos</option>
                                          </select>
                                        </div>
                                      </div>

                                      {/* ATALHOS RÁPIDOS */}
                                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                        <span className="text-[10px] text-zinc-400 font-bold uppercase mr-1">Atalhos:</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            atualizarRegra(regra.id, 'referencia_pos', 'termino');
                                            atualizarRegra(regra.id, 'offset_valor', 0);
                                            atualizarRegra(regra.id, 'offset_unidade', 'minutos');
                                          }}
                                          className="px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold rounded-lg hover:bg-zinc-100"
                                        >
                                          Ao terminar (0 min)
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            atualizarRegra(regra.id, 'referencia_pos', 'termino');
                                            atualizarRegra(regra.id, 'offset_valor', 20);
                                            atualizarRegra(regra.id, 'offset_unidade', 'minutos');
                                          }}
                                          className="px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold rounded-lg hover:bg-zinc-100"
                                        >
                                          20 min após término
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            atualizarRegra(regra.id, 'referencia_pos', 'termino');
                                            atualizarRegra(regra.id, 'offset_valor', 1);
                                            atualizarRegra(regra.id, 'offset_unidade', 'horas');
                                          }}
                                          className="px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold rounded-lg hover:bg-zinc-100"
                                        >
                                          1 hora após término
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            atualizarRegra(regra.id, 'referencia_pos', 'termino');
                                            atualizarRegra(regra.id, 'offset_valor', 2);
                                            atualizarRegra(regra.id, 'offset_unidade', 'horas');
                                          }}
                                          className="px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold rounded-lg hover:bg-zinc-100"
                                        >
                                          2 horas após término
                                        </button>
                                      </div>

                                      <p className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">
                                        {Number(regra.offset_valor ?? 0) === 0 && (regra.referencia_pos || "termino") === "termino"
                                          ? "⚡ Envio no minuto exato em que a consulta/exame acabar."
                                          : `⏱️ Envio programado para ${regra.offset_valor ?? 0} ${regra.offset_unidade || 'minutos'} após o ${(regra.referencia_pos || 'termino') === 'termino' ? 'término' : 'início'} do atendimento.`}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ) : regra.gatilho === "agendado" ? (
                                <>
                                  <div>
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1 mb-1.5 block">Dias Antes</label>
                                    <input type="number" min="0" max="30" value={regra.dias_antes ?? 1} onChange={(e) => atualizarRegra(regra.id, 'dias_antes', e.target.value)} className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-sm font-medium outline-none" />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1 mb-1.5 block">Hora de Envio</label>
                                    <input type="time" value={regra.hora_envio || "08:00"} onChange={(e) => atualizarRegra(regra.id, 'hora_envio', e.target.value)} className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-sm font-medium outline-none" />
                                  </div>
                                </>
                              ) : (
                                <div className="col-span-2 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 rounded-xl flex items-center gap-3">
                                  <Zap size={20} className="text-amber-500" />
                                  <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                                    A mensagem será enviada no momento exato em que o evento ocorrer ({gatilhoOptions.find(g => g.value === regra.gatilho)?.label}).
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex-1 flex flex-col justify-end space-y-3">
                            {/* BOTÕES DE INSERÇÃO RÁPIDA DE VARIÁVEIS */}
                            <div>
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1 mb-2 block">
                                Inserir Variáveis Dinâmicas no Texto:
                              </label>
                              <div className="flex flex-wrap gap-1.5">
                                {variaveisDisponiveis.map((v) => (
                                  <button
                                    key={v.tag}
                                    type="button"
                                    onClick={() => inserirVariavelNaRegra(regra.id, v.tag)}
                                    className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg font-mono text-[11px] font-bold transition-all shadow-sm"
                                    title={v.desc}
                                  >
                                    + {v.tag}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1 block">Texto da Mensagem</label>
                            <div className="bg-[#E1F6CB] dark:bg-[#1a2e1c] p-5 rounded-3xl rounded-tr-sm shadow-sm relative border border-[#c1e89e] dark:border-[#2f4d22]">
                              <textarea
                                value={regra.mensagem}
                                onChange={(e) => atualizarRegra(regra.id, 'mensagem', e.target.value)}
                                placeholder="Digite aqui o que o paciente vai receber..."
                                className="w-full bg-transparent text-sm font-medium text-[#111B21] dark:text-zinc-100 outline-none min-h-[160px] resize-none custom-scrollbar placeholder:text-[#5e7769]"
                              />
                              <div className="absolute bottom-2 right-4 text-[10px] font-bold text-[#5e7769] dark:text-[#88b598] flex items-center gap-1">
                                <CheckCircle2 size={12} /> 10:42
                              </div>
                            </div>
                          </div>

                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </section>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* RODAPÉ FIXO PARA SALVAR */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-t border-zinc-200/80 dark:border-zinc-800 flex justify-end items-center z-50">
        <ButtonPrimary onClick={handleSave} disabled={loading} icon={Save} className="w-full md:w-auto px-12 py-4 text-sm">
          {loading ? "Salvando Alterações..." : "Salvar Configurações do Painel"}
        </ButtonPrimary>
      </div>

    </motion.div>
  );
}
