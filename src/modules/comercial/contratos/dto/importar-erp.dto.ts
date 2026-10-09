import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContratoTipo } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

/**
 * Payload de importação de um contrato aberto no ERP/Protheus (docx §6,
 * "Pontos de API"). Modela o contrato que o Protheus traria já preenchido.
 * Enquanto a API real não existe, este endpoint permite simular/registrar
 * a importação manualmente.
 */
export class ImportarErpDto {
  @ApiProperty({ description: 'Número do contrato no ERP (chave de ligação)' })
  @IsString()
  @MinLength(1)
  numeroErpMaxicon: string;

  @ApiProperty({ enum: ContratoTipo })
  @IsEnum(ContratoTipo)
  tipo: ContratoTipo;

  @ApiProperty({ description: 'Cliente/fornecedor conforme o ERP' })
  @IsString()
  @MinLength(1)
  contraparteNome: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  quantidadeContratadaSc: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  preco?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dataVencimento?: string;

  @ApiPropertyOptional({ description: 'Vínculo com a boleta correspondente (automático quando possível)' })
  @IsOptional()
  @IsUUID()
  boletaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  contraparteId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  produtoId?: string;
}
