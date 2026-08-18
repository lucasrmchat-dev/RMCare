"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Payment, initMercadoPago } from "@mercadopago/sdk-react";
import { CreditCard, ShieldCheck, Lock } from "lucide-react";
import { useAgendamento } from "../context";

export default function ModuleCheckout() {
  const { valorEntrada, onSubmitMP, empresaDados, formData } = useAgendamento();
  const mpKey = empresaDados?.config_chaves?.mp_public_key;

  useEffect(() => {
    if (mpKey) {
      initMercadoPago(mpKey, { locale: "pt-BR" });
    }
  }, [mpKey]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-md mx-auto space-y-6 text-left"
    >
      <div>
        <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 shadow-sm">
          <CreditCard size={21} strokeWidth={2} />
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-zinc-950 dark:text-white leading-tight">
          Garantia da Vaga
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
          Para confirmar sua reserva, efetue o pagamento da taxa de entrada com total segurança via Pix ou Cartão.
        </p>
      </div>

      <div className="p-6 rounded-3xl bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 shadow-sm space-y-4">
        <div className="flex justify-between items-center text-xs font-bold text-zinc-400 uppercase tracking-widest">
          <span>Procedimento / Atendimento</span>
          <span className="text-zinc-950 dark:text-white font-mono">
            {formData.tipo_servico === "Exame" ? formData.subtipo_exame : formData.medico_profissional}
          </span>
        </div>

        <div className="flex justify-between items-baseline border-t border-zinc-200/60 dark:border-white/5 pt-4">
          <div>
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Valor da Entrada</span>
            <span className="text-[11px] text-zinc-400">(Garantia do horário)</span>
          </div>
          <div className="text-3xl font-black text-[#86a621] dark:text-[#9FC131] tracking-tight">
            R$ {Number(valorEntrada).toFixed(2).replace(".", ",")}
          </div>
        </div>

        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
          <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
          <span>Ambiente criptografado com certificação de segurança Bancária.</span>
        </div>
      </div>

      <div className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 rounded-3xl p-4 sm:p-6 shadow-sm min-h-[220px]">
        {mpKey ? (
          <Payment
            initialization={{ amount: Number(valorEntrada.toFixed(2)) }}
            customization={{
              paymentMethods: {
                ticket: "all",
                bankTransfer: "all",
                creditCard: "all",
                debitCard: "all",
                mercadoPago: "all"
              }
            }}
            onSubmit={onSubmitMP}
          />
        ) : (
          <div className="p-8 text-center text-zinc-400 text-xs font-medium space-y-3">
            <Lock size={28} className="mx-auto opacity-40" />
            <p>Carregando módulo de pagamento seguro da clínica...</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
