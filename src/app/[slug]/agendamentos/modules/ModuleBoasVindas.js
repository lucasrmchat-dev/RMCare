"use client"; 
import { motion } from "framer-motion"; 
import { useAgendamento } from "../context"; 

export default function ModuleBoasVindas() {   
  const { context } = useAgendamento();   
  
  return (     
    <motion.div 
      initial={{opacity:0}} 
      animate={{opacity:1}} 
      exit={{opacity:0}} 
      className="text-center mt-20 max-w-sm mx-auto"
    >       
      <h1 className="text-4xl md:text-5xl font-light">         
        Olá{context.personalizedName ? <><span className="font-medium">, {context.personalizedName}</span></> : ""}.       
      </h1>       
      <p className="text-zinc-500 mt-4 text-sm">
        Conectamos o seu painel de agendamento ao ambiente clínico em segurança.
      </p>     
    </motion.div>   
  );
}