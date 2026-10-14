import imagensLicenciadas from './data/wger-images.json';

export const WGER_SOURCE = 'https://wger.de/en/software/api';

function normalizar(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

export function pesquisarImagensLicenciadas(termo, limite = 24) {
  const busca = normalizar(termo);
  if (!busca) return [];

  return imagensLicenciadas
    .filter(exercicio => [
      exercicio.name,
      exercicio.category,
      exercicio.equipment,
      exercicio.description,
    ].some(valor => normalizar(valor).includes(busca)))
    .slice(0, limite);
}
