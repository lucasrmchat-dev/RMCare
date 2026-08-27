"use client";

import { motion } from "framer-motion";
import { useAgendamento } from "../context";
import { masks } from "../utils";
import { UserRound, ShieldCheck } from "lucide-react";

export default function ModuleIdentificacao() {
  const { renderLockedOrInput, empresaDados, context } = useAgendamento();

  const config = empresaDados?.config_campos || {
    mostrar_cpf: true,
    mostrar_sobrenome: true,
    mostrar_whatsapp: true,
    mostrar_nascimento: true,
    mostrar_email: true
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      exit="exit"
      variants={{
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { staggerChildren: 0.06 } },
        exit: { opacity: 0, y: -10 }
      }}
      className="max-w-xl mx-auto text-left"
    >
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[11px] font-bold uppercase tracking-wider mb-2.5 shadow-sm">
          <UserRound size={13} strokeWidth={2} /> Identificação do Paciente
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-zinc-950 dark:text-white leading-tight">
          Como podemos chamar você?
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
          Preencha seus dados para localizarmos seu histórico e enviarmos o comprovante oficial com lembretes de atendimento.
        </p>

        {context.userFound && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-4 p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2.5 shadow-sm"
          >
            <ShieldCheck size={18} className="text-emerald-500 shrink-0" />
            <span>Cadastro localizado com sucesso! Dados preenchidos automaticamente.</span>
          </motion.div>
        )}
      </div>

      <motion.div variants={{ show: { transition: { staggerChildren: 0.04 } } }} className="space-y-3">
        {config.mostrar_cpf !== false &&
          renderLockedOrInput("cpf", "CPF do Paciente", null, false, masks.cpf, "000.000.000-00", 14)}

        {renderLockedOrInput("nome", "Nome Completo", null, false, null, "Seu nome completo (Nome e Sobrenome)", 100)}

        {config.mostrar_sobrenome !== false &&
          renderLockedOrInput("sobrenome", "Sobrenome", null, false, null, "Seu sobrenome completo", 50)}

        {config.mostrar_whatsapp !== false &&
          renderLockedOrInput("telefone_whatsapp", "WhatsApp / Telefone", null, false, masks.phone, "(00) 00000-0000", 15)}

        {config.mostrar_nascimento !== false &&
          renderLockedOrInput("data_nascimento", "Data de Nascimento", null, false, masks.date, "DD/MM/AAAA", 10)}

        {config.mostrar_email !== false &&
          renderLockedOrInput("email", "E-mail de Contato", null, false, null, "seu@email.com", 100, "email")}
      </motion.div>
    </motion.div>
  );
}
