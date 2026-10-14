/**
 * Reconhecimento de cidades brasileiras em texto livre (base oficial do IBGE, 5.571 municípios).
 * Serve para ler cotações em QUALQUER layout: onde houver nomes de cidades (com ou sem UF, com ou sem acento,
 * em maiúsculas ou minúsculas), o interpretador consegue montar origem → destino.
 */
import { MUNICIPIOS } from './municipios';

export interface CidadeAchada {
  nome: string; // grafia oficial
  uf: string | null; // se informada no texto ou única no país
  ini: number; // posição no texto original
  fim: number;
}

export const semAcento = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’`´]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const mapa = new Map<string, Array<{ nome: string; uf: string }>>();
let maxPalavras = 1;
function registra(nome: string, uf: string) {
  const k = semAcento(nome);
  if (!k) return;
  const arr = mapa.get(k) ?? [];
  if (!arr.some((x) => x.uf === uf && x.nome === nome)) arr.push({ nome, uf });
  mapa.set(k, arr);
  maxPalavras = Math.max(maxPalavras, k.split(' ').length);
}
for (const par of MUNICIPIOS.split(';')) {
  const i = par.lastIndexOf('|');
  registra(par.slice(0, i), par.slice(i + 1));
}
// Locais muito usados em frete que não são municípios (distritos/terminais) e apelidos comuns
registra('Miritituba', 'PA');
registra('Itaqui', 'MA'); // (Itaqui/RS também existe como município; o porto de São Luís entra pela UF informada)
const APELIDOS: Record<string, [string, string]> = {
  lrv: ['Lucas do Rio Verde', 'MT'],
  'lucas rv': ['Lucas do Rio Verde', 'MT'],
  'porto de santos': ['Santos', 'SP'],
  'porto de paranagua': ['Paranaguá', 'PR'],
  'porto de itaqui': ['Itaqui', 'MA'],
  'sao luis': ['São Luís', 'MA'],
};
for (const [k, [n, u]] of Object.entries(APELIDOS)) {
  const arr = mapa.get(k) ?? [];
  arr.push({ nome: n, uf: u });
  mapa.set(k, arr);
}

const UFS = new Set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '));
// Palavras comuns que também são nome de município de uma palavra só: só valem se vierem com UF ou em maiúscula clara
const COMUNS = new Set(['bonito', 'formosa', 'planalto', 'esperanca', 'alegria', 'prata', 'ouro', 'salto', 'barra', 'guarani', 'agua', 'campos', 'pedra', 'cruz', 'jacare', 'cristalina', 'luz', 'paz', 'serra', 'mata', 'brejo', 'lagoa', 'santa', 'sao', 'rio', 'nova', 'novo', 'alto', 'boa', 'bom']);

const UF_PADRAO: Record<string, string> = { itaqui: 'MA' };

/** Resolve a UF de um nome que existe em vários estados; null se ambíguo e sem UF informada. */
export function resolveCidade(chave: string, ufInformada?: string | null): { nome: string; uf: string | null } | null {
  const arr = mapa.get(chave);
  if (!arr?.length) return null;
  if (ufInformada) {
    const hit = arr.find((x) => x.uf === ufInformada);
    if (hit) return { nome: hit.nome, uf: hit.uf };
    return { nome: arr[0].nome, uf: ufInformada };
  }
  if (arr.length === 1) return { nome: arr[0].nome, uf: arr[0].uf };
  const padrao = UF_PADRAO[chave]; // ambíguo, mas no frete de grãos quase sempre é este
  if (padrao) return { nome: arr[0].nome, uf: padrao };
  return { nome: arr[0].nome, uf: null };
}

/** Nome de lugar digitado ("PARANAGUA-PR", "paranagua") → "Paranaguá/PR" quando reconhecido; senão devolve igual. */
export function canonicaLugar(texto: string): string {
  const m = /^(.*?)\s*\/\s*([A-Z]{2})$/.exec(texto.trim());
  const base = m ? m[1] : texto.trim();
  const uf = m && UFS.has(m[2]) ? m[2] : null;
  const r = resolveCidade(semAcento(base), uf);
  if (!r) return texto;
  return r.uf ? `${r.nome}/${r.uf}` : r.nome;
}

/**
 * Acha as cidades mencionadas numa linha, na ordem em que aparecem.
 * Nomes de uma palavra em minúsculas só valem se houver UF junto ou se a linha tiver pelo menos 2 cidades.
 */
export function acharCidades(linha: string): CidadeAchada[] {
  const toks: Array<{ t: string; n: string; ini: number; fim: number }> = [];
  const re = /[A-Za-zÀ-ÿ0-9'’]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(linha))) toks.push({ t: m[0], n: semAcento(m[0]), ini: m.index, fim: m.index + m[0].length });
  const achadas: Array<CidadeAchada & { forte: boolean }> = [];
  let i = 0;
  while (i < toks.length) {
    let casou = false;
    for (let n = Math.min(maxPalavras, toks.length - i); n >= 1 && !casou; n--) {
      const chave = toks
        .slice(i, i + n)
        .map((x) => x.n)
        .filter(Boolean)
        .join(' ');
      if (!mapa.has(chave)) continue;
      const proximo = toks[i + n];
      const ufTxt = proximo && proximo.t.length === 2 && UFS.has(proximo.t.toUpperCase()) ? proximo.t.toUpperCase() : null;
      const capital = /^[A-ZÀ-Ý]/.test(toks[i].t);
      const forte = n > 1 || !!ufTxt || (capital && !COMUNS.has(chave));
      const r = resolveCidade(chave, ufTxt);
      if (!r) continue;
      achadas.push({ nome: r.nome, uf: r.uf, ini: toks[i].ini, fim: toks[i + n - 1].fim + (ufTxt ? proximo.fim - toks[i + n - 1].fim : 0), forte });
      i += n + (ufTxt ? 1 : 0);
      casou = true;
    }
    if (!casou) i++;
  }
  // nomes "fracos" (1 palavra, minúscula/comum) só entram se houver ao menos 2 cidades na linha
  const fortes = achadas.filter((a) => a.forte);
  const lista = achadas.length >= 2 ? achadas : fortes;
  return lista.map(({ nome, uf, ini, fim }) => ({ nome, uf, ini, fim }));
}

export const fmtCidade = (c: { nome: string; uf: string | null }): string => (c.uf ? `${c.nome}/${c.uf}` : c.nome);
