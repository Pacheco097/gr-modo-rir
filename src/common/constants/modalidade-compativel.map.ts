import { ModalidadeTipoOperacao, TipoOperacaoBoleta } from '@prisma/client';

/**
 * Mapeamento tipo de operação da Boleta → tipos de Modalidade aceitos.
 * Replica exatamente `sincronizarModalidades()` do frontend de referência
 * (AgroERP_Demo_16_79.html): Venda só aceita modalidades de Venda; Compra
 * aceita Compra e Entrada; Remessa aceita Remessa e Transferência.
 */
export const MODALIDADES_COMPATIVEIS: Record<TipoOperacaoBoleta, ModalidadeTipoOperacao[]> = {
  VENDA: [ModalidadeTipoOperacao.VENDA],
  COMPRA: [ModalidadeTipoOperacao.COMPRA, ModalidadeTipoOperacao.ENTRADA],
  REMESSA: [ModalidadeTipoOperacao.REMESSA, ModalidadeTipoOperacao.TRANSFERENCIA],
};
