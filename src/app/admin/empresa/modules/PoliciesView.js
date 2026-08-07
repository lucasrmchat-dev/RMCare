"use client";
import { useEffect, useState } from "react";
import { Clock3, RotateCcw, Save, ShieldCheck } from "lucide-react";
import { actionSalvarPolicies, fetchAdminPolicies } from "@/actions/adminData";
import { ToggleSwitch } from "../components/SharedUI";

const Field = ({ label, help, ...props }) => <label className="block"><span className="block text-sm font-semibold text-zinc-900">{label}</span><span className="block text-xs text-zinc-500 mt-1 mb-3">{help}</span><input {...props} className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5" /></label>;

export default function PoliciesView({ showToast }) {
  const [config, setConfig] = useState({ retorno_prazo_dias: 30, retorno_exige_pagamento: true, delay_confirmacao_segundos: 0 });
  const [loading, setLoading] = useState(false);
  useEffect(() => { fetchAdminPolicies().then((data) => setConfig((value) => ({ ...value, ...data }))).catch((error) => {
    const missingMigration = error?.message?.includes("config_regras") || error?.code === "42703";
    showToast(missingMigration ? "O banco ainda não recebeu a migração das políticas." : `Não foi possível carregar as políticas: ${error?.message || "erro desconhecido"}`, "error");
  }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const save = async () => { setLoading(true); try { setConfig(await actionSalvarPolicies(config)); showToast("Políticas de atendimento atualizadas."); } catch (error) { showToast(error.message, "error"); } finally { setLoading(false); } };
  return <div className="h-full overflow-y-auto p-6 lg:p-10"><div className="max-w-5xl mx-auto">
    <div className="mb-8"><div className="w-11 h-11 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mb-4"><ShieldCheck size={21}/></div><h1 className="text-3xl font-semibold tracking-tight">Políticas de atendimento</h1><p className="mt-2 text-sm text-zinc-500 max-w-2xl">Configure critérios usados pelo sistema para autorizar retornos e dar ao paciente tempo para revisar os dados antes da confirmação.</p></div>
    <div className="grid lg:grid-cols-2 gap-5">
      <section className="bg-white border border-zinc-200 rounded-3xl p-7 shadow-sm"><div className="flex gap-3 items-center mb-6"><RotateCcw size={19} className="text-violet-600"/><h2 className="font-semibold">Retornos</h2></div><Field type="number" min="1" max="365" label="Prazo após a consulta inicial" help="Quantidade máxima de dias em que o retorno poderá ser agendado." value={config.retorno_prazo_dias} onChange={(e) => setConfig({...config, retorno_prazo_dias:e.target.value})}/><div className="mt-6 p-4 bg-zinc-50 rounded-2xl"><ToggleSwitch label="Exigir consulta inicial paga" checked={config.retorno_exige_pagamento} onChange={(value) => setConfig({...config, retorno_exige_pagamento:value})}/></div></section>
      <section className="bg-white border border-zinc-200 rounded-3xl p-7 shadow-sm"><div className="flex gap-3 items-center mb-6"><Clock3 size={19} className="text-blue-600"/><h2 className="font-semibold">Revisão antes de confirmar</h2></div><Field type="number" min="0" max="300" label="Tempo para corrigir dados" help="A confirmação aguarda este número de segundos. Use zero para confirmar imediatamente." value={config.delay_confirmacao_segundos} onChange={(e) => setConfig({...config, delay_confirmacao_segundos:e.target.value})}/></section>
    </div>
    <button onClick={save} disabled={loading} className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-zinc-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-50"><Save size={16}/>{loading ? "Salvando…" : "Salvar políticas"}</button>
  </div></div>;
}
