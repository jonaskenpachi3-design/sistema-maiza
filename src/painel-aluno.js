import {
  meuCadastroAluno,
  listarTreinos, listarDietas, listarAvaliacoes,
  listarEnvios, enviarArquivo,
  registrarTreinoConcluido,
} from './supabase-client.js';
import { iniciarTreino } from './cronometro.js';

export async function montarPainelAluno(container) {
  container.innerHTML = '<p>Carregando seu plano...</p>';

  const { data: aluno, error } = await meuCadastroAluno();

  if (error || !aluno) {
    container.innerHTML = `
      <p class="erro">
        Ainda não encontramos seu cadastro de aluno vinculado a esta conta.
        Avise a Maiza pra ela conferir — ela precisa vincular seu e-mail ao seu cadastro.
      </p>`;
    return;
  }

  const [treinos, dietas, avaliacoes, envios] = await Promise.all([
    listarTreinos(aluno.id),
    listarDietas(aluno.id),
    listarAvaliacoes(aluno.id),
    listarEnvios(aluno.id),
  ]);

  const ultimaAval = (avaliacoes.data || []).slice(-1)[0];

  container.innerHTML = `
    <div class="secao">
      <h3><i class="fa-solid fa-dumbbell"></i> Seu treino</h3>
      ${(treinos.data && treinos.data.length) ? `
        <button id="btn-iniciar-treino" class="btn-destaque"><i class="fa-solid fa-play"></i> Iniciar treino</button>
      ` : ''}
      ${(treinos.data && treinos.data.length) ? treinos.data.map(t => `
        <div class="card-aluno">
          <div class="info-aluno">
            <strong>${escapar(t.exercicio)}</strong>
            <span>${escapar(t.series || '-')} x ${escapar(t.reps || '-')}${t.carga ? ' · ' + escapar(t.carga) : ''}</span>
            ${t.como_executar ? `<span>${escapar(t.como_executar)}</span>` : ''}
          </div>
        </div>
      `).join('') : '<p class="vazio">Nenhum treino cadastrado ainda.</p>'}
    </div>

    <div class="secao" style="margin-top:28px">
      <h3>Sua dieta</h3>
      ${(dietas.data && dietas.data.length) ? dietas.data.map(d => `
        <div class="card-aluno">
          <div class="info-aluno">
            <strong>${d.horario ? escapar(d.horario) + ' — ' : ''}${escapar(d.refeicao)}</strong>
            <span>${escapar(d.alimentos || '')}</span>
          </div>
        </div>
      `).join('') : '<p class="vazio">Nenhuma refeição cadastrada ainda.</p>'}
    </div>

    <div class="secao" style="margin-top:28px">
      <h3>Sua evolução</h3>
      ${ultimaAval
      ? `<p class="vazio">Última avaliação: ${new Date(ultimaAval.data).toLocaleDateString('pt-BR')} · ${ultimaAval.peso}kg · IMC ${ultimaAval.imc}</p>`
      : '<p class="vazio">Nenhuma avaliação registrada ainda.</p>'}
    </div>

    <div class="secao" style="margin-top:28px">
      <h3>Envie fotos/vídeos do treino</h3>
      <form id="form-envio-aluno" class="caixa-form">
        <label>Legenda (opcional)</label>
        <input type="text" id="env-legenda" placeholder="Ex: agachamento, série 3" />
        <label>Arquivo (foto ou vídeo)</label>
        <input type="file" id="env-arquivo" accept="image/*,video/*" required />
        <button type="submit"><i class="fa-solid fa-paper-plane"></i> Enviar</button>
        <div id="env-erro" class="erro"></div>
      </form>

      <div id="lista-meus-envios" style="margin-top:16px">
        ${renderEnvios(envios.data || [])}
      </div>
    </div>
  `;

  const btnIniciar = document.getElementById('btn-iniciar-treino');
  if (btnIniciar) {
    btnIniciar.addEventListener('click', () => {
      iniciarTreino(treinos.data, async () => {
        await registrarTreinoConcluido();
      });
    });
  }

  document.getElementById('form-envio-aluno').addEventListener('submit', async (e) => {
    e.preventDefault();
    const erroEl = document.getElementById('env-erro');
    erroEl.textContent = '';
    const legenda = document.getElementById('env-legenda').value.trim();
    const arquivo = document.getElementById('env-arquivo').files[0];
    if (!arquivo) return;

    const btn = e.target.querySelector('button');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';

    const { error } = await enviarArquivo(aluno.id, arquivo, legenda);

    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar';

    if (error) {
      erroEl.textContent = 'Não foi possível enviar: ' + error.message;
      return;
    }
    e.target.reset();
    const { data: enviosAtualizados } = await listarEnvios(aluno.id);
    document.getElementById('lista-meus-envios').innerHTML = renderEnvios(enviosAtualizados || []);
  });
}

function renderEnvios(lista) {
  if (!lista.length) return '<p class="vazio">Você ainda não enviou nada.</p>';
  return lista.map(v => `
    <div class="card-envio">
      ${v.tipo === 'video'
      ? `<video src="${v.asset_url}" controls class="midia-envio"></video>`
      : `<img src="${v.asset_url}" class="midia-envio" alt="Seu envio" />`}
      ${v.legenda ? `<p class="legenda-envio">${escapar(v.legenda)}</p>` : ''}
      ${v.devolucao_texto
      ? `<div class="devolucao-pronta"><strong>Devolução da Maiza:</strong> ${escapar(v.devolucao_texto)}</div>`
      : '<p class="vazio">Aguardando retorno da Maiza.</p>'}
    </div>
  `).join('');
}

function escapar(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}