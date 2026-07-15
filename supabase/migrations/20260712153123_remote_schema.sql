drop extension if exists "pg_net";


  create table "public"."administradores" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "usuario" text not null,
    "senha_hash" text not null,
    "role" text not null default 'empresa'::text,
    "empresa_id" uuid
      );



  create table "public"."agendamentos" (
    "id" uuid not null default gen_random_uuid(),
    "paciente_id" uuid,
    "tipo_servico" text not null,
    "subtipo_exame" text,
    "medico_profissional" text not null,
    "data_agendamento" date not null,
    "horario_agendamento" time without time zone not null,
    "modalidade" text not null,
    "status_pagamento_antecipado" boolean default false,
    "valor_total" numeric(10,2),
    "data_consulta_inicial" date,
    "created_at" timestamp with time zone default now()
      );



  create table "public"."bloqueios_horarios" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "data" date not null,
    "horario" text not null,
    "medico_profissional" text not null,
    "status" text default 'manual'::text
      );


alter table "public"."bloqueios_horarios" enable row level security;


  create table "public"."empresas" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "nome" text not null,
    "slug" text not null,
    "supabase_url" text,
    "supabase_anon_key" text,
    "mp_public_key" text,
    "mp_anon_token" text
      );


alter table "public"."empresas" enable row level security;


  create table "public"."fila_mensagens" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "telefone_whatsapp" text not null,
    "nome_paciente" text not null,
    "mensagem" text not null,
    "data_hora_programada" timestamp with time zone not null,
    "status" text default 'pendente'::text
      );



  create table "public"."opcoes_triagem" (
    "id" uuid not null default gen_random_uuid(),
    "pergunta_id" uuid,
    "texto_opcao" text not null,
    "regra_bloqueio_dias" integer default 0,
    "tipo_contagem_dias" text default 'corridos'::text
      );



  create table "public"."pacientes" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "cpf" text not null,
    "nome_completo" text,
    "telefone_whatsapp" text,
    "email" text,
    "data_nascimento" date
      );



  create table "public"."pacientes_credenciais" (
    "paciente_id" uuid not null,
    "senha_hash" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."pacientes_credenciais" enable row level security;


  create table "public"."perguntas_triagem" (
    "id" uuid not null default gen_random_uuid(),
    "servico_id" uuid,
    "pergunta" text not null,
    "ativa" boolean default true
      );



  create table "public"."servicos" (
    "id" uuid not null default gen_random_uuid(),
    "nome" text not null,
    "tipo" text not null,
    "preco" numeric not null,
    "dias_bloqueio_padrao" integer default 0,
    "ativo" boolean default true,
    "tipo_contagem_dias" text default 'corridos'::text
      );


CREATE UNIQUE INDEX administradores_pkey ON public.administradores USING btree (id);

CREATE UNIQUE INDEX administradores_usuario_key ON public.administradores USING btree (usuario);

CREATE UNIQUE INDEX agendamentos_pkey ON public.agendamentos USING btree (id);

CREATE UNIQUE INDEX bloqueios_horarios_pkey ON public.bloqueios_horarios USING btree (id);

CREATE UNIQUE INDEX empresas_pkey ON public.empresas USING btree (id);

CREATE UNIQUE INDEX empresas_slug_key ON public.empresas USING btree (slug);

CREATE UNIQUE INDEX fila_mensagens_pkey ON public.fila_mensagens USING btree (id);

CREATE UNIQUE INDEX opcoes_triagem_pkey ON public.opcoes_triagem USING btree (id);

CREATE UNIQUE INDEX pacientes_cpf_key ON public.pacientes USING btree (cpf);

CREATE UNIQUE INDEX pacientes_credenciais_pkey ON public.pacientes_credenciais USING btree (paciente_id);

CREATE UNIQUE INDEX pacientes_pkey ON public.pacientes USING btree (id);

CREATE UNIQUE INDEX perguntas_triagem_pkey ON public.perguntas_triagem USING btree (id);

CREATE UNIQUE INDEX servicos_pkey ON public.servicos USING btree (id);

alter table "public"."administradores" add constraint "administradores_pkey" PRIMARY KEY using index "administradores_pkey";

alter table "public"."agendamentos" add constraint "agendamentos_pkey" PRIMARY KEY using index "agendamentos_pkey";

alter table "public"."bloqueios_horarios" add constraint "bloqueios_horarios_pkey" PRIMARY KEY using index "bloqueios_horarios_pkey";

alter table "public"."empresas" add constraint "empresas_pkey" PRIMARY KEY using index "empresas_pkey";

alter table "public"."fila_mensagens" add constraint "fila_mensagens_pkey" PRIMARY KEY using index "fila_mensagens_pkey";

alter table "public"."opcoes_triagem" add constraint "opcoes_triagem_pkey" PRIMARY KEY using index "opcoes_triagem_pkey";

alter table "public"."pacientes" add constraint "pacientes_pkey" PRIMARY KEY using index "pacientes_pkey";

alter table "public"."pacientes_credenciais" add constraint "pacientes_credenciais_pkey" PRIMARY KEY using index "pacientes_credenciais_pkey";

alter table "public"."perguntas_triagem" add constraint "perguntas_triagem_pkey" PRIMARY KEY using index "perguntas_triagem_pkey";

alter table "public"."servicos" add constraint "servicos_pkey" PRIMARY KEY using index "servicos_pkey";

alter table "public"."administradores" add constraint "administradores_empresa_id_fkey" FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) not valid;

