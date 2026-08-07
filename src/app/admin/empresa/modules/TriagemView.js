"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Trash2, ClipboardCheck } from "lucide-react";
import { fadeUp, staggerContainer, staggerItem, TextInput, CustomSelect, ButtonPrimary } from "../components/SharedUI";
import { actionSalvarTriagem, actionDeletarTriagem } from "@/actions/adminData";

export default function TriagemView({ perguntas, servicos, fetchPerguntas, showToast }) {
  const [isAddingTriagem, setIsAddingTriagem] = useState(false);
  const [novaTriagem, setNovaTriagem] = useState({ servico_id: "", pergunta: "", opcoes: [] });
  const [novaOpcao, setNovaOpcao] = useState({ texto_opcao: "", regra_bloqueio_dias: 0, tipo_contagem_dias: "corridos" });
  const [loading, setLoading] = useState(false);

  const adicionarOpcaoLocal = () => {
    if(!novaOpcao.texto_opcao) return showToast("Digite um texto para a opção", "error");
    setNovaTriagem(p => ({...p, opcoes: [...p.opcoes, {...novaOpcao, id: Date.now()}]}));
    setNovaOpcao({ texto_opcao: "", regra_bloqueio_dias: 0, tipo_contagem_dias: "corridos" });
  };
  
  const removerOpcaoLocal = (id) => setNovaTriagem(p => ({...p, opcoes: p.opcoes.filter(o => o.id !== id)}));
  
  const salvarNovaTriagem = async () => {
    if(!novaTriagem.pergunta || novaTriagem.opcoes.length === 0) return showToast("Preencha todos os campos e opções.", "error");
    setLoading(true);
    
    try {
      await actionSalvarTriagem(novaTriagem);
      showToast("Triagem cadastrada!"); 
      setIsAddingTriagem(false); 
      setNovaTriagem({ servico_id: "", pergunta: "", opcoes: [] }); 
      fetchPerguntas();
    } catch (error) {
      showToast("Erro ao salvar triagem.", "error");
    }
    setLoading(false);
  };

  const apagarTriagem = async (id) => {
    if(window.confirm("Apagar pergunta?")){
      try {
        await actionDeletarTriagem(id);
        fetchPerguntas();
        showToast("Removida.");
      } catch (error) {
        showToast("Erro ao remover triagem.", "error");
      }
    }
  };

  return (
    <motion.div key="triagem" {...fadeUp} className="p-6 md:p-10 mx-auto w-full max-w-5xl overflow-y-auto h-full custom-scrollbar">
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4"><ClipboardCheck size={21}/></div>
          <h2 className="text-3xl font-semibold text-zinc-900 tracking-tight">Formulários clínicos</h2>
          <p className="text-sm text-zinc-500 mt-2">Faça perguntas antes do agendamento e aplique uma espera automática conforme a resposta — por exemplo, 15 dias após uso de caneta emagrecedora.</p>
        </div>
        {!isAddingTriagem && (
          <ButtonPrimary onClick={() => setIsAddingTriagem(true)} icon={Plus}>Adicionar pergunta</ButtonPrimary>
        )}
      </div>

      <AnimatePresence>
        {isAddingTriagem && (
          <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} className="mb-10 bg-white border border-zinc-200/80 p-8 rounded-[2rem] shadow-[0_20px_40px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="flex justify-between items-center mb-8 border-b border-zinc-100 pb-6">
              <h3 className="font-semibold text-xl text-zinc-900">Nova pergunta clínica</h3>
              <button onClick={() => setIsAddingTriagem(false)} className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"><X size={18}/></button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <CustomSelect label="Atendimento em que a pergunta aparece" value={novaTriagem.servico_id} onChange={val => setNovaTriagem({...novaTriagem, servico_id: val})} options={[{value:"", label:"Todos os atendimentos"}, ...servicos.map(s => ({value: s.id, label:`${s.tipo || "Atendimento"} · ${s.nome}`}))]} />
              <TextInput label="Pergunta apresentada ao paciente" placeholder="Ex.: Usou caneta emagrecedora recentemente?" value={novaTriagem.pergunta} onChange={e => setNovaTriagem({...novaTriagem, pergunta: e.target.value})} />
            </div>

            <div className="bg-zinc-50/50 p-6 border border-zinc-200/60 rounded-3xl mb-8">
              <h4 className="text-[11px] font-bold uppercase text-zinc-400 tracking-widest mb-4 ml-1">Mapear Opções de Resposta</h4>
              <div className="flex flex-col lg:flex-row gap-4 items-end">
                <div className="flex-1 w-full"><TextInput label="Texto" placeholder="Ex: Sim" value={novaOpcao.texto_opcao} onChange={e => setNovaOpcao({...novaOpcao, texto_opcao: e.target.value})} /></div>
                <div className="w-full lg:w-32"><TextInput label="Bloqueio" type="number" value={novaOpcao.regra_bloqueio_dias} onChange={e => setNovaOpcao({...novaOpcao, regra_bloqueio_dias: e.target.value})} /></div>
                <div className="w-full lg:w-48"><CustomSelect label="Tipo" value={novaOpcao.tipo_contagem_dias} onChange={val => setNovaOpcao({...novaOpcao, tipo_contagem_dias: val})} options={[{value:'corridos',label:'Corridos'}, {value:'uteis',label:'Úteis'}]} /></div>
                <button onClick={adicionarOpcaoLocal} className="w-full lg:w-auto h-[52px] px-6 bg-white border border-zinc-200 text-zinc-900 rounded-xl font-bold flex items-center justify-center hover:border-zinc-900 hover:bg-zinc-50 transition-all shadow-sm"><Plus size={20}/></button>
              </div>

              {novaTriagem.opcoes.length > 0 && (
                <div className="mt-6 space-y-3">
                  {novaTriagem.opcoes.map(op => (
                    <div key={op.id} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm">
                      <div><span className="font-bold text-zinc-900">{op.texto_opcao}</span> <span className="bg-zinc-100 text-zinc-500 text-[10px] font-bold uppercase px-2 py-1 rounded ml-3">Impede {op.regra_bloqueio_dias} {op.tipo_contagem_dias}</span></div>
                      <button onClick={() => removerOpcaoLocal(op.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <ButtonPrimary disabled={loading} onClick={salvarNovaTriagem} className="w-full py-5">
              {loading ? "Salvando..." : "Salvar pergunta"}
            </ButtonPrimary>
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {perguntas.map(perg => (
          <motion.div variants={staggerItem} key={perg.id} className="bg-white border border-zinc-200/80 p-8 rounded-[2rem] shadow-sm relative group flex flex-col h-full">
            <button onClick={() => apagarTriagem(perg.id)} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white border border-red-100 text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 flex items-center justify-center shadow-sm"><Trash2 size={16} /></button>
            <div className="mb-8 pr-12">
              <span className="inline-block px-3 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-lg mb-4">{perg.servicos?.nome || "Geral"}</span>
              <h3 className="font-black text-xl text-zinc-900 leading-tight">{perg.pergunta}</h3>
            </div>
            <div className="grid gap-3 mt-auto">
              {perg.opcoes.map(op => (
                <div key={op.id} className="flex justify-between items-center p-4 bg-zinc-50 border border-zinc-100 rounded-xl">
                  <span className="text-sm font-bold text-zinc-700">{op.texto_opcao}</span>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase bg-white border px-2 py-1 rounded shadow-sm">+{op.regra_bloqueio_dias} {op.tipo_contagem_dias.charAt(0)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
