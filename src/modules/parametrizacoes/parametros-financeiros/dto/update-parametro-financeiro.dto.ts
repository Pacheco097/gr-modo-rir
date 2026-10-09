import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateParametroFinanceiroDto {
  @ApiPropertyOptional({ description: 'Taxa de juros do descasamento financeiro (% a.m.)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxaJurosDescasamentoAmPct?: number;

  @ApiPropertyOptional({ description: 'Valor padrão de classificação (R$/sc)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  classificacaoPadraoRsSc?: number;

  @ApiPropertyOptional({
    description:
      'Custo de quebra (% sobre preço de venda). Editável apenas por administrador — ignorado se o header x-user não indicar admin.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  custoQuebraPct?: number;
}
