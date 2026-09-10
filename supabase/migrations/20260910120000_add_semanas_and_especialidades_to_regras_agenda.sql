-- ==============================================================================
-- MIGRAÇÃO: Adicionar suporte a Semanas do Mês e Especialidades Restritas na Agenda
-- Tabela: public.regras_agenda
-- ==============================================================================

-- 1. Garante que as colunas semanas_mes e especialidades_permitidas existam
ALTER TABLE public.regras_agenda
  ADD COLUMN IF NOT EXISTS semanas_mes jsonb NOT NULL DEFAULT '["todas"]'::jsonb,
  ADD COLUMN IF NOT EXISTS especialidades_permitidas jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2. Índices de performance para busca combinada de regras por empresa e serviço
CREATE INDEX IF NOT EXISTS idx_regras_agenda_empresa_servico ON public.regras_agenda(empresa_id, servico_id);
CREATE INDEX IF NOT EXISTS idx_regras_agenda_ativo ON public.regras_agenda(empresa_id, ativo);
