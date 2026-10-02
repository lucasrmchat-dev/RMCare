# ARQUITETURA, ESQUEMA E DIRETRIZES DE SEGURANÇA (LGPD & RLS)
**Sistema DRM Care / RMAgenda - Clinical OS**
*Documento de Referência Mandatória para o Agente e Desenvolvedores*

---

## 1. MANDATO DE SEGURANÇA E PRIVACIDADE (PRIVACY BY DESIGN & DEFAULT)

Toda e qualquer leitura, gravação, alteração ou exclusão no banco de dados e na aplicação **DEVE OBRIGATORIAMENTE** seguir estes 5 pilares:

1. **Isolamento Absoluto por Empresa (`empresa_id`)**:
   - Nenhuma consulta ou mutação pode ser executada sem filtrar explicitamente pelo `empresa_id` autenticado.
   - **PROIBIDO** o uso de `limit(1)` sem filtro de `empresa_id` ou `slug`.
   - **PROIBIDO** o uso de fallbacks para a primeira empresa cadastrada (`firstEmp`). Se o usuário ou ação não possuir `empresa_id`, a requisição deve ser sumariamente bloqueada com erro 401/403.
2. **Zero Credenciais Hardcoded no Código**:
   - Credenciais de APIs externas (MedicalSYS, Mercado Pago, RM Chat, Webhooks) devem residir única e exclusivamente na coluna criptografada/protegida `empresas.config_chaves` da clínica específica.
   - Nenhuma chave de teste ou de outra clínica pode ser usada como fallback global. Se a clínica não configurou suas credenciais, o recurso deve ficar inativo para ela.
3. **Proteção Rigorosa de Dados Pessoais Sensíveis (LGPD Art. 5º e 11)**:
   - CPF, telefone, data de nascimento, prontuários, triagens e observações clínicas pertencem ao paciente e à clínica responsável.
   - A chave pública (`anon`) do Supabase **NUNCA** pode ter permissão de `SELECT` sobre dados de pacientes, credenciais, histórico de mensagens ou `config_chaves`.
4. **Row-Level Security (RLS) Ativo por Padrão**:
   - 100% das tabelas do schema público devem possuir RLS habilitado (`ENABLE ROW LEVEL SECURITY`).
   - O acesso via backend (Server Actions do Next.js) utiliza a `service_role` com políticas irrestritas seguras, garantindo zero perda de dados, enquanto o controle de tenant é auditado e validado em tempo de execução via `getAdminLogado(true)`.
5. **Trilha de Auditoria Imutável (LGPD Art. 6º, X)**:
   - Ações críticas (cancelamentos, aprovações, exclusões em lote, alterações de convênios/preços) devem ser gravadas na tabela `auditoria_sistema`.

---

## 2. MAPEAMENTO DAS 16 TABELAS DO BANCO DE DADOS (SUPABASE)

Com base no schema real ativo no banco de dados:

### 2.1. Núcleo de Clínicas e Acesso
* **`empresas`**:
  - `id` (uuid, PK): Identificador exclusivo da clínica.
  - `nome`, `slug`: Identificação pública e URL de agendamento (`/[slug]`).
  - `config_chaves` (jsonb): Credenciais de ERP (MedicalSYS apikey, customer_apikey, id_clinica) e gateways. Protegida contra leitura anônima.
  - `config_campos` (jsonb): Personalização visual, ordem das etapas, flags de exibição de CPF/e-mail/nascimento.
  - `config_regras` (jsonb): Prazos de retorno (dias), delay de confirmação, regras de pagamento antecipado.
  - `rmchat_webhook_url`, `whatsapp_atendimento`, `logo_url`.
* **`administradores`**:
  - `id` (uuid, PK), `empresa_id` (uuid, FK -> empresas.id).
  - `usuario`, `senha_hash`, `email`, `nome`.
  - `role`: `'sistema'` (Master Admin) ou `'empresa'` (Gestor/Equipe da clínica).
  - `permissoes` (jsonb): Array de módulos permitidos (`agenda`, `equipe`, `bloqueios`, `politicas`, `triagem`, etc.).
  - `is_owner`, `primeiro_acesso`.

### 2.2. Pacientes e Segurança
* **`pacientes`**:
  - `id` (uuid, PK), `empresa_id` (uuid, FK -> empresas.id, NOT NULL).
  - `cpf`, `nome_completo`, `telefone_whatsapp`, `email`, `data_nascimento`, `enfermidades` (array), `observacoes`.
* **`pacientes_credenciais`**:
  - `paciente_id` (uuid, FK -> pacientes.id), `senha_hash`, `created_at`.

### 2.3. Agenda e Procedimentos
* **`agendamentos`**:
  - `id` (uuid, PK), `empresa_id` (uuid, FK, NOT NULL), `paciente_id` (uuid, FK).
  - `tipo_servico`, `subtipo_exame`, `medico_profissional`, `data_agendamento`, `horario_agendamento`, `especialidade`, `modalidade`, `modalidade_id`.
  - `status_atendimento`: `'agendado'`, `'confirmado'`, `'cancelado'`, `'concluido'`.
  - `medicalsys_id`, `enviado_medicalsys`, `resposta_medicalsys`.
  - `consulta_inicial_id` (auto-relacionamento para controle de retornos).
  - `status_pagamento_antecipado`, `valor_total`, `respostas_triagem`.
