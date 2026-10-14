-- Guarda o identificador do catálogo aberto para reutilizar a mídia licenciada
-- que a Maiza associar ao exercício, sem duplicar o registro a cada aluno.

alter table public.biblioteca_exercicios
  add column if not exists id_externo text,
  add column if not exists licenca_url text,
  add column if not exists fonte_texto text,
  add column if not exists licenca_texto_url text;

create unique index if not exists biblioteca_exercicios_id_externo_idx
  on public.biblioteca_exercicios (id_externo)
  where id_externo is not null;

alter table public.treinos
  add column if not exists fonte text,
  add column if not exists licenca_url text,
  add column if not exists fonte_texto text,
  add column if not exists licenca_texto_url text;
