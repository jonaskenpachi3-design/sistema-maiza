import {
    meuCadastroAluno,
    listarTreinos,
    listarDietas,
    listarAvaliacoes,
    listarEnvios,
    enviarArquivo,
    registrarTreinoConcluido,
} from './supabase-client.js';

import { iniciarTreino } from './cronometro.js';


export async function montarPainelAluno(container) {
    container.innerHTML = `
    <div class="aluno-carregando">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <p>Carregando seu painel...</p>
    </div>
  `;

    try {
        const { data: aluno, error } = await meuCadastroAluno();

        if (error || !aluno) {
            container.innerHTML = `
        <section class="secao aluno-erro-cadastro">
          <h3>
            <i class="fa-solid fa-circle-info"></i>
            Cadastro não encontrado
          </h3>

          <p>
            Ainda não encontramos seu cadastro de aluno vinculado
            a esta conta. Avise a Maiza para verificar se seu
            e-mail está vinculado corretamente.
          </p>
        </section>
      `;
            return;
        }

        const [
            resultadoTreinos,
            resultadoDietas,
            resultadoAvaliacoes,
            resultadoEnvios,
        ] = await Promise.all([
            listarTreinos(aluno.id),
            listarDietas(aluno.id),
            listarAvaliacoes(aluno.id),
            listarEnvios(aluno.id),
        ]);

        if (
            resultadoTreinos.error ||
            resultadoDietas.error ||
            resultadoAvaliacoes.error ||
            resultadoEnvios.error
        ) {
            throw new Error(
                'Não foi possível carregar todas as informações do painel.'
            );
        }

        const treinos = resultadoTreinos.data || [];
        const treinosAgrupados = treinos.reduce((grupos, treino) => {
            const nome = treino.treino_nome || 'Meu treino';
            if (!grupos.has(nome)) grupos.set(nome, []);
            grupos.get(nome).push(treino);
            return grupos;
        }, new Map());
        const dietas = resultadoDietas.data || [];
        const avaliacoes = resultadoAvaliacoes.data || [];
        const envios = resultadoEnvios.data || [];

        // Localiza a avaliação mais recente.
        const avaliacoesOrdenadas = [...avaliacoes].sort((a, b) => {
            const dataA = a.data ? new Date(a.data).getTime() : 0;
            const dataB = b.data ? new Date(b.data).getTime() : 0;

            return dataB - dataA;
        });

        const ultimaAval = avaliacoesOrdenadas[0] || null;

        // Data formatada para o resumo e a seção de evolução.
        const dataUltimaAval = formatarData(ultimaAval?.data);

        container.innerHTML = `
      <div class="aluno-painel">

        <!-- ==================================
             RESUMO DO ALUNO
        =================================== -->

        <section class="aluno-resumo">

          <div class="aluno-resumo-cabecalho">
            <span class="aluno-resumo-etiqueta">
              SEU ESPAÇO
            </span>

            <h2>Seu progresso começa aqui.</h2>

            <p>
              Acompanhe seu treino, sua alimentação e sua evolução.
            </p>
          </div>

          <div class="aluno-resumo-grid">

            <article class="aluno-resumo-card">
              <span class="aluno-resumo-icone">
                <i class="fa-solid fa-dumbbell"></i>
              </span>

              <span class="aluno-resumo-label">
                Exercícios
              </span>

              <strong>${treinos.length}</strong>

              <small>
                ${
            treinos.length === 1
                ? 'exercício cadastrado'
                : 'exercícios cadastrados'
        }
              </small>
            </article>

            <article class="aluno-resumo-card">
              <span class="aluno-resumo-icone">
                <i class="fa-solid fa-utensils"></i>
              </span>

              <span class="aluno-resumo-label">
                Alimentação
              </span>

              <strong>${dietas.length}</strong>

              <small>
                ${
            dietas.length === 1
                ? 'refeição cadastrada'
                : 'refeições cadastradas'
        }
              </small>
            </article>

            <article class="aluno-resumo-card">
              <span class="aluno-resumo-icone">
                <i class="fa-solid fa-chart-line"></i>
              </span>

              <span class="aluno-resumo-label">
                Avaliação
              </span>

              <strong class="aluno-resumo-data">
                ${dataUltimaAval || '—'}
              </strong>

              <small>última avaliação</small>
            </article>

            <article class="aluno-resumo-card">
              <span class="aluno-resumo-icone">
                <i class="fa-solid fa-camera"></i>
              </span>

              <span class="aluno-resumo-label">
                Meus envios
              </span>

              <strong>${envios.length}</strong>

              <small>
                ${
            envios.length === 1
                ? 'arquivo enviado'
                : 'arquivos enviados'
        }
              </small>
            </article>

          </div>
        </section>


        <!-- ==================================
             TREINO
        =================================== -->

        <section class="secao secao-treino-aluno">

          <div class="aluno-titulo-secao">
            <span class="aluno-icone-secao">
              <i class="fa-solid fa-dumbbell"></i>
            </span>

            <div>
              <h3>Seu treino</h3>
              <p>Confira os exercícios do seu plano.</p>
            </div>
          </div>

          ${
            treinos.length
                ? `
                <div class="aluno-lista-treinos">
                  ${[...treinosAgrupados].map(([nomeTreino, exercicios]) => `
                    <section class="aluno-grupo-treino">
                      <div class="aluno-grupo-treino-cabecalho">
                        <h4>${escapar(nomeTreino)}</h4>
                        <button
                          type="button"
                          class="btn-destaque btn-iniciar-treino"
                          data-nome-treino="${escapar(nomeTreino)}"
                        >
                          <i class="fa-solid fa-play"></i>
                          Iniciar treino
                        </button>
                      </div>
                      <div class="aluno-lista-exercicios">
                  ${exercicios.map((treino, indice) => `
                    <article class="card-aluno aluno-card-treino">

                      <span class="aluno-numero-exercicio">
                        ${String(indice + 1).padStart(2, '0')}
                      </span>

                      ${urlHttp(treino.imagem_url) ? `
                        <img
                          class="aluno-imagem-exercicio"
                          src="${escapar(urlHttp(treino.imagem_url))}"
                          alt="Demonstração de ${escapar(treino.exercicio)}"
                          loading="lazy"
                        />
                      ` : ''}

                      <div class="info-aluno">

                        <strong>
                          ${escapar(treino.exercicio)}
                        </strong>

                        <div class="aluno-dados-exercicio">

                          ${treino.series ? `
                            <span>
                              <i class="fa-solid fa-repeat"></i>
                              ${escapar(treino.series)} séries
                            </span>
                          ` : ''}

                          <span>
                            <i class="fa-solid fa-hashtag"></i>
                            ${escapar(treino.reps || '-')} repetições
                          </span>

                          ${
                    treino.descanso
                        ? `
                                <span>
                                  <i class="fa-regular fa-clock"></i>
                                  ${escapar(treino.descanso)} s descanso entre séries
                                </span>
                              `
                        : ''
                }

                          ${
                    treino.carga
                        ? `
                                <span>
                                  <i class="fa-solid fa-weight-hanging"></i>
                                  ${escapar(treino.carga)}
                                </span>
                              `
                        : ''
                }

                        </div>

                        ${
                    treino.como_executar
                        ? `
                              <p class="aluno-execucao">
                                ${escapar(treino.como_executar)}
                              </p>
                            `
                        : ''
                }

                        ${urlHttp(treino.video) ? `
                          <a href="${escapar(urlHttp(treino.video))}" target="_blank" rel="noopener noreferrer" class="admin-link aluno-link-demonstracao">
                            <i class="fa-solid fa-circle-play"></i>
                            Ver demonstração
                          </a>
                        ` : ''}

                        ${treino.atribuicao ? `<small class="biblioteca-atribuicao">${escapar(treino.atribuicao)}</small>` : ''}
                        ${urlHttp(treino.fonte) ? `<a href="${escapar(urlHttp(treino.fonte))}" target="_blank" rel="noopener noreferrer" class="admin-link aluno-link-demonstracao">Fonte da imagem</a>` : ''}
                        ${urlHttp(treino.licenca_url) ? `<a href="${escapar(urlHttp(treino.licenca_url))}" target="_blank" rel="noopener noreferrer" class="admin-link aluno-link-demonstracao">Licença da imagem</a>` : ''}
                        ${urlHttp(treino.fonte_texto) ? `<a href="${escapar(urlHttp(treino.fonte_texto))}" target="_blank" rel="noopener noreferrer" class="admin-link aluno-link-demonstracao">Fonte do exercício</a>` : ''}
                        ${urlHttp(treino.licenca_texto_url) ? `<a href="${escapar(urlHttp(treino.licenca_texto_url))}" target="_blank" rel="noopener noreferrer" class="admin-link aluno-link-demonstracao">Licença do texto</a>` : ''}

                      </div>
                    </article>
                  `).join('')}
                      </div>
                    </section>
                  `).join('')}
                </div>
              `
                : `
                <div class="aluno-estado-vazio">
                  <i class="fa-solid fa-dumbbell"></i>

                  <strong>
                    Nenhum treino cadastrado ainda
                  </strong>

                  <p>
                    Quando a Maiza cadastrar seus exercícios,
                    eles aparecerão aqui.
                  </p>
                </div>
              `
        }

        </section>


        <!-- ==================================
             DIETA
        =================================== -->

        <section class="secao secao-dieta-aluno">

          <div class="aluno-titulo-secao">
            <span class="aluno-icone-secao">
              <i class="fa-solid fa-utensils"></i>
            </span>

            <div>
              <h3>Sua dieta</h3>
              <p>Consulte as refeições do seu plano alimentar.</p>
            </div>
          </div>

          ${
            dietas.length
                ? `
                <div class="aluno-lista-dieta">
                  ${dietas.map(refeicao => `
                    <article class="card-aluno aluno-card-refeicao">

                      <span class="aluno-icone-refeicao">
                        <i class="fa-regular fa-clock"></i>
                      </span>

                      <div class="info-aluno">

                        <strong>
                          ${
                    refeicao.horario
                        ? escapar(refeicao.horario) + ' — '
                        : ''
                }${escapar(refeicao.refeicao)}
                        </strong>

                        ${
                    refeicao.alimentos
                        ? `
                              <span>
                                ${escapar(refeicao.alimentos)}
                              </span>
                            `
                        : ''
                }

                      </div>

                    </article>
                  `).join('')}
                </div>
              `
                : `
                <div class="aluno-estado-vazio">
                  <i class="fa-solid fa-utensils"></i>

                  <strong>
                    Nenhuma refeição cadastrada ainda
                  </strong>

                  <p>
                    Quando a Maiza cadastrar sua dieta,
                    as informações aparecerão aqui.
                  </p>
                </div>
              `
        }

        </section>


        <!-- ==================================
             EVOLUÇÃO
        =================================== -->

        <section class="secao secao-evolucao">

          <div class="aluno-titulo-secao">
            <span class="aluno-icone-secao">
              <i class="fa-solid fa-chart-line"></i>
            </span>

            <div>
              <h3>Sua evolução</h3>
              <p>Acompanhe os dados da sua última avaliação.</p>
            </div>
          </div>

          ${
            ultimaAval
                ? `
                <div class="evolucao-grid">

                  <article class="evolucao-card">

                    <span class="evolucao-icone">
                      <i class="fa-solid fa-weight-scale"></i>
                    </span>

                    <span class="evolucao-label">
                      Peso registrado
                    </span>

                    <strong>
                      ${
                    ultimaAval.peso != null
                        ? escapar(ultimaAval.peso)
                        : '—'
                }

                      <small>kg</small>
                    </strong>

                  </article>


                  <article class="evolucao-card">

                    <span class="evolucao-icone">
                      <i class="fa-solid fa-heart-pulse"></i>
                    </span>

                    <span class="evolucao-label">
                      IMC
                    </span>

                    <strong>
                      ${
                    ultimaAval.imc != null
                        ? escapar(ultimaAval.imc)
                        : '—'
                }
                    </strong>

                  </article>


                  <article class="evolucao-card evolucao-data">

                    <span class="evolucao-icone">
                      <i class="fa-regular fa-calendar"></i>
                    </span>

                    <span class="evolucao-label">
                      Data da avaliação
                    </span>

                    <strong>
                      ${dataUltimaAval || 'Não informada'}
                    </strong>

                  </article>

                </div>
              `
                : `
                <div class="aluno-estado-vazio">
                  <i class="fa-solid fa-chart-line"></i>

                  <strong>
                    Nenhuma avaliação registrada ainda
                  </strong>

                  <p>
                    Quando uma avaliação for cadastrada,
                    seus dados aparecerão aqui.
                  </p>
                </div>
              `
        }

        </section>


        <!-- ==================================
             ENVIO DE FOTOS E VÍDEOS
        =================================== -->

        <section class="secao secao-envios-aluno">

          <div class="aluno-titulo-secao">
            <span class="aluno-icone-secao">
              <i class="fa-solid fa-camera"></i>
            </span>

            <div>
              <h3>Envie fotos e vídeos</h3>

              <p>
                Compartilhe seus exercícios para a Maiza acompanhar.
              </p>
            </div>
          </div>


          <form
            id="form-envio-aluno"
            class="caixa-form aluno-form-envio"
          >

            <label for="env-legenda">
              Legenda <span>(opcional)</span>
            </label>

            <input
              type="text"
              id="env-legenda"
              name="legenda"
              maxlength="300"
              placeholder="Ex.: agachamento, série 3"
            />


            <label for="env-arquivo">
              Escolha uma foto ou vídeo
            </label>

            <input
              type="file"
              id="env-arquivo"
              name="arquivo"
              accept="image/*,video/*"
              required
            />

            <p class="aluno-ajuda-arquivo">
              Selecione um arquivo do seu dispositivo.
            </p>


            <button
              type="submit"
              class="aluno-btn-enviar"
            >
              <i class="fa-solid fa-paper-plane"></i>
              Enviar arquivo
            </button>

            <div
              id="env-erro"
              class="erro"
              role="status"
              aria-live="polite"
            ></div>

          </form>


          <div class="aluno-envios-titulo">
            <h4>Meus envios</h4>

            <span id="aluno-total-envios">
              ${envios.length}
              ${envios.length === 1 ? 'arquivo' : 'arquivos'}
            </span>
          </div>


          <div
            id="lista-meus-envios"
            class="aluno-lista-envios"
          >
            ${renderEnvios(envios)}
          </div>

        </section>

      </div>
    `;


        // ==================================
        // INICIAR TREINO
        // ==================================

        container.querySelectorAll('.btn-iniciar-treino').forEach(botao => {
            botao.addEventListener('click', () => {
                const exerciciosTreino = treinosAgrupados.get(botao.dataset.nomeTreino);
                if (!exerciciosTreino?.length) return;
                iniciarTreino(exerciciosTreino, async () => {
                    await registrarTreinoConcluido();
                });
            });
        });


        // ==================================
        // ENVIO DE FOTOS E VÍDEOS
        // ==================================

        const formulario = container.querySelector(
            '#form-envio-aluno'
        );

        formulario.addEventListener('submit', async evento => {
            evento.preventDefault();

            const erroEl = container.querySelector('#env-erro');
            const inputArquivo = container.querySelector('#env-arquivo');
            const inputLegenda = container.querySelector('#env-legenda');
            const botao = formulario.querySelector('button[type="submit"]');

            erroEl.textContent = '';

            const arquivo = inputArquivo.files[0];
            const legenda = inputLegenda.value.trim();

            if (!arquivo) {
                erroEl.textContent =
                    'Selecione uma foto ou vídeo antes de enviar.';
                return;
            }

            if (
                !arquivo.type.startsWith('image/') &&
                !arquivo.type.startsWith('video/')
            ) {
                erroEl.textContent =
                    'Selecione um arquivo de imagem ou vídeo.';
                return;
            }

            botao.disabled = true;

            botao.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Enviando arquivo...
      `;

            try {
                const resultado = await enviarArquivo(
                    aluno.id,
                    arquivo,
                    legenda
                );

                if (resultado.error) {
                    erroEl.textContent =
                        'Não foi possível enviar o arquivo: ' +
                        resultado.error.message;

                    return;
                }

                formulario.reset();

                const resultadoEnvios = await listarEnvios(aluno.id);

                if (resultadoEnvios.error) {
                    erroEl.textContent =
                        'O arquivo foi enviado, mas não foi possível atualizar a lista. Atualize a página.';

                    return;
                }

                const enviosAtualizados = resultadoEnvios.data || [];

                container.querySelector(
                    '#lista-meus-envios'
                ).innerHTML = renderEnvios(enviosAtualizados);

                container.querySelector(
                    '#aluno-total-envios'
                ).textContent =
                    `${enviosAtualizados.length} ${
                        enviosAtualizados.length === 1
                            ? 'arquivo'
                            : 'arquivos'
                    }`;

                // Atualiza o cartão de resumo dos envios.
                const cartoesResumo = container.querySelectorAll(
                    '.aluno-resumo-card'
                );

                const cartaoEnvios = cartoesResumo[3];

                if (cartaoEnvios) {
                    const numero = cartaoEnvios.querySelector('strong');
                    const legenda = cartaoEnvios.querySelector('small');

                    if (numero) {
                        numero.textContent = enviosAtualizados.length;
                    }

                    if (legenda) {
                        legenda.textContent =
                            enviosAtualizados.length === 1
                                ? 'arquivo enviado'
                                : 'arquivos enviados';
                    }
                }
            } catch (erro) {
                console.error('Erro ao enviar arquivo:', erro);

                erroEl.textContent =
                    'Ocorreu um erro ao enviar o arquivo. Tente novamente.';
            } finally {
                botao.disabled = false;

                botao.innerHTML = `
          <i class="fa-solid fa-paper-plane"></i>
          Enviar arquivo
        `;
            }
        });

    } catch (erro) {
        console.error('Erro ao montar painel do aluno:', erro);

        container.innerHTML = `
      <section class="secao aluno-erro-cadastro">
        <h3>
          <i class="fa-solid fa-triangle-exclamation"></i>
          Não foi possível carregar seu painel
        </h3>

        <p>
          Ocorreu um problema ao buscar suas informações.
          Atualize a página e tente novamente.
          Se o problema continuar, avise a Maiza.
        </p>
      </section>
    `;
    }
}


/* ========================================
   RENDERIZAR FOTOS E VÍDEOS
======================================== */

function renderEnvios(lista) {
    if (!lista.length) {
        return `
      <div class="aluno-estado-vazio">
        <i class="fa-regular fa-images"></i>

        <strong>
          Você ainda não enviou arquivos
        </strong>

        <p>
          Suas fotos, vídeos e devoluções da Maiza aparecerão aqui.
        </p>
      </div>
    `;
    }

    return lista.map(envio => `
    <article class="card-envio aluno-card-envio">

      ${
        envio.tipo === 'video'
            ? `
            <video
              src="${escapar(envio.asset_url)}"
              controls
              preload="metadata"
              class="midia-envio"
            ></video>
          `
            : `
            <img
              src="${escapar(envio.asset_url)}"
              class="midia-envio"
              alt="Foto enviada para avaliação"
              loading="lazy"
            />
          `
    }

      ${
        envio.legenda
            ? `
            <p class="legenda-envio">
              <i class="fa-regular fa-comment"></i>
              ${escapar(envio.legenda)}
            </p>
          `
            : ''
    }

      ${
        envio.devolucao_texto
            ? `
            <div class="devolucao-pronta">

              <strong>
                <i class="fa-solid fa-comment-dots"></i>
                Devolução da Maiza
              </strong>

              <p>
                ${escapar(envio.devolucao_texto)}
              </p>

            </div>
          `
            : `
            <div class="aluno-aguardando-retorno">
              <i class="fa-regular fa-clock"></i>
              Aguardando retorno da Maiza.
            </div>
          `
    }

    </article>
  `).join('');
}


/* ========================================
   FORMATAR DATA
======================================== */

function formatarData(data) {
    if (!data) return '';

    const dataObj = new Date(data);

    if (Number.isNaN(dataObj.getTime())) {
        return '';
    }

    return dataObj.toLocaleDateString('pt-BR');
}


/* ========================================
   PROTEGER TEXTO EXIBIDO NA PÁGINA
======================================== */

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