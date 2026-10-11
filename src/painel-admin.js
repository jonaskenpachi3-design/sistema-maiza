import {
  listarAlunos, criarAluno, atualizarAluno, removerAluno,
  listarTreinos, adicionarTreino, removerTreino,
  listarDietas, adicionarDieta, removerDieta,
  listarAvaliacoes, adicionarAvaliacao, removerAvaliacao,
  listarNotas, adicionarNota, removerNota,
  listarEnvios, responderEnvio,
  vincularAlunoPorEmail,
  listarBiblioteca, criarExercicioBiblioteca, removerExercicioBiblioteca,
  listarPlanos, criarPlano, removerPlano,
} from './supabase-client.js';

let containerGlobal = null;
let todosAlunosCache = [];

export async function montarPainelAdmin(container) {
  containerGlobal = container;
  await renderListaAlunos();
}

export async function irParaSecao(secao) {
  if (secao === 'alunos') return renderListaAlunos();
  if (secao === 'biblioteca') return renderBiblioteca();
  if (secao === 'planos') return renderPlanos();
}

// ==============================================================
// ALUNOS — lista
// ==============================================================
async function renderListaAlunos() {
  containerGlobal.innerHTML = `
    <div class="secao">
      <span class="eyebrow">Gestão de alunos</span>
      <h2>Alunos</h2>
      <div class="stats-row" id="stats-row"></div>
      <div class="campo-busca">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input type="text" id="busca-aluno" placeholder="Buscar aluno pelo nome..." />
      </div>
      <div id="lista-alunos" class="lista-cards"><p>Carregando alunos...</p></div>

      <form id="form-novo-aluno" class="caixa-form">
        <h3>Novo aluno</h3>
        <label>Nome</label>
        <input type="text" id="novo-nome" required />
        <label>Idade</label>
        <input type="number" id="novo-idade" />
        <label>Objetivo</label>
        <input type="text" id="novo-objetivo" placeholder="Ex: hipertrofia, emagrecimento" />
        <label>Contato</label>
        <input type="text" id="novo-contato" placeholder="WhatsApp ou e-mail" />
        <button type="submit"><i class="fa-solid fa-plus"></i> Adicionar aluno</button>
        <div id="erro-novo-aluno" class="erro"></div>
      </form>
    </div>
  `;

  document.getElementById('form-novo-aluno').addEventListener('submit', async (e) => {
    e.preventDefault();
    const erroEl = document.getElementById('erro-novo-aluno');
    erroEl.textContent = '';
    const { error } = await criarAluno({
      nome: document.getElementById('novo-nome').value.trim(),
      idade: document.getElementById('novo-idade').value || null,
      objetivo: document.getElementById('novo-objetivo').value.trim(),
      contato: document.getElementById('novo-contato').value.trim(),
    });
    if (error) { erroEl.textContent = 'Não foi possível salvar: ' + error.message; return; }
    e.target.reset();
    await carregarListaAlunos();
  });

  document.getElementById('busca-aluno').addEventListener('input', (e) => {
    desenharListaAlunos(filtrarAlunos(e.target.value));
  });

  await carregarListaAlunos();
}

function filtrarAlunos(termo) {
  const t = (termo || '').toLowerCase().trim();
  if (!t) return todosAlunosCache;
  return todosAlunosCache.filter(a => (a.nome || '').toLowerCase().includes(t));
}

async function carregarListaAlunos() {
  const listaEl = document.getElementById('lista-alunos');
  const { data: alunos, error } = await listarAlunos();
  if (error) { listaEl.innerHTML = `<p class="erro">Erro ao carregar alunos: ${error.message}</p>`; return; }
  todosAlunosCache = alunos;

  const hoje = new Date().toISOString().slice(0, 10);
  const revisoesPendentes = alunos.filter(a => a.proxima_revisao && a.proxima_revisao <= hoje).length;
  const treinaramEstaSemanaOuMais = alunos.filter(a => a.ultimo_treino_em).length;
  document.getElementById('stats-row').innerHTML = `
    <div class="stat-box"><div class="ic-stat"><i class="fa-solid fa-user-group"></i></div><div><span class="num">${alunos.length}</span><span class="lbl">Alunos</span></div></div>
    <div class="stat-box"><div class="ic-stat"><i class="fa-solid fa-check"></i></div><div><span class="num">${treinaramEstaSemanaOuMais}</span><span class="lbl">Já treinaram</span></div></div>
    <div class="stat-box"><div class="ic-stat"><i class="fa-solid fa-calendar"></i></div><div><span class="num">${revisoesPendentes}</span><span class="lbl">Revisões</span></div></div>
  `;

  desenharListaAlunos(alunos);
}

