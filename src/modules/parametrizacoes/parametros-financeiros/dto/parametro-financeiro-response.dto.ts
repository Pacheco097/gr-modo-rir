import { ApiProperty } from '@nestjs/swagger';
import { ParametroFinanceiro } from '@prisma/client';

export class ParametroFinanceiroResponseDto {
  @ApiProperty({ description: 'Taxa de juros do descasamento financeiro (% a.m.)' })
  taxaJurosDescasamentoAmPct: number;

  @ApiProperty({ description: 'Equivalente em % a.a. (derivado: (1+i)^12 - 1)' })
  taxaJurosDescasamentoAaPct: number;

  @ApiProperty({ description: 'Equivalente em % a.d. (derivado: taxa a.m. ÷ 30)' })
  taxaJurosDescasamentoAdPct: number;

  @ApiProperty({ description: 'Valor padrão de classificação (R$/sc)' })
  classificacaoPadraoRsSc: number;

  @ApiProperty({ description: 'Custo de quebra (% sobre preço de venda) — editável apenas por administrador' })
  custoQuebraPct: number;

  @ApiProperty() updatedAt: Date;
  @ApiProperty({ nullable: true }) updatedBy: string | null;

  static fromEntity(entity: ParametroFinanceiro): ParametroFinanceiroResponseDto {
    const dto = new ParametroFinanceiroResponseDto();
    const am = Number(entity.taxaJurosDescasamentoAmPct);
    dto.taxaJurosDescasamentoAmPct = am;
    // % a.a. equivalente composta e % a.d. (fator 30 dias), como no HTML de referência.
    dto.taxaJurosDescasamentoAaPct = Number(((Math.pow(1 + am / 100, 12) - 1) * 100).toFixed(4));
    dto.taxaJurosDescasamentoAdPct = Number((am / 30).toFixed(4));
    dto.classificacaoPadraoRsSc = Number(entity.classificacaoPadraoRsSc);
    dto.custoQuebraPct = Number(entity.custoQuebraPct);
    dto.updatedAt = entity.updatedAt;
    dto.updatedBy = entity.updatedBy;
    return dto;
  }
}
