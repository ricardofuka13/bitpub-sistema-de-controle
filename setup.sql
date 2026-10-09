-- BitPub: configuração do banco de dados (rode UMA vez, no SQL Editor do Supabase)

create table if not exists public.docs (
  coll text not null,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (coll, id)
);

create index if not exists docs_updated_idx on public.docs (updated_at);
create index if not exists docs_day_idx on public.docs (coll, (data->>'day'));
create index if not exists docs_payday_idx on public.docs (coll, (data->>'payDay'));
create index if not exists docs_status_idx on public.docs (coll, (data->>'status'));

-- carimba a hora do servidor em toda gravação
create or replace function public.docs_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists docs_touch_trg on public.docs;
create trigger docs_touch_trg before insert or update on public.docs
for each row execute function public.docs_touch();

-- só quem fez login pode ler e gravar
alter table public.docs enable row level security;

drop policy if exists "equipe le" on public.docs;
drop policy if exists "equipe insere" on public.docs;
drop policy if exists "equipe altera" on public.docs;
drop policy if exists "equipe apaga" on public.docs;

create policy "equipe le" on public.docs for select to authenticated using (true);
create policy "equipe insere" on public.docs for insert to authenticated with check (true);
create policy "equipe altera" on public.docs for update to authenticated using (true) with check (true);
create policy "equipe apaga" on public.docs for delete to authenticated using (true);

-- soma ou subtrai de um campo numérico direto no servidor (estoque correto com 2 celulares)
create or replace function public.inc_field(p_coll text, p_id text, p_field text, p_delta numeric)
returns numeric
language plpgsql
security invoker
as $$
declare
  nv numeric;
begin
  update public.docs
     set data = jsonb_set(data, array[p_field],
                 to_jsonb(round(coalesce((data->>p_field)::numeric, 0) + p_delta, 3)))
   where coll = p_coll and id = p_id
  returning (data->>p_field)::numeric into nv;
  return nv;
end $$;

grant execute on function public.inc_field(text, text, text, numeric) to authenticated;
