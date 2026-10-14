import {
  listarAlunos,
  criarAluno,
  atualizarAluno,
  removerAluno,
  listarTreinos,
  adicionarTreino,
  removerTreino,
  listarDietas,
  adicionarDieta,
  removerDieta,
  listarAvaliacoes,
  adicionarAvaliacao,
  removerAvaliacao,
  listarNotas,
  adicionarNota,
  removerNota,
  listarEnvios,
  listarTodosEnvios,
  responderEnvio,
  vincularAlunoPorEmail,
  listarBiblioteca,
  buscarExercicioBibliotecaPorIdExterno,
  criarExercicioBiblioteca,
  atualizarImagemExercicioBiblioteca,
  removerExercicioBiblioteca,
  listarPlanos,
  criarPlano,
  removerPlano,
} from './supabase-client.js';
import { TREINOS_PRONTOS } from './treinos-prontos.js';

let containerGlobal = null;
let todosAlunosCache = [];
let bibliotecaCache = [];

const icones = {
  alunos: 'fa-user-group',
  treino: 'fa-dumbbell',
  dieta: 'fa-bowl-food',
  avaliacao: 'fa-weight-scale',
  anamnese: 'fa-file-lines',
  notas: 'fa-comment-medical',
  envios: 'fa-camera',
  biblioteca: 'fa-book-open',
  planos: 'fa-tags',
};

export async function montarPainelAdmin(container) {
  containerGlobal = container;
  await renderListaAlunos();
}

export async function irParaSecao(secao) {
  if (secao === 'alunos') return renderListaAlunos();
  if (secao === 'biblioteca') return renderBiblioteca();
  if (secao === 'planos') return renderPlanos();
}

// ============================================================
// UTILITÁRIOS
// ============================================================

function escapar(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, caractere => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[caractere]);
}

function urlHttp(texto) {
  try {
    const url = new URL(texto);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function formatarData(data) {
  if (!data) return 'Não informada';

  const dataObj = new Date(`${String(data).slice(0, 10)}T12:00:00`);

  if (Number.isNaN(dataObj.getTime())) return 'Data inválida';

  return dataObj.toLocaleDateString('pt-BR');
}

function mensagemVazia(icone, texto) {
  return `
    <div class="vazio-rico">
      <i class="fa-solid ${icone}"></i>
      <span>${escapar(texto)}</span>
    </div>
  `;
}

function mostrarErro(elemento, erro) {
  if (!elemento) return;

  elemento.innerHTML = `
    <p class="erro">
      ${escapar(erro?.message || 'Ocorreu um erro inesperado.')}
    </p>
  `;
}

function mensagemErroBibliotecaTreinos(erro) {
  const mensagem = erro?.message || 'Não foi possível salvar o treino.';
  return mensagem.includes('treino_nome')
      ? `${mensagem} Execute supabase/migrations/20261014_biblioteca_treinos.sql no Supabase e tente novamente.`
      : mensagem;
}

function botaoRemover(id, texto = 'Remover') {
  return `
    <button
      type="button"
      class="btn-remover"
      data-id="${escapar(id)}"
      title="${escapar(texto)}"
      aria-label="${escapar(texto)}"
    >
      <i class="fa-solid fa-trash"></i>
    </button>
  `;
}

function obterAluno(id) {
  return todosAlunosCache.find(aluno => String(aluno.id) === String(id));
}

// ============================================================
// ALUNOS — LISTA PRINCIPAL
// ============================================================

async function renderListaAlunos() {
  containerGlobal.innerHTML = `
    <div class="secao admin-painel">
      <div class="admin-cabecalho">
        <div>
          <span class="eyebrow">SISTEMA DA MAIZA · GESTÃO</span>
          <h2>Seus alunos</h2>
          <p class="admin-subtitulo">
            Acompanhe seus alunos e organize sua consultoria.
          </p>
        </div>

        <button type="button" class="admin-btn-principal" id="btn-ir-novo-aluno">
          <i class="fa-solid fa-plus"></i>
          Novo aluno
        </button>
      </div>

      <div class="stats-row" id="stats-row">
        <div class="stat-box">Carregando indicadores...</div>
      </div>

      <div class="admin-bloco-lista">
        <div class="admin-lista-cabecalho">
          <div>
            <h3>Lista de alunos</h3>
            <p>Pesquise e selecione um aluno para ver os detalhes.</p>
          </div>
        </div>

        <div class="campo-busca">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input
            type="search"
            id="busca-aluno"
            placeholder="Buscar aluno pelo nome..."
            autocomplete="off"
          />
        </div>

        <div id="lista-alunos" class="lista-cards">
          <p>Carregando alunos...</p>
        </div>
      </div>

      <form id="form-novo-aluno" class="caixa-form admin-form">
        <div class="admin-form-titulo">
          <span class="admin-icone-titulo">
            <i class="fa-solid fa-user-plus"></i>
          </span>
          <div>
            <h3>Novo aluno</h3>
            <p>Cadastre os dados iniciais do aluno.</p>
          </div>
        </div>

        <div class="admin-grid-form">
          <div>
            <label for="novo-nome">Nome completo</label>
            <input type="text" id="novo-nome" required />
          </div>

          <div>
            <label for="novo-idade">Idade</label>
            <input type="number" id="novo-idade" min="1" max="120" />
          </div>

          <div>
            <label for="novo-objetivo">Objetivo</label>
            <input
              type="text"
              id="novo-objetivo"
              placeholder="Ex.: hipertrofia"
            />
          </div>

          <div>
            <label for="novo-contato">Contato</label>
            <input
              type="text"
              id="novo-contato"
              placeholder="WhatsApp ou e-mail"
            />
          </div>
        </div>

        <button type="submit" class="admin-btn-principal">
          <i class="fa-solid fa-plus"></i>
          Cadastrar aluno
        </button>

        <div id="erro-novo-aluno" class="erro" role="alert"></div>
      </form>
    </div>
  `;

  document.getElementById('btn-ir-novo-aluno')
      .addEventListener('click', () => {
        document.getElementById('form-novo-aluno')
            .scrollIntoView({ behavior: 'smooth', block: 'start' });

        document.getElementById('novo-nome').focus();
      });

  document.getElementById('form-novo-aluno')
      .addEventListener('submit', async evento => {
        evento.preventDefault();

        const formulario = evento.currentTarget;
        const erroEl = document.getElementById('erro-novo-aluno');
        const botao = formulario.querySelector('button[type="submit"]');

        erroEl.textContent = '';
        botao.disabled = true;
        botao.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';

        try {
          const { error } = await criarAluno({
            nome: document.getElementById('novo-nome').value.trim(),
            idade: document.getElementById('novo-idade').value || null,
            objetivo: document.getElementById('novo-objetivo').value.trim(),
            contato: document.getElementById('novo-contato').value.trim(),
          });

          if (error) {
            erroEl.textContent = `Não foi possível cadastrar: ${error.message}`;
            return;
          }

          formulario.reset();
          await carregarListaAlunos();

          alert('Aluno cadastrado com sucesso!');
        } catch (erro) {
          erroEl.textContent = erro.message || 'Erro ao cadastrar aluno.';
        } finally {
          botao.disabled = false;
          botao.innerHTML = '<i class="fa-solid fa-plus"></i> Cadastrar aluno';
        }
      });

  document.getElementById('busca-aluno')
      .addEventListener('input', evento => {
        desenharListaAlunos(filtrarAlunos(evento.target.value));
      });

  await carregarListaAlunos();
}

function filtrarAlunos(termo) {
  const busca = (termo || '').toLocaleLowerCase('pt-BR').trim();

  if (!busca) return todosAlunosCache;

  return todosAlunosCache.filter(aluno =>
      (aluno.nome || '').toLocaleLowerCase('pt-BR').includes(busca)
  );
}

async function carregarListaAlunos() {
  const listaEl = document.getElementById('lista-alunos');
  const statsEl = document.getElementById('stats-row');

  if (!listaEl || !statsEl) return;

  listaEl.innerHTML = '<p>Carregando alunos...</p>';

  try {
    const { data: alunos, error } = await listarAlunos();

    if (error) {
      mostrarErro(listaEl, error);
      return;
    }

    todosAlunosCache = alunos || [];

    const hoje = new Date().toISOString().slice(0, 10);

    const revisoesPendentes = todosAlunosCache.filter(aluno =>
        aluno.proxima_revisao &&
        aluno.proxima_revisao <= hoje
    ).length;

    const alunosComTreino = todosAlunosCache.filter(aluno =>
        aluno.ultimo_treino_em
    ).length;

    let enviosPendentes = 0;

    try {
      const resultadoEnvios = await listarTodosEnvios();

      if (!resultadoEnvios.error) {
        enviosPendentes = (resultadoEnvios.data || []).filter(envio =>
            !envio.devolucao_texto ||
            !envio.devolucao_texto.trim()
        ).length;
      } else {
        console.error('Erro ao consultar envios:', resultadoEnvios.error);
      }
    } catch (erro) {
      console.error('Não foi possível consultar os envios:', erro);
    }

    statsEl.innerHTML = `
      <div class="stat-box">
        <div class="ic-stat"><i class="fa-solid ${icones.alunos}"></i></div>
        <div>
          <span class="num">${todosAlunosCache.length}</span>
          <span class="lbl">Alunos cadastrados</span>
        </div>
      </div>

      <div class="stat-box">
        <div class="ic-stat"><i class="fa-solid ${icones.treino}"></i></div>
        <div>
          <span class="num">${alunosComTreino}</span>
          <span class="lbl">Com treino registrado</span>
        </div>
      </div>

      <div class="stat-box">
        <div class="ic-stat"><i class="fa-solid fa-calendar-check"></i></div>
        <div>
          <span class="num">${revisoesPendentes}</span>
          <span class="lbl">Revisões pendentes</span>
        </div>
      </div>

      <div class="stat-box">
        <div class="ic-stat"><i class="fa-solid ${icones.envios}"></i></div>
        <div>
          <span class="num">${enviosPendentes}</span>
          <span class="lbl">Envios sem devolutiva</span>
        </div>
      </div>
    `;

    desenharListaAlunos(todosAlunosCache);
  } catch (erro) {
    mostrarErro(listaEl, erro);
  }
}

function desenharListaAlunos(alunos) {
  const listaEl = document.getElementById('lista-alunos');

  if (!alunos || !alunos.length) {
    listaEl.innerHTML = `
      <div class="vazio-rico">
        <i class="fa-solid fa-user-group"></i>
        Nenhum aluno encontrado.
      </div>
    `;
    return;
  }

  listaEl.innerHTML = alunos.map(a => `
    <div class="card-aluno card-aluno-organizado" data-id="${a.id}">

      <div class="aluno-avatar">
        ${(a.nome || '?').charAt(0).toUpperCase()}
      </div>

      <div class="aluno-conteudo">
        <div class="aluno-cabecalho">
          <div class="aluno-identificacao">
            <strong>${escapar(a.nome || 'Aluno sem nome')}</strong>

            <span class="aluno-detalhes">
              ${a.idade ? escapar(a.idade) + ' anos' : ''}
              ${a.idade && a.objetivo ? ' · ' : ''}
              ${escapar(a.objetivo || 'Objetivo não definido')}
            </span>
          </div>

          <div class="aluno-acoes">
            <button
              type="button"
              class="btn-abrir-aluno"
              data-id="${a.id}"
            >
              Abrir <i class="fa-solid fa-arrow-right"></i>
            </button>

            <button
              type="button"
              class="btn-remover"
              data-id="${a.id}"
              title="Remover aluno"
              aria-label="Remover aluno"
            >
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>

        ${a.contato ? `
          <div class="aluno-contato">
            <i class="fa-regular fa-id-card"></i>
            <span>${escapar(a.contato)}</span>
          </div>
        ` : ''}

        <div class="aluno-etiquetas">
          ${a.proxima_revisao ? `
            <span class="aluno-tag">
              <i class="fa-regular fa-calendar"></i>
              Revisão: ${new Date(a.proxima_revisao + 'T12:00:00').toLocaleDateString('pt-BR')}
            </span>
          ` : ''}

          ${a.ultimo_treino_em ? `
            <span class="aluno-tag aluno-tag-treino">
              <i class="fa-solid fa-check"></i>
              Treino: ${new Date(a.ultimo_treino_em).toLocaleDateString('pt-BR')}
            </span>
          ` : ''}
        </div>
        ${exercicio.atribuicao ? `<small class="biblioteca-atribuicao">${escapar(exercicio.atribuicao)}</small>` : ''}
      </div>
    </div>
  `).join('');

  listaEl.querySelectorAll('.btn-abrir-aluno').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();

      const aluno = todosAlunosCache.find(
          a => String(a.id) === String(btn.dataset.id)
      );

      if (aluno) renderDetalheAluno(aluno);
    });
  });

  listaEl.querySelectorAll('.card-aluno-organizado').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-remover')) return;
      if (e.target.closest('.btn-abrir-aluno')) return;

      const aluno = todosAlunosCache.find(
          a => String(a.id) === String(card.dataset.id)
      );

      if (aluno) renderDetalheAluno(aluno);
    });
  });

  listaEl.querySelectorAll('.btn-remover').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();

      if (!confirm('Remover este aluno e todos os dados dele? Essa ação não pode ser desfeita.')) {
        return;
      }

      const { error } = await removerAluno(btn.dataset.id);

      if (error) {
        alert('Não foi possível remover: ' + error.message);
        return;
      }

      await carregarListaAlunos();
    });
  });
}

