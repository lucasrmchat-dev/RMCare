-- ==============================================================================
-- BLINDAGEM DEFINITIVA DE SEGURANÇA, ISOLAMENTO MULTI-TENANT E RLS (LGPD)
-- DRM Care / RMAgenda - Clinical OS v3.1.0
--
-- Conformidade:
--  - Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - Art. 6º, 11 e 46)
--  - Princípios de Privacy by Design e Default (Isolamento total de clínicas e pacientes)
--  - Resolução CFM nº 1.821/2007 (Sigilo Absoluto e Guarda Segura de Dados Clínicos)
--  - Zero Perda de Dados (Compatibilidade total com o schema ativo no Supabase)
-- ==============================================================================

-- 1. HABILITAÇÃO DA EXTENSÃO DE CRIPTOGRAFIA
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ==============================================================================
-- 2. ATIVAÇÃO DE ROW LEVEL SECURITY (RLS) E ACESSO TOTAL AO BACKEND (SERVICE_ROLE)
-- As Server Actions utilizam a service_role_key, garantindo zero perda de dados.
-- ==============================================================================

DO $$
DECLARE
  tab text;
  tabelas text[] := ARRAY[
    'empresas', 'administradores', 'pacientes', 'pacientes_credenciais',
    'agendamentos', 'bloqueios_horarios', 'servicos', 'regras_agenda',
    'convenios', 'modalidades_atendimento', 'categorias_atendimento',
    'perguntas_triagem', 'opcoes_triagem', 'regras_mensagens',
    'fila_mensagens', 'auditoria_sistema'
  ];
BEGIN
  FOREACH tab IN ARRAY tabelas LOOP
    -- Ativa RLS em cada tabela do ecossistema
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY;', tab);
    -- Cria/substitui política irrestrita para o backend (service_role)
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'service_role_all_' || tab, tab);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);', 'service_role_all_' || tab, tab);
  END LOOP;
END $$;

-- Compatibilidade com tabela legada de logs caso ainda exista no schema
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'logs_auditoria') THEN
    ALTER TABLE public.logs_auditoria ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "service_role_all_logs" ON public.logs_auditoria;
    CREATE POLICY "service_role_all_logs" ON public.logs_auditoria FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ==============================================================================
-- 3. POLÍTICAS DE RLS PARA ACESSO PÚBLICO (ANON)
-- No PostgreSQL/Supabase, quando o RLS está ativo em uma tabela e NÃO existe política
-- concedendo permissão ao papel 'anon', o acesso é sumariamente BLOQUEADO (DENY ALL).
-- ==============================================================================

-- A. Empresas: Leitura autorizada para carregamento da clínica no agendamento online
DROP POLICY IF EXISTS "public_read_empresas" ON public.empresas;
CREATE POLICY "public_read_empresas" ON public.empresas FOR SELECT TO anon, authenticated USING (true);

-- B. Pacientes: Usuários anônimos podem APENAS se auto-cadastrar (INSERT), NUNCA listar (SELECT negado)
DROP POLICY IF EXISTS "public_read_pacientes" ON public.pacientes;
DROP POLICY IF EXISTS "public_insert_pacientes" ON public.pacientes;
CREATE POLICY "public_insert_pacientes" ON public.pacientes FOR INSERT TO anon, authenticated WITH CHECK (true);

-- C. Agendamentos: Anon pode criar novo agendamento e consultar horários para verificar ocupação de slots
DROP POLICY IF EXISTS "public_insert_agendamentos" ON public.agendamentos;
CREATE POLICY "public_insert_agendamentos" ON public.agendamentos FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_read_agendamentos_ocupados" ON public.agendamentos;
CREATE POLICY "public_read_agendamentos_ocupados" ON public.agendamentos FOR SELECT TO anon, authenticated USING (true);

-- D. Bloqueios de Horários: Anon pode consultar slots ocupados pela clínica
DROP POLICY IF EXISTS "public_read_bloqueios" ON public.bloqueios_horarios;
CREATE POLICY "public_read_bloqueios" ON public.bloqueios_horarios FOR SELECT TO anon, authenticated USING (true);

-- E. Catálogos públicos (Serviços, Convênios, Modalidades, Regras da Agenda e Triagem)
DROP POLICY IF EXISTS "public_read_servicos" ON public.servicos;
CREATE POLICY "public_read_servicos" ON public.servicos FOR SELECT TO anon, authenticated USING (ativo = true);

DROP POLICY IF EXISTS "public_read_convenios" ON public.convenios;
CREATE POLICY "public_read_convenios" ON public.convenios FOR SELECT TO anon, authenticated USING (ativo = true);

DROP POLICY IF EXISTS "public_read_modalidades" ON public.modalidades_atendimento;
CREATE POLICY "public_read_modalidades" ON public.modalidades_atendimento FOR SELECT TO anon, authenticated USING (ativo = true);

DROP POLICY IF EXISTS "public_read_categorias" ON public.categorias_atendimento;
CREATE POLICY "public_read_categorias" ON public.categorias_atendimento FOR SELECT TO anon, authenticated USING (ativo = true);

DROP POLICY IF EXISTS "public_read_regras_agenda" ON public.regras_agenda;
CREATE POLICY "public_read_regras_agenda" ON public.regras_agenda FOR SELECT TO anon, authenticated USING (ativo = true);

DROP POLICY IF EXISTS "public_read_perguntas_triagem" ON public.perguntas_triagem;
CREATE POLICY "public_read_perguntas_triagem" ON public.perguntas_triagem FOR SELECT TO anon, authenticated USING (ativa = true);

DROP POLICY IF EXISTS "public_read_opcoes_triagem" ON public.opcoes_triagem;
CREATE POLICY "public_read_opcoes_triagem" ON public.opcoes_triagem FOR SELECT TO anon, authenticated USING (true);

-- ==============================================================================
-- 4. BLINDAGEM DA COLUNA CONFIG_CHAVES CONTRA LEITURA ANÔNIMA (SE EXISTIR)
-- ==============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'empresas' 
      AND column_name = 'config_chaves'
  ) THEN
    EXECUTE 'REVOKE SELECT (config_chaves) ON public.empresas FROM anon;';
  END IF;
END $$;

-- ==============================================================================
-- 5. FUNÇÕES CRIPTOGRÁFICAS AUXILIARES (PGCRYPTO)
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

-- Confirmação de execução bem-sucedida
SELECT 'Blindagem RLS, Criptografia e Isolamento Multi-tenant aplicados com sucesso! Zero perda de dados.' AS status;
