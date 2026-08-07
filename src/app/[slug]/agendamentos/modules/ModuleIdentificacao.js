"use client"; 
import { motion } from "framer-motion"; 
import { useAgendamento } from "../context"; 
import { masks } from "../utils";
import { UserRound } from "lucide-react";

export default function ModuleIdentificacao() {
  const { renderLockedOrInput, empresaDados } = useAgendamento();
  
  // Lê as configurações do banco. Se não existir, mostra tudo por padrão.
  const config = empresaDados?.config_campos || {
    mostrar_cpf: true,
    mostrar_sobrenome: true,
    mostrar_whatsapp: true,
    mostrar_nascimento: true,
    mostrar_email: true
  };

  return (
    <motion.div initial="hidden" animate="show" variants={{show:{transition:{staggerChildren:.06}}}} className="max-w-xl mx-auto">
      <div className="mb-6">
        <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4"><UserRound size={21}/></div>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Como podemos chamar você?</h2>
        <p className="text-zinc-500 text-sm md:text-base mt-2">Usamos estes dados para identificar seu histórico e enviar a confirmação.</p>
      </div>
      
      <motion.div variants={{show:{transition:{staggerChildren:.04}}}} className="space-y-2">
        {/* O Nome é o único campo sempre obrigatório para o sistema não quebrar */}
        {config.mostrar_cpf !== false && renderLockedOrInput("cpf", "CPF", null, false, masks.cpf, "000.000.000-00", 14)}
        
        {renderLockedOrInput("nome", "Nome", null, false, null, "Seu nome", 50)}
        
        {config.mostrar_sobrenome !== false && renderLockedOrInput("sobrenome", "Sobrenome", null, false, null, "Seu sobrenome", 50)}
        {config.mostrar_whatsapp !== false && renderLockedOrInput("telefone_whatsapp", "WhatsApp", null, false, masks.phone, "(00) 00000-0000", 15)}
        {config.mostrar_nascimento !== false && renderLockedOrInput("data_nascimento", "Data de Nascimento", null, false, masks.date, "DD/MM/AAAA", 10)}
        {config.mostrar_email !== false && renderLockedOrInput("email", "E-mail", null, false, null, "seu@email.com", 100, "email")}
      </motion.div>
    </motion.div>
  );
}
