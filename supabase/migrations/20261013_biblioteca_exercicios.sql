-- Execute no SQL Editor do Supabase do projeto Sistema Maiza.
-- Mantem as tabelas e politicas existentes e acrescenta campos opcionais
-- para pesquisa, demonstracoes e associacao entre biblioteca e ficha de treino.

alter table public.biblioteca_exercicios
  add column if not exists grupo text,
  add column if not exists equipamento text,
  add column if not exists como_executar text,
  add column if not exists imagem_url text,
  add column if not exists video text,
  add column if not exists fonte text,
  add column if not exists atribuicao text;

alter table public.treinos
  add column if not exists biblioteca_exercicio_id uuid
    references public.biblioteca_exercicios(id) on delete set null,
  add column if not exists descanso text,
  add column if not exists como_executar text,
  add column if not exists imagem_url text,
  add column if not exists video text,
  add column if not exists atribuicao text;

create index if not exists treinos_biblioteca_exercicio_id_idx
  on public.treinos (biblioteca_exercicio_id);