// ============================================================
// DETALHES DO ALUNO
// ============================================================

async function renderDetalheAluno(aluno) {
  if (!aluno) return;
  const { EXERCISES_DATASET_LICENSE, EXERCISES_DATASET_SOURCE, pesquisarExercicios } =
      await import('./exercises-dataset.js');
  const { WGER_SOURCE, pesquisarImagensLicenciadas } =
      await import('./wger-media.js');

  containerGlobal.innerHTML = `
    <div class="secao admin-painel">
      <button id="btn-voltar" class="link-botao admin-voltar">
        <i class="fa-solid fa-arrow-left"></i>
        Voltar para os alunos
      </button>

      <div class="admin-cabecalho admin-cabecalho-detalhe">
        <div>
          <span class="eyebrow">FICHA INDIVIDUAL</span>
          <h2>${escapar(aluno.nome)}</h2>
          <p class="admin-subtitulo">
            Dados, acompanhamento e evolução do aluno.
          </p>
        </div>

        <div class="avatar-letra admin-avatar-grande">
          ${escapar((aluno.nome || '?').charAt(0).toUpperCase())}
        </div>
      </div>

      <details class="secao admin-detalhe-secao" open>
        <summary><i class="fa-solid fa-id-card"></i> Dados do aluno</summary>

        <form id="form-editar-aluno" class="caixa-form admin-form">
          <div class="admin-grid-form">
            <div>
              <label for="ed-nome">Nome</label>
              <input type="text" id="ed-nome" value="${escapar(aluno.nome)}" required />
            </div>

            <div>
              <label for="ed-idade">Idade</label>
              <input type="number" id="ed-idade" min="1" max="120" value="${escapar(aluno.idade ?? '')}" />
            </div>

            <div>
              <label for="ed-objetivo">Objetivo</label>
              <input type="text" id="ed-objetivo" value="${escapar(aluno.objetivo || '')}" />
            </div>

            <div>
              <label for="ed-contato">Contato</label>
              <input type="text" id="ed-contato" value="${escapar(aluno.contato || '')}" />
            </div>

            <div>
              <label for="ed-revisao">Próxima revisão</label>
              <input type="date" id="ed-revisao" value="${escapar(aluno.proxima_revisao || '')}" />
            </div>
          </div>

          <button type="submit" class="admin-btn-principal">
            <i class="fa-solid fa-floppy-disk"></i>
            Salvar alterações
          </button>

          <div id="erro-editar" class="erro" role="alert"></div>
        </form>
      </details>

      <details class="secao admin-detalhe-secao">
        <summary><i class="fa-solid fa-key"></i> Acesso do aluno</summary>

        ${aluno.perfil_id ? `
          <p class="admin-mensagem-sucesso">
            <i class="fa-solid fa-circle-check"></i>
            Login vinculado.
          </p>
        ` : `
          <p class="admin-subtitulo">
            Depois que o aluno criar sua conta, informe o e-mail usado no cadastro.
          </p>

          <form id="form-vincular" class="caixa-form admin-form">
            <label for="vincular-email">E-mail da conta</label>
            <input type="email" id="vincular-email" required />

            <button type="submit" class="admin-btn-principal">
              <i class="fa-solid fa-link"></i>
              Vincular login
            </button>

            <div id="erro-vincular" class="erro" role="alert"></div>
          </form>
        `}
      </details>

      <details class="secao admin-detalhe-secao">
        <summary><i class="fa-solid fa-file-lines"></i> Anamnese</summary>

        <form id="form-anamnese" class="caixa-form admin-form">
          <label for="an-restricoes">Restrições de saúde / lesões</label>
          <textarea id="an-restricoes">${escapar(aluno.anamnese?.restricoes || '')}</textarea>

          <label for="an-nivel">Nível de atividade</label>
          <select id="an-nivel">
            <option value="sedentario" ${aluno.anamnese?.nivel === 'sedentario' ? 'selected' : ''}>Sedentário</option>
            <option value="leve" ${aluno.anamnese?.nivel === 'leve' ? 'selected' : ''}>Leve</option>
            <option value="moderado" ${aluno.anamnese?.nivel === 'moderado' ? 'selected' : ''}>Moderado</option>
            <option value="intenso" ${aluno.anamnese?.nivel === 'intenso' ? 'selected' : ''}>Intenso</option>
          </select>

          <label for="an-disponibilidade">Disponibilidade semanal</label>
          <input
            type="text"
            id="an-disponibilidade"
            value="${escapar(aluno.anamnese?.disponibilidade || '')}"
            placeholder="Ex.: 3 vezes por semana"
          />

          <label for="an-obs">Observações gerais</label>
          <textarea id="an-obs">${escapar(aluno.anamnese?.observacoes || '')}</textarea>

          <button type="submit" class="admin-btn-principal">
            <i class="fa-solid fa-floppy-disk"></i>
            Salvar anamnese
          </button>
        </form>
      </details>

      <details class="secao admin-detalhe-secao" open>
        <summary><i class="fa-solid fa-dumbbell"></i> Treino</summary>

        <div id="lista-treinos" class="lista-cards">
          <p>Carregando...</p>
        </div>

        <form id="form-treino-pronto" class="caixa-form admin-form">
          <h3>Biblioteca de treinos</h3>
          <p class="treino-fonte-nota">
            Selecione um modelo para atribuir todos os exercícios ao aluno.
            Revise e adapte a rotina conforme a avaliação e as necessidades individuais.
          </p>
          <label for="tr-pronto-selecao">Treino pronto</label>
          <select id="tr-pronto-selecao" required>
            <option value="">Selecione um treino</option>
            ${TREINOS_PRONTOS.map(treino => `
              <option value="${escapar(treino.id)}">${escapar(treino.nome)}</option>
            `).join('')}
          </select>
          <div id="tr-pronto-preview" class="treino-pronto-preview" aria-live="polite"></div>
          <p id="tr-pronto-mensagem" class="erro" role="alert"></p>
          <button type="submit" class="admin-btn-principal">
            <i class="fa-solid fa-circle-plus"></i>
            Atribuir treino ao aluno
          </button>
        </form>

        <form id="form-exercicio-personalizado" class="caixa-form admin-form">
          <h3>Criar exercício personalizado</h3>
          <p class="treino-fonte-nota">Cadastre um exercício que não esteja nos catálogos.</p>
          <label for="tr-personalizado-nome">Nome do exercício</label>
          <input type="text" id="tr-personalizado-nome" required maxlength="120" />
          <div class="admin-grid-form admin-grid-tres treino-parametros">
            <div>
              <label for="tr-personalizado-series">Séries</label>
              <input type="number" id="tr-personalizado-series" min="1" max="50" value="3" />
            </div>
            <div>
              <label for="tr-personalizado-reps">Repetições</label>
              <input type="text" id="tr-personalizado-reps" required maxlength="60" placeholder="Ex.: 10–12" />
            </div>
            <div>
              <label for="tr-personalizado-descanso">Descanso (segundos)</label>
              <input type="number" id="tr-personalizado-descanso" min="0" step="5" value="60" />
            </div>
          </div>
          <label for="tr-personalizado-instrucoes">Instruções (opcional)</label>
          <textarea id="tr-personalizado-instrucoes" maxlength="1000"></textarea>
          <p id="tr-personalizado-mensagem" class="erro" role="alert"></p>
          <button type="submit" class="admin-btn-principal">
            <i class="fa-solid fa-plus"></i>
            Criar exercício
          </button>
        </form>

        <form id="form-treino" class="caixa-form admin-form">
          <h3>Adicionar exercício de um catálogo</h3>
          <p class="treino-fonte-nota">
            Catálogo de nomes e instruções em inglês: Exercises Library, licença MIT.
            Associa um GIF/imagem próprio ou licenciado; será guardado para reutilização.
            <a href="${EXERCISES_DATASET_SOURCE}" target="_blank" rel="noopener noreferrer">Ver fonte</a>
            · <a href="${EXERCISES_DATASET_LICENSE}" target="_blank" rel="noopener noreferrer">Ver licença do texto</a>
          </p>

          <div class="treino-abas" role="tablist" aria-label="Catálogos de exercícios">
            <button type="button" id="tr-tab-aberto" class="treino-aba ativo" role="tab" aria-selected="true">
              <i class="fa-solid fa-magnifying-glass"></i> Pesquisar catálogo
            </button>
            <button type="button" id="tr-tab-proprio" class="treino-aba" role="tab" aria-selected="false">
              <i class="fa-solid fa-photo-film"></i> Meus exercícios e GIFs
            </button>
            <button type="button" id="tr-tab-imagens" class="treino-aba" role="tab" aria-selected="false">
              <i class="fa-regular fa-image"></i> Imagens licenciadas
            </button>
          </div>

          <div id="tr-painel-aberto" role="tabpanel">
            <label for="tr-busca-aberto">Pesquisar por nome, músculo ou equipamento</label>
            <input
              type="search"
              id="tr-busca-aberto"
              placeholder="Ex.: agachamento, chest, dumbbell..."
              autocomplete="off"
            />
            <div id="tr-resultados-aberto" class="treino-biblioteca-resultados" aria-live="polite"></div>
          </div>

          <div id="tr-painel-proprio" role="tabpanel" hidden>
            <label for="tr-busca-proprio">Pesquisar exercícios com mídia guardada</label>
            <input
              type="search"
              id="tr-busca-proprio"
              placeholder="Nome, músculo ou equipamento..."
              autocomplete="off"
            />
            <div id="tr-resultados-proprios" class="treino-biblioteca-resultados" aria-live="polite"></div>
          </div>

          <div id="tr-painel-imagens" role="tabpanel" hidden>
            <p class="treino-fonte-nota">
              189 exercícios com imagem CC BY-SA, permitida em uso comercial com atribuição.
              <a href="${WGER_SOURCE}" target="_blank" rel="noopener noreferrer">Fonte e condições</a>.
              Não há GIFs animados nesse catálogo.
            </p>
            <label for="tr-busca-imagens">Pesquisar imagem por nome, grupo ou equipamento</label>
            <input
              type="search"
              id="tr-busca-imagens"
              placeholder="Ex.: bench press, squat, dumbbell..."
              autocomplete="off"
            />
            <div id="tr-resultados-imagens" class="treino-biblioteca-resultados" aria-live="polite"></div>
          </div>

          <div id="tr-biblioteca-preview" class="treino-biblioteca-preview" aria-live="polite"></div>
          <input type="hidden" id="tr-imagem-url" />

          <div class="admin-grid-form admin-grid-tres treino-parametros">
            <div>
              <label for="tr-reps">Repetições</label>
              <input type="text" id="tr-reps" required placeholder="Ex.: 12" />
            </div>
            <div>
              <label for="tr-descanso">Descanso entre séries (segundos)</label>
              <input type="number" id="tr-descanso" min="0" step="5" required value="60" />
            </div>
          </div>

          <div id="tr-media-campos" hidden>
            <label for="tr-imagem-arquivo">GIF ou imagem própria/licenciada</label>
            <input type="file" id="tr-imagem-arquivo" accept="image/*,.gif" />

            <label for="tr-imagem-url-input">Ou URL da imagem/GIF licenciado</label>
            <input type="url" id="tr-imagem-url-input" placeholder="https://..." />

            <label for="tr-media-fonte">Fonte/licença ou crédito da mídia</label>
            <input type="url" id="tr-media-fonte" placeholder="https://..." />
            <label for="tr-media-licenca">Link da licença da mídia</label>
            <input type="url" id="tr-media-licenca" placeholder="https://creativecommons.org/licenses/..." />
            <label for="tr-media-atribuicao">Atribuição exigida (se aplicável)</label>
            <input type="text" id="tr-media-atribuicao" placeholder="Ex.: © titular dos direitos" />
          </div>

          <button type="button" id="tr-alterar-media" class="secundario" hidden>
            <i class="fa-solid fa-image"></i> Usar outra imagem/GIF
          </button>

          <p id="tr-selecao-erro" class="erro" role="alert"></p>

          <button type="submit" class="admin-btn-principal">
            <i class="fa-solid fa-plus"></i>
            Adicionar exercício
          </button>
        </form>
      </details>

      <details class="secao admin-detalhe-secao" open>
        <summary><i class="fa-solid fa-bowl-food"></i> Dieta</summary>

        <div id="lista-dietas" class="lista-cards">
          <p>Carregando...</p>
        </div>

        <form id="form-dieta" class="caixa-form admin-form">
          <h3>Adicionar refeição</h3>

          <div class="admin-grid-form">
            <div>
              <label for="di-horario">Horário</label>
              <input type="text" id="di-horario" placeholder="08:00" />
            </div>

            <div>
              <label for="di-refeicao">Refeição</label>
              <input type="text" id="di-refeicao" required placeholder="Café da manhã" />
            </div>
          </div>

          <label for="di-alimentos">Alimentos</label>
          <input type="text" id="di-alimentos" placeholder="Ovos, aveia, banana..." />

          <button type="submit" class="admin-btn-principal">
            <i class="fa-solid fa-plus"></i>
            Adicionar refeição
          </button>
        </form>
      </details>

      <details class="secao admin-detalhe-secao" open>
        <summary><i class="fa-solid fa-weight-scale"></i> Avaliação física</summary>

        <div id="lista-avaliacoes" class="lista-cards">
          <p>Carregando...</p>
        </div>

        <form id="form-avaliacao" class="caixa-form admin-form">
          <h3>Registrar avaliação</h3>

          <div class="admin-grid-form">
            <div>
              <label for="av-peso">Peso (kg)</label>
              <input type="number" step="0.1" min="1" id="av-peso" required />
            </div>

            <div>
              <label for="av-altura">Altura (cm)</label>
              <input type="number" step="0.1" min="1" id="av-altura" required />
            </div>

            <div>
              <label for="av-cintura">Cintura (cm)</label>
              <input type="number" step="0.1" id="av-cintura" />
            </div>

            <div>
              <label for="av-quadril">Quadril (cm)</label>
              <input type="number" step="0.1" id="av-quadril" />
            </div>

            <div>
              <label for="av-braco">Braço (cm)</label>
              <input type="number" step="0.1" id="av-braco" />
            </div>

            <div>
              <label for="av-coxa">Coxa (cm)</label>
              <input type="number" step="0.1" id="av-coxa" />
            </div>
          </div>

          <button type="submit" class="admin-btn-principal">
            <i class="fa-solid fa-plus"></i>
            Registrar avaliação
          </button>
        </form>
      </details>

      <details class="secao admin-detalhe-secao" open>
        <summary><i class="fa-solid fa-comment-medical"></i> Notas de consultoria</summary>

        <div id="lista-notas" class="lista-cards">
          <p>Carregando...</p>
        </div>

        <form id="form-nota" class="caixa-form admin-form">
          <label for="nota-texto">Observação / evolução</label>
          <textarea id="nota-texto" required placeholder="Registre a evolução do aluno..."></textarea>

          <button type="submit" class="admin-btn-principal">
            <i class="fa-solid fa-plus"></i>
            Adicionar nota
          </button>
        </form>
      </details>

      <details class="secao admin-detalhe-secao" open>
        <summary><i class="fa-solid fa-camera"></i> Fotos e vídeos enviados</summary>

        <div id="lista-envios" class="lista-cards">
          <p>Carregando...</p>
        </div>
      </details>
    </div>
  `;

  document.getElementById('btn-voltar')
      .addEventListener('click', renderListaAlunos);

  document.getElementById('form-editar-aluno')
      .addEventListener('submit', async evento => {
        evento.preventDefault();

        const erroEl = document.getElementById('erro-editar');
        const botao = evento.currentTarget.querySelector('button[type="submit"]');

        erroEl.textContent = '';
        botao.disabled = true;

        const dados = {
          nome: document.getElementById('ed-nome').value.trim(),
          idade: document.getElementById('ed-idade').value || null,
          objetivo: document.getElementById('ed-objetivo').value.trim(),
          contato: document.getElementById('ed-contato').value.trim(),
          proxima_revisao: document.getElementById('ed-revisao').value || null,
        };

        try {
          const { error } = await atualizarAluno(aluno.id, dados);

          if (error) {
            erroEl.textContent = `Não foi possível salvar: ${error.message}`;
            return;
          }

          Object.assign(aluno, dados);

          const indice = todosAlunosCache.findIndex(item =>
              String(item.id) === String(aluno.id)
          );

          if (indice >= 0) {
            todosAlunosCache[indice] = { ...todosAlunosCache[indice], ...dados };
          }

          const titulo = containerGlobal.querySelector('.admin-cabecalho h2');

          if (titulo) titulo.textContent = aluno.nome;

          alert('Dados atualizados com sucesso!');
        } catch (erro) {
          erroEl.textContent = erro.message || 'Erro ao atualizar aluno.';
        } finally {
          botao.disabled = false;
        }
      });

  const formVincular = document.getElementById('form-vincular');

  if (formVincular) {
    formVincular.addEventListener('submit', async evento => {
      evento.preventDefault();

      const erroEl = document.getElementById('erro-vincular');
      const botao = formVincular.querySelector('button[type="submit"]');

      erroEl.textContent = '';
      botao.disabled = true;

      try {
        const email = document.getElementById('vincular-email').value.trim();

        const { error } = await vincularAlunoPorEmail(aluno.id, email);

        if (error) {
          erroEl.textContent = error.message;
          return;
        }

        alert('Login vinculado com sucesso!');

        // Recarrega os dados para refletir o vínculo confirmado no banco.
        const { data: alunosAtualizados, error: erroLista } = await listarAlunos();

        if (!erroLista) {
          todosAlunosCache = alunosAtualizados || [];
          const alunoAtualizado = obterAluno(aluno.id);

          if (alunoAtualizado) {
            await renderDetalheAluno(alunoAtualizado);
            return;
          }
        }

        aluno.perfil_id = true;
        await renderDetalheAluno(aluno);
      } catch (erro) {
        erroEl.textContent = erro.message || 'Erro ao vincular login.';
      } finally {
        botao.disabled = false;
      }
    });
  }

  document.getElementById('form-anamnese')
      .addEventListener('submit', async evento => {
        evento.preventDefault();

        const botao = evento.currentTarget.querySelector('button[type="submit"]');
        botao.disabled = true;

        try {
          const anamnese = {
            restricoes: document.getElementById('an-restricoes').value.trim(),
            nivel: document.getElementById('an-nivel').value,
            disponibilidade: document.getElementById('an-disponibilidade').value.trim(),
            observacoes: document.getElementById('an-obs').value.trim(),
          };

          const { error } = await atualizarAluno(aluno.id, { anamnese });

          if (error) {
            alert(`Não foi possível salvar a anamnese: ${error.message}`);
            return;
          }

          aluno.anamnese = anamnese;
          alert('Anamnese salva com sucesso!');
        } catch (erro) {
          alert(erro.message || 'Erro ao salvar anamnese.');
        } finally {
          botao.disabled = false;
        }
      });

  const campoBuscaCatalogoAberto = document.getElementById('tr-busca-aberto');
  const campoBuscaCatalogoProprio = document.getElementById('tr-busca-proprio');
  const campoBuscaImagensLicenciadas = document.getElementById('tr-busca-imagens');
  const resultadosCatalogoAberto = document.getElementById('tr-resultados-aberto');
  const resultadosCatalogoProprio = document.getElementById('tr-resultados-proprios');
  const resultadosImagensLicenciadas = document.getElementById('tr-resultados-imagens');
  const previewBibliotecaTreino = document.getElementById('tr-biblioteca-preview');
  const camposMidiaTreino = document.getElementById('tr-media-campos');
  const inputArquivoTreino = document.getElementById('tr-imagem-arquivo');
  const inputUrlMidiaTreino = document.getElementById('tr-imagem-url-input');
  const inputFonteMidiaTreino = document.getElementById('tr-media-fonte');
  const inputLicencaMidiaTreino = document.getElementById('tr-media-licenca');
  const inputAtribuicaoMidiaTreino = document.getElementById('tr-media-atribuicao');
  const botaoAlterarMidiaTreino = document.getElementById('tr-alterar-media');
  const mensagemSelecaoTreino = document.getElementById('tr-selecao-erro');
  let exercicioSelecionado = null;
  let urlPreviewLocal = null;
  let sequenciaPesquisaCatalogo = 0;
  let substituindoMidiaTreino = false;

  function mostrarPreviewTreino(nome, instrucoes, imagemUrl) {
    if (urlPreviewLocal) {
      URL.revokeObjectURL(urlPreviewLocal);
      urlPreviewLocal = null;
    }

    const arquivo = inputArquivoTreino.files[0];
    if (arquivo) urlPreviewLocal = URL.createObjectURL(arquivo);

    const imagem = urlPreviewLocal || urlHttp(imagemUrl);
    previewBibliotecaTreino.innerHTML = `
      ${imagem ? `<img src="${escapar(imagem)}" alt="Pré-visualização de ${escapar(nome)}" />` : ''}
      <div>
        <strong>${escapar(nome)}</strong>
        <span>${escapar(instrucoes || 'Sem instruções textuais no catálogo.')}</span>
        ${!imagem ? '<span>Adiciona um GIF/imagem próprio ou licenciado para mostrar a demonstração ao aluno.</span>' : ''}
      </div>
    `;
  }

  function selecionarExercicioCatalogo(exercicio, registroBiblioteca = null) {
    exercicioSelecionado = { ...exercicio, registroBiblioteca };
    substituindoMidiaTreino = false;
    const imagemDisponivel = registroBiblioteca?.imagem_url || exercicio.imagemUrl || '';
    const media = exercicio.media || null;
    document.getElementById('tr-imagem-url').value = imagemDisponivel;
    inputUrlMidiaTreino.value = '';
    inputArquivoTreino.value = '';
    inputFonteMidiaTreino.value = registroBiblioteca?.fonte || media?.sourceUrl || '';
    inputLicencaMidiaTreino.value = registroBiblioteca?.licenca_url || media?.licenseUrl || '';
    inputAtribuicaoMidiaTreino.value = registroBiblioteca?.atribuicao ||
      (media ? `Imagem: ${media.imageAuthor}. Exercício: ${media.textAuthor}.` : '');
    camposMidiaTreino.hidden = Boolean(imagemDisponivel);
    botaoAlterarMidiaTreino.hidden = !imagemDisponivel;
    mensagemSelecaoTreino.textContent = '';
    mostrarPreviewTreino(
      exercicio.nome,
      exercicio.instrucoes || registroBiblioteca?.como_executar,
      imagemDisponivel
    );
  }

  async function renderResultadosCatalogoAberto(termo) {
    const sequencia = ++sequenciaPesquisaCatalogo;
    const busca = termo.trim();
    if (!busca) {
      resultadosCatalogoAberto.innerHTML = '<p class="vazio">Escreve para pesquisar entre 1.324 exercícios.</p>';
      return;
    }

    resultadosCatalogoAberto.innerHTML = '<p class="vazio"><i class="fa-solid fa-spinner fa-spin"></i> A pesquisar...</p>';

    try {
      const encontrados = await pesquisarExercicios(busca);
      if (sequencia !== sequenciaPesquisaCatalogo) return;

      resultadosCatalogoAberto.innerHTML = encontrados.length
          ? encontrados.map(exercicio => {
            const registro = bibliotecaCache.find(item => item.id_externo === exercicio.id);
            return `
              <button type="button" class="treino-biblioteca-opcao" data-id="${escapar(exercicio.id)}">
                ${urlHttp(registro?.imagem_url) ? `<img src="${escapar(urlHttp(registro.imagem_url))}" alt="" loading="lazy" />` : ''}
                <span class="treino-biblioteca-opcao-texto">
                  <strong>${escapar(exercicio.name)}</strong>
                  <span>${escapar([exercicio.target || exercicio.bodyPart, exercicio.equipment].filter(Boolean).join(' · '))}</span>
                  <span>${registro?.imagem_url ? 'GIF/imagem guardado' : 'Demonstração própria/licenciada necessária'}</span>
                </span>
              </button>
            `;
          }).join('')
          : '<p class="vazio">Nenhum exercício encontrado.</p>';

      resultadosCatalogoAberto.querySelectorAll('.treino-biblioteca-opcao').forEach(botao => {
        botao.addEventListener('click', () => {
          const item = encontrados.find(exercicio => String(exercicio.id) === botao.dataset.id);
          if (!item) return;
          const registro = bibliotecaCache.find(exercicio => exercicio.id_externo === item.id);
          selecionarExercicioCatalogo({
            idExterno: item.id,
            nome: item.name,
            grupo: item.target || item.bodyPart || item.muscleGroup,
            equipamento: item.equipment,
            instrucoes: item.instructions,
            fonteTexto: EXERCISES_DATASET_SOURCE,
            licencaTextoUrl: EXERCISES_DATASET_LICENSE,
          }, registro);
        });
      });
    } catch (erro) {
      if (sequencia === sequenciaPesquisaCatalogo) {
        resultadosCatalogoAberto.innerHTML = `<p class="erro">Não foi possível carregar o catálogo: ${escapar(erro.message)}</p>`;
      }
    }
  }

  function renderResultadosCatalogoProprio(termo = '') {
    const busca = termo.trim().toLocaleLowerCase('pt-BR');
    const encontrados = bibliotecaCache.filter(exercicio =>
      [exercicio.nome, exercicio.grupo, exercicio.equipamento]
          .some(valor => String(valor || '').toLocaleLowerCase('pt-BR').includes(busca))
    ).slice(0, 24);

    resultadosCatalogoProprio.innerHTML = encontrados.length
        ? encontrados.map(exercicio => `
          <button type="button" class="treino-biblioteca-opcao" data-id="${escapar(exercicio.id)}">
            ${urlHttp(exercicio.imagem_url) ? `<img src="${escapar(urlHttp(exercicio.imagem_url))}" alt="" loading="lazy" />` : ''}
            <span class="treino-biblioteca-opcao-texto">
              <strong>${escapar(exercicio.nome)}</strong>
              <span>${escapar([exercicio.grupo, exercicio.equipamento].filter(Boolean).join(' · ') || 'Sem categoria')}</span>
            </span>
          </button>
        `).join('')
        : `<p class="vazio">${busca ? 'Nenhum exercício encontrado.' : 'Ainda não há exercícios com mídia guardada.'}</p>`;

    resultadosCatalogoProprio.querySelectorAll('.treino-biblioteca-opcao').forEach(botao => {
      botao.addEventListener('click', () => {
        const registro = bibliotecaCache.find(item => String(item.id) === botao.dataset.id);
        if (!registro) return;
        selecionarExercicioCatalogo({
          idExterno: registro.id_externo || '',
          nome: registro.nome,
          grupo: registro.grupo,
          equipamento: registro.equipamento,
          instrucoes: registro.como_executar,
        }, registro);
      });
    });
  }

  function renderResultadosImagens(termo = '') {
    const encontrados = pesquisarImagensLicenciadas(termo);
    resultadosImagensLicenciadas.innerHTML = encontrados.length
        ? encontrados.map(exercicio => {
          const registro = bibliotecaCache.find(item => item.id_externo === exercicio.id);
          return `
            <button type="button" class="treino-biblioteca-opcao" data-id="${escapar(exercicio.id)}">
              <img src="${escapar(urlHttp(registro?.imagem_url) || exercicio.imageUrl)}" alt="" loading="lazy" />
              <span class="treino-biblioteca-opcao-texto">
                <strong>${escapar(exercicio.name)}</strong>
                <span>${escapar([exercicio.category, exercicio.equipment].filter(Boolean).join(' · '))}</span>
                <span>Imagem: ${escapar(exercicio.imageLicense)} · ${escapar(exercicio.imageAuthor)}</span>
                <span>Texto: ${escapar(exercicio.textLicense)} · ${escapar(exercicio.textAuthor)}</span>
              </span>
            </button>
          `;
        }).join('')
        : `<p class="vazio">${termo.trim() ? 'Nenhuma imagem licenciada encontrada.' : 'Escreve para pesquisar imagens disponíveis.'}</p>`;

    resultadosImagensLicenciadas.querySelectorAll('.treino-biblioteca-opcao').forEach(botao => {
      botao.addEventListener('click', () => {
        const item = encontrados.find(exercicio => exercicio.id === botao.dataset.id);
        if (!item) return;
        const registro = bibliotecaCache.find(exercicio => exercicio.id_externo === item.id);
        const exercicio = {
          idExterno: item.id,
          nome: item.name,
          grupo: item.category,
          equipamento: item.equipment,
          instrucoes: item.description,
          imagemUrl: item.imageUrl,
          media: {
            sourceUrl: item.imageSourcePage,
            licenseUrl: item.imageLicenseUrl,
            imageAuthor: item.imageAuthor,
            textAuthor: item.textAuthor,
            textSourceUrl: item.sourceUrl,
            textLicenseUrl: item.textLicenseUrl,
          },
        };

        selecionarExercicioCatalogo(exercicio, registro);
      });
    });
  }

  function trocarAbaTreino(aba) {
    const abas = ['aberto', 'proprio', 'imagens'];
    for (const nomeAba of abas) {
      const ativa = nomeAba === aba;
      document.getElementById(`tr-tab-${nomeAba}`).classList.toggle('ativo', ativa);
      document.getElementById(`tr-tab-${nomeAba}`).setAttribute('aria-selected', String(ativa));
      document.getElementById(`tr-painel-${nomeAba}`).hidden = !ativa;
    }
  }

  document.getElementById('tr-tab-aberto').addEventListener('click', () => trocarAbaTreino('aberto'));
  document.getElementById('tr-tab-proprio').addEventListener('click', () => trocarAbaTreino('proprio'));
  document.getElementById('tr-tab-imagens').addEventListener('click', () => trocarAbaTreino('imagens'));
  campoBuscaCatalogoAberto.addEventListener('input', () => renderResultadosCatalogoAberto(campoBuscaCatalogoAberto.value));
  campoBuscaCatalogoProprio.addEventListener('input', () => renderResultadosCatalogoProprio(campoBuscaCatalogoProprio.value));
  campoBuscaImagensLicenciadas.addEventListener('input', () => renderResultadosImagens(campoBuscaImagensLicenciadas.value));
  botaoAlterarMidiaTreino.addEventListener('click', () => {
    substituindoMidiaTreino = true;
    camposMidiaTreino.hidden = false;
    botaoAlterarMidiaTreino.hidden = true;
    inputUrlMidiaTreino.value = '';
    inputFonteMidiaTreino.value = '';
    inputLicencaMidiaTreino.value = '';
    inputAtribuicaoMidiaTreino.value = '';
    inputUrlMidiaTreino.focus();
  });
  inputArquivoTreino.addEventListener('change', () => {
    if (!exercicioSelecionado) return;
    camposMidiaTreino.hidden = false;
    mostrarPreviewTreino(exercicioSelecionado.nome, exercicioSelecionado.instrucoes, inputUrlMidiaTreino.value || document.getElementById('tr-imagem-url').value);
  });
  inputUrlMidiaTreino.addEventListener('input', () => {
    if (!exercicioSelecionado) return;
    camposMidiaTreino.hidden = false;
    mostrarPreviewTreino(exercicioSelecionado.nome, exercicioSelecionado.instrucoes, inputUrlMidiaTreino.value);
  });

  try {
    const { data, error } = await listarBiblioteca();
    if (error) {
      resultadosCatalogoProprio.innerHTML = `<p class="erro">Não foi possível carregar os exercícios guardados: ${escapar(error.message)}</p>`;
    } else {
      bibliotecaCache = data || [];
      renderResultadosCatalogoProprio();
    }
  } catch (erro) {
    resultadosCatalogoProprio.innerHTML = `<p class="erro">Não foi possível carregar os exercícios guardados: ${escapar(erro.message)}</p>`;
  }

  const selecaoTreinoPronto = document.getElementById('tr-pronto-selecao');
  const previewTreinoPronto = document.getElementById('tr-pronto-preview');
  const mensagemTreinoPronto = document.getElementById('tr-pronto-mensagem');

  function atualizarPreviewTreinoPronto() {
    const treino = TREINOS_PRONTOS.find(item => item.id === selecaoTreinoPronto.value);
    previewTreinoPronto.innerHTML = treino
        ? `<strong>${escapar(treino.descricao)}</strong>
           <ul>${treino.exercicios.map(exercicio => `
             <li>${escapar(exercicio.nome)} — ${exercicio.series} séries × ${escapar(exercicio.reps)}</li>
           `).join('')}</ul>`
        : '';
  }

  selecaoTreinoPronto.addEventListener('change', atualizarPreviewTreinoPronto);
  document.getElementById('form-treino-pronto')
      .addEventListener('submit', async evento => {
        evento.preventDefault();
        mensagemTreinoPronto.textContent = '';

        const treino = TREINOS_PRONTOS.find(item => item.id === selecaoTreinoPronto.value);
        if (!treino) {
          mensagemTreinoPronto.textContent = 'Selecione um treino da biblioteca.';
          return;
        }

        const formulario = evento.currentTarget;
        const botao = formulario.querySelector('button[type="submit"]');
        botao.disabled = true;
        try {
          const { data: treinosAtribuidos, error: erroLista } = await listarTreinos(aluno.id);
          if (erroLista) throw erroLista;
          if (treinosAtribuidos?.some(item => item.treino_nome === treino.nome)) {
            mensagemTreinoPronto.textContent =
                'Este treino já está atribuído. Remova os exercícios existentes antes de atribuí-lo novamente.';
            return;
          }

          const exercicios = treino.exercicios.map((exercicio, indice) => ({
            aluno_id: aluno.id,
            treino_nome: treino.nome,
            exercicio: exercicio.nome,
            series: String(exercicio.series),
            reps: exercicio.reps,
            descanso: String(exercicio.descanso),
            carga: '',
            como_executar: '',
            ordem: indice + 1,
          }));
          const { error } = await adicionarTreino(exercicios);
          if (error) throw error;

          mensagemTreinoPronto.className = 'admin-mensagem-sucesso';
          mensagemTreinoPronto.textContent = `${treino.nome} atribuído ao aluno.`;
          await carregarTreinos(aluno.id);
        } catch (erro) {
          mensagemTreinoPronto.className = 'erro';
          mensagemTreinoPronto.textContent = mensagemErroBibliotecaTreinos(erro);
        } finally {
          botao.disabled = false;
        }
      });

  document.getElementById('form-exercicio-personalizado')
      .addEventListener('submit', async evento => {
        evento.preventDefault();
        const formulario = evento.currentTarget;
        const botao = formulario.querySelector('button[type="submit"]');
        const mensagem = document.getElementById('tr-personalizado-mensagem');
        mensagem.className = 'erro';
        mensagem.textContent = '';
        botao.disabled = true;

        try {
          const { error } = await adicionarTreino({
            aluno_id: aluno.id,
            treino_nome: 'Exercícios personalizados',
            exercicio: document.getElementById('tr-personalizado-nome').value.trim(),
            series: document.getElementById('tr-personalizado-series').value,
            reps: document.getElementById('tr-personalizado-reps').value.trim(),
            descanso: document.getElementById('tr-personalizado-descanso').value,
            carga: '',
            como_executar: document.getElementById('tr-personalizado-instrucoes').value.trim(),
          });
          if (error) throw error;

          formulario.reset();
          document.getElementById('tr-personalizado-series').value = '3';
          document.getElementById('tr-personalizado-descanso').value = '60';
          mensagem.className = 'admin-mensagem-sucesso';
          mensagem.textContent = 'Exercício criado e atribuído ao aluno.';
          await carregarTreinos(aluno.id);
        } catch (erro) {
          mensagem.textContent = mensagemErroBibliotecaTreinos(erro);
        } finally {
          botao.disabled = false;
        }
      });

  document.getElementById('form-treino')
      .addEventListener('submit', async evento => {
        evento.preventDefault();

        const formulario = evento.currentTarget;
        const botao = formulario.querySelector('button[type="submit"]');
        const reps = document.getElementById('tr-reps').value.trim();
        const descanso = document.getElementById('tr-descanso').value.trim();
        const imagemArquivo = inputArquivoTreino.files[0] || null;
        const imagemUrlInformada = camposMidiaTreino.hidden
            ? ''
            : inputUrlMidiaTreino.value.trim();
        const imagemUrlValida = imagemUrlInformada ? urlHttp(imagemUrlInformada) : '';
        const imagemPadrao = exercicioSelecionado?.registroBiblioteca?.imagem_url ||
            exercicioSelecionado?.imagemUrl || '';
        const fonteImagem = inputFonteMidiaTreino.value.trim() ||
            (!substituindoMidiaTreino ? exercicioSelecionado?.media?.sourceUrl : '') || '';
        const licencaImagem = inputLicencaMidiaTreino.value.trim() ||
            (!substituindoMidiaTreino ? exercicioSelecionado?.media?.licenseUrl : '') || '';
        const atribuicaoImagem = inputAtribuicaoMidiaTreino.value.trim() ||
            (exercicioSelecionado?.media
              ? substituindoMidiaTreino
                ? `Exercício: ${exercicioSelecionado.media.textAuthor}.`
                : `Imagem: ${exercicioSelecionado.media.imageAuthor}. Exercício: ${exercicioSelecionado.media.textAuthor}.`
              : '') || '';
        const fonteTexto = exercicioSelecionado?.media?.textSourceUrl ||
            exercicioSelecionado?.fonteTexto ||
            exercicioSelecionado?.registroBiblioteca?.fonte_texto || '';
        const licencaTexto = exercicioSelecionado?.media?.textLicenseUrl ||
            exercicioSelecionado?.licencaTextoUrl ||
            exercicioSelecionado?.registroBiblioteca?.licenca_texto_url || '';

        mensagemSelecaoTreino.textContent = '';
        if (!exercicioSelecionado) {
          mensagemSelecaoTreino.textContent = 'Pesquisa e seleciona um exercício do catálogo antes de adicionar.';
          return;
        }
        if (!reps || !descanso) {
          mensagemSelecaoTreino.textContent = 'Preenche as repetições e o descanso entre séries.';
          return;
        }
        if (imagemUrlInformada && !imagemUrlValida && !imagemArquivo) {
          mensagemSelecaoTreino.textContent = 'O link da imagem/GIF deve começar por http:// ou https://.';
          return;
        }

        if (imagemArquivo && !imagemArquivo.type.startsWith('image/')) {
          mensagemSelecaoTreino.textContent = 'Seleciona um ficheiro de imagem ou GIF válido.';
          return;
        }
        if (imagemArquivo && imagemArquivo.size > 50 * 1024 * 1024) {
          mensagemSelecaoTreino.textContent = 'O ficheiro excede o limite de 50 MB do bucket biblioteca.';
          return;
        }

        botao.disabled = true;

        try {
          let registroBiblioteca = exercicioSelecionado.registroBiblioteca;
          if (!registroBiblioteca && exercicioSelecionado.idExterno) {
            const resultadoExistente = await buscarExercicioBibliotecaPorIdExterno(exercicioSelecionado.idExterno);
            if (resultadoExistente.error) throw resultadoExistente.error;
            registroBiblioteca = resultadoExistente.data;
          }

          if (!registroBiblioteca) {
            if (!imagemArquivo && !imagemUrlValida && !imagemPadrao) {
              mensagemSelecaoTreino.textContent = 'Adiciona um GIF/imagem própria ou licenciada para guardar a demonstração do exercício.';
              return;
            }

            const { data, error } = await criarExercicioBiblioteca({
              idExterno: exercicioSelecionado.idExterno || null,
              nome: exercicioSelecionado.nome,
              grupo: exercicioSelecionado.grupo || '',
              equipamento: exercicioSelecionado.equipamento || '',
              comoExecutar: exercicioSelecionado.instrucoes || '',
              imagemUrl: imagemUrlValida || imagemPadrao || null,
              fonte: fonteImagem || null,
              licencaUrl: licencaImagem || null,
              atribuicao: atribuicaoImagem,
              fonteTexto,
              licencaTextoUrl: licencaTexto,
              imagemArquivo,
            });
            if (error) throw error;
            registroBiblioteca = data;
            bibliotecaCache.push(registroBiblioteca);
            exercicioSelecionado.registroBiblioteca = registroBiblioteca;
          } else if (!registroBiblioteca.imagem_url || imagemArquivo || imagemUrlValida) {
            if (!registroBiblioteca.imagem_url && !imagemArquivo && !imagemUrlValida && !imagemPadrao) {
              mensagemSelecaoTreino.textContent = 'Adiciona um GIF/imagem própria ou licenciada para guardar a demonstração do exercício.';
              return;
            }

            const { data, error } = await atualizarImagemExercicioBiblioteca(registroBiblioteca.id, {
              imagemUrl: imagemUrlValida || imagemPadrao || null,
              fonte: fonteImagem,
              licencaUrl: licencaImagem,
              atribuicao: atribuicaoImagem,
              fonteTexto,
              licencaTextoUrl: licencaTexto,
              imagemArquivo,
            });
            if (error) throw error;
            registroBiblioteca = data;
            bibliotecaCache = bibliotecaCache.map(item =>
              String(item.id) === String(data.id) ? data : item
            );
            exercicioSelecionado.registroBiblioteca = registroBiblioteca;
          }

          const { error } = await adicionarTreino({
            aluno_id: aluno.id,
            treino_nome: 'Exercícios personalizados',
            exercicio: exercicioSelecionado.nome,
            series: '',
            reps,
            descanso,
            carga: '',
            como_executar: '',
            biblioteca_exercicio_id: registroBiblioteca.id,
            imagem_url: registroBiblioteca.imagem_url,
            video: registroBiblioteca.video || null,
            atribuicao: registroBiblioteca.atribuicao || null,
            fonte: registroBiblioteca.fonte || null,
            licenca_url: registroBiblioteca.licenca_url || null,
            fonte_texto: registroBiblioteca.fonte_texto || null,
            licenca_texto_url: registroBiblioteca.licenca_texto_url || null,
          });

          if (error) {
            alert(`Não foi possível salvar o treino: ${error.message}`);
            return;
          }

          formulario.reset();
          exercicioSelecionado = null;
          substituindoMidiaTreino = false;
          document.getElementById('tr-imagem-url').value = '';
          if (urlPreviewLocal) {
            URL.revokeObjectURL(urlPreviewLocal);
            urlPreviewLocal = null;
          }
          previewBibliotecaTreino.innerHTML = '';
          camposMidiaTreino.hidden = true;
          renderResultadosCatalogoProprio(campoBuscaCatalogoProprio.value);
          renderResultadosCatalogoAberto(campoBuscaCatalogoAberto.value);
          await carregarTreinos(aluno.id);
        } catch (erro) {
          const mensagem = erro?.message || 'Erro ao adicionar exercício.';
          mensagemSelecaoTreino.textContent = mensagem.includes('id_externo')
              ? 'Executa a migração supabase/migrations/20261013_exercise_dataset_ids.sql no Supabase e tenta novamente.'
              : mensagem;
        } finally {
          botao.disabled = false;
        }
      });

  document.getElementById('form-dieta')
      .addEventListener('submit', async evento => {
        evento.preventDefault();

        const formulario = evento.currentTarget;
        const botao = formulario.querySelector('button[type="submit"]');

        botao.disabled = true;

        try {
          const { error } = await adicionarDieta({
            aluno_id: aluno.id,
            horario: document.getElementById('di-horario').value.trim(),
            refeicao: document.getElementById('di-refeicao').value.trim(),
            alimentos: document.getElementById('di-alimentos').value.trim(),
          });

          if (error) {
            alert(`Não foi possível salvar a refeição: ${error.message}`);
            return;
          }

          formulario.reset();
          await carregarDietas(aluno.id);
        } catch (erro) {
          alert(erro.message || 'Erro ao adicionar refeição.');
        } finally {
          botao.disabled = false;
        }
      });

  document.getElementById('form-avaliacao')
      .addEventListener('submit', async evento => {
        evento.preventDefault();

        const formulario = evento.currentTarget;
        const botao = formulario.querySelector('button[type="submit"]');

        const peso = Number(document.getElementById('av-peso').value);
        const altura = Number(document.getElementById('av-altura').value);

        if (!(peso > 0) || !(altura > 0)) {
          alert('Informe um peso e uma altura válidos.');
          return;
        }

        const alturaMetros = altura / 100;
        const imc = Number((peso / (alturaMetros * alturaMetros)).toFixed(1));

        botao.disabled = true;

        try {
          const { error } = await adicionarAvaliacao({
            aluno_id: aluno.id,
            peso,
            altura,
            imc,
            cintura: document.getElementById('av-cintura').value || null,
            quadril: document.getElementById('av-quadril').value || null,
            braco: document.getElementById('av-braco').value || null,
            coxa: document.getElementById('av-coxa').value || null,
          });

          if (error) {
            alert(`Não foi possível salvar a avaliação: ${error.message}`);
            return;
          }

          formulario.reset();
          await carregarAvaliacoes(aluno.id);
        } catch (erro) {
          alert(erro.message || 'Erro ao registrar avaliação.');
        } finally {
          botao.disabled = false;
        }
      });

  document.getElementById('form-nota')
      .addEventListener('submit', async evento => {
        evento.preventDefault();

        const formulario = evento.currentTarget;
        const botao = formulario.querySelector('button[type="submit"]');
        const texto = document.getElementById('nota-texto').value.trim();

        if (!texto) return;

        botao.disabled = true;

        try {
          const { error } = await adicionarNota({
            aluno_id: aluno.id,
            texto,
          });

          if (error) {
            alert(`Não foi possível salvar a nota: ${error.message}`);
            return;
          }

          formulario.reset();
          await carregarNotas(aluno.id);
        } catch (erro) {
          alert(erro.message || 'Erro ao adicionar nota.');
        } finally {
          botao.disabled = false;
        }
      });

  await Promise.all([
    carregarTreinos(aluno.id),
    carregarDietas(aluno.id),
    carregarAvaliacoes(aluno.id),
    carregarNotas(aluno.id),
    carregarEnvios(aluno.id),
  ]);
}

