// src/app/admin/empresa/modules/PersonalizacaoView.js
"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Save, MessageSquare, LayoutTemplate, Plus, Trash2, Zap, CheckCircle2, ListChecks, Lock } from "lucide-react";
import { fadeUp, ButtonPrimary, ToggleSwitch, CustomSelect, TextInput, spring } from "../components/SharedUI";
import { supabase } from "@/lib/supabase";

export default function PersonalizacaoView({ showToast }) {
  const [activeTab, setActiveTab] = useState("jornada");
  const [loading, setLoading] = useState(false);
  const [empresaId, setEmpresaId] = useState(null);
  
  const [campos, setCampos] = useState({
    mostrar_cpf: true, mostrar_sobrenome: true, mostrar_whatsapp: true, mostrar_nascimento: true, mostrar_email: true,
    ocultar_triagem: false, ocultar_modalidade: false, ocultar_checkout: false,
    modalidade_padrao: "Particular",
    modalidades_opcoes: [
      { id: "1", nome: "Particular", exige_senha: false, senha: "" },
      { id: "2", nome: "Convênio", exige_senha: false, senha: "" }
    ]
  });
  
  const [regrasMensagens, setRegrasMensagens] = useState([]);
  const [especialidadesUnicas, setEspecialidadesUnicas] = useState([]);

  useEffect(() => {
    const fetchDados = async () => {
      const { data: emp } = await supabase.from('empresas').select('id, config_campos, config_mensagens').limit(1).single();
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
      
      const { data: srvs } = await supabase.from('servicos').select('especialidade').not('especialidade', 'is', null);
      if (srvs) {
        const unicas = [...new Set(
          srvs.flatMap(s => s.especialidade.split(',').map(e => e.trim()))
        )].sort();
        setEspecialidadesUnicas(unicas);
      }
    };
    fetchDados();
  }, []);

  const handleSave = async () => {
    if (!empresaId) {
      showToast("Erro: ID da clínica não encontrado.", "error");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.from('empresas')
        .update({
          config_campos: campos,
          config_mensagens: regrasMensagens
        })
        .eq('id', empresaId)
        .select();
      
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Bloqueio de segurança (RLS) no Supabase.");
      
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
    const novaRegra = { id: Date.now().toString(), especialidade: "Todas", gatilho: "imediato", dias_antes: 1, hora_envio: "08:00", mensagem: "Olá {nome}, seu agendamento de {servico} está confirmado!" };
    setRegrasMensagens([novaRegra, ...regrasMensagens]);
  };
  const atualizarRegra = (id, campo, valor) => setRegrasMensagens(regrasMensagens.map(r => r.id === id ? { ...r, [campo]: valor } : r));
  const removerRegra = (id) => setRegrasMensagens(regrasMensagens.filter(r => r.id !== id));

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

  const espOptions = [{ value: "Todas", label: "Geral (Aplicar para todas)" }, ...especialidadesUnicas.map(e => ({ value: e, label: e }))];

  return (
    <motion.div key="personalizacao" {...fadeUp} className="flex-1 flex flex-col h-full overflow-hidden w-full max-w-7xl mx-auto relative bg-[#F4F4F5]">
      
      <div className="mb-8 px-6 pt-8 md:px-10 md:pt-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div>
          <h2 className="text-3xl font-black text-zinc-900 tracking-tight flex items-center gap-3">
            Personalização <LayoutTemplate size={24} className="text-blue-500" />
          </h2>
          <p className="text-sm text-zinc-500 mt-2 font-medium">
            Molde a experiência do seu paciente. Personalize jornadas, dados e mensagens.
          </p>
        </div>
        
        <LayoutGroup>
          <div className="flex p-1.5 bg-white border border-zinc-200/80 rounded-2xl shadow-sm overflow-x-auto">
            <button 
              onClick={() => setActiveTab("jornada")}
              className={`relative px-5 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-colors z-10 whitespace-nowrap ${activeTab === "jornada" ? "text-white" : "text-zinc-500 hover:text-zinc-900"}`}
            >
              {activeTab === "jornada" && <motion.div layoutId="tab-pill-pers" className="absolute inset-0 bg-zinc-900 rounded-xl -z-10 shadow-md" transition={spring} />}
              Jornada & Campos
            </button>
            <button 
              onClick={() => setActiveTab("modalidades")}
              className={`relative px-5 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-colors z-10 whitespace-nowrap ${activeTab === "modalidades" ? "text-white" : "text-zinc-500 hover:text-zinc-900"}`}
            >
              {activeTab === "modalidades" && <motion.div layoutId="tab-pill-pers" className="absolute inset-0 bg-zinc-900 rounded-xl -z-10 shadow-md" transition={spring} />}
              Métodos de Atendimento
            </button>
            <button 
              onClick={() => setActiveTab("mensagens")}
              className={`relative px-5 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-colors z-10 whitespace-nowrap ${activeTab === "mensagens" ? "text-white" : "text-zinc-500 hover:text-zinc-900"}`}
            >
              {activeTab === "mensagens" && <motion.div layoutId="tab-pill-pers" className="absolute inset-0 bg-zinc-900 rounded-xl -z-10 shadow-md" transition={spring} />}
              Automações WhatsApp
            </button>
          </div>
        </LayoutGroup>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 md:px-10 pb-32 space-y-8">
        
        <AnimatePresence mode="wait">
          
          {/* TAB 1: JORNADA & CAMPOS */}
          {activeTab === "jornada" && (
            <motion.div key="jornada" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={spring} className="space-y-8">
              <section className="bg-white border border-zinc-200/80 p-8 rounded-[2rem] shadow-sm">
                <h3 className="text-lg font-black text-zinc-900 mb-6 border-b border-zinc-100 pb-4">
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
                <div className="grid md:grid-cols-2 gap-6 p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <ToggleSwitch checked={campos.ocultar_triagem} onChange={(v) => setCampos({...campos, ocultar_triagem: v})} label="Ocultar Etapa de Triagem" />
                  <ToggleSwitch checked={campos.ocultar_modalidade} onChange={(v) => setCampos({...campos, ocultar_modalidade: v})} label="Ocultar Particular/Convênio" />
                  <ToggleSwitch checked={campos.ocultar_checkout} onChange={(v) => setCampos({...campos, ocultar_checkout: v})} label="Ocultar Pagamento (Checkout)" />
                </div>
              </section>
            </motion.div>
          )}

          {/* TAB 2: MODALIDADES */}
          {activeTab === "modalidades" && (
            <motion.div key="modalidades" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={spring} className="space-y-8">
              <section className="bg-white border border-zinc-200/80 p-8 rounded-[2rem] shadow-sm">
                
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4 border-b border-zinc-100 pb-6">
                  <div>
                    <h3 className="text-lg font-black text-zinc-900 flex items-center gap-2">
                      <ListChecks size={18} className="text-indigo-500" /> Modalidades & Coberturas
                    </h3>
                    <p className="text-xs text-zinc-500 mt-2">
                      Defina os métodos aceitos e exija senha para liberar o agendamento em opções restritas.
                    </p>
                  </div>
                  <button onClick={addModalidade} className="flex items-center justify-center gap-2 px-5 py-3 bg-zinc-900 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-black transition-transform shadow-md">
                    <Plus size={16} /> Adicionar Método
                  </button>
                </div>

                <div className="mb-10 p-6 bg-blue-50/50 border border-blue-100 rounded-2xl">
                  <CustomSelect 
                    label="Modalidade Padrão (Fallback)" 
                    value={campos.modalidade_padrao} 
                    onChange={v => setCampos({...campos, modalidade_padrao: v})} 
                    options={campos.modalidades_opcoes.map(m => ({value: m.nome, label: m.nome}))}
                  />
                  <p className="text-xs font-bold text-blue-700/80 uppercase tracking-widest mt-3">
                    A modalidade padrão será aplicada automaticamente a todos os agendamentos caso você ative "Ocultar Particular/Convênio" na aba anterior.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <AnimatePresence>
                    {campos.modalidades_opcoes.map((mod) => (
                      <motion.div key={mod.id} initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.95}} className="p-6 bg-white border border-zinc-200 shadow-sm hover:shadow-md transition-shadow rounded-2xl relative group flex flex-col gap-5">
                        
                        <button onClick={() => removeModalidade(mod.id)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white border border-red-100 flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 size={14} />
                        </button>

                        <TextInput value={mod.nome} onChange={(e) => updateModalidade(mod.id, 'nome', e.target.value)} label="Nome do Método (Ex: Cartão de Todos)" />
                        
                        <div className="pt-2 border-t border-zinc-100 flex flex-col gap-4">
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

          {/* TAB 3: MENSAGENS */}
          {activeTab === "mensagens" && (
            <motion.div key="mensagens" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={spring} className="space-y-8">
              <section className="bg-white border border-zinc-200/80 p-8 rounded-[2rem] shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4 border-b border-zinc-100 pb-6">
                  <div>
                    <h3 className="text-lg font-black text-zinc-900 flex items-center gap-2">
                      <MessageSquare size={18} className="text-green-500" /> Automações de WhatsApp
                    </h3>
                    <p className="text-xs text-zinc-500 mt-2 flex flex-wrap gap-2">
                      Variáveis: 
                      <span className="bg-zinc-100 px-2 py-1 rounded font-mono text-zinc-700">{"{nome}"}</span>
                      <span className="bg-zinc-100 px-2 py-1 rounded font-mono text-zinc-700">{"{servico}"}</span>
                      <span className="bg-zinc-100 px-2 py-1 rounded font-mono text-zinc-700">{"{data}"}</span>
                      <span className="bg-zinc-100 px-2 py-1 rounded font-mono text-zinc-700">{"{hora}"}</span>
                      <span className="bg-zinc-100 px-2 py-1 rounded font-mono text-zinc-700">{"{especialidade}"}</span>
                    </p>
                  </div>
                  <button onClick={adicionarNovaRegra} className="flex items-center justify-center gap-2 px-5 py-3 bg-zinc-900 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-black transition-transform shadow-md">
                    <Plus size={16} /> Nova Mensagem
                  </button>
                </div>

                <div className="space-y-8">
                  <AnimatePresence>
                    {regrasMensagens.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-zinc-200 rounded-3xl bg-zinc-50">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                          <MessageSquare size={24} className="text-zinc-300" />
                        </div>
                        <h4 className="text-zinc-900 font-bold mb-1">Nenhuma automação ativa</h4>
                        <p className="text-zinc-500 text-sm">Seus pacientes não receberão mensagens no WhatsApp.</p>
                      </div>
                    ) : (
                      regrasMensagens.map((regra, index) => (
                        <motion.div key={regra.id} initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, scale:0.95}} className="bg-zinc-50/50 border border-zinc-200 rounded-[1.5rem] p-6 relative group flex flex-col lg:flex-row gap-8">
                          
                          <button onClick={() => removerRegra(regra.id)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white border border-red-100 flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm z-10">
                            <Trash2 size={14} />
                          </button>

                          <div className="flex-1 space-y-5">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="w-6 h-6 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-bold">{index + 1}</span>
                              <h4 className="font-bold text-zinc-900 text-sm uppercase tracking-widest">Configuração da Regra</h4>
                            </div>
                            
                            <CustomSelect label="Alvo (Especialidade)" value={regra.especialidade} onChange={(v) => atualizarRegra(regra.id, 'especialidade', v)} options={espOptions} />
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="col-span-2">
                                <CustomSelect label="Quando Enviar?" value={regra.gatilho} onChange={(v) => atualizarRegra(regra.id, 'gatilho', v)} options={[ {value: "imediato", label: "Na hora do Agendamento"}, {value: "agendado", label: "Programar para o Futuro"} ]} />
                              </div>
                              
                              {regra.gatilho === "agendado" ? (
                                <>
                                  <div>
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1 mb-1.5 block">Dias Antes da Consulta</label>
                                    <input type="number" min="0" max="30" value={regra.dias_antes} onChange={(e) => atualizarRegra(regra.id, 'dias_antes', e.target.value)} className="w-full px-4 py-3 bg-white border border-zinc-200/80 rounded-xl text-sm font-medium outline-none" />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1 mb-1.5 block">Hora de Envio</label>
                                    <input type="time" value={regra.hora_envio} onChange={(e) => atualizarRegra(regra.id, 'hora_envio', e.target.value)} className="w-full px-4 py-3 bg-white border border-zinc-200/80 rounded-xl text-sm font-medium outline-none" />
                                  </div>
                                </>
                              ) : (
                                <div className="col-span-2 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-3">
                                  <Zap size={20} className="text-amber-500" />
                                  <p className="text-xs font-bold text-amber-700">A mensagem será enviada instantaneamente assim que o paciente finalizar.</p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex-1 flex flex-col justify-end">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1 mb-2 block">Texto da Mensagem</label>
                            <div className="bg-[#E1F6CB] p-5 rounded-3xl rounded-tr-sm shadow-sm relative border border-[#c1e89e]">
                              <textarea
                                value={regra.mensagem}
                                onChange={(e) => atualizarRegra(regra.id, 'mensagem', e.target.value)}
                                placeholder="Digite aqui o que o paciente vai receber..."
                                className="w-full bg-transparent text-sm font-medium text-[#111B21] outline-none min-h-[160px] resize-none custom-scrollbar placeholder:text-[#5e7769]"
                              />
                              <div className="absolute bottom-2 right-4 text-[10px] font-bold text-[#5e7769] flex items-center gap-1">
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

      {/* RODAPÉ FIXO PARA SALVAR (SEMPRE VISÍVEL EM QUALQUER ABA) */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-zinc-200/80 flex justify-end items-center z-50">
        <ButtonPrimary onClick={handleSave} disabled={loading} icon={Save} className="w-full md:w-auto px-12 py-4 text-sm">
          {loading ? "Salvando Alterações..." : "Salvar Configurações do Painel"}
        </ButtonPrimary>
      </div>

    </motion.div>
  );
}