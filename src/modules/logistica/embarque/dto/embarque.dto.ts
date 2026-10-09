import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Embarque, EmbarqueStatus } from '@prisma/client';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

/** Uma transportadora do lote do embarque, com vigência e caminhões próprios. */
export class TransportadoraLoteDto {
  @ApiProperty() @IsString() nome: string;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() vigente?: boolean;
  @ApiPropertyOptional({ default: 0, description: 'Caminhões que esta transportadora vai posicionar' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  caminhoes?: number;
}

export class LiberarEmbarqueDto {
  @ApiProperty({ description: 'Amarração cujo frete já foi aprovado' })
  @IsUUID()
  amarracaoId: string;

  @ApiProperty({ description: 'Quantidade a embarcar (sc)' })
  @IsNumber()
  @Min(0.001)
  quantidadeSc: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacao?: string;
}

export class AtualizarLoteEmbarqueDto {
  @ApiPropertyOptional({ type: [TransportadoraLoteDto], description: 'Lote detalhado por transportadora (nome, vigência, caminhões)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransportadoraLoteDto)
  transportadorasLote?: TransportadoraLoteDto[];

  @ApiPropertyOptional({ type: [String], description: 'LEGADO — derivado de transportadorasLote' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  transportadoras?: string[];

  @ApiPropertyOptional({ type: [String], description: 'LEGADO — derivado de transportadorasLote' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  transportadorasVigentes?: string[];

  @ApiPropertyOptional({ description: 'LEGADO — total de caminhões (derivado da soma das vigentes)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  caminhoesPosicionados?: number;

  @ApiPropertyOptional({ description: 'Classificadora responsável pelo lote' })
  @IsOptional()
  @IsString()
  classificadora?: string;
}

export class EncerrarEmbarqueDto {
  @ApiPropertyOptional({ description: 'Peso descarregado (kg) — opcional; o performado vem do relatório de descarga' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pesoDescarregadoKg?: number;
}

export class QueryEmbarqueDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  amarracaoId?: string;

  @ApiPropertyOptional({ enum: EmbarqueStatus })
  @IsOptional()
  @IsString()
  status?: EmbarqueStatus;
}

export class EmbarqueResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() amarracaoId: string;
  @ApiProperty() quantidadeSc: number;
  @ApiProperty({ enum: EmbarqueStatus }) status: EmbarqueStatus;
  @ApiProperty({ nullable: true }) dataLiberacao: Date | null;
  @ApiProperty({ nullable: true }) dataEncerramento: Date | null;
  @ApiProperty() pesoDescarregadoKg: number;
  @ApiProperty({ description: '% performado = peso descarregado ÷ (qtd × 60kg)' }) performadoPct: number;
  @ApiProperty({ type: [String] }) transportadoras: string[];
  @ApiProperty({ type: [String] }) transportadorasVigentes: string[];
  @ApiProperty() caminhoesPosicionados: number;
  @ApiProperty({ type: [TransportadoraLoteDto] }) transportadorasLote: TransportadoraLoteDto[];
  @ApiProperty({ nullable: true }) classificadora: string | null;

  static fromEntity(e: Embarque): EmbarqueResponseDto {
    const dto = new EmbarqueResponseDto();
    dto.id = e.id;
    dto.amarracaoId = e.amarracaoId;
    dto.quantidadeSc = Number(e.quantidadeSc);
    dto.status = e.status;
    dto.dataLiberacao = e.dataLiberacao;
    dto.dataEncerramento = e.dataEncerramento;
    dto.pesoDescarregadoKg = Number(e.pesoDescarregadoKg);
    const previstoKg = dto.quantidadeSc * 60;
    dto.performadoPct = previstoKg > 0 ? Number(((dto.pesoDescarregadoKg / previstoKg) * 100).toFixed(2)) : 0;
    dto.transportadoras = e.transportadoras ?? [];
    dto.transportadorasVigentes = e.transportadorasVigentes ?? [];
    dto.caminhoesPosicionados = Number(e.caminhoesPosicionados ?? 0);
    dto.transportadorasLote = Array.isArray(e.transportadorasLote)
      ? (e.transportadorasLote as unknown as TransportadoraLoteDto[])
      : [];
    dto.classificadora = e.classificadora ?? null;
    return dto;
  }
}
