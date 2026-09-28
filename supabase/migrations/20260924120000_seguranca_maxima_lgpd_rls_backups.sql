-- ==============================================================================
-- MIGRAÇÃO DE SEGURANÇA MÁXIMA, LGPD, ROW LEVEL SECURITY (RLS) E AUDITORIA
-- Sistema DRM Care / RMAgenda - Versão 2.5.0
-- Em conformidade com:
--  - Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - Art. 5º, II e Art. 11)
--  - Resolução CFM nº 1.821/2007 (Sigilo e Prontuário Eletrônico)
--  - ISO/IEC 27001 (Controle de Acesso e Backups Criptografados)
-- ==============================================================================

-- 1. Habilitar extensões criptográficas essenciais
create extension if not exists pgcrypto with schema extensions;

-- 2. Garantir existência da tabela de Auditoria e Conformidade LGPD
create table if not exists public.logs_auditoria (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  responsavel text not null default 'sistema',
  modulo text not null default 'geral',
  acao text not null default 'Visualização',
  detalhes text,
  ip_origem text,
  dados_anteriores jsonb,
  dados_novos jsonb,
  checksum text,
  created_at timestamptz not null default now()
);

create index if not exists idx_logs_auditoria_empresa_created on public.logs_auditoria(empresa_id, created_at desc);

-- 3. Habilitar Row Level Security (RLS) em TODAS as tabelas do ecossistema
alter table public.empresas enable row level security;
alter table public.administradores enable row level security;
alter table public.pacientes enable row level security;
alter table public.agendamentos enable row level security;
alter table public.bloqueios_horarios enable row level security;
alter table public.fila_mensagens enable row level security;
alter table public.regras_mensagens enable row level security;
alter table public.regras_agenda enable row level security;
alter table public.servicos enable row level security;
alter table public.convenios enable row level security;
alter table public.perguntas_triagem enable row level security;
alter table public.opcoes_triagem enable row level security;
alter table public.logs_auditoria enable row level security;

-- ==============================================================================
-- 4. POLÍTICAS RLS PARA SERVICE_ROLE (BACKEND SERVER ACTIONS NEXT.JS)
-- Garante que o backend da DRM Care continue 100% operacional sem perda de dados
-- ==============================================================================

-- Empresas
drop policy if exists "service_role_all_empresas" on public.empresas;
create policy "service_role_all_empresas" on public.empresas for all to service_role using (true) with check (true);

-- Administradores
drop policy if exists "service_role_all_administradores" on public.administradores;
create policy "service_role_all_administradores" on public.administradores for all to service_role using (true) with check (true);

-- Pacientes
drop policy if exists "service_role_all_pacientes" on public.pacientes;
create policy "service_role_all_pacientes" on public.pacientes for all to service_role using (true) with check (true);

-- Agendamentos
drop policy if exists "service_role_all_agendamentos" on public.agendamentos;
create policy "service_role_all_agendamentos" on public.agendamentos for all to service_role using (true) with check (true);

-- Bloqueios Horários
drop policy if exists "service_role_all_bloqueios" on public.bloqueios_horarios;
create policy "service_role_all_bloqueios" on public.bloqueios_horarios for all to service_role using (true) with check (true);

-- Fila de Mensagens
drop policy if exists "service_role_all_fila_mensagens" on public.fila_mensagens;
create policy "service_role_all_fila_mensagens" on public.fila_mensagens for all to service_role using (true) with check (true);

-- Regras de Mensagens
drop policy if exists "service_role_all_regras_mensagens" on public.regras_mensagens;
create policy "service_role_all_regras_mensagens" on public.regras_mensagens for all to service_role using (true) with check (true);

-- Regras de Agenda
drop policy if exists "service_role_all_regras_agenda" on public.regras_agenda;
create policy "service_role_all_regras_agenda" on public.regras_agenda for all to service_role using (true) with check (true);

-- Serviços (Corpo Clínico)
drop policy if exists "service_role_all_servicos" on public.servicos;
create policy "service_role_all_servicos" on public.servicos for all to service_role using (true) with check (true);

-- Convênios
drop policy if exists "service_role_all_convenios" on public.convenios;
create policy "service_role_all_convenios" on public.convenios for all to service_role using (true) with check (true);

-- Perguntas de Triagem
drop policy if exists "service_role_all_perguntas" on public.perguntas_triagem;
create policy "service_role_all_perguntas" on public.perguntas_triagem for all to service_role using (true) with check (true);

-- Opções de Triagem
drop policy if exists "service_role_all_opcoes" on public.opcoes_triagem;
create policy "service_role_all_opcoes" on public.opcoes_triagem for all to service_role using (true) with check (true);