function desenharListaAlunos(alunos) {
  const listaEl = document.getElementById('lista-alunos');
  if (!alunos.length) {
    listaEl.innerHTML = '<div class="vazio-rico"><i class="fa-solid fa-user-group"></i>Nenhum aluno encontrado.</div>';
    return;
  }

  listaEl.innerHTML = alunos.map(a => `
    <div class="card-aluno" data-id="${a.id}">
      <div class="avatar-letra">${(a.nome || '?').charAt(0).toUpperCase()}</div>
      <div class="info-aluno">
        <strong>${escapar(a.nome)}</strong>
        <span>${a.idade ? a.idade + ' anos · ' : ''}${escapar(a.objetivo || 'sem objetivo definido')}</span>
        ${a.contato ? `<span class="contato">${escapar(a.contato)}</span>` : ''}
        ${a.proxima_revisao ? `<span class="tag">revisão: ${new Date(a.proxima_revisao).toLocaleDateString('pt-BR')}</span>` : ''}
        ${a.ultimo_treino_em ? `<span class="tag" style="background:rgba(34,197,94,.12);color:#16A34A"><i class="fa-solid fa-check"></i> treinou em ${new Date(a.ultimo_treino_em).toLocaleDateString('pt-BR')}</span>` : ''}
      </div>
      <button class="btn-remover" data-id="${a.id}" title="Remover aluno"><i class="fa-solid fa-xmark"></i></button>
    </div>
  `).join('');

  listaEl.querySelectorAll('.card-aluno').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-remover')) return;
      const aluno = todosAlunosCache.find(a => a.id === card.dataset.id);
      renderDetalheAluno(aluno);
    });
  });
  listaEl.querySelectorAll('.btn-remover').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Remover este aluno e todos os dados dele? Essa ação não pode ser desfeita.')) return;
      const { error } = await removerAluno(btn.dataset.id);
      if (error) { alert('Não foi possível remover: ' + error.message); return; }
      await carregarListaAlunos();
    });
  });
}

