-- Rode no Supabase: SQL Editor > New query
-- Tabelas do Caixa e dos Investimentos. Cada usuário logado só acessa os próprios dados (RLS).
-- (As tabelas do cardápio/pedidos - categorias, produtos, pedidos - não são alteradas.)

create table if not exists public.caixa_categorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  criado_em timestamptz not null default now()
);
create unique index if not exists caixa_categorias_user_nome_idx on public.caixa_categorias (user_id, lower(nome));

create table if not exists public.caixa_lancamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('receita','despesa')),
  descricao text not null,
  categoria text not null,
  valor numeric(14,2) not null check (valor > 0),
  data_lancamento timestamptz not null default now(),
  criado_em timestamptz not null default now()
);
create index if not exists caixa_lancamentos_user_data_idx on public.caixa_lancamentos (user_id, data_lancamento desc);

create table if not exists public.investimentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  tipo text not null,
  valor_investido numeric(14,2) not null check (valor_investido > 0),
  valor_atual numeric(14,2) not null check (valor_atual >= 0),
  observacoes text,
  criado_em timestamptz not null default now()
);

alter table public.caixa_categorias  enable row level security;
alter table public.caixa_lancamentos enable row level security;
alter table public.investimentos     enable row level security;

drop policy if exists "caixa_categorias do usuario"  on public.caixa_categorias;
drop policy if exists "caixa_lancamentos do usuario" on public.caixa_lancamentos;
drop policy if exists "investimentos do usuario"     on public.investimentos;

create policy "caixa_categorias do usuario"  on public.caixa_categorias
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "caixa_lancamentos do usuario" on public.caixa_lancamentos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "investimentos do usuario"     on public.investimentos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Realtime
alter table public.caixa_categorias  replica identity full;
alter table public.caixa_lancamentos replica identity full;
alter table public.investimentos     replica identity full;
do $$
begin
  begin alter publication supabase_realtime add table public.caixa_categorias;  exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.caixa_lancamentos; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.investimentos;     exception when duplicate_object then null; end;
end $$;
