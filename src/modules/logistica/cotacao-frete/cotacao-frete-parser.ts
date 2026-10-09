/**
 * Interpretação de cotações de frete coladas de conversas (WhatsApp etc.).
 *
 * 1) Se `ANTHROPIC_API_KEY` estiver configurada, usa o Claude para extrair (mais preciso com texto livre).
 * 2) Senão (ou se a chamada falhar), cai no interpretador por REGRAS (gratuito; entende listas, blocos e linhas).
 *
 * O resultado é SEMPRE uma sugestão: o usuário confere e confirma antes de gravar.
 */
import { Logger } from '@nestjs/common';

export interface CotacaoSugerida {
  grupo?: string;
  transportadora: string;
  origem: string;
  destino: string;
  produto?: string;
  veiculo?: string;
  valor: number;
  unidade: string;
  dataCotacao: string;
  observacao?: string;
  textoOrigem?: string;
}

export interface ResultadoInterpretacao {
  fonte: 'ia' | 'regras';
  itens: CotacaoSugerida[];
  avisos: string[];
  /** Linhas com número que não viraram cotação (para o usuário ver o que ficou de fora). */
  naoLidas?: string[];
}

const logger = new Logger('CotacaoFreteParser');

const pad = (n: number) => String(n).padStart(2, '0');
export function hojeIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function isoDe(dia: string, mes: string, ano: string): string {
  let a = Number(ano);
  if (a < 100) a += 2000;
  return `${a}-${pad(Number(mes))}-${pad(Number(dia))}`;
}
function numBR(s: string): number {
  return Number(s.replace(/\./g, '').replace(',', '.'));
}
function limpa(s: string): string {
  return s
    .replace(/^[\s*_•\-–—:>→]+|[\s*_•\-–—:>→,;.]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ───────────────────────── REGRAS ─────────────────────────
// Interpretador gratuito (sem IA) — genérico, não depende de um formato único. Reconhece, em qualquer mistura:
//  • linha única:       "Sorriso x Paranaguá R$ 410,00"  /  "Sinop>Santos 300"  /  "de Sinop para Santos - R$ 300/t - bitrem"
//  • lista por origem:  "ORIGEM: NOVA MUTUM – MT" + "🚛 Nova Crixás – GO" + "2 rodocaçambas | 08/10 | R$ 257,30"
//  • blocos:            "➡️ PALMEIRA-PR" / "💰 R$ 90,00 (CNPJ)" / "🚛 BITREM GRANELEIRO"
//  • campos rotulados:  "Origem: X" / "Destino: Y" / "Produto: Z" / "Veículo: W" / "Valor: 130,00"
//  • preço antes do destino ("R$ 300" na linha de cima, cidade na de baixo)
//  • tabelas coladas (Excel/site, colunas por TAB, "|" ou 3+ espaços), com ou sem cabeçalho
// Cada PREÇO encontrado vira uma cotação; destino/origem vêm da linha, das linhas vizinhas ou de um cabeçalho.

const UFS = new Set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '));
const PEQUENAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
const EMOJIS = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{2B00}-\u{2BFF}\u{25A0}-\u{25FF}]/gu;
const CABECALHO = /^\[?(\d{1,2})\/(\d{1,2})\/(\d{2,4})[,\s]+\d{1,2}:\d{2}(?::\d{2})?\]?\s*[-–]?\s*([^:]{1,60}?):\s*(.*)$/;
const DATA_CURTA = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g;
const VEICULO = /(9\s*eixos(?:\s+graneleiro)?|bi-?trem(?:\s*\/\s*ls)?(?:\s+graneleiro)?|rodo\s*-?\s*ca[cç]ambas?|rodotrem|ls\s+graneleiro|carreta(?:\s+graneleira)?|vanderl[eé]ia|truck|graneleiro)/i;
const CONTAGEM = /\b(\d{1,2})\s*(?:ve[ií]culos?|rodo\s*-?\s*ca[cç]ambas?|bi-?trem(?:s)?|carretas?|cargas?|caminh[oõ]es?)\b/i;
const PRODUTO = /^(farelo(?:\s+de\s+\w+)?|soja|milho|sorgo|trigo|fertilizantes?|calc[aá]rio|a[cç][uú]car|caroço de algod[aã]o)$/i;
const TITULO_TRANSP = /(transportes?|transportadora|log[ií]stica|express|cargas)\b/i;
const RUIDO = /^(frete\s+liberado|fretes?\s+liberados?|carregamento\s+(hoje|amanh[aã])|bom\s+dia|boa\s+(tarde|noite)|aten[cç][aã]o|dispon[ií]vel|obs\b|valor\b\s*[:\-]?\s*$|filial\b)/i;
const CONTATOS = /^(contatos?|whats\s*app|whatsapp|tel\.?|fone|telefone|chame|clique|link)\b/i;
const FONE = /\(?\b\d{2}\)?\s?9?\d{4}[-\s]?\d{4}\b/;
// Frase corrida: "tenho carga saindo de Sorriso pra Paranaguá, pago 310" (cidades começam com maiúscula)
const CIDADE = "[A-ZÀ-Ý][A-Za-zÀ-ÿ'.-]*(?:\\s+(?:d[aeo]s?\\s+)?[A-ZÀ-Ý][A-Za-zÀ-ÿ'.-]*){0,3}";
const PROSA = new RegExp('(?:\\bde|\\bdo|\\bda|\\bem|saindo\\s+de)\\s+(' + CIDADE + ')\\s+(?:pra|para|até|ate|→|->|x|X)\\s+(' + CIDADE + ')');
const SEP_LINHA = /^(?:x|→|->|=>|>|›|»|para|pra)$/i;
const SEPARADOR_ROTA = /\s*(?:→|->|=>|›|»)\s*|\s*>\s*|\s+(?:x|X|para|pra|até|ate)\s+|\s+[–—-]\s+|\s+a\s+(?=[A-ZÀ-Ý])/;
const ROTULO = /^(origem|de|coleta|sa[ií]da|destino|para|entrega|descarga|produto|mercadoria|carga|ve[ií]culo|tipo|equipamento|rota|transportadora|empresa|motorista|agregado)\s*[:=]\s*(.+)$/i;
const COL_KW: Array<[RegExp, string]> = [
  [/^origem|^coleta|^saida|^saída|^de$/i, 'origem'],
  [/^destino|^entrega|^para$|^descarga|^cidade/i, 'destino'],
  [/^uf$|^estado/i, 'uf'],
  [/^cliente|^embarcador|^remetente|^favorecido/i, 'cliente'],
  [/^ve[ií]culo|^tipo|^equipamento|^carroceria/i, 'veiculo'],
  [/^carregamento|^data|^dia\b/i, 'data'],
  [/^qn?t|^carga|^qtd|^quantidade|^viagens/i, 'qtd'],
  [/^frete|^valor|^pre[cç]o|^r\$/i, 'valor'],
  [/^produto|^mercadoria/i, 'produto'],
  [/^transportadora|^empresa/i, 'transp'],
  [/^rota/i, 'rota'],
];

function nomeProprio(s: string): string {
  return s
    .trim()
    .replace(/\s{2,}/g, ' ')
    .split(' ')
    .map((p, i) => {
      if (/^[A-Z]{2}$/.test(p) && UFS.has(p)) return p;
      const m = p.toLowerCase();
      if (i > 0 && PEQUENAS.has(m)) return m;
      return m.replace(/(^|[\/\-])(\p{L})/gu, (_x, a, b) => a + b.toUpperCase());
    })
    .join(' ');
}
/** "PALMEIRA-PR" / "Nova Crixás – GO" → "Palmeira/PR" / "Nova Crixás/GO". */
function lugar(bruto: string): string {
  const s = bruto.replace(/[|•*_]+/g, ' ').replace(/^(?:de|para|pra|em)\s+/i, '').replace(/^[\s\-–—:>→,;.]+|[\s\-–—:>→,;.]+$/g, '').replace(/\s{2,}/g, ' ').trim();
  const m = /^(.*?)\s*[-–—\/,]\s*([A-Za-z]{2})$/.exec(s);
  if (m && UFS.has(m[2].toUpperCase()) && m[1].trim()) return nomeProprio(m[1]) + '/' + m[2].toUpperCase();
  return nomeProprio(s);
}
function limpaLinha(s: string): string {
  return s.replace(EMOJIS, ' ').trim();
}
function veiculoNorm(v: string): string {
  const x = v.replace(/rodo\s*-?\s*ca[cç]ambas?/i, 'Rodocaçamba').replace(/bi-?trem/i, 'Bitrem');
  return nomeProprio(x).replace(/\bLs\b/g, 'LS');
}
function temLetras(s: string): boolean {
  return /[A-Za-zÀ-ÿ]{3,}/.test(s);
}
function plausivel(valor: number, unidade: string): boolean {
  return unidade === 'R$/sc' ? valor >= 2 && valor <= 200 : valor >= 20 && valor <= 5000;
}

interface CandidatoPreco {
  valor: number;
  unidade: string;
  ini: number;
  fim: number;
}
function acharPreco(linha: string, temRota: boolean): CandidatoPreco | null {
  const re = /(R\$\s*|valor\s*[:\-]?\s*|frete\s*[:\-]?\s*|pre[cç]o\s*[:\-]?\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d{1,4}[,.]\d{1,2}|\d{2,4})(?:\s*(?:reais|conto|pila|,-|\.-))?(?:\s*(?:\/|por|a)?\s*(t|ton|tons|tn|tonelada|sc|saca|sacas|sac)\b)?(?![\d,]|\.\d)/gi;
  let m: RegExpExecArray | null;
  let melhor: CandidatoPreco | null = null;
  while ((m = re.exec(linha))) {
    const sufixo = /reais|conto|pila|,-|\.-/i.test(m[0]);
    const prefixo = !!m[1] || sufixo;
    const decimal = /[,.]\d{1,2}$/.test(m[2]);
    if (!prefixo && !decimal && !temRota) continue; // inteiro solto só vale em linha de rota ("... - 405")
    const valor = Number(m[2].replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.'));
    const unidade = /^(sc|saca|sacas|sac)$/i.test(m[3] ?? '') ? 'R$/sc' : 'R$/t';
    if (!plausivel(valor, unidade)) continue;
    const cand = { valor, unidade, ini: m.index, fim: m.index + m[0].length };
    if (prefixo) return cand;
    if (!melhor) melhor = cand;
  }
  return melhor;
}
function partirRota(resto: string): [string, string] | null {
  const partes = resto.split(SEPARADOR_ROTA).map((p) => p.trim()).filter((p) => temLetras(p));
  if (partes.length < 2) return null;
  if (/^[A-Za-z]{2}$/.test(partes[1]) && UFS.has(partes[1].toUpperCase())) return null; // "Nova Crixás – GO" não é rota
  return [partes[0], partes[1]];
}
function numeroCelula(cel: string): number | null {
  const m = /(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[,.]\d{1,2})?)/.exec(cel.replace(/R\$/g, ' '));
  if (!m) return null;
  return Number(m[1].replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.'));
}

export function interpretarPorRegras(texto: string, grupo?: string, dataPadrao?: string, transportadoraPadrao?: string): ResultadoInterpretacao {
  const avisos: string[] = [];
  const itens: CotacaoSugerida[] = [];
  const naoLidas: string[] = [];
  const padrao = dataPadrao && /^\d{4}-\d{2}-\d{2}$/.test(dataPadrao) ? dataPadrao : hojeIso();
  const ctx = { origem: '', transp: '', autor: '', data: padrao };
  let buf: string[] = [];
  let pend = null as CotacaoSugerida | null;
  let incompleto = null as CotacaoSugerida | null; // preço visto antes do destino
  let produtoBloco = '';
  let kv: { destino?: string; veiculo?: string } = {};
  let pulandoContatos = false;
  let colmap: Record<number, string> | null = null;

  const transpAtual = (extra?: string) => extra || ctx.transp || ctx.autor || (transportadoraPadrao ? nomeProprio(transportadoraPadrao) : '') || '(informar)';
  const empurra = (it: CotacaoSugerida) => {
    itens.push(it);
    pend = it;
  };
  const resetBloco = () => {
    buf = [];
    pend = null;
    incompleto = null;
    produtoBloco = '';
    kv = {};
    pulandoContatos = false;
  };

  for (const bruta of texto.split(/\r?\n/)) {
    let linha = bruta.replace(/ /g, ' ').trimEnd();
    if (!linha.trim()) {
      resetBloco();
      continue;
    }
    const h = CABECALHO.exec(linha.trim());
    if (h) {
      ctx.data = isoDe(h[1], h[2], h[3]);
      ctx.autor = nomeProprio(limpa(h[4]));
      linha = h[5];
      buf = [];
      pend = null;
      incompleto = null;
      if (!linha.trim()) continue;
    }
    let c = limpaLinha(linha);
    if (!c) continue;
    if (CONTATOS.test(c)) {
      pulandoContatos = true;
      continue;
    }
    if (pulandoContatos || (FONE.test(c) && !/R\$/.test(c))) continue;

    // ── Tabela colada (TAB, "|" ou 3+ espaços entre colunas) ──
    const celulas = c.split(/\t+|\s{3,}|\s*\|\s*/).map((x) => x.trim()).filter(Boolean);
    if (celulas.length >= 4) {
      const kinds = celulas.map((x) => COL_KW.find(([re]) => re.test(x.replace(/[^\p{L}$]/gu, '')))?.[1] ?? '');
      if (kinds.filter(Boolean).length >= 3 && !celulas.some((x) => acharPreco(x, false))) {
        colmap = {};
        kinds.forEach((k, i) => k && (colmap![i] = k));
        continue;
      }
      let cel: Record<string, string> = {};
      if (colmap) celulas.forEach((x, i) => colmap![i] && (cel[colmap![i]] = x));
      else {
        // sem cabeçalho: valor = última célula numérica; datas/veículo/UF reconhecidos; 2 últimos textos = origem, destino
        cel = {};
        const textos: string[] = [];
        for (const x of celulas) {
          if (/^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/.test(x)) cel.data = x;
          else if (/^[A-Za-z]{2}$/.test(x) && UFS.has(x.toUpperCase())) cel.uf = x.toUpperCase();
          else if (VEICULO.test(x)) cel.veiculo = x;
          else if (/^\d{1,2}$/.test(x)) cel.qtd = x;
          else if (/^(R\$\s*)?\d[\d.,]*$/.test(x)) cel.valor = x;
          else if (temLetras(x)) textos.push(x);
        }
        if (textos.length >= 2) {
          cel.origem = textos[textos.length - 2];
          cel.destino = textos[textos.length - 1];
          if (textos.length >= 3) cel.cliente = textos[textos.length - 3];
        } else if (textos.length === 1) cel.destino = textos[0];
      }
      const v = cel.valor != null ? numeroCelula(cel.valor) : null;
      const un = /sc|saca/i.test(cel.valor ?? '') ? 'R$/sc' : 'R$/t';
      if (v != null && plausivel(v, un) && cel.destino) {
        const obs: string[] = [];
        if (cel.cliente) obs.push('cliente ' + nomeProprio(cel.cliente));
        if (cel.data) obs.push('carregamento ' + cel.data);
        if (cel.qtd) obs.push(cel.qtd + (Number(cel.qtd) > 1 ? ' veículos' : ' veículo'));
        const dest = lugar(cel.destino + (cel.uf && !/[-\/,]\s*[A-Za-z]{2}$/.test(cel.destino) ? '-' + cel.uf : ''));
        const orig = cel.origem ? lugar(cel.origem) : ctx.origem;
        empurra({
          grupo,
          transportadora: transpAtual(cel.transp ? nomeProprio(cel.transp) : ''),
          origem: orig || '(informar)',
          destino: dest,
          produto: cel.produto ? nomeProprio(cel.produto) : produtoBloco || undefined,
          veiculo: cel.veiculo ? veiculoNorm(cel.veiculo) : undefined,
          valor: v,
          unidade: un,
          dataCotacao: ctx.data,
          observacao: obs.length ? obs.join(' · ') : undefined,
          textoOrigem: bruta.trim().slice(0, 500),
        });
        continue;
      }
      if (/\d/.test(c)) naoLidas.push(bruta.trim().slice(0, 140));
      continue;
    }
    colmap = null;

    // "Transportadora XYZ: Sorriso x Santos 310" → transportadora explícita só desta linha
    let transpLinha = '';
    const tr = /^(?:transportadora|transp\.?|empresa)\s*[:\-]?\s*([^:]{2,40}?)\s*[:\-]\s*(.+)$/i.exec(c);
    if (tr) {
      transpLinha = nomeProprio(limpa(tr[1]));
      c = tr[2];
    }

    // Campos rotulados / cabeçalho de origem
    const og = /^(?:origem|saindo\s+de|sa[ií]da\s+de|coleta(?:\s+em)?)\s*[:\-–=]?\s*(.+)$/i.exec(c);
    if (og) {
      ctx.origem = lugar(og[1]);
      buf = [];
      continue;
    }
    const rot = ROTULO.exec(c);
    if (rot && !acharPreco(rot[2], false)) {
      const k = rot[1].toLowerCase();
      const val = rot[2].trim();
      if (/^(transportadora|empresa|motorista|agregado)$/.test(k)) ctx.transp = nomeProprio(val);
      else if (/^(destino|para|entrega|descarga)$/.test(k)) kv.destino = lugar(val);
      else if (/^(produto|mercadoria|carga)$/.test(k)) produtoBloco = nomeProprio(val);
      else if (/^(ve[ií]culo|tipo|equipamento)$/.test(k)) kv.veiculo = VEICULO.test(val) ? veiculoNorm(VEICULO.exec(val)![0]) : nomeProprio(val);
      else if (k === 'rota') buf.push(val);
      else if (/^(de)$/.test(k)) ctx.origem = lugar(val);
      continue;
    }

    const temRota = !!partirRota(c.replace(/R\$\s*[\d.,]+/g, ' '));
    const preco = acharPreco(c, temRota);

    if (!preco) {
      // Título da transportadora (ex.: "1500 TRANSPORTES", "MOVEMOS TRANSPORTES")
      if (TITULO_TRANSP.test(c) && c.length <= 60 && !/\d{2}\/\d{2}/.test(c) && !partirRota(c)) {
        ctx.transp = nomeProprio(limpa(c));
        continue;
      }
      if (RUIDO.test(c)) continue;
      const soVeiculo = VEICULO.exec(c);
      if (soVeiculo && c.length <= soVeiculo[0].length + 22 && !partirRota(c)) {
        if (pend && !pend.veiculo) pend.veiculo = veiculoNorm(soVeiculo[0]);
        else if (incompleto && !incompleto.veiculo) incompleto.veiculo = veiculoNorm(soVeiculo[0]);
        else kv.veiculo = veiculoNorm(soVeiculo[0]);
        continue;
      }
      if (PRODUTO.test(c)) {
        produtoBloco = nomeProprio(c);
        if (pend && !pend.produto) pend.produto = produtoBloco;
        continue;
      }
      // Preço já visto, destino vem agora ("R$ 300" / "Santos")
      if (incompleto && temLetras(c) && c.length <= 60) {
        const rt = partirRota(c);
        if (rt) {
          incompleto.origem = lugar(rt[0]);
          incompleto.destino = lugar(rt[1]);
        } else incompleto.destino = lugar(c);
        empurra(incompleto);
        incompleto = null;
        continue;
      }
      buf.push(c);
      if (buf.length > 6) buf.shift();
      continue;
    }

    // ── linha com PREÇO → uma cotação ──
    if (incompleto) {
      naoLidas.push(incompleto.textoOrigem ?? '');
      incompleto = null;
    }
    const antes = c.slice(0, preco.ini);
    const depois = c.slice(preco.fim);
    let resto = (antes + ' ' + depois).replace(/R\$/g, ' ');
    const obs: string[] = [];
    const dm = new RegExp(DATA_CURTA.source).exec(resto);
    if (dm) obs.push('carregamento ' + dm[0]);
    resto = resto.replace(DATA_CURTA, ' ');
    const vm = VEICULO.exec(resto);
    const veiculo = vm ? veiculoNorm(vm[0]) : kv.veiculo;
    const cm = CONTAGEM.exec(resto);
    if (cm) obs.push(cm[1] + (Number(cm[1]) > 1 ? ' veículos' : ' veículo'));
    const doc = /\b(cnpj|cpf)\b/i.exec(resto);
    if (doc) obs.push(doc[1].toUpperCase());
    resto = resto
      .replace(CONTAGEM, ' ')
      .replace(VEICULO, ' ')
      .replace(/ve[ií]culos?/gi, ' ')
      .replace(/\(?\b(cnpj|cpf)\b\)?/gi, ' ')
      .replace(/[|•]+/g, ' ')
      .replace(/^(?:rota|cota[cç][aã]o)\s*[:\-]?\s*/i, ' ')
      .replace(/\b(?:valor|frete|pre[cç]o)\b\s*[:\-]?/gi, ' ')
      .replace(/\b(?:a\s+tonelada|por\s+tonelada|\/\s*t(?:on)?)\b/gi, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    let origem = ctx.origem;
    let destino = kv.destino ?? '';
    const rotaSimples = !destino && resto ? partirRota(resto) : null;
    const longa = !!rotaSimples && (rotaSimples[0].split(/\s+/).length > 4 || rotaSimples[1].split(/\s+/).length > 4);
    const prosa = !destino && (longa || (!rotaSimples && resto.split(/\s+/).length > 4)) ? PROSA.exec(resto) : null;
    const rota = prosa ? null : rotaSimples;
    if (prosa) {
      origem = lugar(prosa[1]);
      destino = lugar(prosa[2]);
    } else if (rota) {
      origem = lugar(rota[0]);
      destino = lugar(rota[1]);
    } else if (!destino && temLetras(resto)) {
      destino = lugar(resto); // "Palmeira-PR R$ 90,00" na mesma linha
    } else if (!destino && buf.length) {
      const k = buf.findIndex((b) => SEP_LINHA.test(b));
      const ult = buf[buf.length - 1];
      const rUlt = partirRota(ult);
      if (k > 0 && k < buf.length - 1) {
        origem = lugar(buf[k - 1]);
        destino = lugar(buf[k + 1]);
      } else if (rUlt) {
        origem = lugar(rUlt[0]);
        destino = lugar(rUlt[1]);
      } else {
        destino = lugar(ult);
      }
    }
    buf = [];
    const item: CotacaoSugerida = {
      grupo,
      transportadora: transpAtual(transpLinha),
      origem: origem || '(informar)',
      destino,
      produto: produtoBloco || undefined,
      veiculo,
      valor: preco.valor,
      unidade: preco.unidade,
      dataCotacao: ctx.data,
      observacao: obs.length ? obs.join(' · ') : undefined,
      textoOrigem: bruta.trim().slice(0, 500),
    };
    kv = {};
    if (!destino) {
      incompleto = item; // talvez o destino venha na linha seguinte
      continue;
    }
    empurra(item);
  }
  if (incompleto) naoLidas.push((incompleto as CotacaoSugerida).textoOrigem ?? '');
  if (!itens.length) avisos.push('Não reconheci cotações nesse texto. Cada cotação precisa de um valor (ex.: R$ 257,30) e um destino.');
  if (naoLidas.length) avisos.push(`${naoLidas.length} linha(s) com número não viraram cotação (veja abaixo).`);
  if (itens.some((i) => i.transportadora === '(informar)')) avisos.push('Informe a transportadora no campo acima ou na conferência.');
  if (itens.some((i) => i.origem === '(informar)')) avisos.push('Algumas cotações ficaram sem origem — preencha na conferência.');
  return { fonte: 'regras', itens, avisos, naoLidas: naoLidas.slice(0, 15) };
}

// ───────────────────────── IA (Claude, texto e imagens) ─────────────────────────
const SISTEMA = `Você extrai cotações / liberações de frete rodoviário (grãos, farelo, etc.) de TEXTOS e IMAGENS (cartazes, tabelas, prints de WhatsApp) recebidos por uma trading agrícola brasileira. Os formatos NÃO são padronizados.
Responda SOMENTE com um array JSON (sem texto antes/depois, sem markdown). Cada item:
{"transportadora": string, "origem": string, "destino": string, "produto": string|null, "veiculo": string|null, "valor": number, "unidade": "R$/t"|"R$/sc", "dataCotacao": "YYYY-MM-DD", "observacao": string|null}
Regras:
- Uma cotação = uma transportadora + uma rota (origem→destino) + um veículo + um valor. Mensagem/cartaz/tabela com várias rotas gera um item por rota.
- "transportadora": a empresa que divulga o frete (marca/título do cartaz ou da mensagem, ex.: "Movemos Transportes", "1500 Transportes"). Se não houver, use o autor da mensagem; se nem isso, "(informar)". Em tabelas com coluna "CLIENTE", o cliente NÃO é a transportadora: coloque-o em "observacao".
- Cabeçalhos como "ORIGEM PARANAGUÁ" ou "FILIAL X" valem para todas as rotas abaixo. Em tabelas, origem e destino vêm das colunas.
- Setas, "X", "x", "-", "→", "para" separam origem e destino. Atenção: nomes de local podem ter hífen (ex.: "Cuiabá - Root X Conquista do Oeste" = origem "Cuiabá - Root", destino "Conquista do Oeste").
- Escreva cidades como "Cidade/UF" quando a UF aparecer (ex.: "Palmeira/PR", "Sinop/MT"); sem UF, só a cidade. Primeira letra de cada palavra em maiúscula; mantenha a mesma grafia para a mesma cidade.
- "produto": o produto transportado se citado (ex.: "Farelo de Soja"); senão null. "veiculo": tipo de veículo citado (ex.: "Bitrem", "Rodocaçamba", "9 Eixos Graneleiro"); senão null.
- "valor": número com ponto decimal. Os fretes são normalmente R$ por TONELADA; use "R$/sc" só se estiver explícito. Ignore "CNPJ"/"CPF" no valor (é só a modalidade de pagamento: coloque em observacao).
- "dataCotacao": data da publicação (cabeçalho da mensagem) se existir; senão a data padrão informada. Datas de carregamento vão em "observacao" (ex.: "carregamento 08/10/2026").
- Ignore o que não for cotação (contatos, telefones, propaganda, cumprimentos). Não invente dados; se um valor estiver ilegível, omita o item.`;

export interface ImagemEntrada {
  tipo: string;
  dados: string;
}

type Bloco = { type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

async function chamarClaude(chave: string, conteudo: Bloco[], grupo: string | undefined, dataPadrao: string): Promise<CotacaoSugerida[]> {
  const modelo = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': chave, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: modelo,
      max_tokens: 16000,
      system: SISTEMA,
      messages: [{ role: 'user', content: [{ type: 'text', text: `Data padrão (se não houver data no material): ${dataPadrao}` }, ...conteudo] }],
    }),
  });
  if (!resp.ok) throw new Error(`Claude API ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  const json: any = await resp.json();
  const bruto: string = (json.content ?? []).map((b: any) => b.text ?? '').join('');
  const ini = bruto.indexOf('[');
  const fim = bruto.lastIndexOf(']');
  if (ini < 0 || fim < ini) throw new Error('Resposta da IA sem JSON');
  const arr = JSON.parse(bruto.slice(ini, fim + 1));
  return (Array.isArray(arr) ? arr : [])
    .map((x: any) => ({
      grupo,
      transportadora: String(x.transportadora ?? '(informar)').trim() || '(informar)',
      origem: String(x.origem ?? '').trim(),
      destino: String(x.destino ?? '').trim(),
      produto: x.produto ? String(x.produto).trim() : undefined,
      veiculo: x.veiculo ? String(x.veiculo).trim() : undefined,
      valor: Number(x.valor),
      unidade: /sc/i.test(String(x.unidade ?? '')) ? 'R$/sc' : 'R$/t',
      dataCotacao: /^\d{4}-\d{2}-\d{2}$/.test(String(x.dataCotacao ?? '')) ? String(x.dataCotacao) : dataPadrao,
      observacao: x.observacao ? String(x.observacao).trim() : undefined,
    }))
    .filter((x) => x.origem && x.destino && Number.isFinite(x.valor) && x.valor > 0);
}

/** Testa a chave com uma chamada mínima; devolve null se OK ou a mensagem de erro. */
export async function testarChaveIa(chave: string): Promise<string | null> {
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': chave, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: 5, messages: [{ role: 'user', content: 'ok' }] }),
    });
    if (resp.ok) return null;
    if (resp.status === 401) return 'Chave inválida (a Anthropic recusou). Confira se copiou a chave inteira.';
    if (resp.status === 403) return 'Esta chave não tem permissão para usar a API.';
    if (resp.status === 429) return null; // chave válida, só limitada no momento
    return `A Anthropic respondeu ${resp.status}: ${(await resp.text()).slice(0, 160)}`;
  } catch (e) {
    return `Não consegui falar com a Anthropic (${(e as Error).message}). Verifique a internet do servidor.`;
  }
}

export async function interpretarCotacoes(
  texto: string,
  imagens: ImagemEntrada[],
  chaveIa: string | null,
  grupo?: string,
  dataPadrao?: string,
  transportadoraPadrao?: string,
): Promise<ResultadoInterpretacao> {
  const padrao = dataPadrao && /^\d{4}-\d{2}-\d{2}$/.test(dataPadrao) ? dataPadrao : hojeIso();
  if (!chaveIa) {
    if (imagens.length) throw new Error('SEM_IA_IMAGEM');
    return interpretarPorRegras(texto, grupo, padrao, transportadoraPadrao);
  }
  const itens: CotacaoSugerida[] = [];
  const avisos: string[] = [];
  // Texto: blocos de ~12 mil caracteres; cada imagem numa chamada própria (mais fiel em tabelas densas).
  const trabalhos: Bloco[][] = [];
  if (texto.trim()) {
    let atual = '';
    const blocos: string[] = [];
    for (const l of texto.split(/\r?\n/)) {
      if (atual.length + l.length > 12000 && atual) {
        blocos.push(atual);
        atual = '';
      }
      atual += l + '\n';
    }
    if (atual.trim()) blocos.push(atual);
    blocos.forEach((b) => trabalhos.push([{ type: 'text', text: 'TEXTO:\n' + b }]));
  }
  imagens.forEach((im) => trabalhos.push([{ type: 'image', source: { type: 'base64', media_type: im.tipo, data: im.dados } }]));
  let falhas = 0;
  for (const t of trabalhos) {
    try {
      itens.push(...(await chamarClaude(chaveIa, t, grupo, padrao)));
    } catch (e) {
      falhas++;
      logger.warn(`Falha ao interpretar um trecho: ${(e as Error).message}`);
    }
  }
  if (falhas) avisos.push(`${falhas} trecho(s)/imagem(ns) não puderam ser lidos pela IA — tente novamente.`);
  if (!itens.length && !falhas) avisos.push('A IA não encontrou cotações no material.');
  if (!itens.length && falhas && texto.trim() && !imagens.length) {
    const r = interpretarPorRegras(texto, grupo, padrao, transportadoraPadrao);
    r.avisos.unshift('A IA não respondeu; usei o interpretador por regras.');
    return r;
  }
  return { fonte: 'ia', itens, avisos };
}