// ==============================================================
// DETALHE DO ALUNO
// ==============================================================
async function renderDetalheAluno(aluno) {
  containerGlobal.innerHTML = `
    <button id="btn-voltar" class="link-botao" style="margin-bottom:14px"><i class="fa-solid fa-arrow-left"></i> Voltar pra lista de alunos</button>
    <h2 style="font-family:'Playfair Display',serif;margin:0 0 20px">${escapar(aluno.nome)}</h2>

    <div class="secao" style="margin-bottom:28px">
      <h3><i class="fa-solid fa-id-card"></i> Dados do aluno</h3>
      <form id="form-editar-aluno" class="caixa-form">
        <label>Nome</label>
        <input type="text" id="ed-nome" value="${escapar(aluno.nome)}" required />
        <label>Idade</label>
        <input type="number" id="ed-idade" value="${aluno.idade ?? ''}" />
        <label>Objetivo</label>
        <input type="text" id="ed-objetivo" value="${escapar(aluno.objetivo || '')}" />
        <label>Contato</label>
        <input type="text" id="ed-contato" value="${escapar(aluno.contato || '')}" />
        <label>Próxima revisão</label>
        <input type="date" id="ed-revisao" value="${aluno.proxima_revisao || ''}" />
        <button type="submit"><i class="fa-solid fa-floppy-disk"></i> Salvar alterações</button>
        <div id="erro-editar" class="erro"></div>
      </form>
    </div>

    <div class="secao" style="margin-bottom:28px">
      <h3><i class="fa-solid fa-key"></i> Acesso do aluno</h3>
      ${aluno.perfil_id ? `
        <p class="vazio"><i class="fa-solid fa-circle-check" style="color:var(--accent)"></i> Login já vinculado.</p>
      ` : `
        <p class="vazio">Peça pro aluno criar a conta dele (tela de cadastro), depois cole o e-mail aqui:</p>
        <form id="form-vincular" class="caixa-form">
          <label>E-mail da conta do aluno</label>
          <input type="email" id="vincular-email" required />
          <button type="submit"><i class="fa-solid fa-link"></i> Vincular login</button>
          <div id="erro-vincular" class="erro"></div>
        </form>
      `}
    </div>

    <div class="secao" style="margin-bottom:28px">
      <h3><i class="fa-solid fa-file-lines"></i> Anamnese</h3>
      <form id="form-anamnese" class="caixa-form">
        <label>Restrições de saúde / lesões</label>
        <textarea id="an-restricoes">${escapar(aluno.anamnese?.restricoes || '')}</textarea>
        <label>Nível de atividade</label>
        <select id="an-nivel">
          <option value="sedentario" ${aluno.anamnese?.nivel === 'sedentario' ? 'selected' : ''}>Sedentário</option>
          <option value="leve" ${aluno.anamnese?.nivel === 'leve' ? 'selected' : ''}>Leve</option>
          <option value="moderado" ${aluno.anamnese?.nivel === 'moderado' ? 'selected' : ''}>Moderado</option>
          <option value="intenso" ${aluno.anamnese?.nivel === 'intenso' ? 'selected' : ''}>Intenso</option>
        </select>
        <label>Disponibilidade semanal</label>
        <input type="text" id="an-disponibilidade" value="${escapar(aluno.anamnese?.disponibilidade || '')}" placeholder="Ex: 3x por semana" />
        <label>Observações gerais</label>
        <textarea id="an-obs">${escapar(aluno.anamnese?.observacoes || '')}</textarea>
        <button type="submit"><i class="fa-solid fa-floppy-disk"></i> Salvar anamnese</button>
      </form>
    </div>

    <div class="secao" style="margin-bottom:28px">
      <h3><i class="fa-solid fa-dumbbell"></i> Treino</h3>
      <div id="lista-treinos" class="lista-cards"><p>Carregando...</p></div>
      <form id="form-treino" class="caixa-form">
        <label>Exercício</label>
        <input type="text" id="tr-exercicio" required />
        <div style="display:flex;gap:10px">
          <div style="flex:1"><label>Séries</label><input type="text" id="tr-series" placeholder="4" /></div>
          <div style="flex:1"><label>Reps</label><input type="text" id="tr-reps" placeholder="12" /></div>
          <div style="flex:1"><label>Carga</label><input type="text" id="tr-carga" placeholder="20kg" /></div>
        </div>
        <button type="submit"><i class="fa-solid fa-plus"></i> Adicionar exercício</button>
      </form>
    </div>

    <div class="secao" style="margin-bottom:28px">
      <h3><i class="fa-solid fa-bowl-food"></i> Dieta</h3>
      <div id="lista-dietas" class="lista-cards"><p>Carregando...</p></div>
      <form id="form-dieta" class="caixa-form">
        <div style="display:flex;gap:10px">
          <div style="flex:1"><label>Horário</label><input type="text" id="di-horario" placeholder="08:00" /></div>
          <div style="flex:2"><label>Refeição</label><input type="text" id="di-refeicao" required placeholder="Café da manhã" /></div>
        </div>
        <label>Alimentos</label>
        <input type="text" id="di-alimentos" placeholder="3 ovos, aveia, banana" />
        <button type="submit"><i class="fa-solid fa-plus"></i> Adicionar refeição</button>
      </form>
    </div>

    <div class="secao" style="margin-bottom:28px">
      <h3><i class="fa-solid fa-weight-scale"></i> Avaliação física</h3>
      <div id="lista-avaliacoes" class="lista-cards"><p>Carregando...</p></div>
      <form id="form-avaliacao" class="caixa-form">
        <div style="display:flex;gap:10px">
          <div style="flex:1"><label>Peso (kg)</label><input type="number" step="0.1" id="av-peso" required /></div>
          <div style="flex:1"><label>Altura (cm)</label><input type="number" step="0.1" id="av-altura" required /></div>
        </div>
        <div style="display:flex;gap:10px">
          <div style="flex:1"><label>Cintura (cm)</label><input type="number" step="0.1" id="av-cintura" /></div>
          <div style="flex:1"><label>Quadril (cm)</label><input type="number" step="0.1" id="av-quadril" /></div>
          <div style="flex:1"><label>Braço (cm)</label><input type="number" step="0.1" id="av-braco" /></div>
        </div>
        <label>Coxa (cm)</label>
        <input type="number" step="0.1" id="av-coxa" />
        <button type="submit"><i class="fa-solid fa-plus"></i> Registrar avaliação</button>
      </form>
    </div>

    <div class="secao" style="margin-bottom:28px">
      <h3><i class="fa-solid fa-comment-medical"></i> Notas de consultoria</h3>
      <div id="lista-notas" class="lista-cards"><p>Carregando...</p></div>
      <form id="form-nota" class="caixa-form">
        <label>Observação / evolução</label>
        <textarea id="nota-texto" required placeholder="Ex: evoluindo bem, aumentar carga do supino"></textarea>
        <button type="submit"><i class="fa-solid fa-plus"></i> Adicionar nota</button>
      </form>
    </div>

    <div class="secao">
      <h3><i class="fa-solid fa-camera"></i> Fotos e vídeos enviados</h3>
      <div id="lista-envios" class="lista-cards"><p>Carregando...</p></div>
    </div>
  `;

  document.getElementById('btn-voltar').addEventListener('click', renderListaAlunos);

  document.getElementById('form-editar-aluno').addEventListener('submit', async (e) => {
    e.preventDefault();
    const erroEl = document.getElementById('erro-editar');
    erroEl.textContent = '';
    const { error } = await atualizarAluno(aluno.id, {
      nome: document.getElementById('ed-nome').value.trim(),
      idade: document.getElementById('ed-idade').value || null,
      objetivo: document.getElementById('ed-objetivo').value.trim(),
      contato: document.getElementById('ed-contato').value.trim(),
      proxima_revisao: document.getElementById('ed-revisao').value || null,
    });
    if (error) { erroEl.textContent = 'Não foi possível salvar: ' + error.message; return; }
    Object.assign(aluno, {
      nome: document.getElementById('ed-nome').value.trim(),
      proxima_revisao: document.getElementById('ed-revisao').value || null,
    });
    document.querySelector('h2').textContent = aluno.nome;
    alert('Dados atualizados!');
  });

  const formVincular = document.getElementById('form-vincular');
  if (formVincular) {
    formVincular.addEventListener('submit', async (e) => {
      e.preventDefault();
      const erroEl = document.getElementById('erro-vincular');
      erroEl.textContent = '';
      const { error } = await vincularAlunoPorEmail(aluno.id, document.getElementById('vincular-email').value);
      if (error) { erroEl.textContent = error.message; return; }
      aluno.perfil_id = true;
      await renderDetalheAluno(aluno);
    });
  }

  document.getElementById('form-anamnese').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { error } = await atualizarAluno(aluno.id, {
      anamnese: {
        restricoes: document.getElementById('an-restricoes').value.trim(),
        nivel: document.getElementById('an-nivel').value,
        disponibilidade: document.getElementById('an-disponibilidade').value.trim(),
        observacoes: document.getElementById('an-obs').value.trim(),
      },
    });
    if (error) { alert('Não foi possível salvar: ' + error.message); return; }
    alert('Anamnese salva!');
  });

  document.getElementById('form-treino').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { error } = await adicionarTreino({
      aluno_id: aluno.id,
      exercicio: document.getElementById('tr-exercicio').value.trim(),
      series: document.getElementById('tr-series').value.trim(),
      reps: document.getElementById('tr-reps').value.trim(),
      carga: document.getElementById('tr-carga').value.trim(),
    });
    if (error) { alert('Não foi possível salvar: ' + error.message); return; }
    e.target.reset();
    await carregarTreinos(aluno.id);
  });

  document.getElementById('form-dieta').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { error } = await adicionarDieta({
      aluno_id: aluno.id,
      horario: document.getElementById('di-horario').value.trim(),
      refeicao: document.getElementById('di-refeicao').value.trim(),
      alimentos: document.getElementById('di-alimentos').value.trim(),
    });
    if (error) { alert('Não foi possível salvar: ' + error.message); return; }
    e.target.reset();
    await carregarDietas(aluno.id);
  });

  document.getElementById('form-avaliacao').addEventListener('submit', async (e) => {
    e.preventDefault();
    const peso = parseFloat(document.getElementById('av-peso').value);
    const altura = parseFloat(document.getElementById('av-altura').value);
    const imc = +(peso / ((altura / 100) * (altura / 100))).toFixed(1);
    const { error } = await adicionarAvaliacao({
      aluno_id: aluno.id, peso, altura, imc,
      cintura: document.getElementById('av-cintura').value || null,
      quadril: document.getElementById('av-quadril').value || null,
      braco: document.getElementById('av-braco').value || null,
      coxa: document.getElementById('av-coxa').value || null,
    });
    if (error) { alert('Não foi possível salvar: ' + error.message); return; }
    e.target.reset();
    await carregarAvaliacoes(aluno.id);
  });

  document.getElementById('form-nota').addEventListener('submit', async (e) => {
    e.preventDefault();
    const texto = document.getElementById('nota-texto').value.trim();
    if (!texto) return;
    const { error } = await adicionarNota({ aluno_id: aluno.id, texto });
    if (error) { alert('Não foi possível salvar: ' + error.message); return; }
    e.target.reset();
    await carregarNotas(aluno.id);
  });

  await carregarTreinos(aluno.id);
  await carregarDietas(aluno.id);
  await carregarAvaliacoes(aluno.id);
  await carregarNotas(aluno.id);
  await carregarEnvios(aluno.id);
}

