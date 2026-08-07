# Funcionalidades administrativas e regras de atendimento

## Implementado

- Categorias de regras para consulta particular inicial, consulta por convênio e retorno, incluindo regras específicas por dia da semana e duração do slot.
- Edição completa de horários existentes pelo botão de lápis, incluindo início, término, último horário, dias e duração.
- Retorno vinculado à consulta inicial, permitido somente quando a consulta inicial estiver paga e o novo atendimento estiver dentro de 30 dias.
- Automação de mensagens após consulta/exame, com quantidade de dias e horário configuráveis.
- Alvos de mensagem por serviço, especialidade ou tipo; suporta Colonoscopia no dia 0 e serviços como retirada de balão.
- Formulários clínicos gerais ou por serviço, com bloqueio configurável em dias corridos ou úteis.
- Políticas administrativas para prazo do retorno, exigência de pagamento e tempo de revisão antes da confirmação.
- Jornada de agendamento mobile-first, com ações fixas na base, áreas seguras do iPhone, alvos de toque maiores e manifesto instalável.
- Rascunho automático por clínica durante 24 horas; dados, respostas e etapa são retomados após recarregar a página.
- Etapas condicionais derivadas do serviço escolhido, eliminando a triagem ao voltar quando não há perguntas aplicáveis.
- Transições coordenadas entre telas, progresso, calendário e horários, com respeito à preferência de movimento reduzido.
- Painéis administrativos em tela cheia, sem o espaçamento superior vazio.
- Sessão administrativa assinada, protegida no middleware, com limite padrão de 30 minutos, cronômetro visível, renovação por interação, logout automático e botão Sair.
- Tela para alteração do login e da senha administrativa.
- Provisionamento no servidor, criando empresa e administrador juntos em uma transação.
- Remoção das permissões públicas de escrita nas tabelas de empresas e administradores. A tela de login continua sem qualquer fluxo de cadastro administrativo.

## Banco de dados

Aplicar `supabase/migrations/20260806180000_admin_rules_and_security.sql` antes da publicação. A migração adiciona os campos de categoria/vínculo/status, funções protegidas para credenciais e provisionamento e revoga escritas administrativas para usuários públicos.

Opcionalmente, configure `ADMIN_SESSION_SECRET`. Quando ausente, o backend utiliza `SUPABASE_SERVICE_ROLE_KEY` para assinar a sessão. O limite pode ser alterado com `ADMIN_SESSION_SECONDS` (padrão: 1800).

## Testes executados

- `npm test`: 6 testes aprovados, cobrindo 30º dia, rejeição no 31º dia, rejeição sem pagamento, programação pós-atendimento, assinatura/adulteração e expiração da sessão.
- `npm run build`: compilação de produção concluída e 12 páginas geradas.
- ESLint direcionado aos arquivos alterados: aprovado.

## Limitações conhecidas

- A migração foi criada, mas não foi aplicada ao Supabase remoto neste trabalho.
- O lint completo do repositório ainda acusa problemas anteriores em componentes não relacionados (pureza de renderização, efeitos e textos JSX). Eles não impediram a compilação de produção.
- O disparo pós-atendimento usa a data/hora programada posterior ao horário do atendimento. Para exigir confirmação clínica manual de “concluído” antes do envio, ainda será necessário adicionar essa ação operacional na agenda.
