alter table public.agendamentos
  add column if not exists cancelado_em timestamptz,
  add column if not exists cancelado_por text,
  add column if not exists motivo_cancelamento text,
  add column if not exists remarcado_em timestamptz;

alter table public.servicos
  add column if not exists agendamento_bloqueado_ate date,
  add column if not exists motivo_bloqueio_agenda text;

create index if not exists fila_mensagens_agendamento_idx on public.fila_mensagens(agendamento_id);
create index if not exists agendamentos_disponibilidade_idx on public.agendamentos(empresa_id, data_agendamento, horario_agendamento, status_atendimento);

-- Função de Cancelamento Soft (Status = cancelado, desativa mensagens na fila)
drop function if exists public.cancelar_agendamento(uuid, uuid, uuid, text, text);
create function public.cancelar_agendamento(p_agendamento_id uuid, p_empresa_id uuid, p_paciente_id uuid default null, p_cancelado_por text default 'admin', p_motivo text default null)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update agendamentos
     set status_atendimento = 'cancelado', cancelado_em = now(), cancelado_por = p_cancelado_por, motivo_cancelamento = nullif(trim(p_motivo), '')
   where id = p_agendamento_id and empresa_id = p_empresa_id
     and (p_paciente_id is null or paciente_id = p_paciente_id)
     and status_atendimento <> 'cancelado';
  if not found then return false; end if;
  update fila_mensagens set status = 'cancelada'
   where agendamento_id = p_agendamento_id and status in ('pendente', 'aguardando_conclusao');
  return true;
end; $$;
revoke all on function public.cancelar_agendamento(uuid, uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.cancelar_agendamento(uuid, uuid, uuid, text, text) to service_role;

-- Função de Exclusão Física (Remove agendamento e mensagens atreladas)
drop function if exists public.excluir_agendamento(uuid, uuid, uuid);
create function public.excluir_agendamento(p_agendamento_id uuid, p_empresa_id uuid, p_paciente_id uuid default null)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  delete from public.fila_mensagens where agendamento_id = p_agendamento_id;
  delete from public.agendamentos
   where id = p_agendamento_id and empresa_id = p_empresa_id
     and (p_paciente_id is null or paciente_id = p_paciente_id);
  if not found then return false; end if;
  return true;
end; $$;
revoke all on function public.excluir_agendamento(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.excluir_agendamento(uuid, uuid, uuid) to service_role;

-- Função de Remarcação (Altera data/hora, libera horário anterior, desativa mensagens antigas)
drop function if exists public.remarcar_agendamento(uuid, uuid, uuid, date, time);
create function public.remarcar_agendamento(p_agendamento_id uuid, p_empresa_id uuid, p_paciente_id uuid default null, p_nova_data date default null, p_novo_horario time default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_servico text;
begin
  select case when tipo_servico = 'Exame' then subtipo_exame else medico_profissional end into v_servico
    from agendamentos where id = p_agendamento_id and empresa_id = p_empresa_id
      and (p_paciente_id is null or paciente_id = p_paciente_id) and status_atendimento <> 'cancelado' for update;
  if not found then return false; end if;
  if exists (
    select 1 from agendamentos where empresa_id = p_empresa_id and id <> p_agendamento_id
      and data_agendamento = p_nova_data and horario_agendamento = p_novo_horario
      and status_atendimento <> 'cancelado'
      and (case when tipo_servico = 'Exame' then subtipo_exame else medico_profissional end) = v_servico
  ) then raise exception 'Este horário acabou de ser ocupado.' using errcode = 'P0001'; end if;
  update agendamentos set data_agendamento = p_nova_data, horario_agendamento = p_novo_horario,
    status_atendimento = 'agendado', remarcado_em = now(), cancelado_em = null, cancelado_por = null, motivo_cancelamento = null
    where id = p_agendamento_id;
  update fila_mensagens set status = 'cancelada'
    where agendamento_id = p_agendamento_id and status in ('pendente', 'aguardando_conclusao');
  return true;
end; $$;
revoke all on function public.remarcar_agendamento(uuid, uuid, uuid, date, time) from public, anon, authenticated;
grant execute on function public.remarcar_agendamento(uuid, uuid, uuid, date, time) to service_role;