async function carregarTreinos(alunoId) {
  const el = document.getElementById('lista-treinos');
  const { data, error } = await listarTreinos(alunoId);
  if (error) { el.innerHTML = `<p class="erro">${error.message}</p>`; return; }

  if (!data.length) {
    el.innerHTML = '<div class="vazio-rico"><i class="fa-solid fa-dumbbell"></i>Nenhum exercício ainda.</div>';
    return;
  }

  el.innerHTML = data.map(t => `
    <div class="card-aluno" style="cursor:default">
      <div class="info-aluno">
        <strong>${escapar(t.exercicio)}</strong>
        <span>${escapar(t.series || '-')} x ${escapar(t.reps || '-')}${t.carga ? ' · ' + escapar(t.carga) : ''}</span>
      </div>
      <button class="btn-remover" data-id="${t.id}"><i class="fa-solid fa-xmark"></i></button>
    </div>
  `).join('');
  el.querySelectorAll('.btn-remover').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remover este exercício?')) return;
      await removerTreino(btn.dataset.id);
      await carregarTreinos(alunoId);
    });
  });
}

async function carregarDietas(alunoId) {
  const el = document.getElementById('lista-dietas');
  const { data, error } = await listarDietas(alunoId);
  if (error) { el.innerHTML = `<p class="erro">${error.message}</p>`; return; }
  if (!data.length) { el.innerHTML = '<div class="vazio-rico"><i class="fa-solid fa-bowl-food"></i>Nenhuma refeição ainda.</div>'; return; }
  el.innerHTML = data.map(d => `
    <div class="card-aluno" style="cursor:default">
      <div class="info-aluno">
        <strong>${d.horario ? escapar(d.horario) + ' — ' : ''}${escapar(d.refeicao)}</strong>
        <span>${escapar(d.alimentos || '')}</span>
      </div>
      <button class="btn-remover" data-id="${d.id}"><i class="fa-solid fa-xmark"></i></button>
    </div>
  `).join('');
  el.querySelectorAll('.btn-remover').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remover esta refeição?')) return;
      await removerDieta(btn.dataset.id);
      await carregarDietas(alunoId);
    });
  });
}

