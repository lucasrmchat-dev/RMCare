"use client";
import { useState } from "react";
import { KeyRound } from "lucide-react";
import { updateAdminCredentials } from "@/actions/auth";

export default function AccountView({ showToast }) {
  const [form, setForm] = useState({ currentPassword: "", newUsername: "", newPassword: "" });
  const [loading, setLoading] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setLoading(true);
    const result = await updateAdminCredentials(form);
    setLoading(false);
    if (!result.success) return showToast(result.error, "error");
    setForm({ currentPassword: "", newUsername: "", newPassword: "" });
    showToast("Login e senha alterados com segurança.");
  };
  return <div className="w-full h-full overflow-y-auto p-6 lg:p-10">
    <form onSubmit={submit} className="max-w-2xl bg-white border border-zinc-200 rounded-[2rem] p-8 shadow-sm space-y-5">
      <div><KeyRound className="text-[#86a621] mb-3" /><h2 className="text-2xl font-black">Acesso administrativo</h2><p className="text-sm text-zinc-500 mt-2">Altere seu login e sua senha. A senha atual é obrigatória.</p></div>
      <input required type="password" value={form.currentPassword} onChange={(e) => setForm({...form, currentPassword:e.target.value})} placeholder="Senha atual" className="w-full p-4 border border-zinc-200 rounded-xl" />
      <input required minLength={3} value={form.newUsername} onChange={(e) => setForm({...form, newUsername:e.target.value})} placeholder="Novo login" className="w-full p-4 border border-zinc-200 rounded-xl" />
      <input required minLength={8} type="password" value={form.newPassword} onChange={(e) => setForm({...form, newPassword:e.target.value})} placeholder="Nova senha (mínimo 8 caracteres)" className="w-full p-4 border border-zinc-200 rounded-xl" />
      <button disabled={loading} className="px-6 py-3 rounded-xl bg-zinc-900 text-white font-bold disabled:opacity-50">{loading ? "Salvando..." : "Alterar credenciais"}</button>
    </form>
  </div>;
}
