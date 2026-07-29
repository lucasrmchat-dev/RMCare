"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, CreditCard, Link2, ShieldCheck, KeySquare } from "lucide-react";
import { fadeUp, ButtonPrimary } from "../components/SharedUI";
import { supabase } from "@/lib/supabase";

export default function IntegracoesView({ showToast }) {
  const [loading, setLoading] = useState(false);
  const [empresaId, setEmpresaId] = useState(null);
  
  const [chaves, setChaves] = useState({
    mp_public_key: "",
    mp_access_token: ""
  });

  useEffect(() => {
    const fetchDados = async () => {
      const { data } = await supabase.from('empresas').select('id, config_chaves').limit(1).single();
      if (data) {
        setEmpresaId(data.id);
        if (data.config_chaves) setChaves(data.config_chaves);
      }
    };
    fetchDados();
  }, []);

  const handleSave = async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('empresas').update({ config_chaves: chaves }).eq('id', empresaId);
      if (error) throw error;
      showToast("Integrações atualizadas com sucesso!");
    } catch (e) {
      showToast("Erro ao salvar as integrações.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div key="integracoes" {...fadeUp} className="flex-1 flex flex-col h-full overflow-hidden w-full max-w-6xl mx-auto relative bg-[#F4F4F5]">
      <div className="px-6 pt-8 pb-4 md:px-10 md:pt-10">
        <h2 className="text-3xl font-black text-zinc-900 tracking-tight flex items-center gap-3">
          Integrações & Pagamentos <Link2 size={24} className="text-indigo-500" />
        </h2>
        <p className="text-sm text-zinc-500 mt-2 font-medium max-w-xl">
          Conecte os provedores de pagamento e sistemas externos exclusivos desta clínica.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 md:px-10 pb-32 space-y-8">
        
        <section className="bg-white border border-zinc-200/80 p-8 rounded-[2rem] shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <CreditCard size={120} />
          </div>
          
          <h3 className="text-lg font-black text-zinc-900 mb-2 flex items-center gap-2 relative z-10">
            <ShieldCheck size={18} className="text-blue-500" /> Mercado Pago (Checkout Transparente)
          </h3>
          <p className="text-sm text-zinc-500 mb-8 relative z-10">
            As credenciais abaixo garantem que o valor pago pelo paciente caia diretamente na conta bancária deste estabelecimento.
          </p>

          <div className="grid md:grid-cols-2 gap-6 relative z-10">
            <div className="space-y-4">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                <KeySquare size={14} /> Public Key
              </label>
              <input 
                type="text" 
                value={chaves.mp_public_key || ""} 
                onChange={(e) => setChaves({...chaves, mp_public_key: e.target.value})} 
                placeholder="APP_USR-xxxxxxxx-xxxx-xxxx..."
                className="w-full px-4 py-3.5 bg-zinc-50 border border-zinc-200/80 rounded-2xl text-sm font-mono text-zinc-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                <KeySquare size={14} /> Access Token (Privado)
              </label>
              <input 
                type="password" 
                value={chaves.mp_access_token || ""} 
                onChange={(e) => setChaves({...chaves, mp_access_token: e.target.value})} 
                placeholder="APP_USR-xxxxxxxx-xxxx-xxxx..."
                className="w-full px-4 py-3.5 bg-zinc-50 border border-zinc-200/80 rounded-2xl text-sm font-mono text-zinc-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>
          </div>
        </section>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-xl border-t border-zinc-200/80 flex justify-end items-center z-50">
        <ButtonPrimary onClick={handleSave} disabled={loading} icon={Save} className="w-full md:w-auto px-12 py-4 text-sm">
          {loading ? "Salvando Integrações..." : "Salvar Configurações de Pagamento"}
        </ButtonPrimary>
      </div>
    </motion.div>
  );
}