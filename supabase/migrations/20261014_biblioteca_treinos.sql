-- Permite identificar e exibir separadamente cada rotina atribuída ao aluno.
alter table public.treinos
  add column if not exists treino_nome text;
