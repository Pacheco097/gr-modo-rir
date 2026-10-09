import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsPositive, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateProdutoDto {
  @ApiProperty({ example: 'SOJA EM GRÃO - FIXO' })
  @IsString()
  @MinLength(1)
  nome: string;

  @ApiProperty({ example: 60, description: 'Fator de conversão kg por saca' })
  @IsInt()
  @IsPositive()
  fatorKgPorSaca: number;

  @ApiProperty({ example: 'Saca 60kg' })
  @IsString()
  @MinLength(1)
  unidade: string;

  @ApiPropertyOptional({ example: '1201.10.00' })
  @IsOptional()
  @IsString()
  ncm?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean = true;

  @ApiPropertyOptional({
    description: 'Para produtos "A Fixar": id do produto FIXO equivalente (usado ao encerrar a formação de preço)',
  })
  @IsOptional()
  @IsUUID()
  produtoFixoEquivalenteId?: string;
}
