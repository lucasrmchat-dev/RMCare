-- Migração: Garantir colunas de configuração dinâmica por empresa no Supabase

-- 1. Garante que a tabela 'empresas' possua as colunas de configuração JSONB e coluna direta para o Push RM Chat
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS config_chaves jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS config_campos jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS config_mensagens jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rmchat_webhook_url text;

-- 2. Garante que a tabela 'fila_mensagens' tenha a coluna 'empresa_id' para vincular os disparos a cada clínica
ALTER TABLE public.fila_mensagens
  ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);

-- 3. Associa mensagens antigas sem 'empresa_id' à empresa principal cadastrada
UPDATE public.fila_mensagens
SET empresa_id = (SELECT id FROM public.empresas ORDER BY created_at ASC LIMIT 1)
WHERE empresa_id IS NULL;
