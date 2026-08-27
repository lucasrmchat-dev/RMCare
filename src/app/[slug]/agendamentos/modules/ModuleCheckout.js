"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Payment, initMercadoPago } from "@mercadopago/sdk-react";
import {
  CreditCard,
  ShieldCheck,
  Lock,
  MessageCircle,
  Sparkles,
  QrCode,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  ArrowRight
} from "lucide-react";
import { useAgendamento } from "../context";
import { formatarMensagemPagamentoWhatsApp, processarMensagensDinamicas } from "../utils";
import { playDopamineSound, triggerHaptic } from "@/lib/dopamine";

export default function ModuleCheckout() {
  const {
    valorEntrada,
    onSubmitMP,
    empresaDados,
    formData,
    salvarNoBanco,
    setCurrentStepIndex,
    modulosAtivos,
    showIsland
  } = useAgendamento();

  const mpKey = empresaDados?.config_chaves?.mp_public_key;
  const tipoCheckout = empresaDados?.config_campos?.tipo_checkout_pagamento || "online"; // "online" | "whatsapp" | "ambos"
  const [selectedMethod, setSelectedMethod] = useState(tipoCheckout === "whatsapp" ? "whatsapp" : "online");
  const [isProcessingWpp, setIsProcessingWpp] = useState(false);

  useEffect(() => {
    if (mpKey && (selectedMethod === "online" || tipoCheckout === "online" || tipoCheckout === "ambos")) {
      initMercadoPago(mpKey, { locale: "pt-BR" });
    }
  }, [mpKey, selectedMethod, tipoCheckout]);

  const handleFinalizarWhatsApp = async () => {
    if (isProcessingWpp) return;
    setIsProcessingWpp(true);
    playDopamineSound("select");
    triggerHaptic("success");
    showIsland("Reservando seu horário e abrindo WhatsApp...", "loading");

    try {
      // 1. Salva o agendamento no Supabase com pagamento pendente
      const saved = await salvarNoBanco(false);
      if (!saved) {
        showIsland("Erro ao registrar agendamento. Tente novamente.");
        setIsProcessingWpp(false);
        return;
      }

      // 2. Dispara mensagens automáticas configuradas (ex: imediato, antes_pagamento)
      try {
        await processarMensagensDinamicas(formData, empresaDados, saved.id, null, {
          valor: valorEntrada
        });
      } catch (eMsg) {
        console.warn("Aviso ao processar mensagens do agendamento:", eMsg);
      }

      // 3. Formata mensagem e redireciona para o WhatsApp da clínica
      const rawWpp =
        empresaDados?.config_campos?.whatsapp_atendimento ||
        empresaDados?.whatsapp_atendimento ||
        empresaDados?.telefone ||
        "";
      const wppNum = rawWpp.replace(/\D/g, "");

      const templateCustom = empresaDados?.config_campos?.msg_pagamento_whatsapp || "";
      const mensagemFinal = formatarMensagemPagamentoWhatsApp(templateCustom, {
        formData,
        empresaDados,
        valorEntrada
      });

      const textoEncoded = encodeURIComponent(mensagemFinal);
      if (wppNum) {
        window.open(`https://wa.me/55${wppNum.replace(/^55/, "")}?text=${textoEncoded}`, "_blank");
      }

      // 4. Avança para a tela de conclusão com sucesso
      playDopamineSound("success");
      const idxConcluido = modulosAtivos.indexOf("concluido");
      if (idxConcluido !== -1) {
        setCurrentStepIndex(idxConcluido);
      }
    } catch (err) {
      console.error("Erro ao finalizar via WhatsApp:", err);
      showIsland("Falha ao direcionar para WhatsApp.");
    } finally {
      setIsProcessingWpp(false);
    }
  };

  const isExame = formData?.tipo_servico === "Exame";
  const nomeAtendimento = isExame
    ? formData?.subtipo_exame || formData?.especialidade || "Exame Clínico"
    : formData?.especialidade || "Consulta Médica";
  const nomeEspecialista = formData?.medico_profissional || "Corpo Clínico";

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
          {tipoCheckout === "whatsapp" || selectedMethod === "whatsapp"
            ? "Finalize sua reserva falando diretamente com nossa atendente no WhatsApp para emissão do pagamento."
            : "Para confirmar sua reserva, efetue o pagamento da taxa de entrada com total segurança via Pix ou Cartão."}
        </p>
      </div>

      {/* SE FOR HÍBRIDO (AMBOS): SELETOR DE ABAS */}
      {tipoCheckout === "ambos" && (
        <div className="flex p-1.5 bg-zinc-100/80 dark:bg-zinc-900/80 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 gap-1.5">
          <button
            type="button"
            onClick={() => {
              playDopamineSound("click");
              setSelectedMethod("online");
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              selectedMethod === "online"
                ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm ring-1 ring-zinc-200/50 dark:ring-zinc-700/50"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            <QrCode size={14} className="text-emerald-500" />
            <span>Pagar Online (Pix/Cartão)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playDopamineSound("click");
              setSelectedMethod("whatsapp");
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              selectedMethod === "whatsapp"
                ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm ring-1 ring-zinc-200/50 dark:ring-zinc-700/50"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            <MessageCircle size={14} className="text-purple-500" />
            <span>Pagar no WhatsApp</span>
          </button>
        </div>
      )}

      {/* RESUMO DO AGENDAMENTO */}
      <div className="p-6 rounded-3xl bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 shadow-sm space-y-3.5">
        <div className="flex justify-between items-center text-xs font-bold text-zinc-400 uppercase tracking-widest">
          <span>Atendimento</span>
          <span className="text-zinc-950 dark:text-white font-extrabold truncate max-w-[200px]">
            {nomeAtendimento}
          </span>
        </div>

        {nomeEspecialista && (
          <div className="flex justify-between items-center text-xs border-t border-zinc-100 dark:border-white/5 pt-2.5">
            <span className="text-zinc-400 font-bold uppercase tracking-wider">Especialista</span>
            <span className="text-zinc-800 dark:text-zinc-200 font-semibold truncate max-w-[200px]">
              {nomeEspecialista}
            </span>
          </div>
        )}

        <div className="flex justify-between items-center text-xs border-t border-zinc-100 dark:border-white/5 pt-2.5">
          <span className="text-zinc-400 font-bold uppercase tracking-wider">Data & Horário</span>
          <span className="text-zinc-800 dark:text-zinc-200 font-bold">
            {formData?.data_agendamento ? formData.data_agendamento.split("-").reverse().join("/") : "--/--"} às {formData?.horario_agendamento || "--:--"}h
          </span>
        </div>

        <div className="flex justify-between items-baseline border-t border-zinc-200/60 dark:border-white/5 pt-3.5">
          <div>
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">
              Valor da Entrada
            </span>
            <span className="text-[11px] text-zinc-400">(Garantia do horário)</span>
          </div>
          <div className="text-3xl font-black text-[#86a621] dark:text-[#9FC131] tracking-tight">
            R$ {Number(valorEntrada).toFixed(2).replace(".", ",")}
          </div>
        </div>

        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
          <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
          <span>Sua vaga é reservada no sistema durante o processo.</span>
        </div>
      </div>

      {/* ÁREA DE PAGAMENTO: WHATSAPP VS MERCADO PAGO ONLINE */}
      {(tipoCheckout === "whatsapp" || (tipoCheckout === "ambos" && selectedMethod === "whatsapp")) ? (
        <div className="bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border border-emerald-500/20 dark:border-emerald-500/30 rounded-3xl p-6 shadow-sm space-y-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mx-auto shadow-sm">
            <MessageCircle size={28} strokeWidth={2.2} />
          </div>

          <div>
            <h4 className="text-base font-black text-zinc-950 dark:text-white">
              Pagamento com a Atendente
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Ao clicar no botão abaixo, sua vaga será registrada e você será direcionado ao WhatsApp com o resumo do seu atendimento para efetuar o pagamento com nossa equipe.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            disabled={isProcessingWpp}
            onClick={handleFinalizarWhatsApp}
            className="w-full min-h-[52px] py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-emerald-600/25 cursor-pointer"
          >
            <MessageCircle size={19} />
            <span>{isProcessingWpp ? "Processando..." : "Finalizar e Pagar via WhatsApp"}</span>
          </motion.button>
        </div>
      ) : (
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
      )}
    </motion.div>
  );
}
