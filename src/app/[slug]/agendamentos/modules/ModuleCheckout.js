"use client";
import { motion } from "framer-motion";
import { Payment, initMercadoPago } from '@mercadopago/sdk-react';
import { useAgendamento } from "../context";
import { useEffect, useState } from "react";

export default function ModuleCheckout() {
  const { formData, valorEntrada, onSubmitMP, empresaDados } = useAgendamento();
  const [sdkPronto, setSdkPronto] = useState(false);

  useEffect(() => {
    const mpKey = empresaDados?.config_chaves?.mp_public_key;
    if (mpKey) {
      initMercadoPago(mpKey, { locale: 'pt-BR' });
      setSdkPronto(true);
    }
  }, [empresaDados]);

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="max-w-md mx-auto mt-6">
      <div className="text-center mb-6"><h2 className="text-3xl font-medium">Checkout</h2><p className="text-zinc-500 text-sm mt-2">Ambiente seguro verificado.</p></div>
      <div className="p-8 rounded-[32px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0A0A0A] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
        <div className="flex justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-4"><span className="text-zinc-500 text-sm">{formData.tipo_servico === "Exame" ? formData.subtipo_exame : formData.medico_profissional}</span><span className="text-sm">R$ {(valorEntrada*2).toFixed(2)}</span></div>
        <div className="flex justify-between items-center mb-8"><span className="font-medium">Reserva (50%)</span><span className="font-medium text-xl">R$ {valorEntrada.toFixed(2)}</span></div>
        
        {sdkPronto ? (
          <Payment 
             initialization={{ amount: valorEntrada > 0 ? valorEntrada : 1 }} 
             onSubmit={onSubmitMP} 
             customization={{ paymentMethods: { ticket: "all", bankTransfer: "all", creditCard: "all", debitCard: "all", mercadoPago: "all" }}} 
          />
        ) : (
          <div className="p-4 bg-amber-50 text-amber-600 rounded-xl text-center text-sm font-medium border border-amber-100">
            Pagamentos não configurados pelo administrador.
          </div>
        )}
      </div>
    </motion.div>
  );
}