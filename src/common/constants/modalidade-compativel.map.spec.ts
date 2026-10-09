import { ModalidadeTipoOperacao, TipoOperacaoBoleta } from '@prisma/client';
import { MODALIDADES_COMPATIVEIS } from './modalidade-compativel.map';

describe('MODALIDADES_COMPATIVEIS', () => {
  it('Venda só aceita modalidades de Venda', () => {
    expect(MODALIDADES_COMPATIVEIS[TipoOperacaoBoleta.VENDA]).toEqual([ModalidadeTipoOperacao.VENDA]);
  });

  it('Compra aceita Compra e Entrada', () => {
    expect(MODALIDADES_COMPATIVEIS[TipoOperacaoBoleta.COMPRA]).toEqual([
      ModalidadeTipoOperacao.COMPRA,
      ModalidadeTipoOperacao.ENTRADA,
    ]);
  });

  it('Remessa aceita Remessa e Transferência', () => {
    expect(MODALIDADES_COMPATIVEIS[TipoOperacaoBoleta.REMESSA]).toEqual([
      ModalidadeTipoOperacao.REMESSA,
      ModalidadeTipoOperacao.TRANSFERENCIA,
    ]);
  });
});
