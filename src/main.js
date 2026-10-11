import { supabase, login, cadastrar, logout, usuarioAtual, meuPerfil } from './supabase-client.js';
import { montarPainelAdmin, irParaSecao } from './painel-admin.js';
import { montarPainelAluno } from './painel-aluno.js';

const telas = {
  carregando: document.getElementById('tela-carregando'),
  login: document.getElementById('tela-login'),
  cadastro: document.getElementById('tela-cadastro'),
  painel: document.getElementById('tela-painel'),
};

function mostrarTela(nome) {
  Object.values(telas).forEach(t => t.style.display = 'none');
  telas[nome].style.display = 'flex';
}

async function iniciar() {
  mostrarTela('carregando');
  const user = await usuarioAtual();
  if (user) {
    await abrirPainel();
  } else {
    mostrarTela('login');
  }
}

// ------------------------------------------------------------
// LOGIN / CADASTRO / SAIR
// ------------------------------------------------------------
document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;
  const erroEl = document.getElementById('login-erro');
  erroEl.textContent = '';
  const { error } = await login(email, senha);
  if (error) { erroEl.textContent = 'E-mail ou senha incorretos.'; return; }
  await abrirPainel();
});

document.getElementById('btn-ir-cadastro').addEventListener('click', () => mostrarTela('cadastro'));
document.getElementById('btn-ir-login').addEventListener('click', () => mostrarTela('login'));

document.getElementById('form-cadastro').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome = document.getElementById('cad-nome').value.trim();
  const email = document.getElementById('cad-email').value.trim();
  const senha = document.getElementById('cad-senha').value;
  const erroEl = document.getElementById('cadastro-erro');
  erroEl.textContent = '';
  const { error } = await cadastrar(email, senha, nome);
  if (error) {
    erroEl.textContent = error.message === 'User already registered'
        ? 'Esse e-mail já tem conta — tenta entrar.'
        : 'Não foi possível criar a conta: ' + error.message;
    return;
  }
  await abrirPainel();
});

document.getElementById('btn-sair').addEventListener('click', async () => {
  await logout();
  mostrarTela('login');
});

// ------------------------------------------------------------
// MENU MOBILE (hambúrguer)
// ------------------------------------------------------------
document.getElementById('btn-menu').addEventListener('click', () => {
  document.body.classList.toggle('sidebar-open');
});
document.getElementById('sidebar-backdrop').addEventListener('click', () => {
  document.body.classList.remove('sidebar-open');
});

// ------------------------------------------------------------
// NAVEGAÇÃO DA SIDEBAR (só existe pra admin)
// ------------------------------------------------------------
document.querySelectorAll('#nav-admin .nav-link').forEach(btn => {
  btn.addEventListener('click', async () => {
    document.querySelectorAll('#nav-admin .nav-link').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.body.classList.remove('sidebar-open');
    await irParaSecao(btn.dataset.secao);
  });
});

// ------------------------------------------------------------
// ABRIR O PAINEL CERTO (admin vê tudo, aluno vê só o dele)
// ------------------------------------------------------------
async function abrirPainel(tentativa = 0) {
  mostrarTela('carregando');

  const user = await usuarioAtual();
  if (!user) {
    document.getElementById('login-erro').textContent =
        'Não foi possível entrar. Se seu projeto exige confirmação por e-mail, confirme antes de entrar.';
    mostrarTela('login');
    return;
  }

  const perfil = await meuPerfil();

  if (!perfil) {
    if (tentativa >= 5) {
      document.getElementById('login-erro').textContent =
          'Conta criada, mas não encontramos seu perfil. Avise quem está configurando o sistema.';
      mostrarTela('login');
      return;
    }
    await new Promise(r => setTimeout(r, 800));
    return abrirPainel(tentativa + 1);
  }

  document.getElementById('saudacao').textContent = perfil.nome || 'Você';
  document.getElementById('avatar-letra').textContent = (perfil.nome || '?').charAt(0).toUpperCase();
  document.getElementById('papel-usuario').textContent = perfil.role === 'admin' ? 'Administradora' : 'Aluno(a)';

  document.getElementById('topo-saudacao').innerHTML = `Olá, ${perfil.nome || ''}`;
  document.getElementById('topo-data').textContent = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  }).toUpperCase();

  mostrarTela('painel');

  const conteudo = document.getElementById('conteudo-painel');
  const navAdmin = document.getElementById('nav-admin');

  if (perfil.role === 'admin') {
    navAdmin.style.display = 'grid';
    await montarPainelAdmin(conteudo);
  } else {
    navAdmin.style.display = 'none';
    await montarPainelAluno(conteudo);
  }
}

iniciar();