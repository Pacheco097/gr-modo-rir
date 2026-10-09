import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContratoTipo } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export class CreateContratoDto {
  @ApiProperty({ enum: ContratoTipo })
  @IsEnum(ContratoTipo)
  tipo: ContratoTipo;

  @ApiPropertyOptional({ description: 'Boleta de origem. Se informada, campos ausentes são herdados dela.' })
  @IsOptional()
  @IsUUID()
  boletaId?: string;

  @ApiPropertyOptional({ description: 'Número do contrato no ERP/Protheus (chave de ligação)' })
  @IsOptional()
  @IsString()
  numeroErpMaxicon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  contraparteId?: string;

  @ApiPropertyOptional({ description: 'Obrigatório se não vier de boleta' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  contraparteNome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  produtoId?: string;

  @ApiPropertyOptional({ description: 'Obrigatório se não vier de boleta (em TONELADAS — preferencial)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantidadeContratadaTon?: number;

  @ApiPropertyOptional({ description: 'Legado: em sacas (use quantidadeContratadaTon)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantidadeContratadaSc?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  preco?: number;

  @ApiPropertyOptional({ description: 'Data de vencimento (usada no CR/CP financeiro)' })
  @IsOptional()
  @IsDateString()
  dataVencimento?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  temArmazenagem?: boolean;

  @ApiPropertyOptional({ default: false, description: 'Se ausente, herda da boleta. Contrato passa por classificação.' })
  @IsOptional()
  @IsBoolean()
  temClassificacao?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacoes?: string;
}
