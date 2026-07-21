"use client";

import { motion } from "framer-motion";
import { CreditCard, CheckCircle, RefreshCw, MessageCircle, CalendarPlus } from "lucide-react";
import { useAgendamento } from "../context";

export default function ModuleConcluido() {
  const { formData, pixData, timeLeft, showIsland } = useAgendamento();
  return (
    <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className="flex flex-col items-center justify-center text-center max-w-sm mx-auto py-8">
      <div className={`w-20 h-20 rounded-full ${pixData ? "bg-indigo-600" : "bg-zinc-900 dark:bg-white"} text-white ${!pixData && "dark:text-black"} flex items-center justify-center mb-6 shadow-xl`}>
        {pixData ? <CreditCard size={36} /> : <CheckCircle size={36} />}
      </div>
      
      <h2 className="text-3xl font-medium">{pixData ? "Finalize seu pagamento" : "Agendamento Confirmado"}</h2>
      <p className="text-zinc-500 mt-4 text-sm leading-relaxed">
        {pixData 
          ? `Sua vaga de ${formData.tipo_servico === "Exame" ? formData.subtipo_exame : formData.medico_profissional} para o dia ${formData.data_agendamento?.split("-").reverse().join("/")} às ${formData.horario_agendamento}h está pré-reservada. Efetue o pagamento para garantir o agendamento.` 
          : `Seu agendamento para o dia ${formData.data_agendamento?.split("-").reverse().join("/")} às ${formData.horario_agendamento}h foi registrado com sucesso.`}
      </p>

      {pixData && (
        <div className="mt-8 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 w-full text-center bg-zinc-50/50 dark:bg-[#111111]/50">
          <h3 className="text-[11px] font-bold uppercase text-zinc-500 mb-5 tracking-widest">Escaneie o QR Code</h3>
          <img src={`data:image/jpeg;base64,${pixData.qr_code_base64}`} alt="QR Code Pix" className="w-52 h-52 mx-auto rounded-2xl border border-zinc-200 p-2 bg-white shadow-sm" />
          <div className="mt-6">
            <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-2 tracking-wider">Ou use o Copia e Cola</span>
            <div className="flex bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-2xl p-2 items-center mb-6 shadow-sm">
              <input readOnly value={pixData.qr_code} className="w-full text-xs bg-transparent outline-none text-zinc-500 px-3 truncate" />
              <button onClick={() => { navigator.clipboard.writeText(pixData.qr_code); showIsland("Código copiado!", "success"); }} className="bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-black px-5 py-2.5 rounded-xl text-xs font-bold transition-colors">Copiar</button>
            </div>
            
            <div className="mt-4 flex flex-col items-center justify-center p-5 bg-white dark:bg-[#0A0A0A] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                {timeLeft > 0 && <RefreshCw size={12} className="animate-spin text-zinc-400" />}
                Verificação Automática
              </span>
              <div className="text-3xl font-mono font-medium tracking-wider text-zinc-900 dark:text-white">
                {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
              </div>
              {timeLeft === 0 && <span className="text-xs text-red-500 mt-3 font-medium">Tempo limite expirado.</span>}
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 w-full text-left bg-zinc-50 dark:bg-[#111111]">
        <div className="flex justify-between mb-4"><span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Paciente</span><span className="text-sm font-medium">{formData.nome}</span></div>
        <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-800 pt-4"><span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Status</span><span className="text-sm font-mono">{pixData ? "Aguardando Pagamento" : "Confirmado"}</span></div>
      </div>

      {!pixData && (
        <div className="mt-8 flex flex-col gap-3 w-full">
          <button onClick={() => window.open(`https://wa.me/5583999999999`, "_blank")} className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-full font-bold flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]">
            <MessageCircle size={18} />
            Falar no WhatsApp
          </button>
          <button onClick={() => window.location.reload()} className="w-full py-4 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-900 dark:text-white rounded-full font-medium flex items-center justify-center gap-2 transition-colors">
            <CalendarPlus size={18} />
            Realizar Novo Agendamento
          </button>
        </div>
      )}
    </motion.div>
  );
}