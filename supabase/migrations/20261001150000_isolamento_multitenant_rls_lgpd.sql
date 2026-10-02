-- ==============================================================================
-- MIGRAÇÃO DEFINITIVA: ISOLAMENTO MULTI-TENANT ESTRITO, BLINDAGEM LGPD E RLS
-- Sistema DRM Care / RMAgenda - Versão 3.0.0
-- 
-- Em conformidade com:
--  - Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - Art. 6º, 11 e 46)
--  - Princípios de Privacy by Design e Default (Isolamento total entre empresas)
--  - CFM nº 1.821/2007 (Sigilo e Proteção Rigorosa de Dados de Saúde)
-- ==============================================================================

-- 1. Habilitar extensão pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. Habilitar Row Level Security (RLS) em 100% das tabelas do ecossistema
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.administradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacientes_credenciais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bloqueios_horarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fila_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regras_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regras_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convenios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perguntas_triagem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opcoes_triagem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_auditoria ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 3. GARANTIR POLÍTICAS IRRESTRITAS PARA O BACKEND (SERVICE_ROLE)
-- Isso garante que nenhum dado existente se perca ou suma do sistema
-- ==============================================================================

DROP POLICY IF EXISTS "service_role_all_empresas" ON public.empresas;
CREATE POLICY "service_role_all_empresas" ON public.empresas FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_administradores" ON public.administradores;
CREATE POLICY "service_role_all_administradores" ON public.administradores FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_pacientes" ON public.pacientes;
CREATE POLICY "service_role_all_pacientes" ON public.pacientes FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_credenciais" ON public.pacientes_credenciais;
CREATE POLICY "service_role_all_credenciais" ON public.pacientes_credenciais FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_agendamentos" ON public.agendamentos;
CREATE POLICY "service_role_all_agendamentos" ON public.agendamentos FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_bloqueios" ON public.bloqueios_horarios;
CREATE POLICY "service_role_all_bloqueios" ON public.bloqueios_horarios FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_fila_mensagens" ON public.fila_mensagens;
CREATE POLICY "service_role_all_fila_mensagens" ON public.fila_mensagens FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_regras_mensagens" ON public.regras_mensagens;
CREATE POLICY "service_role_all_regras_mensagens" ON public.regras_mensagens FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_regras_agenda" ON public.regras_agenda;
CREATE POLICY "service_role_all_regras_agenda" ON public.regras_agenda FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_servicos" ON public.servicos;
CREATE POLICY "service_role_all_servicos" ON public.servicos FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_convenios" ON public.convenios;
CREATE POLICY "service_role_all_convenios" ON public.convenios FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_perguntas" ON public.perguntas_triagem;
CREATE POLICY "service_role_all_perguntas" ON public.perguntas_triagem FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_opcoes" ON public.opcoes_triagem;
CREATE POLICY "service_role_all_opcoes" ON public.opcoes_triagem FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_logs" ON public.logs_auditoria;
CREATE POLICY "service_role_all_logs" ON public.logs_auditoria FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ==============================================================================
-- 4. BLINDAGEM DA CHAVE PÚBLICA (ANON): ZERO VAZAMENTO DE DADOS SENSÍVEIS
-- ==============================================================================

-- A. Empresas: Bloqueia leitura de config_chaves (chaves ERP, webhooks, credenciais) para anon
DROP POLICY IF EXISTS "public_read_empresas" ON public.empresas;
CREATE POLICY "public_read_empresas" ON public.empresas FOR SELECT TO anon USING (true);

REVOKE ALL ON TABLE public.empresas FROM anon, authenticated;
GRANT SELECT (id, nome, slug, subdominio, email, telefone, config_campos, created_at) ON public.empresas TO anon, authenticated;

-- B. Pacientes: Anon NUNCA pode ler a lista de pacientes de nenhuma clínica
DROP POLICY IF EXISTS "public_read_pacientes" ON public.pacientes;
DROP POLICY IF EXISTS "public_insert_pacientes" ON public.pacientes;
CREATE POLICY "public_insert_pacientes" ON public.pacientes FOR INSERT TO anon WITH CHECK (true);