// ============================================================
// TREINOS
// ============================================================

async function carregarTreinos(alunoId) {
  const el = document.getElementById('lista-treinos');

  if (!el) return;

  try {
    const { data, error } = await listarTreinos(alunoId);

    if (error) {
      mostrarErro(el, error);
      return;
    }

    if (!data?.length) {
      el.innerHTML = mensagemVazia('fa-dumbbell', 'Nenhum exercício cadastrado.');
      return;
    }

    el.innerHTML = data.map(treino => `
      <div class="card-aluno admin-item-registro">
        ${urlHttp(treino.imagem_url) ? `
          <img class="treino-miniatura" src="${escapar(urlHttp(treino.imagem_url))}" alt="" loading="lazy" />
        ` : ''}
        <div class="info-aluno">
          <strong>${escapar(treino.exercicio)}</strong>
          <span>
            ${treino.series ? `${escapar(treino.series)} séries × ` : ''}
            ${escapar(treino.reps || '-')} repetições
            ${treino.descanso ? ` · Descanso entre séries: ${escapar(treino.descanso)} s` : ''}
            ${treino.carga ? ` · ${escapar(treino.carga)}` : ''}
          </span>
        </div>
        ${botaoRemover(treino.id, 'Remover exercício')}
      </div>
    `).join('');

    el.querySelectorAll('.btn-remover').forEach(botao => {
      botao.addEventListener('click', async () => {
        if (!confirm('Remover este exercício?')) return;

        const { error: erroRemocao } = await removerTreino(botao.dataset.id);

        if (erroRemocao) {
          alert(erroRemocao.message);
          return;
        }

        await carregarTreinos(alunoId);
      });
    });
  } catch (erro) {
    mostrarErro(el, erro);
  }
}