async function carregarAvaliacoes(alunoId) {
  const el = document.getElementById('lista-avaliacoes');
  const { data, error } = await listarAvaliacoes(alunoId);
  if (error) { el.innerHTML = `<p class="erro">${error.message}</p>`; return; }
  if (!data.length) { el.innerHTML = '<div class="vazio-rico"><i class="fa-solid fa-weight-scale"></i>Nenhuma avaliação registrada ainda.</div>'; return; }
  const ordenadas = data.slice().reverse();
  el.innerHTML = ordenadas.map(v => `
    <div class="card-aluno" style="cursor:default">
      <div class="info-aluno">
        <strong>${new Date(v.data).toLocaleDateString('pt-BR')} — ${v.peso}kg</strong>
        <span>IMC ${v.imc}${v.cintura ? ' · cintura ' + v.cintura + 'cm' : ''}${v.quadril ? ' · quadril ' + v.quadril + 'cm' : ''}</span>
      </div>
      <button class="btn-remover" data-id="${v.id}"><i class="fa-solid fa-xmark"></i></button>
    </div>
  `).join('');
  el.querySelectorAll('.btn-remover').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remover esta avaliação?')) return;
      await removerAvaliacao(btn.dataset.id);
      await carregarAvaliacoes(alunoId);
    });
  });
}

