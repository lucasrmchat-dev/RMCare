-- Link público de confirmação de presença (confirmar / remarcar / cancelar) — redução de no-show.
-- Apenas adiciona colunas e índices; nenhum dado existente é removido.

alter table public.agendamentos
  add column if not exists confirmado_em timestamptz,
  add column if not exists confirmado_por text,
  add column if not exists confirmacao_aberta_em timestamptz;

comment on column public.agendamentos.confirmado_em is 'Momento em que a presença foi confirmada (link, WhatsApp ou operador).';
comment on column public.agendamentos.confirmado_por is 'Origem da confirmação: paciente_link, paciente_link_remarcacao, paciente_webhook, administrador.';
comment on column public.agendamentos.confirmacao_aberta_em is 'Primeira vez que o paciente abriu o link de confirmação.';

create index if not exists agendamentos_confirmacao_idx
  on public.agendamentos(empresa_id, data_agendamento, status_atendimento);

-- Remarcação passa a limpar a confirmação anterior (o novo horário precisa ser confirmado de novo).
-- Mesma assinatura e mesmas regras da versão de 20260807120000, acrescentando apenas a limpeza.
create or replace function public.remarcar_agendamento(p_agendamento_id uuid, p_empresa_id uuid, p_paciente_id uuid default null, p_nova_data date default null, p_novo_horario time default null)
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
    status_atendimento = 'agendado', remarcado_em = now(), cancelado_em = null, cancelado_por = null, motivo_cancelamento = null,
    confirmado_em = null, confirmado_por = null
    where id = p_agendamento_id;
  update fila_mensagens set status = 'cancelada'
    where agendamento_id = p_agendamento_id and status in ('pendente', 'aguardando_conclusao');
  return true;
end; $$;
revoke all on function public.remarcar_agendamento(uuid, uuid, uuid, date, time) from public, anon, authenticated;
grant execute on function public.remarcar_agendamento(uuid, uuid, uuid, date, time) to service_role;