// ============================================================
// DIETAS
// ============================================================

async function carregarDietas(alunoId) {
  const el = document.getElementById('lista-dietas');

  if (!el) return;

  try {
    const { data, error } = await listarDietas(alunoId);

    if (error) {
      mostrarErro(el, error);
      return;
    }

    if (!data?.length) {
      el.innerHTML = mensagemVazia('fa-bowl-food', 'Nenhuma refeição cadastrada.');
      return;
    }

    el.innerHTML = data.map(dieta => `
      <div class="card-aluno admin-item-registro">
        <div class="info-aluno">
          <strong>
            ${dieta.horario ? `${escapar(dieta.horario)} — ` : ''}
            ${escapar(dieta.refeicao)}
          </strong>
          <span>${escapar(dieta.alimentos || 'Alimentos não informados')}</span>
        </div>
        ${botaoRemover(dieta.id, 'Remover refeição')}
      </div>
    `).join('');

    el.querySelectorAll('.btn-remover').forEach(botao => {
      botao.addEventListener('click', async () => {
        if (!confirm('Remover esta refeição?')) return;

        const { error: erroRemocao } = await removerDieta(botao.dataset.id);

        if (erroRemocao) {
          alert(erroRemocao.message);
          return;
        }

        await carregarDietas(alunoId);
      });
    });
  } catch (erro) {
    mostrarErro(el, erro);
  }
}

