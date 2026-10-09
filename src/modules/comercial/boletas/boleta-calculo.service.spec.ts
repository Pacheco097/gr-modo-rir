import { TipoOperacaoBoleta } from '@prisma/client';
import { BoletaCalculoService } from './boleta-calculo.service';

describe('BoletaCalculoService', () => {
  let service: BoletaCalculoService;

  beforeEach(() => {
    service = new BoletaCalculoService();
  });

  describe('calcularResultado', () => {
    it('calcula o resultado projetado de uma Venda simples', () => {
      const resultado = service.calcularResultado({
        tipo: TipoOperacaoBoleta.VENDA,
        quantidadeSc: 10000,
        preco: 100,
        fatorKgPorSaca: 60,
        freteRsPorTon: 160,
        icmsPct: 0,
        corretagemPct: 0.3,
        comissaoInternaPct: 0,
        custoArmazenagemSimplificadaRsSc: 0,
        classificadoras: [{ valorRsPorSc: 0.6 }],
        produtoNome: 'SOJA EM GRÃO - FIXO',
        contraparteNome: 'Cargill Brasil Ltda',
      });

      expect(resultado.pesoKg).toBe(600000);
      expect(resultado.toneladas).toBe(600);
      expect(resultado.valorBruto).toBe(1_000_000);
      // frete: 160 R$/t ÷ (1000/60) = 9,6 R$/sc × 10000 sc = 96.000
      expect(resultado.freteRsPorSc).toBeCloseTo(9.6, 6);
      expect(resultado.valorFreteTotal).toBeCloseTo(96_000, 6);
      expect(resultado.valorCorretagem).toBeCloseTo(3_000, 6);
      expect(resultado.valorClassificacao).toBeCloseTo(6_000, 6);
      expect(resultado.valorCustosTotal).toBeCloseTo(105_000, 6);
      // Venda: líquido = bruta - custos
      expect(resultado.valorLiquido).toBeCloseTo(895_000, 6);
      expect(resultado.margemPct).toBeCloseTo(89.5, 6);
      expect(resultado.resultadoPorSaca).toBeCloseTo(89.5, 6);
      expect(resultado.creditoIcms).toBe(0);
      expect(resultado.creditoPisCofins).toBe(0);
      expect(resultado.valorLiquidoComFiscal).toBeNull();
      expect(resultado.resultadoPorSacaComFiscal).toBeNull();
    });

    it('inverte o sinal do resultado líquido para Compra (custos sempre negativos)', () => {
      const resultado = service.calcularResultado({
        tipo: TipoOperacaoBoleta.COMPRA,
        quantidadeSc: 1000,
        preco: 60,
        fatorKgPorSaca: 60,
        freteRsPorTon: 0,
        icmsPct: 0,
        corretagemPct: 1,
        comissaoInternaPct: 0,
        custoArmazenagemSimplificadaRsSc: 0,
        classificadoras: [],
        produtoNome: 'MILHO EM GRÃOS - FIXO',
        contraparteNome: 'Fazenda Santa Fé',
      });

      expect(resultado.valorBruto).toBe(60_000);
      expect(resultado.valorCorretagem).toBeCloseTo(600, 6);
      expect(resultado.valorCustosTotal).toBeCloseTo(600, 6);
      // Compra: líquido = -(custos), nunca bruta - custos
      expect(resultado.valorLiquido).toBeCloseTo(-600, 6);
      expect(resultado.resultadoPorSaca).toBeCloseTo(-0.6, 6);
    });

    it('concede crédito de ICMS somente em Compra com icmsPct > 0', () => {
      const base = {
        tipo: TipoOperacaoBoleta.COMPRA,
        quantidadeSc: 1000,
        preco: 60,
        fatorKgPorSaca: 60,
        freteRsPorTon: 0,
        corretagemPct: 0,
        comissaoInternaPct: 0,
        custoArmazenagemSimplificadaRsSc: 0,
        classificadoras: [],
        produtoNome: 'SOJA EM GRÃO - FIXO',
        contraparteNome: 'Fazenda Santa Fé',
      };

      const comIcms = service.calcularResultado({ ...base, icmsPct: 12 });
      expect(comIcms.creditoIcms).toBeCloseTo(7_200, 6); // 60.000 × 12%
      expect(comIcms.valorLiquidoComFiscal).toBeCloseTo(comIcms.valorLiquido + 7_200, 6);

      const semIcms = service.calcularResultado({ ...base, icmsPct: 0 });
      expect(semIcms.creditoIcms).toBe(0);
      expect(semIcms.valorLiquidoComFiscal).toBeNull();

      const venda = service.calcularResultado({ ...base, tipo: TipoOperacaoBoleta.VENDA, icmsPct: 12 });
      expect(venda.creditoIcms).toBe(0); // crédito de ICMS só existe na Compra
    });

    it('concede crédito de PIS/COFINS somente em Compra de milho de cooperativa', () => {
      const base = {
        tipo: TipoOperacaoBoleta.COMPRA,
        quantidadeSc: 1000,
        preco: 60,
        fatorKgPorSaca: 60,
        freteRsPorTon: 0,
        icmsPct: 0,
        corretagemPct: 0,
        comissaoInternaPct: 0,
        custoArmazenagemSimplificadaRsSc: 0,
        classificadoras: [],
      };

      const milhoCoop = service.calcularResultado({
        ...base,
        produtoNome: 'MILHO EM GRÃOS - FIXO',
        contraparteNome: 'Cooperativa Central MT',
      });
      expect(milhoCoop.creditoPisCofins).toBeCloseTo(60_000 * 0.0925, 6);

      const milhoSemCoop = service.calcularResultado({
        ...base,
        produtoNome: 'MILHO EM GRÃOS - FIXO',
        contraparteNome: 'Cargill Brasil Ltda',
      });
      expect(milhoSemCoop.creditoPisCofins).toBe(0);

      const sojaCoop = service.calcularResultado({
        ...base,
        produtoNome: 'SOJA EM GRÃO - FIXO',
        contraparteNome: 'Cooperativa Central MT',
      });
      expect(sojaCoop.creditoPisCofins).toBe(0); // só milho dá direito ao crédito
    });

    it('soma múltiplas classificadoras e multiplica pela quantidade', () => {
      const resultado = service.calcularResultado({
        tipo: TipoOperacaoBoleta.VENDA,
        quantidadeSc: 100,
        preco: 50,
        fatorKgPorSaca: 60,
        freteRsPorTon: 0,
        icmsPct: 0,
        corretagemPct: 0,
        comissaoInternaPct: 0,
        custoArmazenagemSimplificadaRsSc: 0,
        classificadoras: [{ valorRsPorSc: 0.5 }, { valorRsPorSc: 0.3 }, { valorRsPorSc: 0.2 }],
        produtoNome: 'SOJA EM GRÃO - FIXO',
        contraparteNome: 'Cargill Brasil Ltda',
      });
      // (0,5 + 0,3 + 0,2) × 100 sc = 100
      expect(resultado.valorClassificacao).toBeCloseTo(100, 6);
    });
  });
});
