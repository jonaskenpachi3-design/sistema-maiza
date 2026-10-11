// ============================================================
// Conexão com o Supabase — auth + banco de dados
// ============================================================
// 1) Crie o projeto em https://supabase.com (grátis)
// 2) Rode o schema-maiza.sql no SQL Editor do projeto
// 3) Pegue a URL e a chave "anon public" em:
//    Project Settings > API
// 4) Cole os valores abaixo (ou, melhor, use variáveis de
//    ambiente — veja a nota no final do arquivo)
// ============================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ------------------------------------------------------------
// AUTENTICAÇÃO
// ------------------------------------------------------------

export async function cadastrar(email, senha, nome) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { data: { nome } }, // vira raw_user_meta_data no trigger do SQL
  });
  return { data, error };
}

export async function login(email, senha) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });
  return { data, error };
}

export async function logout() {
  return supabase.auth.signOut();
}

export async function usuarioAtual() {
  const { data } = await supabase.auth.getUser();
  return data.user; // null se não estiver logado
}

export async function meuPerfil() {
  const user = await usuarioAtual();
  if (!user) return null;
  const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', user.id)
      .single();
  if (error) { console.error(error); return null; }
  return data; // { id, role: 'admin' | 'aluno', nome }
}

// ------------------------------------------------------------
// ALUNOS
// Graças ao RLS do schema, estas mesmas funções servem pra
// admin (vê todos) e pra aluno (o filtro de "só o meu" é
// aplicado pelo próprio banco, não precisa repetir aqui).
// ------------------------------------------------------------

export async function listarAlunos() {
  const { data, error } = await supabase
      .from('alunos')
      .select('*')
      .order('nome');
  return { data: data || [], error };
}

export async function criarAluno(aluno) {
  return supabase.from('alunos').insert(aluno).select().single();
}

export async function atualizarAluno(id, campos) {
  return supabase.from('alunos').update(campos).eq('id', id);
}

export async function removerAluno(id) {
  return supabase.from('alunos').delete().eq('id', id);
}

// Usado na visão do ALUNO: pega o cadastro dele mesmo (via perfil_id)
export async function meuCadastroAluno() {
  const user = await usuarioAtual();
  if (!user) return { data: null, error: null };
  return supabase.from('alunos').select('*').eq('perfil_id', user.id).single();
}

// Usado pelo ALUNO ao terminar o cronômetro: marca "treinou hoje" no cadastro dele
export async function registrarTreinoConcluido() {
  return supabase.rpc('registrar_treino_concluido');
}

// Usado pela Maiza: liga o login (conta já criada pelo aluno) ao cadastro dele
export async function vincularAlunoPorEmail(alunoId, email) {
  const { data: perfil, error: erroPerfil } = await supabase
      .from('perfis')
      .select('id')
      .eq('email', email.trim())
      .maybeSingle();

  if (erroPerfil) return { error: erroPerfil };
  if (!perfil) return { error: { message: 'Nenhuma conta encontrada com esse e-mail. O aluno precisa criar a conta dele primeiro (tela de cadastro).' } };

  return supabase.from('alunos').update({ perfil_id: perfil.id }).eq('id', alunoId);
}

// ------------------------------------------------------------
// TREINOS / DIETAS / AVALIAÇÕES / ENVIOS
// Todas seguem o mesmo padrão: tabela + aluno_id
// ------------------------------------------------------------

export async function listarTreinos(alunoId) {
  return supabase.from('treinos').select('*').eq('aluno_id', alunoId).order('ordem');
}

export async function adicionarTreino(treino) {
  return supabase.from('treinos').insert(treino);
}

export async function removerTreino(id) {
  return supabase.from('treinos').delete().eq('id', id);
}

export async function listarDietas(alunoId) {
  return supabase.from('dietas').select('*').eq('aluno_id', alunoId);
}

export async function adicionarDieta(dieta) {
  return supabase.from('dietas').insert(dieta);
}

export async function removerDieta(id) {
  return supabase.from('dietas').delete().eq('id', id);
}

export async function listarAvaliacoes(alunoId) {
  return supabase.from('avaliacoes').select('*').eq('aluno_id', alunoId).order('data');
}

export async function adicionarAvaliacao(avaliacao) {
  return supabase.from('avaliacoes').insert(avaliacao);
}

export async function removerAvaliacao(id) {
  return supabase.from('avaliacoes').delete().eq('id', id);
}

export async function listarNotas(alunoId) {
  return supabase.from('notas_consultoria').select('*').eq('aluno_id', alunoId).order('data', { ascending: false });
}