// ============================================================
// AVALIAÇÕES FÍSICAS
// ============================================================

async function carregarAvaliacoes(alunoId) {
  const el = document.getElementById('lista-avaliacoes');

  if (!el) return;

  try {
    const { data, error } = await listarAvaliacoes(alunoId);

    if (error) {
      mostrarErro(el, error);
      return;
    }

    if (!data?.length) {
      el.innerHTML = mensagemVazia('fa-weight-scale', 'Nenhuma avaliação registrada.');
      return;
    }

    const ordenadas = [...data].sort((a, b) =>
        new Date(b.data) - new Date(a.data)
    );

    el.innerHTML = ordenadas.map(avaliacao => `
      <div class="card-aluno admin-item-registro">
        <div class="info-aluno">
          <strong>
            ${formatarData(avaliacao.data)} · ${escapar(avaliacao.peso)} kg
          </strong>
          <span>
            Altura: ${escapar(avaliacao.altura)} cm
            · IMC: ${escapar(avaliacao.imc)}
          </span>
          <span>
            ${avaliacao.cintura ? `Cintura: ${escapar(avaliacao.cintura)} cm · ` : ''}
            ${avaliacao.quadril ? `Quadril: ${escapar(avaliacao.quadril)} cm · ` : ''}
            ${avaliacao.braco ? `Braço: ${escapar(avaliacao.braco)} cm · ` : ''}
            ${avaliacao.coxa ? `Coxa: ${escapar(avaliacao.coxa)} cm` : ''}
          </span>
        </div>
        ${botaoRemover(avaliacao.id, 'Remover avaliação')}
      </div>
    `).join('');

    el.querySelectorAll('.btn-remover').forEach(botao => {
      botao.addEventListener('click', async () => {
        if (!confirm('Remover esta avaliação?')) return;

        const { error: erroRemocao } = await removerAvaliacao(botao.dataset.id);

        if (erroRemocao) {
          alert(erroRemocao.message);
          return;
        }

        await carregarAvaliacoes(alunoId);
      });
    });
  } catch (erro) {
    mostrarErro(el, erro);
  }
}

