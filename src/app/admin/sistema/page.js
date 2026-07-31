"use client"; 

import { useState, useEffect } from "react"; 
import { supabase } from "@/lib/supabase"; 
import { Plus, LayoutDashboard, Building2, ShieldCheck, Database, Server, Activity } from "lucide-react"; 
import Navbar from "@/components/Navbar"; 

export default function SuperAdminSistema() {   
  const [empresas, setEmpresas] = useState([]);   
  const [nome, setNome] = useState("");   
  const [slug, setSlug] = useState("");   
  const [loading, setLoading] = useState(false);   

  useEffect(() => {     
    fetchEmpresas();   
  }, []);   

  const fetchEmpresas = async () => {     
    const { data } = await supabase.from("empresas").select("*").order("created_at", { ascending: false });     
    if (data) setEmpresas(data);   
  };   

  const handleProvisionar = async (e) => {     
    e.preventDefault();     
    if (!nome || !slug) return;     
    
    setLoading(true);     
    const { error } = await supabase.from("empresas").insert([{ nome, slug: slug.toLowerCase().replace(/\s+/g, "-") }]);     
    
    if (!error) {       
      setNome("");       
      setSlug("");       
      fetchEmpresas();     
    }     
    setLoading(false);   
  };   

  return (     
    <main className="min-h-screen bg-[#0A0A0A] text-white p-6 pt-28 antialiased">       
      <Navbar />              
      
      <div className="max-w-6xl mx-auto space-y-10 relative z-10">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-8">         
          <div>           
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#9FC131] to-[#7a9622] rounded-2xl flex items-center justify-center shadow-lg shadow-[#9FC131]/20">
                <LayoutDashboard size={24} className="text-black" />
              </div>
              Master Provisioning
            </h1>           
            <p className="text-sm text-zinc-400 font-medium mt-2">Painel global de orquestração de instâncias e empresas (SaaS).</p>         
          </div>         
          <div className="bg-[#9FC131]/10 border border-[#9FC131]/20 text-[#9FC131] px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm">           
            <ShieldCheck size={16} /> Status: Root Access Active         
          </div>       
        </div>       
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">         
          
          {/* FORMULÁRIO DE PROVISIONAMENTO */}         
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-xl h-fit">           
            <div className="flex items-center gap-3 mb-6">
                <Database className="text-[#9FC131]" size={20} />
                <h3 className="font-black text-white text-sm uppercase tracking-widest">Nova Instância</h3>           
            </div>
            
            <form onSubmit={handleProvisionar} className="space-y-6">             
              <div className="space-y-2">               
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Nome da Organização</label>               
                <input 
                  required 
                  type="text" 
                  value={nome} 
                  onChange={(e) => setNome(e.target.value)} 
                  placeholder="Ex: Clínica Saúde Prime" 
                  className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-sm font-medium outline-none text-white focus:border-[#9FC131] focus:ring-1 focus:ring-[#9FC131] transition-all placeholder:text-zinc-700" 
                />             
              </div>             
              <div className="space-y-2">               
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Slug da URL (Identificador)</label>               
                <input 
                  required 
                  type="text" 
                  value={slug} 
                  onChange={(e) => setSlug(e.target.value)} 
                  placeholder="ex: saude-prime" 
                  className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-sm font-medium outline-none text-white focus:border-[#9FC131] focus:ring-1 focus:ring-[#9FC131] transition-all placeholder:text-zinc-700 lowercase" 
                />             
              </div>             
              
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full py-4 mt-4 bg-white hover:bg-zinc-200 text-black font-black text-[12px] uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >               
                {loading ? <Activity size={16} className="animate-spin" /> : <Plus size={16} />} 
                {loading ? "Criando Ambiente..." : "Provisionar Empresa"}             
              </button>           
            </form>         
          </div>         

          {/* LISTA DE EMPRESAS ATIVAS */}         
          <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-xl flex flex-col">           
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <Server className="text-blue-400" size={20} />
                    <h3 className="font-black text-white text-sm uppercase tracking-widest">Empresas Monitoradas</h3>           
                </div>
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                    {empresas.length} {empresas.length === 1 ? 'Instância' : 'Instâncias'}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-4 max-h-[500px]">             
              {empresas.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500 py-10 border border-dashed border-white/10 rounded-3xl">
                    <Building2 size={32} className="mb-4 opacity-40" />
                    <p className="text-sm font-medium">Nenhum ambiente provisionado ainda.</p>
                </div>
              ) : empresas.map(emp => (               
                <div key={emp.id} className="p-5 bg-black/40 border border-white/5 hover:border-white/20 transition-colors rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">                 
                  <div className="flex items-center gap-4">                   
                    <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-[#9FC131] shadow-inner group-hover:scale-105 transition-transform">
                        <Building2 size={20} />
                    </div>                   
                    <div>                     
                      <h4 className="font-black text-base text-white">{emp.nome}</h4>                     
                      <p className="text-[11px] text-zinc-500 font-mono mt-1 tracking-wider uppercase">ID: {emp.id.split('-')[0]}...</p>                   
                    </div>                 
                  </div>                 
                  <div className="flex items-center gap-3">
                    <span className="bg-white/10 border border-white/10 text-zinc-300 font-mono text-[11px] px-4 py-2 rounded-xl font-bold">
                        /{emp.slug}
                    </span>               
                  </div>
                </div>             
              ))}           
            </div>         
          </div>       
        </div>
      </div>     
    </main>   
  ); 
}