* **`bloqueios_horarios`**:
  - `id` (uuid, PK), `empresa_id` (uuid, FK, NOT NULL).
  - `data`, `horario`, `horario_fim`, `medico_profissional`, `status` (`'importado'`, `'manual'`, etc.).
  - `nome_paciente`, `cpf_paciente`, `telefone_paciente`, `especialidade`, `convenio`, `medicalsys_id`, `raw_payload_completo`.
* **`regras_agenda`**:
  - `id` (uuid, PK), `empresa_id` (uuid, FK), `servico_id` (uuid, FK).
  - `dias_semana` (array), `hora_inicio`, `hora_fim`, `duracao_slot_minutos`, `ocupacao_sequencial`, `ativo`.
  - `modalidade`, `especialidade`, `tipo_bloqueio`, `semanas_mes`, `especialidades_permitidas`.
* **`servicos`** (Corpo Clínico / Procedimentos):
  - `id` (uuid, PK), `empresa_id` (uuid, FK, NOT NULL).
  - `nome`, `tipo` (`'Profissional'` ou `'Exame'`), `preco`, `especialidade`, `categoria_atendimento`.
  - `duracao_minutos`, `dias_bloqueio_padrao`, `codigo_uri`, `numero_especialista`, `status_agendamento`, `ativo`.

### 2.4. Comunicação e Automações (WhatsApp & Webhooks)
* **`fila_mensagens`**:
  - `id` (uuid, PK), `empresa_id` (uuid, FK, NOT NULL), `agendamento_id` (uuid, FK).
  - `telefone_whatsapp`, `nome_paciente`, `mensagem`, `data_hora_programada`, `status` (`'pendente'`, `'rascunho'`, `'enviada'`, `'falha'`).
  - `gatilho`, `tipo_envio`, `url_webhook_customizada`, `resposta_recebida`, `respondido_em`.
* **`regras_mensagens`**:
  - `id` (uuid, PK), `empresa_id` (uuid, FK, NOT NULL).
  - `titulo`, `gatilho` (`'imediato'`, `'antes'`, `'apos'`, `'cancelado'`, `'remarcado'`).
  - `alvo`, `especialidade`, `categoria`, `filtro_modalidade`, `dias_antes`, `hora_envio`, `mensagem`, `ativo`.

### 2.5. Suporte Operacional e Auditoria
* **`convenios`**:
  - `id` (text, PK), `empresa_id` (uuid, FK).
  - `nome`, `codigo_medicalsys`, `ativo`.
* **`modalidades_atendimento`**:
  - `id` (bigint, PK), `empresa_id` (uuid, FK), `codigo_id`, `nome`, `exige_senha`, `senha`, `ativo`.
* **`categorias_atendimento`**:
  - `id` (uuid, PK), `empresa_id` (uuid, FK), `nome`, `descricao`, `ativo`.
* **`perguntas_triagem`** e **`opcoes_triagem`**:
  - Perguntas por especialidade/serviço com regras de bloqueio de agendamento por dias.
* **`auditoria_sistema`**:
  - `id` (uuid, PK), `empresa_id` (uuid, FK).
  - `usuario`, `modulo`, `acao`, `detalhes`, `dados_anteriores`, `dados_novos`, `ip_origem`, `created_at`.

---

## 3. ANÁLISE DE REDUNDÂNCIAS E DIRETRIZES DE MIGRAÇÃO FUTURA

1. **`empresas.especialidades` vs `servicos.especialidade`**:
   - `empresas.especialidades` guarda um array JSONB com strings simples. 
   - A tabela `servicos` possui a coluna `especialidade`. O sistema agora prioriza carregar especialidades a partir do corpo clínico cadastrado em `servicos`, mantendo o JSONB apenas para compatibilidade retroativa.
2. **`empresas.config_campos.lista_convenios` vs tabela `convenios`**:
   - A tabela `convenios` é a fonte oficial. O fallback em `config_campos` deve ser usado apenas para importações legadas.
3. **`empresas.config_campos.auditoria_logs` vs tabela `auditoria_sistema`**:
   - A tabela oficial de auditoria é `auditoria_sistema`. O armazenamento em `config_campos` foi mantido como fail-safe secundário em caso de falha de conexão.
4. **`empresas.config_mensagens` vs tabela `regras_mensagens`**:
   - Todas as automações ativas devem consultar e gravar na tabela estruturada `regras_mensagens`.

---

## 4. FLUXO OBRIGATÓRIO DE AUTENTICAÇÃO E RESOLUÇÃO DE TENANT

Em qualquer Server Action ou Endpoint de API:

```javascript
// 1. Obter o administrador da sessão criptografada
const admin = await getAdminLogado(true); // true = exige vínculo com clínica

// 2. Garantir isolamento
const empresaId = admin.empresa_id;
if (!empresaId) {
  throw new Error("Acesso negado: Administrador sem clínica vinculada.");
}

// 3. Sempre filtrar as consultas
const { data, error } = await supabaseAdmin
  .from("tabela_desejada")
  .select("*")
  .eq("empresa_id", empresaId);
```

---

## 5. CHECKLIST ANTES DE CRIAR OU ALTERAR CÓDIGO NO RMCARE

- [ ] A consulta possui `.eq("empresa_id", ...)`?
- [ ] O código utiliza `getAdminLogado(true)` para validar o tenant logado?
- [ ] Foram removidas todas as credenciais estáticas de teste ou de terceiros?
- [ ] Foi verificado se o arquivo é módulo ECMAScript com todas as funções exportadas na raiz?
- [ ] O script SQL preserva todos os dados existentes sem executar `DROP TABLE` ou `DELETE`?
