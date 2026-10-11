// ==============================================================
// CRONÔMETRO / MODO "INICIAR TREINO" — usado na visão do ALUNO
// O HTML do modal fica no index.html (id="treino-modal").
// ==============================================================

const CIRCUNFERENCIA = 339.3; // 2 * pi * 54 (raio do círculo no SVG)
const MAX_VISUAL = 90;        // acima disso o anel só fica "cheio"
const DESCANSO_PADRAO = 60;

let exercicios = [];
let indice = 0;
let segundos = DESCANSO_PADRAO;
let intervalo = null;
let rodando = false;
let aoConcluir = null;

export function iniciarTreino(listaExercicios, callbackConcluir) {
    exercicios = listaExercicios;
    indice = 0;
    aoConcluir = callbackConcluir || null;
    document.getElementById('treino-modal').style.display = 'flex';
    renderPasso();
}

function renderPasso() {
    const t = exercicios[indice];
    document.getElementById('tw-progresso').textContent = `Exercício ${indice + 1} de ${exercicios.length}`;
    document.getElementById('tw-nome').textContent = t.exercicio;
    document.getElementById('tw-detalhes').textContent =
        `${t.series || '-'} x ${t.reps || '-'}${t.carga ? ' · ' + t.carga : ''}`;
    document.getElementById('tw-como').textContent = t.como_executar || '';
    clearInterval(intervalo);
    rodando = false;
    segundos = DESCANSO_PADRAO;
    atualizarTela();
    setBotaoPlay(false);
}

function atualizarTela() {
    const m = Math.floor(segundos / 60);
    const s = String(segundos % 60).padStart(2, '0');
    document.getElementById('tw-timer').textContent = `${m}:${s}`;

    const fracao = Math.min(1, segundos / MAX_VISUAL);
    const anel = document.getElementById('tw-anel');
    anel.style.strokeDashoffset = CIRCUNFERENCIA * (1 - fracao);
    anel.classList.toggle('quase-acabando', segundos <= 10 && segundos > 0);
}

function setBotaoPlay(estaRodando) {
    document.getElementById('tw-play-btn').innerHTML = estaRodando
        ? '<i class="fa-solid fa-pause"></i> Pausar'
        : '<i class="fa-solid fa-play"></i> Descanso';
}

// Funções chamadas pelos botões do modal (HTML estático no index.html)
window.treinoTimerToggle = function () {
    rodando = !rodando;
    setBotaoPlay(rodando);
    if (rodando) {
        intervalo = setInterval(() => {
            if (segundos > 0) {
                segundos--;
                atualizarTela();
            } else {
                clearInterval(intervalo);
                rodando = false;
                setBotaoPlay(false);
            }
        }, 1000);
    } else {
        clearInterval(intervalo);
    }
};

window.treinoTimerAjustar = function (delta) {
    segundos = Math.max(0, segundos + delta);
    atualizarTela();
};

window.treinoProximo = async function () {
    indice++;
    if (indice >= exercicios.length) {
        if (aoConcluir) await aoConcluir();
        window.fecharTreino();
        alert('Treino concluído! Bom trabalho.');
        return;
    }
    renderPasso();
};

window.fecharTreino = function () {
    clearInterval(intervalo);
    rodando = false;
    document.getElementById('treino-modal').style.display = 'none';
};