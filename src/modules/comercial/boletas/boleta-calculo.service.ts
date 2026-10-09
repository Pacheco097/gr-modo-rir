import { Injectable } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { TipoOperacaoBoleta } from '@prisma/client';
import {
  BoletaCalculoInput,
  BoletaResultadoCalculado,
} from './interfaces/boleta-calculo.interface';

/** R$/t → R$/sc (também usado na inversa: R$/sc × este fator = R$/t para fator padrão 60kg/sc). */
const TON_PARA_SACA = new Decimal('16.667');

/** PIS 1,65% + COFINS 7,6% — crédito de compra de milho de cooperativa (Lei 10.925/04). */
const PIS_COFINS_PCT = new Decimal('9.25');

function toDecimal(value: number | null | undefined): Decimal {
  return new Decimal(value ?? 0);
}

/**
 * Motor de cálculo do Resultado Projetado e da Formação de Preço da Boleta.
 * Réplica fiel, em Decimal (nunca float), de `_getBoletaData()`,
 * `calcResultado()` e `recalcFixacao()` do frontend de referência
 * (AgroERP_Demo_16_79.html) — nenhuma fórmula deve divergir daquele
 * comportamento sem que o docx/HTML de referência também mudem.
 *
 * Serviço puro e sem dependências de banco — cada método é uma função
 * determinística, o que o torna trivialmente testável.
 */
@Injectable()
export class BoletaCalculoService {
  calcularResultado(input: BoletaCalculoInput): BoletaResultadoCalculado {
    const qtd = toDecimal(input.quantidadeSc);
    const preco = toDecimal(input.preco);
    const fator = toDecimal(input.fatorKgPorSaca || 60);
    const freteTon = toDecimal(input.freteRsPorTon);
    const icmsPct = toDecimal(input.icmsPct);
    const corrPct = toDecimal(input.corretagemPct);
    const comisPct = toDecimal(input.comissaoInternaPct);
    const armazSimpl = toDecimal(input.custoArmazenagemSimplificadaRsSc);

    const pesoKg = qtd.mul(fator);
    const toneladas = pesoKg.div(1000);

    const precoPorKg = fator.gt(0) ? preco.div(fator) : new Decimal(0);
    const precoPorTon = precoPorKg.mul(1000);

    const precoComIcmsPorSc = icmsPct.gt(0) ? preco.div(new Decimal(1).sub(icmsPct.div(100))) : new Decimal(0);
    const precoComIcmsPorTon = fator.gt(0) ? precoComIcmsPorSc.div(fator).mul(1000) : new Decimal(0);

    // Frete digitado em R$/t → convertido para R$/sc: R$/t ÷ (1000 ÷ fator)
    const freteRsPorSc = fator.gt(0) ? freteTon.div(new Decimal(1000).div(fator)) : new Decimal(0);
    const valorFreteTotal = qtd.mul(freteRsPorSc);

    const valorBruto = qtd.mul(preco);
    const valorCorretagem = valorBruto.mul(corrPct).div(100);
    const valorComissaoInterna = valorBruto.mul(comisPct).div(100);
    const valorArmazenagemSimplificada = qtd.mul(armazSimpl);
    const somaClassificadorasPorSc = (input.classificadoras ?? []).reduce(
      (acc, c) => acc.add(toDecimal(c.valorRsPorSc)),
      new Decimal(0),
    );
    const valorClassificacao = qtd.mul(somaClassificadorasPorSc);

    const valorCustosTotal = valorFreteTotal
      .add(valorCorretagem)
      .add(valorComissaoInterna)
      .add(valorArmazenagemSimplificada)
      .add(valorClassificacao);

    // Réplica exata do HTML: `tipo === 'Compra' ? -(custos) : bruta - custos`
    // (Remessa cai no mesmo ramo de Venda; na prática seu valorBruto é 0).
    const valorLiquido =
      input.tipo === TipoOperacaoBoleta.COMPRA ? valorCustosTotal.neg() : valorBruto.sub(valorCustosTotal);

    const margemPct = valorBruto.gt(0) ? valorLiquido.div(valorBruto).mul(100) : new Decimal(0);
    const resultadoPorSaca = qtd.gt(0) ? valorLiquido.div(qtd) : new Decimal(0);
    const resultadoPorKg = pesoKg.gt(0) ? valorLiquido.div(pesoKg) : new Decimal(0);

    // ── Créditos fiscais (somente em Compra) ──
    const ehCompra = input.tipo === TipoOperacaoBoleta.COMPRA;
    const creditoIcms = ehCompra && icmsPct.gt(0) ? valorBruto.mul(icmsPct).div(100) : new Decimal(0);
    const ehMilho = (input.produtoNome ?? '').toUpperCase().includes('MILHO');
    const ehCooperativa = (input.contraparteNome ?? '').toUpperCase().includes('COOP');
    const creditoPisCofins = ehCompra && ehMilho && ehCooperativa ? valorBruto.mul(PIS_COFINS_PCT).div(100) : new Decimal(0);

    const totalFiscal = creditoIcms.add(creditoPisCofins);
    const temFiscal = totalFiscal.gt(0);
    const valorLiquidoComFiscal = temFiscal ? valorLiquido.add(totalFiscal) : null;
    const resultadoPorSacaComFiscal = temFiscal && qtd.gt(0) ? valorLiquidoComFiscal!.div(qtd) : temFiscal ? new Decimal(0) : null;

    return {
      pesoKg: pesoKg.toNumber(),
      toneladas: toneladas.toNumber(),
      precoPorKg: precoPorKg.toNumber(),
      precoPorTon: precoPorTon.toNumber(),
      precoComIcmsPorSc: precoComIcmsPorSc.toNumber(),
      precoComIcmsPorTon: precoComIcmsPorTon.toNumber(),
      freteRsPorSc: freteRsPorSc.toNumber(),
      valorFreteTotal: valorFreteTotal.toNumber(),
      valorBruto: valorBruto.toNumber(),
      valorCorretagem: valorCorretagem.toNumber(),
      valorComissaoInterna: valorComissaoInterna.toNumber(),
      valorArmazenagemSimplificada: valorArmazenagemSimplificada.toNumber(),
      valorClassificacao: valorClassificacao.toNumber(),
      valorCustosTotal: valorCustosTotal.toNumber(),
      valorLiquido: valorLiquido.toNumber(),
      margemPct: margemPct.toNumber(),
      resultadoPorSaca: resultadoPorSaca.toNumber(),
      resultadoPorKg: resultadoPorKg.toNumber(),
      creditoIcms: creditoIcms.toNumber(),
      creditoPisCofins: creditoPisCofins.toNumber(),
      valorLiquidoComFiscal: valorLiquidoComFiscal ? valorLiquidoComFiscal.toNumber() : null,
      resultadoPorSacaComFiscal: resultadoPorSacaComFiscal !== null ? resultadoPorSacaComFiscal.toNumber() : null,
    };
  }

}
