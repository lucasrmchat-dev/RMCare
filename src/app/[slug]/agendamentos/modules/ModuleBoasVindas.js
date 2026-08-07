"use client"; 
import { motion } from "framer-motion"; 
import { useAgendamento } from "../context"; 
import { CalendarCheck, ShieldCheck, Sparkles } from "lucide-react";

export default function ModuleBoasVindas() {   
  const { context } = useAgendamento();   
  
  return (     
    <motion.div 
      initial={{opacity:0}} 
      animate={{opacity:1}} 
      exit={{opacity:0}} 
      className="text-center md:mt-12 max-w-md mx-auto"
    >       
      <motion.div initial={{scale:.7,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:"spring",stiffness:320,damping:22}} className="w-20 h-20 rounded-[1.75rem] bg-zinc-900 dark:bg-white text-white dark:text-black mx-auto flex items-center justify-center shadow-xl shadow-zinc-900/15 mb-7"><Sparkles size={30}/></motion.div>
      <motion.h1 initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{delay:.08}} className="text-4xl md:text-5xl font-semibold tracking-[-.04em]">         
        Olá{context.personalizedName ? <><span>, {context.personalizedName}</span></> : ""}.       
      </motion.h1>       
      <motion.p initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:.16}} className="text-zinc-500 mt-4 text-base leading-relaxed">
        Vamos encontrar o melhor horário para o seu atendimento. É rápido e seus dados ficam salvos neste dispositivo.
      </motion.p>
      <motion.div initial="hidden" animate="show" variants={{show:{transition:{delayChildren:.24,staggerChildren:.08}}}} className="grid grid-cols-2 gap-3 mt-8 text-left">
        {[{icon:CalendarCheck,title:"Poucos minutos",text:"Fluxo simples e guiado"},{icon:ShieldCheck,title:"Dados protegidos",text:"Retome se precisar sair"}].map(({icon:Icon,title,text}) => <motion.div variants={{hidden:{opacity:0,y:14},show:{opacity:1,y:0}}} key={title} className="p-4 rounded-2xl bg-white dark:bg-[#111] border border-zinc-200/80 dark:border-zinc-800"><Icon size={18} className="text-[#86a621] mb-3"/><strong className="block text-sm">{title}</strong><span className="text-xs text-zinc-500 mt-1 block">{text}</span></motion.div>)}
      </motion.div>     
    </motion.div>   
  );
}