// ============================================================
// NOTAS DE CONSULTORIA
// ============================================================

async function carregarNotas(alunoId) {
  const el = document.getElementById('lista-notas');

  if (!el) return;

  try {
    const { data, error } = await listarNotas(alunoId);

    if (error) {
      mostrarErro(el, error);
      return;
    }

    if (!data?.length) {
      el.innerHTML = mensagemVazia('fa-comment-medical', 'Nenhuma nota registrada.');
      return;
    }

    el.innerHTML = data.map(nota => `
      <div class="card-aluno admin-item-registro">
        <div class="info-aluno">
          <strong>${formatarData(nota.data)}</strong>
          <span>${escapar(nota.texto)}</span>
        </div>
        ${botaoRemover(nota.id, 'Remover nota')}
      </div>
    `).join('');

    el.querySelectorAll('.btn-remover').forEach(botao => {
      botao.addEventListener('click', async () => {
        if (!confirm('Remover esta nota?')) return;

        const { error: erroRemocao } = await removerNota(botao.dataset.id);

        if (erroRemocao) {
          alert(erroRemocao.message);
          return;
        }

        await carregarNotas(alunoId);
      });
    });
  } catch (erro) {
    mostrarErro(el, erro);
  }
}

// ============================================================
// FOTOS, VÍDEOS E DEVOLUTIVAS
// ============================================================