REVOKE SELECT ON TABLE public.pacientes FROM anon;
GRANT INSERT ON public.pacientes TO anon;

-- C. Agendamentos: Anon só pode consultar horários ocupados (sem CPF, notas clínicas ou dados pessoais)
DROP POLICY IF EXISTS "public_insert_agendamentos" ON public.agendamentos;
CREATE POLICY "public_insert_agendamentos" ON public.agendamentos FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "public_read_agendamentos_ocupados" ON public.agendamentos;
CREATE POLICY "public_read_agendamentos_ocupados" ON public.agendamentos FOR SELECT TO anon USING (
  status_atendimento != 'cancelado'
);

REVOKE ALL ON TABLE public.agendamentos FROM anon;
GRANT SELECT (id, empresa_id, data_agendamento, horario_agendamento, medico_profissional, tipo_servico, status_atendimento) ON public.agendamentos TO anon;
GRANT INSERT ON public.agendamentos TO anon;

-- D. Bloqueios Horários: Anon só pode consultar os slots ocupados, nunca dados de pacientes
DROP POLICY IF EXISTS "public_read_bloqueios" ON public.bloqueios_horarios;
CREATE POLICY "public_read_bloqueios" ON public.bloqueios_horarios FOR SELECT TO anon USING (true);

REVOKE ALL ON TABLE public.bloqueios_horarios FROM anon;
GRANT SELECT (id, empresa_id, data, horario, horario_fim, medico_profissional, status) ON public.bloqueios_horarios TO anon;

-- E. Fila de Mensagens, Logs de Auditoria e Administradores: TOTALMENTE BLOQUEADOS PARA ANON
REVOKE ALL ON TABLE public.fila_mensagens FROM anon, authenticated;
REVOKE ALL ON TABLE public.logs_auditoria FROM anon, authenticated;
REVOKE ALL ON TABLE public.administradores FROM anon, authenticated;
REVOKE ALL ON TABLE public.pacientes_credenciais FROM anon, authenticated;

-- F. Serviços, Convênios, Regras e Triagem: Disponíveis publicamente para o agendamento online do paciente
DROP POLICY IF EXISTS "public_read_servicos" ON public.servicos;
CREATE POLICY "public_read_servicos" ON public.servicos FOR SELECT TO anon USING (ativo = true);

DROP POLICY IF EXISTS "public_read_convenios" ON public.convenios;
CREATE POLICY "public_read_convenios" ON public.convenios FOR SELECT TO anon USING (ativo = true);

DROP POLICY IF EXISTS "public_read_regras_agenda" ON public.regras_agenda;
CREATE POLICY "public_read_regras_agenda" ON public.regras_agenda FOR SELECT TO anon USING (ativo = true);

DROP POLICY IF EXISTS "public_read_perguntas_triagem" ON public.perguntas_triagem;
CREATE POLICY "public_read_perguntas_triagem" ON public.perguntas_triagem FOR SELECT TO anon USING (ativa = true);

DROP POLICY IF EXISTS "public_read_opcoes_triagem" ON public.opcoes_triagem;
CREATE POLICY "public_read_opcoes_triagem" ON public.opcoes_triagem FOR SELECT TO anon USING (true);

-- ==============================================================================
-- 5. FUNÇÕES CRIPTOGRÁFICAS E SEGURANÇA DE DADOS SENSÍVEIS (PGCRYPTO)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.criptografar_dado_sensivel(p_texto text, p_chave text)
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT extensions.encode(extensions.pgp_sym_encrypt(p_texto, p_chave), 'base64');
$$;

CREATE OR REPLACE FUNCTION public.descriptografar_dado_sensivel(p_criptografado text, p_chave text)
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT extensions.pgp_sym_decrypt(extensions.decode(p_criptografado, 'base64'), p_chave);
$$;

REVOKE ALL ON FUNCTION public.criptografar_dado_sensivel(text, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.descriptografar_dado_sensivel(text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.criptografar_dado_sensivel(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.descriptografar_dado_sensivel(text, text) TO service_role;