alter table "public"."administradores" validate constraint "administradores_empresa_id_fkey";

alter table "public"."administradores" add constraint "administradores_usuario_key" UNIQUE using index "administradores_usuario_key";

alter table "public"."agendamentos" add constraint "agendamentos_paciente_id_fkey" FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id) ON DELETE CASCADE not valid;

alter table "public"."agendamentos" validate constraint "agendamentos_paciente_id_fkey";

alter table "public"."empresas" add constraint "empresas_slug_key" UNIQUE using index "empresas_slug_key";

alter table "public"."opcoes_triagem" add constraint "opcoes_triagem_pergunta_id_fkey" FOREIGN KEY (pergunta_id) REFERENCES public.perguntas_triagem(id) ON DELETE CASCADE not valid;

alter table "public"."opcoes_triagem" validate constraint "opcoes_triagem_pergunta_id_fkey";

alter table "public"."pacientes" add constraint "pacientes_cpf_key" UNIQUE using index "pacientes_cpf_key";

alter table "public"."pacientes_credenciais" add constraint "pacientes_credenciais_paciente_id_fkey" FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id) ON DELETE CASCADE not valid;

alter table "public"."pacientes_credenciais" validate constraint "pacientes_credenciais_paciente_id_fkey";

alter table "public"."perguntas_triagem" add constraint "perguntas_triagem_servico_id_fkey" FOREIGN KEY (servico_id) REFERENCES public.servicos(id) ON DELETE CASCADE not valid;

alter table "public"."perguntas_triagem" validate constraint "perguntas_triagem_servico_id_fkey";

grant delete on table "public"."administradores" to "anon";

grant insert on table "public"."administradores" to "anon";

grant references on table "public"."administradores" to "anon";

grant select on table "public"."administradores" to "anon";

grant trigger on table "public"."administradores" to "anon";

grant truncate on table "public"."administradores" to "anon";

grant update on table "public"."administradores" to "anon";

grant delete on table "public"."administradores" to "authenticated";

grant insert on table "public"."administradores" to "authenticated";

grant references on table "public"."administradores" to "authenticated";

grant select on table "public"."administradores" to "authenticated";

grant trigger on table "public"."administradores" to "authenticated";

grant truncate on table "public"."administradores" to "authenticated";

grant update on table "public"."administradores" to "authenticated";

grant delete on table "public"."administradores" to "service_role";

grant insert on table "public"."administradores" to "service_role";

grant references on table "public"."administradores" to "service_role";