async function carregarEnvios(alunoId) {
  const el = document.getElementById('lista-envios');

  if (!el) return;

  try {
    const { data, error } = await listarEnvios(alunoId);

    if (error) {
      mostrarErro(el, error);
      return;
    }

    if (!data?.length) {
      el.innerHTML = mensagemVazia('fa-camera', 'Nenhuma foto ou vídeo enviado.');
      return;
    }

    el.innerHTML = data.map(envio => `
      <article class="card-envio admin-card-midia">
        <div class="admin-midia-cabecalho">
          <span class="tag">
            <i class="fa-solid ${envio.tipo === 'video' ? 'fa-video' : 'fa-image'}"></i>
            ${envio.tipo === 'video' ? 'Vídeo' : 'Foto'}
          </span>
          <span class="admin-data-midia">${formatarData(envio.criado_em)}</span>
        </div>

        ${envio.tipo === 'video'
        ? `<video src="${escapar(envio.asset_url)}" controls class="midia-envio"></video>`
        : `<a href="${escapar(envio.asset_url)}" target="_blank" rel="noopener noreferrer">
               <img src="${escapar(envio.asset_url)}" class="midia-envio" alt="Foto enviada pelo aluno" loading="lazy" />
             </a>`
    }

        ${envio.legenda ? `
          <p class="legenda-envio">${escapar(envio.legenda)}</p>
        ` : ''}

        ${envio.devolucao_texto ? `
          <div class="devolucao-pronta">
            <strong><i class="fa-solid fa-check-circle"></i> Devolutiva enviada</strong>
            <p>${escapar(envio.devolucao_texto)}</p>
          </div>
        ` : `
          <form class="form-devolucao" data-id="${escapar(envio.id)}">
            <label>Escreva sua devolutiva</label>
            <textarea placeholder="Comente a evolução e oriente o aluno..." required></textarea>
            <button type="submit" class="admin-btn-principal">
              <i class="fa-solid fa-paper-plane"></i>
              Enviar devolutiva
            </button>
          </form>
        `}
      </article>
    `).join('');

    el.querySelectorAll('.form-devolucao').forEach(formulario => {
      formulario.addEventListener('submit', async evento => {
        evento.preventDefault();

        const textarea = formulario.querySelector('textarea');
        const botao = formulario.querySelector('button');
        const texto = textarea.value.trim();

        if (!texto) return;

        botao.disabled = true;

        try {
          const { error: erroResposta } = await responderEnvio(
              formulario.dataset.id,
              texto
          );

          if (erroResposta) {
            alert(`Não foi possível enviar a devolutiva: ${erroResposta.message}`);
            return;
          }

          await carregarEnvios(alunoId);
        } catch (erro) {
          alert(erro.message || 'Erro ao enviar devolutiva.');
        } finally {
          botao.disabled = false;
        }
      });
    });
  } catch (erro) {
    mostrarErro(el, erro);
  }
}

// ============================================================
// BIBLIOTECA DE EXERCÍCIOS
// ============================================================

async function renderBiblioteca() {
  containerGlobal.innerHTML = `
    <div class="secao admin-painel">
      <div class="admin-cabecalho">
        <div>
          <span class="eyebrow">CONTEÚDO DA CONSULTORIA</span>
          <h2>Biblioteca de exercícios</h2>
          <p class="admin-subtitulo">
            Organize os exercícios e materiais da sua consultoria.
          </p>
        </div>
      </div>

      <div class="campo-busca">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input type="search" id="busca-biblioteca" placeholder="Buscar por exercício, grupo ou equipamento..." autocomplete="off" />
      </div>

      <div id="lista-biblioteca" class="lista-cards">
        <p>Carregando biblioteca...</p>
      </div>

      <form id="form-biblioteca" class="caixa-form admin-form">
        <div class="admin-form-titulo">
          <span class="admin-icone-titulo">
            <i class="fa-solid fa-book-open"></i>
          </span>
          <div>
            <h3>Novo exercício</h3>
            <p>Adicione as instruções e os materiais de apoio.</p>
          </div>
        </div>

        <label for="bi-nome">Nome do exercício</label>
        <input type="text" id="bi-nome" required />

        <label for="bi-grupo">Grupo muscular</label>
        <input type="text" id="bi-grupo" placeholder="Peito, pernas, costas..." />

        <label for="bi-equipamento">Equipamento</label>
        <input type="text" id="bi-equipamento" placeholder="Halteres, barra, peso corporal..." />

        <label for="bi-como">Como executar</label>
        <textarea id="bi-como" placeholder="Descreva a execução correta..."></textarea>

        <label for="bi-video">Link do vídeo</label>
        <input type="url" id="bi-video" placeholder="https://..." />

        <label for="bi-imagem-url">Link da imagem (opcional)</label>
        <input type="url" id="bi-imagem-url" placeholder="https://..." />

        <label for="bi-imagem">Foto ou GIF do exercício</label>
        <input type="file" id="bi-imagem" accept="image/*,.gif" />

        <label for="bi-fonte">Fonte / licença do material</label>
        <input type="url" id="bi-fonte" placeholder="https://..." />

        <label for="bi-atribuicao">Atribuição exigida</label>
        <input type="text" id="bi-atribuicao" placeholder="Ex.: © titular dos direitos" />

        <button type="submit" class="admin-btn-principal">
          <i class="fa-solid fa-plus"></i>
          Adicionar à biblioteca
        </button>

        <div id="erro-biblioteca" class="erro" role="alert"></div>
      </form>
    </div>
  `;

  document.getElementById('form-biblioteca')
      .addEventListener('submit', async evento => {
        evento.preventDefault();

        const formulario = evento.currentTarget;
        const erroEl = document.getElementById('erro-biblioteca');
        const botao = formulario.querySelector('button[type="submit"]');

        erroEl.textContent = '';
        botao.disabled = true;
        botao.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';

        try {
          const { error } = await criarExercicioBiblioteca({
            nome: document.getElementById('bi-nome').value.trim(),
            grupo: document.getElementById('bi-grupo').value.trim(),
            equipamento: document.getElementById('bi-equipamento').value.trim(),
            comoExecutar: document.getElementById('bi-como').value.trim(),
            video: document.getElementById('bi-video').value.trim(),
            imagemUrl: document.getElementById('bi-imagem-url').value.trim(),
            fonte: document.getElementById('bi-fonte').value.trim(),
            atribuicao: document.getElementById('bi-atribuicao').value.trim(),
            imagemArquivo: document.getElementById('bi-imagem').files[0] || null,
          });

          if (error) {
            erroEl.textContent = `Não foi possível salvar: ${error.message}`;
            return;
          }

          formulario.reset();
          await carregarBiblioteca();
        } catch (erro) {
          erroEl.textContent = erro.message || 'Erro ao adicionar exercício.';
        } finally {
          botao.disabled = false;
          botao.innerHTML = '<i class="fa-solid fa-plus"></i> Adicionar à biblioteca';
        }
      });

  document.getElementById('busca-biblioteca')
      .addEventListener('input', evento => renderListaBiblioteca(evento.currentTarget.value));

  await carregarBiblioteca();
}

