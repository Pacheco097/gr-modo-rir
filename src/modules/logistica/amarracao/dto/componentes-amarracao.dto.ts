import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min, ValidateIf } from 'class-validator';

/**
 * Componentes do resultado digitados na tela "Resultado por contrato".
 * Enviar um número define o override manual; enviar null volta ao valor AUTO;
 * campo ausente = não altera. Total em R$ por amarração.
 */
export class ComponentesAmarracaoDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  @Min(0)
  custoArmazenagem?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  @Min(0)
  custoClassificacao?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'Aceita negativo (receita financeira)' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  custoJuros?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'Frete (soma dos CT-es do par)' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  @Min(0)
  custoFrete?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'PIS/COFINS do frete (+ receita / − despesa)' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  fretePisCofins?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'ICMS do frete (+ receita / − despesa)' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  freteIcms?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'PIS/COFINS da classificação (+ receita / − despesa)' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  classifPisCofins?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'PIS/COFINS da corretagem (+ receita / − despesa)' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  corretagemPisCofins?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'ICMS do contrato — override do auto (venda − compra), com sinal' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  icmsManual?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'PIS/COFINS do contrato (+ receita / − despesa)' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  receitaPisCofins?: number | null;
}