grant select on table "public"."administradores" to "service_role";

grant trigger on table "public"."administradores" to "service_role";

grant truncate on table "public"."administradores" to "service_role";

grant update on table "public"."administradores" to "service_role";

grant delete on table "public"."agendamentos" to "anon";

grant insert on table "public"."agendamentos" to "anon";

grant references on table "public"."agendamentos" to "anon";

grant select on table "public"."agendamentos" to "anon";

grant trigger on table "public"."agendamentos" to "anon";

grant truncate on table "public"."agendamentos" to "anon";

grant update on table "public"."agendamentos" to "anon";

grant delete on table "public"."agendamentos" to "authenticated";

grant insert on table "public"."agendamentos" to "authenticated";

grant references on table "public"."agendamentos" to "authenticated";

grant select on table "public"."agendamentos" to "authenticated";

grant trigger on table "public"."agendamentos" to "authenticated";

grant truncate on table "public"."agendamentos" to "authenticated";

grant update on table "public"."agendamentos" to "authenticated";

grant delete on table "public"."agendamentos" to "service_role";

grant insert on table "public"."agendamentos" to "service_role";

grant references on table "public"."agendamentos" to "service_role";

grant select on table "public"."agendamentos" to "service_role";

grant trigger on table "public"."agendamentos" to "service_role";

grant truncate on table "public"."agendamentos" to "service_role";

grant update on table "public"."agendamentos" to "service_role";

grant delete on table "public"."bloqueios_horarios" to "anon";

grant insert on table "public"."bloqueios_horarios" to "anon";

grant references on table "public"."bloqueios_horarios" to "anon";

grant select on table "public"."bloqueios_horarios" to "anon";

grant trigger on table "public"."bloqueios_horarios" to "anon";

grant truncate on table "public"."bloqueios_horarios" to "anon";

grant update on table "public"."bloqueios_horarios" to "anon";

grant delete on table "public"."bloqueios_horarios" to "authenticated";

grant insert on table "public"."bloqueios_horarios" to "authenticated";

grant references on table "public"."bloqueios_horarios" to "authenticated";

grant select on table "public"."bloqueios_horarios" to "authenticated";

grant trigger on table "public"."bloqueios_horarios" to "authenticated";

grant truncate on table "public"."bloqueios_horarios" to "authenticated";

grant update on table "public"."bloqueios_horarios" to "authenticated";

grant delete on table "public"."bloqueios_horarios" to "service_role";

grant insert on table "public"."bloqueios_horarios" to "service_role";

grant references on table "public"."bloqueios_horarios" to "service_role";

grant select on table "public"."bloqueios_horarios" to "service_role";

grant trigger on table "public"."bloqueios_horarios" to "service_role";

grant truncate on table "public"."bloqueios_horarios" to "service_role";

grant update on table "public"."bloqueios_horarios" to "service_role";

grant delete on table "public"."empresas" to "anon";

grant insert on table "public"."empresas" to "anon";

grant references on table "public"."empresas" to "anon";

grant select on table "public"."empresas" to "anon";

grant trigger on table "public"."empresas" to "anon";

grant truncate on table "public"."empresas" to "anon";

grant update on table "public"."empresas" to "anon";

grant delete on table "public"."empresas" to "authenticated";

grant insert on table "public"."empresas" to "authenticated";

grant references on table "public"."empresas" to "authenticated";

grant select on table "public"."empresas" to "authenticated";

grant trigger on table "public"."empresas" to "authenticated";

grant truncate on table "public"."empresas" to "authenticated";

grant update on table "public"."empresas" to "authenticated";

grant delete on table "public"."empresas" to "service_role";

grant insert on table "public"."empresas" to "service_role";

grant references on table "public"."empresas" to "service_role";

grant select on table "public"."empresas" to "service_role";

grant trigger on table "public"."empresas" to "service_role";

grant truncate on table "public"."empresas" to "service_role";

grant update on table "public"."empresas" to "service_role";

grant delete on table "public"."fila_mensagens" to "anon";