function renderListaBiblioteca(termo = '') {
  const el = document.getElementById('lista-biblioteca');
  if (!el) return;

  const busca = termo.trim().toLocaleLowerCase('pt-BR');
  const exercicios = bibliotecaCache.filter(exercicio =>
    [exercicio.nome, exercicio.grupo, exercicio.equipamento]
        .some(valor => String(valor || '').toLocaleLowerCase('pt-BR').includes(busca))
  );

  if (!exercicios.length) {
    el.innerHTML = mensagemVazia('fa-book-open', busca ? 'Nenhum exercício corresponde à pesquisa.' : 'Nenhum exercício cadastrado.');
    return;
  }

  el.innerHTML = exercicios.map(exercicio => `
    <article class="card-envio admin-card-biblioteca">
      ${urlHttp(exercicio.imagem_url) ? `
        <img
          src="${escapar(urlHttp(exercicio.imagem_url))}"
          class="midia-envio"
          alt="${escapar(exercicio.nome)}"
          loading="lazy"
        />
      ` : ''}

      <div class="admin-biblioteca-conteudo">
        <div class="admin-biblioteca-titulo">
          <strong>${escapar(exercicio.nome)}</strong>
          ${exercicio.grupo ? `<span class="tag">${escapar(exercicio.grupo)}</span>` : ''}
          ${exercicio.equipamento ? `<span class="tag">${escapar(exercicio.equipamento)}</span>` : ''}
        </div>

        ${exercicio.como_executar ? `<p class="legenda-envio">${escapar(exercicio.como_executar)}</p>` : ''}

        <div class="admin-biblioteca-links">
          ${urlHttp(exercicio.video) ? `
            <a href="${escapar(urlHttp(exercicio.video))}" target="_blank" rel="noopener noreferrer" class="admin-link">
              <i class="fa-solid fa-video"></i> Assistir vídeo
            </a>
          ` : ''}
          ${urlHttp(exercicio.fonte) ? `
            <a href="${escapar(urlHttp(exercicio.fonte))}" target="_blank" rel="noopener noreferrer" class="admin-link">
              <i class="fa-solid fa-arrow-up-right-from-square"></i> Fonte da imagem
            </a>
          ` : ''}
          ${urlHttp(exercicio.licenca_url) ? `
            <a href="${escapar(urlHttp(exercicio.licenca_url))}" target="_blank" rel="noopener noreferrer" class="admin-link">
              <i class="fa-regular fa-copyright"></i> Licença
            </a>
          ` : ''}
          ${urlHttp(exercicio.fonte_texto) ? `
            <a href="${escapar(urlHttp(exercicio.fonte_texto))}" target="_blank" rel="noopener noreferrer" class="admin-link">
              <i class="fa-solid fa-book"></i> Fonte do exercício
            </a>
          ` : ''}
          ${urlHttp(exercicio.licenca_texto_url) ? `
            <a href="${escapar(urlHttp(exercicio.licenca_texto_url))}" target="_blank" rel="noopener noreferrer" class="admin-link">
              <i class="fa-regular fa-copyright"></i> Licença do texto
            </a>
          ` : ''}
        </div>
        ${exercicio.atribuicao ? `<small class="biblioteca-atribuicao">${escapar(exercicio.atribuicao)}</small>` : ''}
      </div>

      ${botaoRemover(exercicio.id, 'Remover exercício da biblioteca')}
    </article>
  `).join('');

  el.querySelectorAll('.btn-remover').forEach(botao => {
    botao.addEventListener('click', async () => {
      if (!confirm('Remover este exercício da biblioteca?')) return;

      const { error: erroRemocao } = await removerExercicioBiblioteca(botao.dataset.id);
      if (erroRemocao) {
        alert(erroRemocao.message);
        return;
      }

      await carregarBiblioteca();
    });
  });
}

async function carregarBiblioteca() {
  const el = document.getElementById('lista-biblioteca');

  if (!el) return;

  try {
    const { data, error } = await listarBiblioteca();

    if (error) {
      mostrarErro(el, error);
      return;
    }

    bibliotecaCache = data || [];
    renderListaBiblioteca(document.getElementById('busca-biblioteca')?.value || '');
  } catch (erro) {
    mostrarErro(el, erro);
  }
}

// ============================================================
// PLANOS
// ============================================================

async function renderPlanos() {
  containerGlobal.innerHTML = `
    <div class="secao admin-painel">
      <div class="admin-cabecalho">
        <div>
          <span class="eyebrow">PÁGINA DE VENDAS</span>
          <h2>Planos da consultoria</h2>
          <p class="admin-subtitulo">
            Gerencie os planos e os benefícios oferecidos.
          </p>
        </div>
      </div>

      <div id="lista-planos">
        <p>Carregando planos...</p>
      </div>

      <form id="form-plano" class="caixa-form admin-form">
        <div class="admin-form-titulo">
          <span class="admin-icone-titulo">
            <i class="fa-solid fa-tags"></i>
          </span>
          <div>
            <h3>Novo plano</h3>
            <p>Cadastre um plano para sua consultoria.</p>
          </div>
        </div>

        <label for="pl-nome">Nome do plano</label>
        <input type="text" id="pl-nome" required />

        <label for="pl-preco">Preço</label>
        <input type="text" id="pl-preco" placeholder="R$ 199/mês" />

        <label for="pl-desc">Descrição e benefícios</label>
        <textarea id="pl-desc" placeholder="Liste o que está incluído..."></textarea>

        <label class="admin-checkbox">
          <input type="checkbox" id="pl-destaque" />
          <span>Destacar este plano</span>
        </label>

        <button type="submit" class="admin-btn-principal">
          <i class="fa-solid fa-plus"></i>
          Adicionar plano
        </button>
      </form>
    </div>
  `;

  document.getElementById('form-plano')
      .addEventListener('submit', async evento => {
        evento.preventDefault();

        const formulario = evento.currentTarget;
        const botao = formulario.querySelector('button[type="submit"]');

        botao.disabled = true;

        try {
          const { error } = await criarPlano({
            nome: document.getElementById('pl-nome').value.trim(),
            preco: document.getElementById('pl-preco').value.trim(),
            descricao: document.getElementById('pl-desc').value.trim(),
            destaque: document.getElementById('pl-destaque').checked,
          });

          if (error) {
            alert(`Não foi possível salvar o plano: ${error.message}`);
            return;
          }

          formulario.reset();
          await carregarPlanos();
        } catch (erro) {
          alert(erro.message || 'Erro ao cadastrar plano.');
        } finally {
          botao.disabled = false;
        }
      });

  await carregarPlanos();
}

async function carregarPlanos() {
  const el = document.getElementById('lista-planos');

  if (!el) return;

  try {
    const { data, error } = await listarPlanos();

    if (error) {
      mostrarErro(el, error);
      return;
    }

    if (!data?.length) {
      el.innerHTML = mensagemVazia('fa-tags', 'Nenhum plano cadastrado.');
      return;
    }

    el.innerHTML = `
      <div class="planos-grid admin-planos-grid">
        ${data.map(plano => `
          <article class="card-envio plano-card ${plano.destaque ? 'plano-destaque' : ''}">
            ${plano.destaque ? `
              <div class="plano-ribbon">
                <i class="fa-solid fa-star"></i>
                Em destaque
              </div>
            ` : ''}

            <div class="admin-plano-icone">
              <i class="fa-solid fa-leaf"></i>
            </div>

            <strong class="admin-plano-nome">${escapar(plano.nome)}</strong>

            ${plano.preco ? `
              <div class="plano-preco">${escapar(plano.preco)}</div>
            ` : ''}

            <p class="legenda-envio">
              ${escapar(plano.descricao || 'Sem descrição cadastrada.').replace(/\n/g, '<br>')}
            </p>

            ${botaoRemover(plano.id, 'Remover plano')}
          </article>
        `).join('')}
      </div>
    `;

    el.querySelectorAll('.btn-remover').forEach(botao => {
      botao.addEventListener('click', async () => {
        if (!confirm('Remover este plano?')) return;

        const { error: erroRemocao } = await removerPlano(botao.dataset.id);

        if (erroRemocao) {
          alert(erroRemocao.message);
          return;
        }

        await carregarPlanos();
      });
    });
  } catch (erro) {
    mostrarErro(el, erro);
  }
}