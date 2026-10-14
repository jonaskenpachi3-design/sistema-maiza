-- Permite que administradoras vejam todos os cadastros de alunos.
-- A policy existente para o aluno consultar o próprio cadastro permanece intacta.
drop policy if exists "Admins can view all students" on public.alunos;

create policy "Admins can view all students"
  on public.alunos
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.perfis
      where perfis.id = (select auth.uid())
        and perfis.role = 'admin'
    )
  );
