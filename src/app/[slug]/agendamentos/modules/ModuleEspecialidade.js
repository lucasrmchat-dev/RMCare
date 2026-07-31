"use client";  
import { motion } from "framer-motion";  
import { ChevronLeft, Stethoscope, User } from "lucide-react";  
import { useAgendamento } from "../context";  

export default function ModuleEspecialidade() {      
    const { formData, setValue, servicosDB, flags, setFlags, modulosAtivos, setCurrentStepIndex, perguntasAtuais } = useAgendamento();      
    
    // Extrai as especialidades separando as que contém vírgula e remove duplicatas   
    const especialidades = [...new Set(     
        servicosDB       
        .filter(s => s.especialidade)       
        .flatMap(s => s.especialidade.split(',').map(e => e.trim()))   
    )].sort(); // Ordem alfabética para ficar organizado   
    
    return (          
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="max-w-2xl mx-auto space-y-6">              
            <div>         
                <h2 className="text-3xl font-medium">Direcionamento</h2>         
                <p className="text-zinc-500 text-sm mt-2">           
                    {!formData.especialidade ? "Selecione a especialidade desejada." : "Selecione o especialista."}         
                </p>       
            </div>                            
            
            {flags.exibirConfUri && !flags.confirmouUri ? (                  
                <div className="text-center max-w-md mx-auto py-6">                      
                    <h3 className="text-2xl font-medium">Verificação de Agendamento</h3>                      
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
                                        setValue("tipo_servico", ""); // Limpa o tipo para a próxima etapa decidir                    
                                    }}                    
                                    className="p-5 border rounded-2xl flex items-center gap-4 text-left transition-all border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white dark:bg-[#0A0A0A]"                 
                                >                   
                                    <Stethoscope size={24} className="text-zinc-400" />                   
                                    <span className="font-medium text-zinc-900 dark:text-white text-base">{esp}</span>                 
                                </button>                                
                            )) : (                 
                                <div className="col-span-2 p-8 text-center border border-dashed rounded-3xl border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-[#111111]">                   
                                    <p className="text-zinc-500 font-medium">Nenhuma especialidade cadastrada ainda.</p>                   
                                    <p className="text-sm text-zinc-400 mt-2">Vá no Supabase e substitua os valores "NULL" da coluna "especialidade" pelos nomes corretos.</p>                 
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
                                className="flex items-center gap-2 mb-6 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"               
                            >                 
                                <ChevronLeft size={18} /> Voltar para Especialidades               
                            </button>                              
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">                                  
                                {servicosDB                   
                                    .filter(s => s.especialidade && s.especialidade.split(',').map(e => e.trim()).includes(formData.especialidade))                   
                                    .map(m => (                                      
                                        <button                      
                                            key={m.id}                      
                                            onClick={() => {
                                                setValue("medico_profissional", m.nome);
                                                setValue("tipo_servico", m.tipo || "Consulta"); // Define o tipo real advindo do banco
                                            }}                      
                                            className={`p-5 border rounded-2xl flex items-center gap-4 text-left transition-all ${                       
                                                formData.medico_profissional === m.nome                          
                                                ? "border-zinc-900 bg-zinc-50 dark:border-white dark:bg-[#111111] shadow-md scale-[1.02]"                          
                                                : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white dark:bg-[#0A0A0A]"                     
                                            }`}                   
                                        >                     
                                            <User size={24} className={formData.medico_profissional === m.nome ? "text-zinc-900 dark:text-white" : "text-zinc-400"} />                     
                                            <div>                       
                                                <span className={`block ${formData.medico_profissional === m.nome ? "font-bold text-zinc-900 dark:text-white" : "font-medium text-zinc-700 dark:text-zinc-300"}`}>                         
                                                    {m.nome}                       
                                                </span>                       
                                                <span className="text-[11px] text-zinc-500 uppercase tracking-widest mt-1 block">Especialista</span>                     
                                            </div>                   
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