grant insert on table "public"."fila_mensagens" to "anon";

grant references on table "public"."fila_mensagens" to "anon";

grant select on table "public"."fila_mensagens" to "anon";

grant trigger on table "public"."fila_mensagens" to "anon";

grant truncate on table "public"."fila_mensagens" to "anon";

grant update on table "public"."fila_mensagens" to "anon";

grant delete on table "public"."fila_mensagens" to "authenticated";

grant insert on table "public"."fila_mensagens" to "authenticated";

grant references on table "public"."fila_mensagens" to "authenticated";

grant select on table "public"."fila_mensagens" to "authenticated";

grant trigger on table "public"."fila_mensagens" to "authenticated";

grant truncate on table "public"."fila_mensagens" to "authenticated";

grant update on table "public"."fila_mensagens" to "authenticated";

grant delete on table "public"."fila_mensagens" to "service_role";

grant insert on table "public"."fila_mensagens" to "service_role";

grant references on table "public"."fila_mensagens" to "service_role";

grant select on table "public"."fila_mensagens" to "service_role";

grant trigger on table "public"."fila_mensagens" to "service_role";

grant truncate on table "public"."fila_mensagens" to "service_role";

grant update on table "public"."fila_mensagens" to "service_role";

grant delete on table "public"."opcoes_triagem" to "anon";

grant insert on table "public"."opcoes_triagem" to "anon";

grant references on table "public"."opcoes_triagem" to "anon";

grant select on table "public"."opcoes_triagem" to "anon";

grant trigger on table "public"."opcoes_triagem" to "anon";

grant truncate on table "public"."opcoes_triagem" to "anon";

grant update on table "public"."opcoes_triagem" to "anon";

grant delete on table "public"."opcoes_triagem" to "authenticated";

grant insert on table "public"."opcoes_triagem" to "authenticated";

grant references on table "public"."opcoes_triagem" to "authenticated";

grant select on table "public"."opcoes_triagem" to "authenticated";

grant trigger on table "public"."opcoes_triagem" to "authenticated";

grant truncate on table "public"."opcoes_triagem" to "authenticated";

grant update on table "public"."opcoes_triagem" to "authenticated";

grant delete on table "public"."opcoes_triagem" to "service_role";

grant insert on table "public"."opcoes_triagem" to "service_role";

grant references on table "public"."opcoes_triagem" to "service_role";

grant select on table "public"."opcoes_triagem" to "service_role";

grant trigger on table "public"."opcoes_triagem" to "service_role";

grant truncate on table "public"."opcoes_triagem" to "service_role";

grant update on table "public"."opcoes_triagem" to "service_role";

grant delete on table "public"."pacientes" to "anon";

grant insert on table "public"."pacientes" to "anon";

grant references on table "public"."pacientes" to "anon";

grant select on table "public"."pacientes" to "anon";

grant trigger on table "public"."pacientes" to "anon";

grant truncate on table "public"."pacientes" to "anon";

grant update on table "public"."pacientes" to "anon";

grant delete on table "public"."pacientes" to "authenticated";

grant insert on table "public"."pacientes" to "authenticated";

grant references on table "public"."pacientes" to "authenticated";

grant select on table "public"."pacientes" to "authenticated";

grant trigger on table "public"."pacientes" to "authenticated";

grant truncate on table "public"."pacientes" to "authenticated";

grant update on table "public"."pacientes" to "authenticated";

grant delete on table "public"."pacientes" to "service_role";

grant insert on table "public"."pacientes" to "service_role";

grant references on table "public"."pacientes" to "service_role";

grant select on table "public"."pacientes" to "service_role";

grant trigger on table "public"."pacientes" to "service_role";

grant truncate on table "public"."pacientes" to "service_role";

grant update on table "public"."pacientes" to "service_role";

grant delete on table "public"."pacientes_credenciais" to "anon";

grant insert on table "public"."pacientes_credenciais" to "anon";

grant references on table "public"."pacientes_credenciais" to "anon";

