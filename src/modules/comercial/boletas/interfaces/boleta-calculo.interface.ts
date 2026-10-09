import { TipoOperacaoBoleta } from '@prisma/client';

export interface ClassificadoraCalculoInput {
  valorRsPorSc: number;
}

/**
 * Entradas do motor de cálculo — espelha exatamente os campos lidos por
 * `_getBoletaData()` / `calcResultado()` no HTML de referência.
 */
export interface BoletaCalculoInput {
  tipo: TipoOperacaoBoleta;
  quantidadeSc: number;
  preco: number; // R$/sc
  fatorKgPorSaca: number;
  freteRsPorTon: number;
  icmsPct: number;
  corretagemPct: number;
  comissaoInternaPct: number;
  custoArmazenagemSimplificadaRsSc: number;
  classificadoras: ClassificadoraCalculoInput[];
  produtoNome: string;
  contraparteNome: string;
}

export interface BoletaResultadoCalculado {
  pesoKg: number;
  toneladas: number;
  precoPorKg: number;
  precoPorTon: number;
  precoComIcmsPorSc: number;
  precoComIcmsPorTon: number;
  freteRsPorSc: number;
  valorFreteTotal: number;
  valorBruto: number;
  valorCorretagem: number;
  valorComissaoInterna: number;
  valorArmazenagemSimplificada: number;
  valorClassificacao: number;
  valorCustosTotal: number;
  valorLiquido: number;
  margemPct: number;
  resultadoPorSaca: number;
  resultadoPorKg: number;
  creditoIcms: number;
  creditoPisCofins: number;
  valorLiquidoComFiscal: number | null;
  resultadoPorSacaComFiscal: number | null;
}
