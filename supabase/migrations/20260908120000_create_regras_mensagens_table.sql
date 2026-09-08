-- ==============================================================================
-- MIGRAÇÃO: Criar tabela estruturada para Cadastro de Mensagens Automáticas
-- Tabela: public.regras_mensagens
-- Descrição: Organiza as regras de disparo de WhatsApp e Webhooks por empresa_id,
--            com colunas separadas para Tipo de Alvo, Categoria e Especialidade.
-- ==============================================================================

-- 1. Criação da tabela regras_mensagens com colunas separadas
CREATE TABLE IF NOT EXISTS public.regras_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  titulo text, -- Identificação amigável da automação (ex: "Lembrete 24h Antes", "Preparo Exame Colonoscopia")
  gatilho text NOT NULL DEFAULT 'imediato', -- imediato, agendado, pos_atendimento, remarcado, cancelado, antes_pagamento, pagamento_aprovado, pagamento_rejeitado, importado_erp
  
  -- ALVOS E CATEGORIZAÇÃO TOTALMENTE SEPARADOS (Sem prefixos misturados)
  tipo_alvo text NOT NULL DEFAULT 'todos', -- 'todos', 'categoria', 'especialidade'
  categoria text, -- 'Exames', 'Consultas' (ou NULL para todos)
  especialidade text, -- 'Colonoscopia', 'Endoscopia', etc. (ou NULL)
  alvo text NOT NULL DEFAULT 'Todas', -- Nome limpo: 'Exames', 'Consultas', 'Colonoscopia' ou 'Todas'
  
  tipo_envio text NOT NULL DEFAULT 'whatsapp', -- whatsapp, webhook
  url_webhook_customizada text, -- URL específica de webhook quando aplicável
  
  -- Configurações Temporais de Envio (Lembrete Antes do Atendimento - gatilho = 'agendado')
  dias_antes integer DEFAULT 1,
  unidade_antes text DEFAULT 'dias', -- 'dias', 'horas', 'dias_uteis'
  tipo_dias_antes text DEFAULT 'corridos', -- 'corridos', 'uteis'
  hora_envio text DEFAULT '08:00', -- Horário de disparo formatado (HH:mm)
  
  -- Configurações Temporais de Pós-Atendimento (gatilho = 'pos_atendimento')
  pos_base text DEFAULT 'termino', -- 'termino' ou 'inicio'
  pos_unidade text DEFAULT 'minutos', -- 'minutos', 'horas', 'dias'
  pos_tempo integer DEFAULT 30, -- Quantidade de minutos, horas ou dias após atendimento
  
  -- Filtros de Refinamento (Modalidade, Idade, Enfermidade)
  filtro_modalidade text DEFAULT 'todas', -- 'todas', 'Particular', 'Convênio', 'Retorno'
  filtro_idade_tipo text DEFAULT 'todas', -- 'todas', 'maior_que', 'menor_que', 'faixa'
  idade_minima integer,
  idade_maxima integer,
  filtrar_enfermidade boolean DEFAULT false,
  enfermidade_alvo text,
  
  -- Conteúdo, Template e Mídia
  mensagem text NOT NULL, -- Template com variáveis {nome}, {servico}, {data}, {hora}, etc.
  anexo_url text, -- URL de anexo ou imagem para envio WhatsApp
  
  -- Status, Ordenação e Auditoria
  ativo boolean NOT NULL DEFAULT true,
  ordem integer DEFAULT 0,
  alterado_por text,
  alterado_em timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Garantir adição das colunas separadas caso a tabela já tenha sido criada anteriormente
ALTER TABLE public.regras_mensagens
  ADD COLUMN IF NOT EXISTS tipo_alvo text NOT NULL DEFAULT 'todos',
  ADD COLUMN IF NOT EXISTS categoria text,
  ADD COLUMN IF NOT EXISTS especialidade text;

