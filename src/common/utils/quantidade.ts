import { Decimal } from 'decimal.js';

/**
 * A operação é negociada em TONELADAS, mas os cálculos internos (preço R$/sc,
 * saldos, armazenagem, juros...) seguem em SACAS. Esta conversão é feita com
 * precisão total (6 casas) para que toneladas × preço bata com a planilha de
 * resultados ao centavo — sem arredondar a saca cedo demais.
 *
 * toneladas × 1000 ÷ fatorKgPorSaca = sacas   (fator padrão: 60 kg/sc)
 */
export const FATOR_KG_PADRAO = 60;

export function tonParaSc(ton: number | string | Decimal, fatorKg: number = FATOR_KG_PADRAO): number {
  return new Decimal(ton).mul(1000).div(fatorKg || FATOR_KG_PADRAO).toDecimalPlaces(6).toNumber();
}

export function scParaTon(sc: number | string | Decimal, fatorKg: number = FATOR_KG_PADRAO): number {
  return new Decimal(sc).mul(fatorKg || FATOR_KG_PADRAO).div(1000).toDecimalPlaces(6).toNumber();
}

/** Usa a quantidade em toneladas quando informada; senão a de sacas (compatibilidade). */
export function resolverQuantidadeSc(
  q: { quantidadeSc?: number | null; quantidadeTon?: number | null },
  fatorKg: number = FATOR_KG_PADRAO,
): number {
  if (q.quantidadeTon !== undefined && q.quantidadeTon !== null) return tonParaSc(q.quantidadeTon, fatorKg);
  return Number(q.quantidadeSc);
}
