"use client"; 
import { motion } from "framer-motion"; 
import { useAgendamento } from "../context"; 
import { masks } from "../utils";

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
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="max-w-xl mx-auto">
      <div className="mb-6">
        <h2 className="text-3xl font-medium">Identificação</h2>
        <p className="text-zinc-500 text-sm mt-2">Por favor, preencha seus dados.</p>
      </div>
      
      <div className="space-y-2">
        {/* O Nome é o único campo sempre obrigatório para o sistema não quebrar */}
        {config.mostrar_cpf !== false && renderLockedOrInput("cpf", "CPF", null, false, masks.cpf, "000.000.000-00", 14)}
        
        {renderLockedOrInput("nome", "Nome", null, false, null, "Seu nome", 50)}
        
        {config.mostrar_sobrenome !== false && renderLockedOrInput("sobrenome", "Sobrenome", null, false, null, "Seu sobrenome", 50)}
        {config.mostrar_whatsapp !== false && renderLockedOrInput("telefone_whatsapp", "WhatsApp", null, false, masks.phone, "(00) 00000-0000", 15)}
        {config.mostrar_nascimento !== false && renderLockedOrInput("data_nascimento", "Data de Nascimento", null, false, masks.date, "DD/MM/AAAA", 10)}
        {config.mostrar_email !== false && renderLockedOrInput("email", "E-mail", null, false, null, "seu@email.com", 100, "email")}
      </div>
    </motion.div>
  );
}