-- 2. Índices de performance para consultas por empresa, gatilho e alvos separados
CREATE INDEX IF NOT EXISTS idx_regras_mensagens_empresa ON public.regras_mensagens(empresa_id);
CREATE INDEX IF NOT EXISTS idx_regras_mensagens_gatilho ON public.regras_mensagens(empresa_id, gatilho);
CREATE INDEX IF NOT EXISTS idx_regras_mensagens_tipo_alvo ON public.regras_mensagens(empresa_id, tipo_alvo);
CREATE INDEX IF NOT EXISTS idx_regras_mensagens_categoria ON public.regras_mensagens(empresa_id, categoria);
CREATE INDEX IF NOT EXISTS idx_regras_mensagens_especialidade ON public.regras_mensagens(empresa_id, especialidade);
CREATE INDEX IF NOT EXISTS idx_regras_mensagens_ativo ON public.regras_mensagens(empresa_id, ativo);
CREATE INDEX IF NOT EXISTS idx_regras_mensagens_ordem ON public.regras_mensagens(empresa_id, ordem);

-- 3. Habilitação de RLS (Row Level Security)
ALTER TABLE public.regras_mensagens ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
DROP POLICY IF EXISTS "regras_mensagens_select_all" ON public.regras_mensagens;
CREATE POLICY "regras_mensagens_select_all" ON public.regras_mensagens
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "regras_mensagens_service_role" ON public.regras_mensagens;
CREATE POLICY "regras_mensagens_service_role" ON public.regras_mensagens
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. Função e trigger para atualização automática de updated_at
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_regras_mensagens_updated_at ON public.regras_mensagens;
CREATE TRIGGER trigger_regras_mensagens_updated_at
  BEFORE UPDATE ON public.regras_mensagens
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 5. Limpeza e separação imediata dos registros já existentes no banco
UPDATE public.regras_mensagens
SET 
  tipo_alvo = 'categoria',
  categoria = TRIM(REPLACE(alvo, 'categoria:', '')),
  especialidade = NULL,
  alvo = TRIM(REPLACE(alvo, 'categoria:', ''))
WHERE alvo LIKE 'categoria:%';

UPDATE public.regras_mensagens
SET 
  tipo_alvo = 'especialidade',
  especialidade = TRIM(REPLACE(alvo, 'especialidade:', '')),
  categoria = CASE 
    WHEN alvo ILIKE '%colono%' OR alvo ILIKE '%endo%' OR alvo ILIKE '%exame%' THEN 'Exames'
    ELSE 'Consultas'
  END,
  alvo = TRIM(REPLACE(alvo, 'especialidade:', ''))
WHERE alvo LIKE 'especialidade:%';

UPDATE public.regras_mensagens
SET 
  tipo_alvo = 'todos',
  categoria = NULL,
  especialidade = NULL,
  alvo = 'Todas'
WHERE alvo = 'Todas' OR alvo = 'todos' OR alvo IS NULL;

-- 6. Migração de dados legados existentes em empresas.config_mensagens
DO $$
DECLARE
  emp RECORD;
  regra RECORD;
  v_ordem INT;
  v_tipo_alvo text;
  v_cat text;
  v_esp text;
  v_alvo text;
