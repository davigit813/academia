-- ============================================================
-- SEGURANÇA DO SUPABASE  —  rode UMA vez no SQL Editor
-- (Supabase > SQL Editor > New query > cole tudo > Run)
-- Pode rodar de novo sem problema: ele refaz as regras do zero.
-- ============================================================
-- Regra geral: cada aluno só enxerga e mexe nos PRÓPRIOS dados.
-- Sem isso, qualquer pessoa com a chave que está no app.js
-- consegue ler (ou apagar) os dados de todo mundo.

-- ------------------------------------------------------------
-- 1) Liga a proteção (Row Level Security) em todas as tabelas
-- ------------------------------------------------------------
alter table public.alunos    enable row level security;
alter table public.checkins  enable row level security;
alter table public.pesos     enable row level security;
alter table public.progresso enable row level security;

-- ------------------------------------------------------------
-- 2) alunos  (ler, criar o próprio cadastro, atualizar nome/foto)
-- ------------------------------------------------------------
drop policy if exists "alunos_select_proprio" on public.alunos;
drop policy if exists "alunos_insert_proprio" on public.alunos;
drop policy if exists "alunos_update_proprio" on public.alunos;

create policy "alunos_select_proprio" on public.alunos
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "alunos_insert_proprio" on public.alunos
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "alunos_update_proprio" on public.alunos
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ------------------------------------------------------------
-- 3) checkins  (ler, registrar, desfazer)
-- ------------------------------------------------------------
drop policy if exists "checkins_select_proprio" on public.checkins;
drop policy if exists "checkins_insert_proprio" on public.checkins;
drop policy if exists "checkins_delete_proprio" on public.checkins;

create policy "checkins_select_proprio" on public.checkins
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "checkins_insert_proprio" on public.checkins
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "checkins_delete_proprio" on public.checkins
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ------------------------------------------------------------
-- 4) pesos  (ler, registrar, editar, apagar)
-- ------------------------------------------------------------
drop policy if exists "pesos_select_proprio" on public.pesos;
drop policy if exists "pesos_insert_proprio" on public.pesos;
drop policy if exists "pesos_update_proprio" on public.pesos;
drop policy if exists "pesos_delete_proprio" on public.pesos;

create policy "pesos_select_proprio" on public.pesos
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "pesos_insert_proprio" on public.pesos
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "pesos_update_proprio" on public.pesos
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "pesos_delete_proprio" on public.pesos
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ------------------------------------------------------------
-- 5) progresso  (ler, registrar, editar, apagar)
-- ------------------------------------------------------------
drop policy if exists "progresso_select_proprio" on public.progresso;
drop policy if exists "progresso_insert_proprio" on public.progresso;
drop policy if exists "progresso_update_proprio" on public.progresso;
drop policy if exists "progresso_delete_proprio" on public.progresso;

create policy "progresso_select_proprio" on public.progresso
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "progresso_insert_proprio" on public.progresso
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "progresso_update_proprio" on public.progresso
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "progresso_delete_proprio" on public.progresso
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ------------------------------------------------------------
-- 6) Limites nos valores (o banco recusa lixo mesmo se alguém burlar o site)
--    "not valid" = vale para registros NOVOS e editados; os antigos não são checados.
-- ------------------------------------------------------------
alter table public.pesos drop constraint if exists pesos_peso_valido;
alter table public.pesos
  add constraint pesos_peso_valido check (peso > 0 and peso <= 200) not valid;

alter table public.progresso drop constraint if exists progresso_peso_valido;
alter table public.progresso
  add constraint progresso_peso_valido check (peso > 0 and peso <= 1000) not valid;

alter table public.progresso drop constraint if exists progresso_nome_valido;
alter table public.progresso
  add constraint progresso_nome_valido check (char_length(nome) between 1 and 80) not valid;

alter table public.alunos drop constraint if exists alunos_nome_valido;
alter table public.alunos
  add constraint alunos_nome_valido check (char_length(nome) between 1 and 60) not valid;

-- ------------------------------------------------------------
-- 7) OPCIONAL: impede registro duplicado no mesmo dia.
--    Se der erro de "duplicate key", é porque já existem duplicados:
--    apague-os primeiro e rode de novo. Tire o "--" do começo para ativar.
-- ------------------------------------------------------------
-- create unique index if not exists pesos_um_por_dia     on public.pesos (user_id, data);
-- create unique index if not exists checkins_um_por_dia  on public.checkins (user_id, data);

-- ------------------------------------------------------------
-- 8) OPCIONAL: coluna da foto de perfil (para a foto aparecer em qualquer aparelho).
--    O app.js já tenta usar essa coluna se ela existir.
-- ------------------------------------------------------------
-- alter table public.alunos add column if not exists avatar text;
