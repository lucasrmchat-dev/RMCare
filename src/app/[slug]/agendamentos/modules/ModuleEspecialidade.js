"use client";  
import { useEffect } from "react";
import { motion } from "framer-motion";  
import { ChevronLeft, Stethoscope, User, RefreshCw } from "lucide-react";  
import { useAgendamento } from "../context";  

export default function ModuleEspecialidade() {      
    const { formData, setValue, servicosDB, flags, setFlags, modulosAtivos, setCurrentStepIndex, perguntasAtuais } = useAgendamento();      
    
    // Extrai as especialidades separando as que contém vírgula e remove duplicatas   
    const especialidades = [...new Set(     
        servicosDB       
        .filter(s => s.especialidade)       
        .flatMap(s => s.especialidade.split(',').map(e => e.trim()))   
    )].sort();
    
    // Ao montar a tela se o usuário havia selecionado um profissional e voltou, limpa para pedir especialidade primeiro
    useEffect(() => {
      if (formData.especialidade && formData.medico_profissional) {
        // Mantém a especialidade mas limpa o médico para forçar o direcionamento correto
        setValue("medico_profissional", "");
        setValue("subtipo_exame", "");
      }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (          
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="max-w-2xl mx-auto space-y-6">              
            <div>         
                <h2 className="text-3xl font-medium text-zinc-900 dark:text-white">Direcionamento</h2>         
                <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">           
                    {!formData.especialidade ? "Escolha primeiro a especialidade desejada para listar os especialistas." : `Especialidade escolhida: ${formData.especialidade}. Escolha o profissional.`}         
                </p>       
            </div>                            
            
            {flags.exibirConfUri && !flags.confirmouUri ? (                  
                <div className="text-center max-w-md mx-auto py-6">                      
                    <h3 className="text-2xl font-medium text-zinc-900 dark:text-white">Verificação de Agendamento</h3>                      
                    <p className="text-zinc-500 text-sm mt-2">Você selecionou através do WhatsApp:</p>                                            
                    <div className="my-6 inline-block bg-zinc-50 dark:bg-[#111111] border border-zinc-200 dark:border-zinc-800 px-8 py-5 rounded-3xl w-full shadow-sm">                          
                        <span className="block font-semibold text-lg text-zinc-900 dark:text-white">{formData.medico_profissional}</span>                          
                        <span className="block text-[11px] font-bold text-zinc-400 uppercase mt-2 tracking-widest">Profissional</span>                      
                    </div>                      
                    <div className="flex flex-col sm:flex-row gap-3 mt-4">                          
                        <button onClick={() => {                                
                                setFlags(f => ({...f, confirmouUri: true}));                                
                                const idxTriagem = modulosAtivos.indexOf("triagem");                               
                                const idxModalidade = modulosAtivos.indexOf("modalidade");                               
                                if (idxTriagem !== -1 && perguntasAtuais.length > 0) return setCurrentStepIndex(idxTriagem);                               
                                if (idxModalidade !== -1) return setCurrentStepIndex(idxModalidade);                               
                                setCurrentStepIndex(p => p + 1);                            
                            }} className="w-full sm:w-1/2 py-3.5 bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-black rounded-full font-bold text-sm shadow-md transition-transform hover:scale-[1.02]">                              
                            Continuar                          
                        </button>                          
                        <button onClick={() => {                
                                setFlags(f => ({...f, exibirConfUri: false}));                
                                setValue("medico_profissional", "");                
                                setValue("especialidade", "");             
                            }} className="w-full sm:w-1/2 py-3.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-[#111111] rounded-full font-medium text-sm transition-colors text-zinc-900 dark:text-white">                              
                            Selecionar outro profissional                          
                        </button>                      
                    </div>                  
                </div>              
            ) : (                  
                <div className="w-full">                                 
                    {!formData.especialidade ? (             
                        // PASSO 1: TELA DE ESPECIALIDADES             
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">                                
                            {especialidades.length > 0 ? especialidades.map(esp => (                                    
                                <button                    
                                    key={esp}                    
                                    onClick={() => {                     
                                        setValue("especialidade", esp);                     
                                        setValue("medico_profissional", "");                     
                                        setValue("tipo_servico", "");                     
                                    }}                    
                                    className="p-5 border rounded-2xl flex items-center gap-4 text-left transition-all border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white dark:bg-[#0A0A0A] shadow-sm hover:shadow-md"                 
                                >                   
                                    <Stethoscope size={24} className="text-blue-500" />                   
                                    <span className="font-bold text-zinc-900 dark:text-white text-base">{esp}</span>                 
                                </button>                                
                            )) : (                 
                                <div className="col-span-2 p-8 text-center border border-dashed rounded-3xl border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-[#111111]">                   
                                    <p className="text-zinc-500 font-medium">Nenhuma especialidade cadastrada ainda.</p>                   
                                    <p className="text-sm text-zinc-400 mt-2">Cadastre as especialidades dos serviços no painel administrativo para exibi-las aqui.</p>                 
                                </div>               
                            )}                            
                        </div>           
                    ) : (             
                        // PASSO 2: TELA DE MÉDICOS (ESPECIALISTAS)             
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">               
                            <button                  
                                onClick={() => {                    
                                    setValue("especialidade", "");                    
                                    setValue("medico_profissional", "");                  
                                }}                  
                                className="flex items-center gap-2 mb-6 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 transition-colors"               
                            >                 
                                <ChevronLeft size={16} /> Voltar e Escolher Outra Especialidade               
                            </button>                              
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">                                  
                                {servicosDB                   
                                    .filter(s => s.especialidade && s.especialidade.split(',').map(e => e.trim()).includes(formData.especialidade))                   
                                    .map(m => (                                      
                                        <button                      
                                            key={m.id}                      
                                            onClick={() => {
                                                const tipo = m.tipo || "Consulta";
                                                setValue("tipo_servico", tipo);
                                                setValue("medico_profissional", tipo === "Exame" ? "" : m.nome);
                                                setValue("subtipo_exame", tipo === "Exame" ? m.nome : "");
                                                setValue("modalidade", "");
                                                setValue("data_agendamento", "");
                                                setValue("horario_agendamento", "");
                                            }}                     
                                            className={`p-5 border rounded-2xl flex items-center justify-between text-left transition-all ${                       
                                                formData.medico_profissional === m.nome || formData.subtipo_exame === m.nome
                                                ? "border-zinc-900 bg-zinc-50 dark:border-white dark:bg-[#111111] shadow-md scale-[1.02]"                          
                                                : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white dark:bg-[#0A0A0A]"                     
                                            }`}                   
                                        >                     
                                            <div className="flex items-center gap-4">
                                                <User size={24} className={formData.medico_profissional === m.nome ? "text-zinc-900 dark:text-white" : "text-zinc-400"} />                     
                                                <div>                       
                                                    <span className={`block ${formData.medico_profissional === m.nome ? "font-bold text-zinc-900 dark:text-white" : "font-medium text-zinc-700 dark:text-zinc-300"}`}>                         
                                                        {m.nome}                       
                                                    </span>                       
                                                    <span className="text-[11px] text-zinc-500 uppercase tracking-widest mt-1 block">Especialista</span>                     
                                                </div>                   
                                            </div>
                                            {m.agendamento_bloqueado_ate && (
                                                <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-md">
                                                    Pausado até {new Date(`${m.agendamento_bloqueado_ate}T12:00:00`).toLocaleDateString("pt-BR")}
                                                </span>
                                            )}
                                        </button>                                  
                                ))}                              
                            </div>             
                        </div>           
                    )}         
                </div>              
            )}          
        </motion.div>      
    );  
}