export async function adicionarNota(nota) {
  return supabase.from('notas_consultoria').insert(nota);
}

export async function removerNota(id) {
  return supabase.from('notas_consultoria').delete().eq('id', id);
}

// ------------------------------------------------------------
// ENVIOS (fotos/vídeos) — usa o Supabase Storage em vez do
// "assets" do artifact. Crie um bucket chamado "envios" em
// Storage > New bucket (marque como público ou com policy própria).
// ------------------------------------------------------------

export async function enviarArquivo(alunoId, arquivo, legenda) {
  const nomeArquivo = `${alunoId}/${Date.now()}-${arquivo.name}`;
  const { error: erroUpload } = await supabase.storage
      .from('envios')
      .upload(nomeArquivo, arquivo);
  if (erroUpload) return { error: erroUpload };

  const { data: urlData } = supabase.storage.from('envios').getPublicUrl(nomeArquivo);
  const tipo = arquivo.type.startsWith('video') ? 'video' : 'foto';

  return supabase.from('envios').insert({
    aluno_id: alunoId,
    tipo,
    asset_url: urlData.publicUrl,
    legenda,
  });
}

export async function listarEnvios(alunoId) {
  return supabase.from('envios').select('*').eq('aluno_id', alunoId).order('criado_em', { ascending: false });
}

export async function responderEnvio(envioId, textoDevolucao) {
  return supabase
      .from('envios')
      .update({ devolucao_texto: textoDevolucao, devolucao_em: new Date().toISOString() })
      .eq('id', envioId);
}

// ------------------------------------------------------------
// BIBLIOTECA DE EXERCÍCIOS
// Fotos vão pro Storage (bucket "biblioteca"); vídeo fica como
// link externo (YouTube/Instagram) pra não gastar os 50MB por
// arquivo / 1GB total do plano gratuito do Storage.
// Crie o bucket em Storage > New bucket > nome "biblioteca"
// (marcado como público).
// ------------------------------------------------------------

export async function listarBiblioteca() {
  const { data, error } = await supabase
      .from('biblioteca_exercicios')
      .select('*')
      .order('nome');
  return { data: data || [], error };
}

export async function criarExercicioBiblioteca({ nome, grupo, comoExecutar, video, imagemArquivo }) {
  let imagemUrl = null;

  if (imagemArquivo) {
    const nomeArquivo = `${Date.now()}-${imagemArquivo.name}`;
    const { error: erroUpload } = await supabase.storage
        .from('biblioteca')
        .upload(nomeArquivo, imagemArquivo);
    if (erroUpload) return { error: erroUpload };

    const { data: urlData } = supabase.storage.from('biblioteca').getPublicUrl(nomeArquivo);
    imagemUrl = urlData.publicUrl;
  }

  return supabase.from('biblioteca_exercicios').insert({
    nome,
    grupo,
    como_executar: comoExecutar,
    video,
    imagem_url: imagemUrl,
  }).select().single();
}

export async function removerExercicioBiblioteca(id) {
  return supabase.from('biblioteca_exercicios').delete().eq('id', id);
}

// ------------------------------------------------------------
// PLANOS (página de vendas)
// ------------------------------------------------------------

export async function listarPlanos() {
  const { data, error } = await supabase.from('planos').select('*').order('destaque', { ascending: false });
  return { data: data || [], error };
}

export async function criarPlano(plano) {
  return supabase.from('planos').insert(plano);
}

export async function removerPlano(id) {
  return supabase.from('planos').delete().eq('id', id);
}

// ------------------------------------------------------------
// TEMPO REAL (opcional) — equivalente ao onSnapshot do artifact
// ------------------------------------------------------------

export function escutarAlunos(callback) {
  return supabase
      .channel('alunos-mudancas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alunos' }, callback)
      .subscribe();
}

// ============================================================
// NOTA SOBRE SEGURANÇA DAS CHAVES:
// A "anon key" é pública por design (ela só abre a porta; quem
// decide o que cada um pode ver/editar são as policies de RLS
// que já estão no schema-maiza.sql). Mesmo assim, o ideal é não
// deixar hardcoded no código-fonte: em projetos Vite, crie um
// arquivo .env com:
//   VITE_SUPABASE_URL=...
//   VITE_SUPABASE_ANON_KEY=...
// e troque as duas constantes no topo deste arquivo por:
//   import.meta.env.VITE_SUPABASE_URL
//   import.meta.env.VITE_SUPABASE_ANON_KEY
// ============================================================