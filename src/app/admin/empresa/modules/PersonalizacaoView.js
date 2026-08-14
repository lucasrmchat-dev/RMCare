"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Sparkles,
  Zap,
  Clock,
  Trash2,
  Plus,
  Lock,
  Eye,
  CheckCircle2,
  Calendar,
  Save,
  Filter,
  ListChecks,
  Image as ImageIcon,
  Upload,
  UserCheck,
  ShieldAlert
} from "lucide-react";
import {
  fadeUp,
  CustomSelect,
  ToggleSwitch,
  ButtonPrimary,
  TextInput,
  spring
} from "../components/SharedUI";
import { fetchAdminCustomization, actionSalvarCustomization, actionSalvarLogoEmpresa } from "@/actions/adminData";

export default function PersonalizacaoView({ subTab = "jornada", setSubTab, showToast, servicos = [] }) {
  const [loading, setLoading] = useState(false);
  const [empresaId, setEmpresaId] = useState(null);

  // Estados dos Campos e Configurações da Empresa
  const [campos, setCampos] = useState({
    mostrar_cpf: true,
    mostrar_sobrenome: true,
    mostrar_nascimento: true,
    mostrar_email: true,
    mostrar_whatsapp: true,
    ocultar_triagem: false,
    ocultar_modalidade: false,
    ocultar_checkout: false,
    logo_url: "",
    modalidade_padrao: "Particular",
    modalidades_opcoes: [
      { id: "1", nome: "Particular", exige_senha: false, senha: "" },
      { id: "2", nome: "Convênio", exige_senha: false, senha: "" }
    ],
    enviar_mensagens_importados_erp: true
  });

  // Estados das Regras de Mensagens Automáticas
  const [regrasMensagens, setRegrasMensagens] = useState([]);

  // Estados para Filtros das Mensagens
  const [filterEspecialidade, setFilterEspecialidade] = useState("Todas");
  const [filterGatilho, setFilterGatilho] = useState("Todos");

  // Carregar dados salvos no banco de dados
  useEffect(() => {
    const fetchDados = async () => {
      const emp = await fetchAdminCustomization();
      if (emp) {
        setEmpresaId(emp.id);
        if (emp.config_campos) {
          setCampos((prev) => ({ 
            ...prev, 
            ...emp.config_campos,
            logo_url: emp.logo_url || emp.config_campos.logo_url || prev.logo_url,
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
      if (campos.logo_url) {
        await actionSalvarLogoEmpresa(campos.logo_url);
      }
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
      referencia_pos: "termino",
      offset_valor: 0,
      offset_unidade: "minutos",
      filtro_idade_tipo: "todas",
      idade_minima: 0,
      idade_maxima: 999,
      mensagem: "Olá {nome}, seu agendamento de {servico} com {especialista} está confirmado!"
    };
    setRegrasMensagens([novaRegra, ...regrasMensagens]);
  };

  const atualizarRegra = (id, campo, valor) =>
    setRegrasMensagens((prev) => prev.map((r) => (r.id === id ? { ...r, [campo]: valor } : r)));
  
  const removerRegra = (id) =>
    setRegrasMensagens((prev) => prev.filter((r) => r.id !== id));

  const inserirVariavelNaRegra = (id, tag) => {
    setRegrasMensagens((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const msgAtual = r.mensagem || "";
          return { ...r, mensagem: `${msgAtual} ${tag}`.trim() };
        }
        return r;
      })
    );
  };

  // Funções de Modalidades
  const addModalidade = () => {
    setCampos((prev) => ({
      ...prev,
      modalidades_opcoes: [
        ...prev.modalidades_opcoes,
        { id: Date.now().toString(), nome: "Nova Modalidade", exige_senha: false, senha: "" }
      ]
    }));
  };

  const updateModalidade = (id, field, value) => {
    setCampos((prev) => ({
      ...prev,
      modalidades_opcoes: prev.modalidades_opcoes.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    }));
  };

  const removeModalidade = (id) => {
    setCampos((prev) => ({
      ...prev,
      modalidades_opcoes: prev.modalidades_opcoes.filter((m) => m.id !== id)
    }));
  };

  // Upload da Logo da Empresa
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast("A imagem deve ter no máximo 2MB.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setCampos((prev) => ({ ...prev, logo_url: reader.result }));
      showToast("Logotipo carregado! Clique em Salvar para persistir.");
    };
    reader.readAsDataURL(file);
  };

  // Lista de Especialidades Únicas
  const especialidadesUnicas = useMemo(() => {
    const srvs = Array.isArray(servicos) ? servicos : [];
    const unicas = srvs
      .filter((s) => s.especialidade)
      .flatMap((s) => s.especialidade.split(",").map((e) => e.trim()));
    const base = ["Colonoscopia", "Endoscopia", "Gastroenterologia", "Cirurgia Geral", "Clínico Geral", "Psicologia"];
    return [...new Set([...base, ...unicas])].filter(Boolean).sort();
  }, [servicos]);

  const alvoOptions = useMemo(() => [
    { value: "Todas", label: "🌐 Todos os Atendimentos (Geral)" },
    { value: "tipo:Consulta", label: "📋 Apenas Consultas Médicas" },
    { value: "tipo:Exame", label: "🔬 Apenas Exames e Procedimentos" },
    { value: "tipo:Retorno", label: "🔄 Apenas Retornos Clínicos" },
    ...especialidadesUnicas.map((e) => ({ value: `especialidade:${e}`, label: `Especialidade: ${e}` })),
    ...servicos.map((s) => ({ value: `servico:${s.nome}`, label: `Profissional: ${s.nome}` }))
  ], [especialidadesUnicas, servicos]);

  const gatilhoOptions = [
    { value: "imediato", label: "Na hora do Agendamento (Instantâneo)" },
    { value: "agendado", label: "Dias antes do Atendimento (Lembrete)" },
    { value: "pos_atendimento", label: "Após Consulta / Exame (Pós-Atendimento)" },
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
    { tag: "{tipo_servico}", desc: "Consulta ou Exame" },
    { tag: "{idade}", desc: "Idade calculada do paciente" },
    { tag: "{data}", desc: "Data do atendimento" },
    { tag: "{hora}", desc: "Horário agendado" },
    { tag: "{valor}", desc: "Valor a pagar" },
    { tag: "{chave_pix}", desc: "Chave Pix copia e cola" },
    { tag: "{link_pagamento}", desc: "Link direto do checkout" }
  ];

  const regrasFiltradas = useMemo(() => {
    return regrasMensagens.filter((regra) => {
      if (filterGatilho !== "Todos" && regra.gatilho !== filterGatilho) return false;
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
    <motion.div key="personalizacao" {...fadeUp} className="flex-1 flex flex-col h-full overflow-hidden w-full max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
      
      {/* CABEÇALHO UNIFICADO */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Zap size={24} />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
              Mensagens, Jornada & Logotipo
            </h2>
            <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
              Configure templates por nicho e idade, personalize os dados do paciente e envie o logotipo da sua clínica.
            </p>
          </div>
        </div>

        <ButtonPrimary onClick={handleSave} disabled={loading} icon={Save} className="px-8 py-3 text-xs">
          {loading ? "Salvando..." : "Salvar Alterações"}
        </ButtonPrimary>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pb-32">
        <AnimatePresence mode="wait">
          
          {/* ==========================================
              TAB 1: DADOS DO PACIENTE & LOGOTIPO DA EMPRESA
              ========================================== */}
          {subTab === "jornada" && (
            <motion.div key="jornada" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={spring} className="space-y-8">
              
              {/* LOGOTIPO DA EMPRESA */}
              <section className="bg-white dark:bg-[#111] border border-zinc-200/80 dark:border-zinc-800 p-8 rounded-[2.5rem] shadow-sm">
                <div className="flex items-center gap-3 mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
                    <ImageIcon size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-zinc-900 dark:text-white">Logotipo da Clínica / Empresa</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Sua logomarca será exibida elegantemente no cabeçalho do portal de agendamento dos seus pacientes.
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-4">
                    <TextInput
                      label="URL da Imagem da Logo"
                      placeholder="https://suaclinica.com.br/logo.png"
                      value={campos.logo_url || ""}
                      onChange={(e) => setCampos({ ...campos, logo_url: e.target.value })}
                    />
                    
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-zinc-400 font-bold uppercase">Ou faça upload:</span>
                      <label className="cursor-pointer px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold rounded-xl flex items-center gap-2 transition-all">
                        <Upload size={14} /> Escolher Imagem (PNG/JPG)
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      </label>
                    </div>
                  </div>

                  {/* PREVIEW DA LOGO */}
                  <div className="p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex flex-col items-center justify-center text-center min-h-[160px]">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Prévia do Logotipo</span>
                    {campos.logo_url ? (
                      <div className="p-3 bg-white dark:bg-black rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm max-w-[220px]">
                        <img src={campos.logo_url} alt="Logo da Clínica" className="max-h-14 max-w-full object-contain mx-auto" />
                      </div>
                    ) : (
                      <div className="text-zinc-400 text-xs flex flex-col items-center gap-1.5">
                        <ImageIcon size={32} className="opacity-40" />
                        Nenhum logotipo configurado ainda.
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* DADOS EXIGIDOS NA IDENTIFICAÇÃO */}
              <section className="bg-white dark:bg-[#111] border border-zinc-200/80 dark:border-zinc-800 p-8 rounded-[2.5rem] shadow-sm">
                <h3 className="text-lg font-black text-zinc-900 dark:text-white mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                  Dados Exigidos na Identificação do Paciente
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  <ToggleSwitch checked={campos.mostrar_cpf} onChange={(v) => setCampos({ ...campos, mostrar_cpf: v })} label="Exigir CPF" />
                  <ToggleSwitch checked={campos.mostrar_sobrenome} onChange={(v) => setCampos({ ...campos, mostrar_sobrenome: v })} label="Exigir Sobrenome" />
                  <ToggleSwitch checked={campos.mostrar_nascimento} onChange={(v) => setCampos({ ...campos, mostrar_nascimento: v })} label="Data de Nascimento" />
                  <ToggleSwitch checked={campos.mostrar_email} onChange={(v) => setCampos({ ...campos, mostrar_email: v })} label="Exigir E-mail" />
                  <ToggleSwitch checked={campos.mostrar_whatsapp} onChange={(v) => setCampos({ ...campos, mostrar_whatsapp: v })} label="Exigir WhatsApp" />
                </div>
                
                <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Pular Módulos do Sistema</h4>
                <div className="grid md:grid-cols-2 gap-6 p-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  <ToggleSwitch checked={campos.ocultar_triagem} onChange={(v) => setCampos({ ...campos, ocultar_triagem: v })} label="Ocultar Etapa de Triagem" />
                  <ToggleSwitch checked={campos.ocultar_modalidade} onChange={(v) => setCampos({ ...campos, ocultar_modalidade: v })} label="Ocultar Particular/Convênio" />
                  <ToggleSwitch checked={campos.ocultar_checkout} onChange={(v) => setCampos({ ...campos, ocultar_checkout: v })} label="Ocultar Pagamento (Checkout)" />
                </div>
              </section>
            </motion.div>
          )}

          {/* ==========================================
              TAB 2: FORMAS DE ATENDIMENTO
              ========================================== */}
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
                    onChange={(v) => setCampos({ ...campos, modalidade_padrao: v })} 
                    options={campos.modalidades_opcoes.map((m) => ({ value: m.nome, label: m.nome }))}
                  />
                  <p className="text-xs font-bold text-blue-700/80 dark:text-blue-400 uppercase tracking-widest mt-3">
                    A modalidade acima será aplicada automaticamente caso a etapa de seleção esteja oculta.
                  </p>
                </div>

                <div className="space-y-4">
                  {campos.modalidades_opcoes.map((mod) => (
                    <div key={mod.id} className="p-6 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                      <div className="flex-1 w-full grid md:grid-cols-2 gap-4">
                        <TextInput label="Nome da Modalidade" value={mod.nome} onChange={(e) => updateModalidade(mod.id, "nome", e.target.value)} />
                        {mod.exige_senha && (
                          <TextInput label="Senha Exigida para Liberar" value={mod.senha || ""} onChange={(e) => updateModalidade(mod.id, "senha", e.target.value)} />
                        )}
                      </div>
                      <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                        <ToggleSwitch checked={mod.exige_senha} onChange={(v) => updateModalidade(mod.id, "exige_senha", v)} label="Exigir Senha" />
                        <button onClick={() => removeModalidade(mod.id)} className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {/* ==========================================
              TAB 3: MENSAGENS AUTOMÁTICAS & NICHO/IDADE
              ========================================== */}
          {subTab === "mensagens" && (
            <motion.div key="mensagens" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={spring} className="space-y-8">
              <section className="bg-white dark:bg-[#111] border border-zinc-200/80 dark:border-zinc-800 p-8 rounded-[2.5rem] shadow-sm">
                
                {/* CONFIGURAÇÃO ERP */}
                <div className="mb-8 p-6 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-black text-purple-900 dark:text-purple-300 flex items-center gap-2">
                      <Sparkles size={16} className="text-purple-600 dark:text-purple-400" />
                      Geração de Mensagens para Atendimentos Importados do ERP
                    </h4>
                    <p className="text-xs text-purple-700/80 dark:text-purple-400/80 mt-1">
                      Quando ativo, novos atendimentos sincronizados pelo ERP Medicalsys geram mensagens em rascunho.
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={Boolean(campos.enviar_mensagens_importados_erp)}
                    onChange={(v) => setCampos({ ...campos, enviar_mensagens_importados_erp: v })}
                    label={campos.enviar_mensagens_importados_erp ? "Geração Ativada" : "Geração Pausada"}
                  />
                </div>

                {/* FILTROS DE PESQUISA */}
                <div className="p-6 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl mb-8 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                    <Filter size={14} /> Filtrar Mensagens Cadastradas
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <CustomSelect
                      label="Filtrar por Nicho / Especialidade"
                      value={filterEspecialidade}
                      onChange={setFilterEspecialidade}
                      options={[
                        { value: "Todas", label: "Todas as Especialidades e Serviços" },
                        ...especialidadesUnicas.map((e) => ({ value: e, label: e }))
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
                    <Plus size={16} /> Adicionar Mensagem
                  </button>
                </div>

                <div className="space-y-6">
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
                        <motion.div key={regra.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-[1.75rem] p-6 relative group flex flex-col lg:flex-row gap-8">
                          
                          <button onClick={() => removerRegra(regra.id)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white dark:bg-zinc-800 border border-red-100 flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm z-10">
                            <Trash2 size={14} />
                          </button>

                          <div className="flex-1 space-y-5">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="w-6 h-6 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black flex items-center justify-center text-xs font-bold">{index + 1}</span>
                              <h4 className="font-semibold text-zinc-900 dark:text-white text-sm">Critérios de Disparo da Mensagem</h4>
                            </div>
                            
                            {/* ALVO: NICHO / TIPO / ESPECIALIDADE */}
                            <CustomSelect
                              label="Nicho / Atendimento que receberá a mensagem"
                              value={regra.alvo || (regra.especialidade === "Todas" ? "Todas" : `especialidade:${regra.especialidade}`)}
                              onChange={(v) => atualizarRegra(regra.id, "alvo", v)}
                              options={alvoOptions}
                            />

                            {/* FILTRO DE IDADE DO PACIENTE */}
                            <div className="p-4 bg-zinc-100/70 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                                  <UserCheck size={13} /> Filtro de Faixa Etária (Idade)
                                </span>
                              </div>
                              
                              <CustomSelect
                                label="Critério de Idade do Paciente"
                                value={regra.filtro_idade_tipo || "todas"}
                                onChange={(v) => atualizarRegra(regra.id, "filtro_idade_tipo", v)}
                                options={[
                                  { value: "todas", label: "Todas as idades (Sem restrição)" },
                                  { value: "maior_que", label: "Apenas pacientes com idade maior ou igual a (>= X anos)" },
                                  { value: "menor_que", label: "Apenas pacientes com idade menor ou igual a (<= X anos)" },
                                  { value: "faixa", label: "Apenas pacientes dentro de uma faixa etária (De X a Y anos)" }
                                ]}
                              />

                              {regra.filtro_idade_tipo === "maior_que" && (
                                <div>
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Idade Mínima (Anos)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="120"
                                    value={regra.idade_minima ?? 65}
                                    onChange={(e) => atualizarRegra(regra.id, "idade_minima", Number(e.target.value))}
                                    placeholder="Ex: 65"
                                    className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none"
                                  />
                                  <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-1 font-medium">
                                    💡 A mensagem será enviada apenas para pacientes com {regra.idade_minima ?? 65} anos ou mais.
                                  </p>
                                </div>
                              )}

                              {regra.filtro_idade_tipo === "menor_que" && (
                                <div>
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Idade Máxima (Anos)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="120"
                                    value={regra.idade_maxima ?? 18}
                                    onChange={(e) => atualizarRegra(regra.id, "idade_maxima", Number(e.target.value))}
                                    placeholder="Ex: 18"
                                    className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none"
                                  />
                                </div>
                              )}

                              {regra.filtro_idade_tipo === "faixa" && (
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">De (Anos)</label>
                                    <input
                                      type="number"
                                      value={regra.idade_minima ?? 60}
                                      onChange={(e) => atualizarRegra(regra.id, "idade_minima", Number(e.target.value))}
                                      className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Até (Anos)</label>
                                    <input
                                      type="number"
                                      value={regra.idade_maxima ?? 80}
                                      onChange={(e) => atualizarRegra(regra.id, "idade_maxima", Number(e.target.value))}
                                      className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* GATILHO */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="col-span-2">
                                <CustomSelect label="Gatilho / Categoria da Mensagem" value={regra.gatilho} onChange={(v) => atualizarRegra(regra.id, "gatilho", v)} options={gatilhoOptions} />
                              </div>
                              
                              {regra.gatilho === "pos_atendimento" ? (
                                <div className="col-span-2 space-y-4 p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl">
                                  <CustomSelect
                                    label="Momento de Referência do Envio"
                                    value={regra.referencia_pos || "termino"}
                                    onChange={(v) => atualizarRegra(regra.id, "referencia_pos", v)}
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
                                          onChange={(e) => atualizarRegra(regra.id, "dias_depois", e.target.value)}
                                          className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-sm font-medium outline-none"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1 mb-1.5 block">Hora de Envio</label>
                                        <input
                                          type="time"
                                          value={regra.hora_envio || "08:00"}
                                          onChange={(e) => atualizarRegra(regra.id, "hora_envio", e.target.value)}
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
                                            onChange={(e) => atualizarRegra(regra.id, "offset_valor", Number(e.target.value))}
                                            className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-sm font-medium outline-none"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1 mb-1.5 block">Unidade de Tempo</label>
                                          <select
                                            value={regra.offset_unidade || "minutos"}
                                            onChange={(e) => atualizarRegra(regra.id, "offset_unidade", e.target.value)}
                                            className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-sm font-medium outline-none text-zinc-800 dark:text-zinc-200"
                                          >
                                            <option value="minutos">Minutos</option>
                                            <option value="horas">Horas</option>
                                            <option value="segundos">Segundos</option>
                                          </select>
                                        </div>
                                      </div>

                                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                        <span className="text-[10px] text-zinc-400 font-bold uppercase mr-1">Atalhos:</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            atualizarRegra(regra.id, "referencia_pos", "termino");
                                            atualizarRegra(regra.id, "offset_valor", 0);
                                            atualizarRegra(regra.id, "offset_unidade", "minutos");
                                          }}
                                          className="px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold rounded-lg hover:bg-zinc-100"
                                        >
                                          Ao terminar (0 min)
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            atualizarRegra(regra.id, "referencia_pos", "termino");
                                            atualizarRegra(regra.id, "offset_valor", 20);
                                            atualizarRegra(regra.id, "offset_unidade", "minutos");
                                          }}
                                          className="px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold rounded-lg hover:bg-zinc-100"
                                        >
                                          20 min após término
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            atualizarRegra(regra.id, "referencia_pos", "termino");
                                            atualizarRegra(regra.id, "offset_valor", 1);
                                            atualizarRegra(regra.id, "offset_unidade", "horas");
                                          }}
                                          className="px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold rounded-lg hover:bg-zinc-100"
                                        >
                                          1 hora após término
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : regra.gatilho === "agendado" ? (
                                <>
                                  <div>
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1 mb-1.5 block">Dias Antes</label>
                                    <input type="number" min="0" max="30" value={regra.dias_antes ?? 1} onChange={(e) => atualizarRegra(regra.id, "dias_antes", e.target.value)} className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-sm font-medium outline-none" />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1 mb-1.5 block">Hora de Envio</label>
                                    <input type="time" value={regra.hora_envio || "08:00"} onChange={(e) => atualizarRegra(regra.id, "hora_envio", e.target.value)} className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-sm font-medium outline-none" />
                                  </div>
                                </>
                              ) : (
                                <div className="col-span-2 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 rounded-xl flex items-center gap-3">
                                  <Zap size={20} className="text-amber-500" />
                                  <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                                    A mensagem será enviada no momento exato em que o evento ocorrer ({gatilhoOptions.find((g) => g.value === regra.gatilho)?.label}).
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex-1 flex flex-col justify-end space-y-3">
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
                                onChange={(e) => atualizarRegra(regra.id, "mensagem", e.target.value)}
                                placeholder="Digite aqui o que o paciente vai receber..."
                                className="w-full bg-transparent text-sm font-medium text-[#111B21] dark:text-zinc-100 outline-none min-h-[160px] resize-none custom-scrollbar placeholder:text-[#5e7769]"
                              />
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

    </motion.div>
  );
}
