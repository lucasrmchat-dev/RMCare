"use client";

import { useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { 
  PenLine, Plus, X, Stethoscope, Code, Info, 
  DollarSign, CalendarDays, CheckCircle2, ChevronRight, Hash
} from "lucide-react";
import { fadeUp, staggerContainer, staggerItem, TextInput, CustomSelect, ButtonPrimary, ToggleSwitch, spring } from "../components/SharedUI";

// IMPORTAÇÕES DE ACTIONS
import { actionAtualizarServico, actionCriarServico } from "@/actions/adminData"; 

// ==========================================
// COMPONENTE: CARD DO SERVIÇO / PROFISSIONAL
// ==========================================
const ServicoCard = ({ srv, onEdit }) => {
  return (
    <motion.div 
      variants={staggerItem} 
      layoutId={`card-${srv.id}`} 
      className="bg-white border border-zinc-200/80 p-8 rounded-[2rem] shadow-sm hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] hover:border-zinc-300 transition-all duration-500 flex flex-col justify-between group relative overflow-hidden"
    >
      <button 
        onClick={() => onEdit(srv)} 
        className="absolute top-6 right-6 w-11 h-11 rounded-full bg-white/80 backdrop-blur-md border border-zinc-200/80 flex items-center justify-center text-zinc-400 opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 hover:text-zinc-900 hover:border-zinc-900 hover:bg-zinc-50 shadow-[0_8px_16px_rgba(0,0,0,0.06)] z-20"
        title="Editar Profissional/Serviço"
      >
        <PenLine size={18} strokeWidth={2.5} />
      </button>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100/80 text-zinc-600 text-[10px] font-black uppercase tracking-widest rounded-lg">
            <Stethoscope size={12} />
            {srv.tipo}
          </span>
          {!srv.ativo && (
            <span className="inline-flex items-center px-3 py-1.5 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-lg">
              Inativo
            </span>
          )}
        </div>
        
        <h3 className="font-black text-2xl text-zinc-900 mb-2 leading-tight pr-10">{srv.nome}</h3>
        
        <div className="flex items-center gap-4 mt-8 pt-6 border-t border-zinc-100/80">
          <div className="flex-1">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Valor</p>
            <p className="font-bold text-zinc-900 flex items-center gap-1">
              <DollarSign size={14} className="text-zinc-400" />
              {srv.preco ? Number(srv.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : "0,00"}
            </p>
          </div>
          <div className="w-px h-8 bg-zinc-200/60" />
          <div className="flex-1">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Bloqueio</p>
            <p className="font-bold text-zinc-900 flex items-center gap-1">
              <CalendarDays size={14} className="text-zinc-400" />
              {srv.dias_bloqueio_padrao > 0 ? `${srv.dias_bloqueio_padrao} ${srv.tipo_contagem_dias}` : "Sem restrição"}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ==========================================
// COMPONENTE: FORMULÁRIO (CADASTRO E EDIÇÃO)
// ==========================================
const ServicoForm = ({ initialData, onSave, onCancel, loading }) => {
  const isEditing = !!initialData?.id;
  
  const [formData, setFormData] = useState({
    id: initialData?.id || "",
    nome: initialData?.nome || "",
    tipo: initialData?.tipo || "Profissional",
    preco: initialData?.preco || "",
    dias_bloqueio_padrao: initialData?.dias_bloqueio_padrao || "",
    tipo_contagem_dias: initialData?.tipo_contagem_dias || "corridos",
    ativo: initialData?.ativo !== false
  });

  const [devModeEnabled, setDevModeEnabled] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData, isEditing);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 20 }}
      transition={spring}
      className="bg-white border border-zinc-200/80 rounded-[2.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col max-w-3xl mx-auto w-full relative z-50"
    >
      <div className="flex justify-between items-center px-8 md:px-10 py-8 border-b border-zinc-100 bg-zinc-50/50">
        <div>
          <h3 className="font-black text-2xl text-zinc-900 tracking-tight">
            {isEditing ? "Editar Profissional" : "Novo Profissional"}
          </h3>
          <p className="text-sm font-medium text-zinc-500 mt-1">
            {isEditing ? "Ajuste as configurações e regras de agendamento." : "Cadastre um novo profissional na plataforma."}
          </p>
        </div>
        <button 
          onClick={onCancel}
          className="w-12 h-12 rounded-full bg-white border border-zinc-200 text-zinc-400 hover:text-zinc-900 hover:border-zinc-900 hover:shadow-md transition-all flex items-center justify-center group"
        >
          <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </div>

      <div className="p-8 md:p-10 overflow-y-auto custom-scrollbar max-h-[65vh]">
        <div className="space-y-10">
          
          <section>
            <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-900 mb-6">
              <span className="w-6 h-6 rounded-md bg-zinc-900 text-white flex items-center justify-center">1</span>
              Informações Obrigatórias
            </h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <TextInput 
                  label="Nome do Profissional / Serviço *" 
                  placeholder="Ex: Dr. Carlos Eduardo (Cardiologia)" 
                  value={formData.nome} 
                  onChange={(e) => setFormData({...formData, nome: e.target.value})} 
                  required
                  autoFocus
                />
              </div>
              <CustomSelect 
                label="Categoria" 
                value={formData.tipo} 
                onChange={(val) => setFormData({...formData, tipo: val})} 
                options={[
                  {value: 'Profissional', label: 'Profissional Clínico'}, 
                  {value: 'Exame', label: 'Exame / Procedimento'}
                ]} 
              />
              <div className="flex items-center h-full pt-6">
                <ToggleSwitch 
                  checked={formData.ativo} 
                  onChange={(val) => setFormData({...formData, ativo: val})} 
                  label="Cadastro Ativo" 
                />
              </div>
            </div>
          </section>

          <section className="pt-8 border-t border-zinc-100">
            <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-900 mb-6">
              <span className="w-6 h-6 rounded-md bg-zinc-100 text-zinc-400 flex items-center justify-center">2</span>
              Precificação e Regras (Opcional)
            </h4>
            <div className="grid md:grid-cols-3 gap-6">
              <TextInput 
                label="Valor Total (R$)" 
                type="number" 
                placeholder="0.00"
                value={formData.preco} 
                onChange={(e) => setFormData({...formData, preco: e.target.value})} 
              />
              <TextInput 
                label="Dias de Bloqueio" 
                type="number" 
                placeholder="Ex: 5"
                value={formData.dias_bloqueio_padrao} 
                onChange={(e) => setFormData({...formData, dias_bloqueio_padrao: e.target.value})} 
              />
              <CustomSelect 
                label="Contagem" 
                value={formData.tipo_contagem_dias} 
                onChange={(val) => setFormData({...formData, tipo_contagem_dias: val})} 
                options={[
                  {value: 'corridos', label: 'Dias Corridos'}, 
                  {value: 'uteis', label: 'Dias Úteis'}
                ]} 
              />
            </div>
          </section>

          <section className="pt-8 border-t border-zinc-100">
            <button 
              type="button" 
              onClick={() => setDevModeEnabled(!devModeEnabled)}
              className="flex items-center justify-between w-full p-5 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/80 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-500 shadow-sm">
                  <Code size={18} />
                </div>
                <div className="text-left">
                  <h5 className="font-bold text-sm text-zinc-900 tracking-wide">Opções de Desenvolvedor</h5>
                  <p className="text-xs font-medium text-zinc-500 mt-0.5">Atribuir UUID ou ID externo específico</p>
                </div>
              </div>
              <ChevronRight size={18} className={`text-zinc-400 transition-transform duration-300 ${devModeEnabled ? 'rotate-90' : ''}`} />
            </button>

            <AnimatePresence>
              {devModeEnabled && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-6 pb-2">
                    <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                      
                      <div className="flex gap-3 mb-5">
                        <Info size={18} className="text-blue-500 mt-0.5" />
                        <p className="text-xs font-medium text-blue-800/80 leading-relaxed">
                          <strong>Atenção Dev:</strong> Preencha este campo apenas se precisar forçar uma associação de ID com o ERP legado ou realizar uma migração exata. Caso contrário, deixe em branco para o banco gerar o UUID.
                        </p>
                      </div>

                      <div className="relative">
                        <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 z-10" />
                        <input 
                          type="text" 
                          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                          value={formData.id}
                          onChange={(e) => setFormData({...formData, id: e.target.value})}
                          disabled={isEditing}
                          className="w-full pl-11 pr-4 py-3.5 bg-white border border-blue-200/80 rounded-xl text-sm font-mono text-zinc-900 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed placeholder:text-zinc-300"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

        </div>
      </div>

      <div className="px-8 md:px-10 py-6 border-t border-zinc-100 bg-zinc-50/80 flex flex-col sm:flex-row justify-end gap-4">
        <button 
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <ButtonPrimary 
          onClick={handleSubmit} 
          disabled={loading || !formData.nome.trim()} 
          icon={isEditing ? CheckCircle2 : Plus}
          className="w-full sm:w-auto"
        >
          {loading ? "Processando..." : (isEditing ? "Salvar Alterações" : "Cadastrar Profissional")}
        </ButtonPrimary>
      </div>
    </motion.div>
  );
};

// ==========================================
// COMPONENTE PRINCIPAL (VIEW)
// ==========================================
export default function FinanceiroView({ servicos, showToast, fetchServicos }) {
  const [activeTab, setActiveTab] = useState("catalogo"); 
  const [editingServico, setEditingServico] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleOpenForm = (servico = null) => {
    setEditingServico(servico);
    setActiveTab("formulario");
  };

  const handleCloseForm = () => {
    setEditingServico(null);
    setActiveTab("catalogo");
  };

  const handleSaveServico = async (formData, isEditing) => {
    setIsProcessing(true);
    try {
      // Sanitização do payload para o Supabase
      const payload = {
        nome: formData.nome.trim(),
        tipo: formData.tipo,
        ativo: formData.ativo,
        tipo_contagem_dias: formData.tipo_contagem_dias,
        preco: formData.preco ? parseFloat(formData.preco) : 0.00, // Preço não nulo no schema
        dias_bloqueio_padrao: formData.dias_bloqueio_padrao ? parseInt(formData.dias_bloqueio_padrao, 10) : 0,
      };

      // Se o dev inseriu um ID e não está editando, manda no payload
      if (!isEditing && formData.id && formData.id.trim() !== "") {
        payload.id = formData.id.trim();
      }

      if (isEditing) {
        await actionAtualizarServico(formData.id, payload);
        showToast("Profissional atualizado com sucesso!");
      } else {
        await actionCriarServico(payload); 
        showToast("Profissional cadastrado com sucesso!");
      }
      
      // Atualiza o estado global no orquestrador! (Isso tira o Empty State da tela)
      if (fetchServicos) {
        await fetchServicos();
      }
      
      handleCloseForm();
    } catch (error) {
      console.error(error);
      showToast(isEditing ? "Erro ao atualizar." : "Erro ao cadastrar. Verifique os dados.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div key="financeiro" {...fadeUp} className="p-6 md:p-10 mx-auto w-full max-w-7xl overflow-y-auto h-full custom-scrollbar relative">
      
      <div className="mb-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div>
          <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Catálogo e Profissionais</h2>
          <p className="text-sm text-zinc-500 mt-2 font-medium">
            Gerencie o corpo clínico, tabela de preços e os prazos de bloqueio de agenda.
          </p>
        </div>
        
        <LayoutGroup>
          <div className="flex p-1.5 bg-white border border-zinc-200/80 rounded-2xl shadow-sm">
            <button 
              onClick={handleCloseForm}
              className={`relative px-6 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-colors z-10 ${activeTab === "catalogo" ? "text-white" : "text-zinc-500 hover:text-zinc-900"}`}
            >
              {activeTab === "catalogo" && <motion.div layoutId="tab-pill" className="absolute inset-0 bg-zinc-900 rounded-xl -z-10 shadow-md" transition={spring} />}
              Ver Catálogo
            </button>
            <button 
              onClick={() => handleOpenForm(null)}
              className={`relative flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-colors z-10 ${activeTab === "formulario" && !editingServico ? "text-white" : "text-zinc-500 hover:text-zinc-900"}`}
            >
              {activeTab === "formulario" && !editingServico && <motion.div layoutId="tab-pill" className="absolute inset-0 bg-zinc-900 rounded-xl -z-10 shadow-md" transition={spring} />}
              <Plus size={14} /> Novo Cadastro
            </button>
          </div>
        </LayoutGroup>
      </div>
      
      <AnimatePresence mode="wait">
        
        {activeTab === "catalogo" && (
          <motion.div 
            key="grid"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={spring}
          >
            {servicos.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-20 text-center">
                 <div className="w-20 h-20 bg-white border border-zinc-200 rounded-[2rem] flex items-center justify-center text-zinc-300 mb-6 shadow-sm">
                   <Stethoscope size={28} />
                 </div>
                 <h4 className="text-lg font-bold text-zinc-900 mb-2">Nenhum profissional cadastrado</h4>
                 <p className="text-sm text-zinc-500 max-w-sm mb-6">Comece adicionando o corpo clínico para habilitar o agendamento no sistema.</p>
                 <ButtonPrimary onClick={() => handleOpenForm(null)} icon={Plus}>Adicionar Primeiro Cadastro</ButtonPrimary>
               </div>
            ) : (
              <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {servicos.map(srv => (
                  <ServicoCard key={srv.id} srv={srv} onEdit={handleOpenForm} />
                ))}
              </motion.div>
            )}
          </motion.div>
        )}

        {activeTab === "formulario" && (
          <motion.div 
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={spring}
            className="flex items-start justify-center py-4"
          >
            <ServicoForm 
              initialData={editingServico} 
              onSave={handleSaveServico} 
              onCancel={handleCloseForm} 
              loading={isProcessing} 
            />
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  );
}