BEGIN
  FOR emp IN 
    SELECT id, config_mensagens 
    FROM public.empresas 
    WHERE config_mensagens IS NOT NULL
  LOOP
    IF jsonb_typeof(emp.config_mensagens) = 'array' THEN
      IF jsonb_array_length(emp.config_mensagens) > 0 THEN
        v_ordem := 0;
        FOR regra IN 
          SELECT * FROM jsonb_to_recordset(emp.config_mensagens) AS x(
            id text,
            titulo text,
            alvo text,
            tipo_alvo text,
            categoria text,
            especialidade text,
            gatilho text,
            tipo_envio text,
            url_webhook_customizada text,
            dias_antes integer,
            unidade_antes text,
            tipo_dias_antes text,
            hora_envio text,
            pos_base text,
            pos_unidade text,
            pos_tempo integer,
            dias_depois integer,
            filtro_modalidade text,
            filtro_idade_tipo text,
            idade_minima integer,
            idade_maxima integer,
            filtrar_enfermidade boolean,
            enfermidade_alvo text,
            mensagem text,
            anexo_url text,
            ativo boolean,
            alterado_por text,
            alterado_em timestamptz
          ) 
        LOOP
          -- Resolução e separação de tipo_alvo, categoria, especialidade
          v_tipo_alvo := 'todos';
          v_cat := NULL;
          v_esp := NULL;
          v_alvo := 'Todas';

          IF regra.alvo LIKE 'categoria:%' THEN
            v_tipo_alvo := 'categoria';
            v_cat := TRIM(REPLACE(regra.alvo, 'categoria:', ''));
            v_alvo := v_cat;
          ELSIF regra.alvo LIKE 'especialidade:%' THEN
            v_tipo_alvo := 'especialidade';
            v_esp := TRIM(REPLACE(regra.alvo, 'especialidade:', ''));
            v_alvo := v_esp;
            IF v_esp ILIKE '%colono%' OR v_esp ILIKE '%endo%' OR v_esp ILIKE '%exame%' THEN
              v_cat := 'Exames';
            ELSE
              v_cat := 'Consultas';
            END IF;
          ELSIF regra.categoria IS NOT NULL AND regra.categoria <> '' THEN
            v_tipo_alvo := 'categoria';
            v_cat := regra.categoria;
            v_alvo := regra.categoria;
          ELSIF regra.especialidade IS NOT NULL AND regra.especialidade <> '' AND regra.especialidade <> 'Todas' THEN
            v_tipo_alvo := 'especialidade';
            v_esp := regra.especialidade;
            v_alvo := regra.especialidade;
          END IF;

          INSERT INTO public.regras_mensagens (
            empresa_id,
            titulo,
            tipo_alvo,
            categoria,
            especialidade,
            alvo,
            gatilho,
            tipo_envio,
            url_webhook_customizada,
            dias_antes,
            unidade_antes,
            tipo_dias_antes,
            hora_envio,
            pos_base,
            pos_unidade,
            pos_tempo,
            filtro_modalidade,
            filtro_idade_tipo,
            idade_minima,
            idade_maxima,
            filtrar_enfermidade,
            enfermidade_alvo,
            mensagem,
            anexo_url,
            ativo,
            ordem,
            alterado_por,
            alterado_em
          ) VALUES (
            emp.id,
            COALESCE(regra.titulo, (CASE WHEN regra.id IS NOT NULL AND regra.id NOT LIKE '%_%' THEN 'Regra Personalizada' ELSE NULL END), 'Automação ' || (v_ordem + 1)),
            v_tipo_alvo,
            v_cat,
            v_esp,
            v_alvo,
            COALESCE(regra.gatilho, 'imediato'),
            COALESCE(regra.tipo_envio, 'whatsapp'),
            regra.url_webhook_customizada,
            COALESCE(regra.dias_antes, 1),
            COALESCE(regra.unidade_antes, 'dias'),
            COALESCE(regra.tipo_dias_antes, 'corridos'),
            COALESCE(regra.hora_envio, '08:00'),
            COALESCE(regra.pos_base, 'termino'),
            COALESCE(regra.pos_unidade, 'minutos'),
            COALESCE(regra.pos_tempo, regra.dias_depois, 30),
            COALESCE(regra.filtro_modalidade, 'todas'),
            COALESCE(regra.filtro_idade_tipo, 'todas'),
            regra.idade_minima,
            regra.idade_maxima,
            COALESCE(regra.filtrar_enfermidade, false),
            regra.enfermidade_alvo,
            COALESCE(regra.mensagem, ''),
            regra.anexo_url,
            COALESCE(regra.ativo, true),
            v_ordem,
            regra.alterado_por,
            COALESCE(regra.alterado_em, now())
          );
          v_ordem := v_ordem + 1;
        END LOOP;
      END IF;
    END IF;
  END LOOP;
END $$;