async function carregarNotas(alunoId) {
  const el = document.getElementById('lista-notas');
  const { data, error } = await listarNotas(alunoId);
  if (error) { el.innerHTML = `<p class="erro">${error.message}</p>`; return; }
  if (!data.length) { el.innerHTML = '<div class="vazio-rico"><i class="fa-solid fa-comment-medical"></i>Nenhuma nota ainda.</div>'; return; }
  el.innerHTML = data.map(n => `
    <div class="card-aluno" style="cursor:default;align-items:flex-start">
      <div class="info-aluno">
        <strong>${new Date(n.data).toLocaleDateString('pt-BR')}</strong>
        <span>${escapar(n.texto)}</span>
      </div>
      <button class="btn-remover" data-id="${n.id}"><i class="fa-solid fa-xmark"></i></button>
    </div>
  `).join('');
  el.querySelectorAll('.btn-remover').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remover esta nota?')) return;
      await removerNota(btn.dataset.id);
      await carregarNotas(alunoId);
    });
  });
}

async function carregarEnvios(alunoId) {
  const el = document.getElementById('lista-envios');
  const { data, error } = await listarEnvios(alunoId);
  if (error) { el.innerHTML = `<p class="erro">${error.message}</p>`; return; }
  if (!data.length) { el.innerHTML = '<div class="vazio-rico"><i class="fa-solid fa-camera"></i>Nenhum envio ainda.</div>'; return; }
  el.innerHTML = data.map(v => `
    <div class="card-envio">
      ${v.tipo === 'video' ? `<video src="${v.asset_url}" controls class="midia-envio"></video>` : `<img src="${v.asset_url}" class="midia-envio" alt="Envio" />`}
      ${v.legenda ? `<p class="legenda-envio">${escapar(v.legenda)}</p>` : ''}
      ${v.devolucao_texto ? `<div class="devolucao-pronta"><strong>Sua devolução:</strong> ${escapar(v.devolucao_texto)}</div>` : `
        <form class="form-devolucao" data-id="${v.id}">
          <textarea placeholder="Escreva a devolução para este envio..." required></textarea>
          <button type="submit"><i class="fa-solid fa-paper-plane"></i> Enviar devolução</button>
        </form>
      `}
    </div>
  `).join('');
  el.querySelectorAll('.form-devolucao').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const texto = form.querySelector('textarea').value.trim();
      if (!texto) return;
      const { error } = await responderEnvio(form.dataset.id, texto);
      if (error) { alert('Não foi possível salvar: ' + error.message); return; }
      await carregarEnvios(alunoId);
    });
  });
}

// ==============================================================
// BIBLIOTECA DE EXERCÍCIOS
// ==============================================================
async function renderBiblioteca() {
  containerGlobal.innerHTML = `
    <div class="secao">
      <span class="eyebrow">Conteúdo da consultoria</span>
      <h2>Biblioteca de exercícios</h2>
      <div id="lista-biblioteca" class="lista-cards"><p>Carregando...</p></div>
      <form id="form-biblioteca" class="caixa-form">
        <h3>Novo exercício</h3>
        <label>Nome</label>
        <input type="text" id="bi-nome" required />
        <label>Grupo muscular</label>
        <input type="text" id="bi-grupo" placeholder="Peito, pernas..." />
        <label>Como executar</label>
        <textarea id="bi-como"></textarea>
        <label>Link do vídeo</label>
        <input type="url" id="bi-video" placeholder="https://..." />
        <label>Foto do exercício</label>
        <input type="file" id="bi-imagem" accept="image/*" />
        <button type="submit"><i class="fa-solid fa-plus"></i> Adicionar à biblioteca</button>
        <div id="erro-biblioteca" class="erro"></div>
      </form>
    </div>
  `;

  document.getElementById('form-biblioteca').addEventListener('submit', async (e) => {
    e.preventDefault();
    const erroEl = document.getElementById('erro-biblioteca');
    erroEl.textContent = '';
    const btn = e.target.querySelector('button');
    btn.disabled = true;

    const { error } = await criarExercicioBiblioteca({
      nome: document.getElementById('bi-nome').value.trim(),
      grupo: document.getElementById('bi-grupo').value.trim(),
      comoExecutar: document.getElementById('bi-como').value.trim(),
      video: document.getElementById('bi-video').value.trim(),
      imagemArquivo: document.getElementById('bi-imagem').files[0] || null,
    });
    btn.disabled = false;
    if (error) { erroEl.textContent = 'Não foi possível salvar: ' + error.message; return; }
    e.target.reset();
    await carregarBiblioteca();
  });

  await carregarBiblioteca();
}

