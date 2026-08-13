-- Migração para suporte a separação de Convênio/Especialidade e Validação Segura de Mensagens

-- 1. Adiciona a coluna 'convenio' na tabela 'bloqueios_horarios' para armazenar planos de saúde (ex: Unimed) separadamente de especialidades médicas (ex: Colonoscopia)
ALTER TABLE public.bloqueios_horarios
  ADD COLUMN IF NOT EXISTS convenio text;

-- 2. Garante suporte a status de 'rascunho' e 'validado' na tabela de fila de mensagens
-- Status possíveis para fila_mensagens: 'rascunho' (aguardando validação do gestor), 'pendente' (liberado para envio), 'enviada', 'cancelada', 'pausado_erp'
ALTER TABLE public.fila_mensagens
  ADD COLUMN IF NOT EXISTS agendamento_id uuid,
  ADD COLUMN IF NOT EXISTS empresa_id uuid,
  ADD COLUMN IF NOT EXISTS gatilho text;

-- 3. Índice para acelerar a busca de mensagens rascunho por empresa
CREATE INDEX IF NOT EXISTS fila_mensagens_empresa_status_idx ON public.fila_mensagens(empresa_id, status, gatilho);
