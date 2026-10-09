import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Matches, Min, ValidateIf } from 'class-validator';

/**
 * Conciliação de VOLUME de uma amarração (sobra performada acima do previsto).
 *
 * - status 'COMPLEMENTO': SOBRA → cobrar o excedente (exige sobraSc, precoModo, precoRsSc,
 *   valor e dataRecebimento; entra como receita e conta a receber no fluxo de caixa).
 * - status 'DESCONTO': QUEBRA → descontar (exige descReceita e/ou descCusto e dataRecebimento;
 *   reduz receita, custo de compra e fluxo de caixa).
 * - status 'SEM_COMPLEMENTO': não faz nada → finaliza a pendência.
 * - status null: volta ao estado pendente (limpa a decisão).
 */
export class ConciliacaoVolumeDto {
  @ApiPropertyOptional({ nullable: true, enum: ['COMPLEMENTO', 'DESCONTO', 'SEM_COMPLEMENTO'] })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsIn(['COMPLEMENTO', 'DESCONTO', 'SEM_COMPLEMENTO'])
  volConcStatus?: 'COMPLEMENTO' | 'DESCONTO' | 'SEM_COMPLEMENTO' | null;

  @ApiPropertyOptional({ nullable: true, description: 'Volume conciliado em sacas — sobra ou falta (snapshot)' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  @Min(0)
  volConcSobraSc?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'DESCONTO: redução na receita (venda) pela quebra' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  @Min(0)
  volConcDescReceita?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'DESCONTO: redução no custo de compra pela quebra' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  @Min(0)
  volConcDescCusto?: number | null;

  @ApiPropertyOptional({ nullable: true, enum: ['MESMO', 'NOVO'] })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsIn(['MESMO', 'NOVO'])
  volConcPrecoModo?: 'MESMO' | 'NOVO' | null;

  @ApiPropertyOptional({ nullable: true, description: 'R$/sc aplicado ao excedente' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  @Min(0)
  volConcPrecoRsSc?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'Complemento total = sobraSc × precoRsSc' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  @Min(0)
  volConcValor?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'Data prevista de recebimento (YYYY-MM-DD)' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'volConcDataRecebimento deve ser YYYY-MM-DD' })
  volConcDataRecebimento?: string | null;
}
