-- Migração: Suporte a Especialidade e Pergunta Obrigatória/Opcional em Formulários Clínicos (Triagem)

ALTER TABLE public.perguntas_triagem
  ADD COLUMN IF NOT EXISTS especialidade text,
  ADD COLUMN IF NOT EXISTS obrigatoria boolean NOT NULL DEFAULT true;

-- Atualiza perguntas existentes para serem associadas como gerais e obrigatórias por padrão
UPDATE public.perguntas_triagem
SET obrigatoria = true
WHERE obrigatoria IS NULL;
