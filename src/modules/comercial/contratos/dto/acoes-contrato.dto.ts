import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssinaturaStatus, ContratoStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsIn, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class MudarStatusDto {
  @ApiProperty({ enum: ContratoStatus })
  @IsEnum(ContratoStatus)
  status: ContratoStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  motivo?: string;
}

export class AssinaturaDto {
  @ApiProperty({ enum: AssinaturaStatus })
  @IsEnum(AssinaturaStatus)
  assinatura: AssinaturaStatus;

  @ApiPropertyOptional({ description: 'Data de envio para assinatura' })
  @IsOptional()
  @IsDateString()
  dataEnvioAssinatura?: string;

  @ApiPropertyOptional({ description: 'Data em que foi assinado' })
  @IsOptional()
  @IsDateString()
  dataAssinatura?: string;
}

export class RegistrarEntregaDto {
  @ApiProperty({ description: 'Quantidade entregue nesta descarga (sc)' })
  @IsNumber()
  @Min(0.001)
  quantidadeSc: number;
}

/** Tratamento de excedente de peso (docx §6). */
export const TRATAMENTOS_EXCEDENTE = ['MESMO_PRECO', 'NOVA_BOLETA', 'ADITIVO', 'ABONO'] as const;
export type TratamentoExcedente = (typeof TRATAMENTOS_EXCEDENTE)[number];

export class RegistrarExcedenteDto {
  @ApiProperty({ enum: TRATAMENTOS_EXCEDENTE })
  @IsIn(TRATAMENTOS_EXCEDENTE)
  tratamento: TratamentoExcedente;

  @ApiProperty({ description: 'Quantidade excedente (sc)' })
  @IsNumber()
  @Min(0.001)
  quantidadeSc: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  detalhe?: string;
}

export class VincularBoletaDto {
  @ApiProperty({ description: 'Id da boleta a vincular' })
  @IsString()
  @MinLength(1)
  boletaId: string;
}
