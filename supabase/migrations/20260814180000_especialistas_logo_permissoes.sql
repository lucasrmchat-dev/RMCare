-- Migração: Suporte a Código URI de Especialistas, Logo da Empresa, Permissões de Usuários e Respostas Clínicas

-- 1. Adiciona código/número identificador de URI na tabela de serviços/especialistas
ALTER TABLE public.servicos
  ADD COLUMN IF NOT EXISTS codigo_uri text,
  ADD COLUMN IF NOT EXISTS numero_especialista integer;

-- 2. Adiciona campo para Logo da empresa
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS logo_url text;

-- 3. Adiciona campos de permissões e nome aos administradores da clínica
ALTER TABLE public.administradores
  ADD COLUMN IF NOT EXISTS nome text,
  ADD COLUMN IF NOT EXISTS permissoes jsonb NOT NULL DEFAULT '["agenda", "dados_sensiveis", "bloqueios", "politicas", "triagem", "personalizacao", "equipe", "integracoes", "usuarios"]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_owner boolean NOT NULL DEFAULT false;

-- 4. Adiciona campo para armazenar respostas de formulários clínicos no agendamento
ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS respostas_triagem jsonb;

-- Garante que o administrador principal existente seja marcado como owner
UPDATE public.administradores
SET is_owner = true,
    permissoes = '["agenda", "dados_sensiveis", "bloqueios", "politicas", "triagem", "personalizacao", "equipe", "integracoes", "usuarios"]'::jsonb
WHERE is_owner IS NULL OR is_owner = false;