async function carregarBiblioteca() {
  const el = document.getElementById('lista-biblioteca');
  const { data, error } = await listarBiblioteca();
  if (error) { el.innerHTML = `<p class="erro">${error.message}</p>`; return; }
  if (!data.length) { el.innerHTML = '<div class="vazio-rico"><i class="fa-solid fa-book"></i>Nenhum exercício na biblioteca ainda.</div>'; return; }
  el.innerHTML = data.map(b => `
    <div class="card-envio">
      ${b.imagem_url ? `<img src="${b.imagem_url}" class="midia-envio" style="max-height:180px" alt="${escapar(b.nome)}" />` : ''}
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <strong>${escapar(b.nome)}</strong>${b.grupo ? ` <span class="tag">${escapar(b.grupo)}</span>` : ''}
          ${b.como_executar ? `<p class="legenda-envio">${escapar(b.como_executar)}</p>` : ''}
          ${b.video ? `<a href="${escapar(b.video)}" target="_blank" rel="noopener" style="font-size:13px;color:var(--accent)"><i class="fa-solid fa-video"></i> Ver vídeo</a>` : ''}
        </div>
        <button class="btn-remover" data-id="${b.id}"><i class="fa-solid fa-xmark"></i></button>
      </div>
    </div>
  `).join('');
  el.querySelectorAll('.btn-remover').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remover este exercício da biblioteca?')) return;
      await removerExercicioBiblioteca(btn.dataset.id);
      await carregarBiblioteca();
    });
  });
}

// ==============================================================
// PLANOS
// ==============================================================
async function renderPlanos() {
  containerGlobal.innerHTML = `
    <div class="secao">
      <span class="eyebrow">Página de vendas</span>
      <h2>Planos</h2>
      <div id="lista-planos"><p>Carregando...</p></div>
      <form id="form-plano" class="caixa-form">
        <h3>Novo plano</h3>
        <label>Nome do plano</label>
        <input type="text" id="pl-nome" required />
        <label>Preço</label>
        <input type="text" id="pl-preco" placeholder="R$ 199/mês" />
        <label>Descrição / benefícios</label>
        <textarea id="pl-desc"></textarea>
        <label style="display:flex;align-items:center;gap:8px;margin-top:12px">
          <input type="checkbox" id="pl-destaque" style="width:auto;margin-top:0" /> Plano em destaque
        </label>
        <button type="submit"><i class="fa-solid fa-plus"></i> Adicionar plano</button>
      </form>
    </div>
  `;

  document.getElementById('form-plano').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { error } = await criarPlano({
      nome: document.getElementById('pl-nome').value.trim(),
      preco: document.getElementById('pl-preco').value.trim(),
      descricao: document.getElementById('pl-desc').value.trim(),
      destaque: document.getElementById('pl-destaque').checked,
    });
    if (error) { alert('Não foi possível salvar: ' + error.message); return; }
    e.target.reset();
    await carregarPlanos();
  });

  await carregarPlanos();
}

async function carregarPlanos() {
  const el = document.getElementById('lista-planos');
  const { data, error } = await listarPlanos();
  if (error) { el.innerHTML = `<p class="erro">${error.message}</p>`; return; }
  if (!data.length) { el.innerHTML = '<div class="vazio-rico"><i class="fa-solid fa-tag"></i>Nenhum plano cadastrado ainda.</div>'; return; }

  el.innerHTML = `<div class="planos-grid">` + data.map(p => `
    <div class="card-envio plano-card ${p.destaque ? 'plano-destaque' : ''}">
      ${p.destaque ? '<div class="plano-ribbon"><i class="fa-solid fa-star"></i> Mais popular</div>' : ''}
      <strong style="font-size:17px">${escapar(p.nome)}</strong>
      ${p.preco ? `<div class="plano-preco">${escapar(p.preco)}</div>` : ''}
      <p class="legenda-envio">${escapar(p.descricao || '').replace(/\n/g, '<br>')}</p>
      <button class="btn-remover" data-id="${p.id}"><i class="fa-solid fa-xmark"></i> remover</button>
    </div>
  `).join('') + `</div>`;

  el.querySelectorAll('.btn-remover').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remover este plano?')) return;
      await removerPlano(btn.dataset.id);
      await carregarPlanos();
    });
  });
}

function escapar(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}