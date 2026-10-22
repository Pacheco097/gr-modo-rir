/**
 * Padronização do tipo de veículo. As cotações chegam com descrições diferentes para o mesmo caminhão
 * ("Bitrem Graneleiro", "BITREM / LS GRANELEIRO", "bitrem"). Todas viram a mesma FAMÍLIA, para que o frete
 * novo de uma rota substitua o antigo mesmo quando a descrição mudou.
 */
const sa = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export const VEICULOS_CANONICOS = ['Bitrem', 'Rodotrem', 'Rodocaçamba', '9 Eixos', 'Vanderléia', 'Truck', 'Carreta'];

const PEQUENAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
const titulo = (s: string) =>
  s
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((w, i) => (i > 0 && PEQUENAS.has(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');

/** Devolve a família do veículo (Bitrem, Rodocaçamba, 9 Eixos, Carreta...) ou o texto em formato de título se desconhecido. */
export function veiculoCanonico(v?: string | null): string | null {
  const t = sa(v ?? '');
  if (!t) return null;
  if (/bi ?-?trem/.test(t)) return 'Bitrem';
  if (/rodo ?-?trem/.test(t)) return 'Rodotrem';
  if (/rodo ?-?cacamba|cacamba|basculante/.test(t)) return 'Rodocaçamba';
  if (/\b(9|nove) ?eixos?/.test(t)) return '9 Eixos';
  if (/vanderleia/.test(t)) return 'Vanderléia';
  if (/truck/.test(t)) return 'Truck';
  if (/carreta|\bls\b|graneleir|simples/.test(t)) return 'Carreta';
  return titulo(v as string);
}