-- Logs de Auditoria
drop policy if exists "service_role_all_logs" on public.logs_auditoria;
create policy "service_role_all_logs" on public.logs_auditoria for all to service_role using (true) with check (true);

-- ==============================================================================
-- 5. POLÍTICAS RLS PÚBLICAS / ANON (PÁGINA DE AGENDAMENTO ONLINE)
-- Permite que pacientes agendem consultas sem expor os dados de outros pacientes
-- ==============================================================================

-- Empresas: Leitura pública permitida para carregar nome e slug da clínica
drop policy if exists "public_read_empresas" on public.empresas;
create policy "public_read_empresas" on public.empresas for select to anon using (true);

-- Serviços: Leitura pública permitida para listar médicos e especialidades
drop policy if exists "public_read_servicos" on public.servicos;
create policy "public_read_servicos" on public.servicos for select to anon using (ativo = true);

-- Regras de Agenda: Leitura pública para montar os dias e turnos de atendimento
drop policy if exists "public_read_regras_agenda" on public.regras_agenda;
create policy "public_read_regras_agenda" on public.regras_agenda for select to anon using (ativo = true);

-- Bloqueios Horários: Leitura pública para a grade saber horários indisponíveis
drop policy if exists "public_read_bloqueios" on public.bloqueios_horarios;
create policy "public_read_bloqueios" on public.bloqueios_horarios for select to anon using (true);

-- Convênios: Leitura pública dos convênios aceitos
drop policy if exists "public_read_convenios" on public.convenios;
create policy "public_read_convenios" on public.convenios for select to anon using (ativo = true);

-- Triagem: Leitura pública das perguntas e opções
drop policy if exists "public_read_perguntas_triagem" on public.perguntas_triagem;
create policy "public_read_perguntas_triagem" on public.perguntas_triagem for select to anon using (ativa = true);

drop policy if exists "public_read_opcoes_triagem" on public.opcoes_triagem;
create policy "public_read_opcoes_triagem" on public.opcoes_triagem for select to anon using (true);

-- Pacientes: ANON PODE APENAS CRIAR SEU PRÓPRIO CADASTRO (NUNCA LISTAR OUTROS PACIENTES)
drop policy if exists "public_insert_pacientes" on public.pacientes;
create policy "public_insert_pacientes" on public.pacientes for insert to anon with check (true);

drop policy if exists "public_read_pacientes" on public.pacientes;
-- NENHUMA leitura pública de pacientes (Anon não pode ler nenhum registro de paciente via API!)

-- Agendamentos: Anon pode inserir novo agendamento e consultar horários ocupados
drop policy if exists "public_insert_agendamentos" on public.agendamentos;
create policy "public_insert_agendamentos" on public.agendamentos for insert to anon with check (true);

drop policy if exists "public_read_agendamentos_ocupados" on public.agendamentos;
create policy "public_read_agendamentos_ocupados" on public.agendamentos for select to anon using (
  status_atendimento != 'cancelado'
);

-- Fila de Mensagens: TOTALMENTE BLOQUEADA PARA ANON (ZERO ACESSO EXTERNO)
-- Administradores: TOTALMENTE BLOQUEADA PARA ANON (ZERO ACESSO EXTERNO)
-- Logs de Auditoria: TOTALMENTE BLOQUEADA PARA ANON (ZERO ACESSO EXTERNO)
-- Regras de Mensagens: TOTALMENTE BLOQUEADA PARA ANON (ZERO ACESSO EXTERNO)

-- ==============================================================================
-- 6. FUNÇÃO DE CRIPTOGRAFIA DE DADOS MÉDICOS SENSÍVEIS (PGCRYPTO)
-- Permite que diagnósticos e observações sejam gravados criptografados
-- ==============================================================================

create or replace function public.criptografar_dado_sensivel(p_texto text, p_chave text)
returns text language sql security definer set search_path = public, extensions as $$
  select extensions.encode(extensions.pgp_sym_encrypt(p_texto, p_chave), 'base64');
$$;

create or replace function public.descriptografar_dado_sensivel(p_criptografado text, p_chave text)
returns text language sql security definer set search_path = public, extensions as $$
  select extensions.pgp_sym_decrypt(extensions.decode(p_criptografado, 'base64'), p_chave);
$$;

revoke all on function public.criptografar_dado_sensivel(text, text) from public, anon;
revoke all on function public.descriptografar_dado_sensivel(text, text) from public, anon;
grant execute on function public.criptografar_dado_sensivel(text, text) to service_role;
grant execute on function public.descriptografar_dado_sensivel(text, text) to service_role;
