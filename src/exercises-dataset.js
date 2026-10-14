export const EXERCISES_DATASET_SOURCE =
  'https://github.com/plataformafitness/exercises-library';
export const EXERCISES_DATASET_LICENSE =
  'https://github.com/plataformafitness/exercises-library/blob/main/LICENSE';

let exerciciosPromise = null;

const SINONIMOS = {
  peito: ['chest', 'pectorals'],
  costas: ['back', 'lats'],
  ombros: ['shoulders', 'delts'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  pernas: ['legs', 'quads', 'hamstrings'],
  gluteos: ['glutes'],
  halteres: ['dumbbell'],
  barra: ['barbell'],
  polia: ['cable'],
  maquina: ['machine'],
  'peso corporal': ['body weight'],
  agachamento: ['squat'],
  supino: ['bench press', 'chest press'],
  remada: ['row'],
  'levantamento terra': ['deadlift'],
  flexao: ['push up'],
  'barra fixa': ['pull up'],
  puxada: ['lat pulldown'],
  rosca: ['biceps curl'],
  afundo: ['lunge'],
  desenvolvimento: ['shoulder press'],
  abdominal: ['abs', 'waist', 'core', 'sit up', 'crunch'],
  abdomen: ['abs', 'waist', 'core', 'sit up', 'crunch'],
};

function normalizar(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

async function carregarExercicios() {
  if (!exerciciosPromise) {
    exerciciosPromise = Promise.all([
      import('./data/exercises-1.json'),
      import('./data/exercises-2.json'),
      import('./data/exercises-3.json'),
    ]).then(partes => partes.flatMap(parte => parte.default))
      .catch(erro => {
        exerciciosPromise = null;
        throw erro;
      });
  }

  return exerciciosPromise;
}

export async function pesquisarExercicios(termo, limite = 24) {
  const busca = normalizar(termo);
  if (!busca) return [];
  const termos = [busca, ...(SINONIMOS[busca] || [])];
  const exercicios = await carregarExercicios();

  return exercicios
    .filter(exercicio => [
      exercicio.name,
      exercicio.bodyPart,
      exercicio.equipment,
      exercicio.target,
      exercicio.muscleGroup,
    ].some(valor => termos.some(item => normalizar(valor).includes(item))))
    .slice(0, limite);
}