grant select on table "public"."pacientes_credenciais" to "anon";

grant trigger on table "public"."pacientes_credenciais" to "anon";

grant truncate on table "public"."pacientes_credenciais" to "anon";

grant update on table "public"."pacientes_credenciais" to "anon";

grant delete on table "public"."pacientes_credenciais" to "authenticated";

grant insert on table "public"."pacientes_credenciais" to "authenticated";

grant references on table "public"."pacientes_credenciais" to "authenticated";

grant select on table "public"."pacientes_credenciais" to "authenticated";

grant trigger on table "public"."pacientes_credenciais" to "authenticated";

grant truncate on table "public"."pacientes_credenciais" to "authenticated";

grant update on table "public"."pacientes_credenciais" to "authenticated";

grant delete on table "public"."pacientes_credenciais" to "service_role";

grant insert on table "public"."pacientes_credenciais" to "service_role";

grant references on table "public"."pacientes_credenciais" to "service_role";

grant select on table "public"."pacientes_credenciais" to "service_role";

grant trigger on table "public"."pacientes_credenciais" to "service_role";

grant truncate on table "public"."pacientes_credenciais" to "service_role";

grant update on table "public"."pacientes_credenciais" to "service_role";

grant delete on table "public"."perguntas_triagem" to "anon";

grant insert on table "public"."perguntas_triagem" to "anon";

grant references on table "public"."perguntas_triagem" to "anon";

grant select on table "public"."perguntas_triagem" to "anon";

grant trigger on table "public"."perguntas_triagem" to "anon";

grant truncate on table "public"."perguntas_triagem" to "anon";

grant update on table "public"."perguntas_triagem" to "anon";

grant delete on table "public"."perguntas_triagem" to "authenticated";

grant insert on table "public"."perguntas_triagem" to "authenticated";

grant references on table "public"."perguntas_triagem" to "authenticated";

grant select on table "public"."perguntas_triagem" to "authenticated";

grant trigger on table "public"."perguntas_triagem" to "authenticated";

grant truncate on table "public"."perguntas_triagem" to "authenticated";

grant update on table "public"."perguntas_triagem" to "authenticated";

grant delete on table "public"."perguntas_triagem" to "service_role";

grant insert on table "public"."perguntas_triagem" to "service_role";

grant references on table "public"."perguntas_triagem" to "service_role";

grant select on table "public"."perguntas_triagem" to "service_role";

grant trigger on table "public"."perguntas_triagem" to "service_role";

grant truncate on table "public"."perguntas_triagem" to "service_role";

grant update on table "public"."perguntas_triagem" to "service_role";

grant delete on table "public"."servicos" to "anon";

grant insert on table "public"."servicos" to "anon";

grant references on table "public"."servicos" to "anon";

grant select on table "public"."servicos" to "anon";

grant trigger on table "public"."servicos" to "anon";

grant truncate on table "public"."servicos" to "anon";

grant update on table "public"."servicos" to "anon";

grant delete on table "public"."servicos" to "authenticated";

grant insert on table "public"."servicos" to "authenticated";

grant references on table "public"."servicos" to "authenticated";

grant select on table "public"."servicos" to "authenticated";

grant trigger on table "public"."servicos" to "authenticated";

grant truncate on table "public"."servicos" to "authenticated";

grant update on table "public"."servicos" to "authenticated";

grant delete on table "public"."servicos" to "service_role";

grant insert on table "public"."servicos" to "service_role";

grant references on table "public"."servicos" to "service_role";

grant select on table "public"."servicos" to "service_role";

grant trigger on table "public"."servicos" to "service_role";

grant truncate on table "public"."servicos" to "service_role";

grant update on table "public"."servicos" to "service_role";


  create policy "Permitir controle de bloqueios de horários"
  on "public"."bloqueios_horarios"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Permitir leitura e escrita de empresas"
  on "public"."empresas"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Permitir tudo para operações autenticadas/anonimas"
  on "public"."pacientes_credenciais"
  as permissive
  for all
  to public
using (true)
with check (true);



