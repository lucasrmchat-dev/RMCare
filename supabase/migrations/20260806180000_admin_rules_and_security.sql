create extension if not exists pgcrypto with schema extensions;

alter table public.agendamentos
  add column if not exists categoria_atendimento text not null default 'inicial',
  add column if not exists consulta_inicial_id uuid references public.agendamentos(id),
  add column if not exists status_atendimento text not null default 'agendado',
  add column if not exists data_hora_conclusao timestamptz;

alter table public.fila_mensagens
  add column if not exists empresa_id uuid references public.empresas(id),
  add column if not exists agendamento_id uuid references public.agendamentos(id),
  add column if not exists gatilho text not null default 'agendado';

alter table public.servicos
  add column if not exists categoria_atendimento text not null default 'inicial';

alter table public.regras_agenda
  add column if not exists categoria_atendimento text,
  add column if not exists modalidade text;

alter table public.empresas
  add column if not exists config_regras jsonb not null default '{"retorno_prazo_dias":30,"retorno_exige_pagamento":true,"delay_confirmacao_segundos":0}'::jsonb;

drop function if exists public.verificar_senha_admin(text, text);
create function public.verificar_senha_admin(p_usuario text, p_senha text)
returns boolean language sql security definer set search_path = public, extensions
as $$ select exists(select 1 from administradores where usuario = lower(trim(p_usuario)) and senha_hash = extensions.crypt(p_senha, senha_hash)); $$;

revoke all on function public.verificar_senha_admin(text, text) from public, anon, authenticated;
grant execute on function public.verificar_senha_admin(text, text) to service_role;

drop function if exists public.alterar_credenciais_admin(text, text, text);
create function public.alterar_credenciais_admin(p_usuario_atual text, p_novo_usuario text, p_nova_senha text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  update administradores set usuario = lower(trim(p_novo_usuario)), senha_hash = extensions.crypt(p_nova_senha, extensions.gen_salt('bf')) where usuario = p_usuario_atual;
end; $$;
revoke all on function public.alterar_credenciais_admin(text, text, text) from public, anon, authenticated;
grant execute on function public.alterar_credenciais_admin(text, text, text) to service_role;

drop function if exists public.provisionar_empresa(text, text, text, text);
create function public.provisionar_empresa(p_nome text, p_slug text, p_usuario text, p_senha text)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v_empresa_id uuid;
begin
  insert into empresas(nome, slug) values (p_nome, p_slug) returning id into v_empresa_id;
  insert into administradores(usuario, senha_hash, role, empresa_id)
  values (lower(trim(p_usuario)), extensions.crypt(p_senha, extensions.gen_salt('bf')), 'empresa', v_empresa_id);
  return v_empresa_id;
end; $$;
revoke all on function public.provisionar_empresa(text, text, text, text) from public, anon, authenticated;
grant execute on function public.provisionar_empresa(text, text, text, text) to service_role;

revoke insert, update, delete, truncate on public.administradores from anon, authenticated;
revoke insert, update, delete, truncate on public.empresas from anon, authenticated;
