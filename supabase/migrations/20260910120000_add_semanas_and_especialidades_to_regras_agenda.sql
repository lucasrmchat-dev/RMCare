-- ==============================================================================
-- MIGRAÇÃO: Suporte a Semanas do Mês, Especialidades Restritas e Liberação da Grade (15 em 15 min)
-- Tabela: public.regras_agenda
-- ==============================================================================

-- 1. Garante que as colunas existam na tabela regras_agenda
ALTER TABLE public.regras_agenda
  ADD COLUMN IF NOT EXISTS semanas_mes jsonb NOT NULL DEFAULT '["todas"]'::jsonb,
  ADD COLUMN IF NOT EXISTS especialidades_permitidas jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS intervalo_slot_minutos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS passo_grade_minutos integer NOT NULL DEFAULT 15;

-- 2. Índices para otimização de busca
CREATE INDEX IF NOT EXISTS idx_regras_agenda_empresa_servico ON public.regras_agenda(empresa_id, servico_id);
CREATE INDEX IF NOT EXISTS idx_regras_agenda_ativo ON public.regras_agenda(empresa_id, ativo);
