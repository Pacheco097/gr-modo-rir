import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LancamentoCategoria, LancamentoFinanceiro, LancamentoStatus, LancamentoTipo } from '@prisma/client';
import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class CreateLancamentoDto {
  @ApiProperty({ enum: LancamentoTipo })
  @IsEnum(LancamentoTipo)
  tipo: LancamentoTipo;

  @ApiProperty({ enum: LancamentoCategoria })
  @IsEnum(LancamentoCategoria)
  categoria: LancamentoCategoria;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  descricao: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  valor: number;

  @ApiProperty({ example: '2026-05-15' })
  @IsDateString()
  dataVencimento: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  contratoId?: string;

  @ApiPropertyOptional({ default: false, description: 'true = valor com ICMS (frete)' })
  @IsOptional()
  @IsBoolean()
  comIcms?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacao?: string;
}

export class LiquidarDto {
  @ApiPropertyOptional({ description: 'Data da liquidação (default: hoje)' })
  @IsOptional()
  @IsDateString()
  dataLiquidacao?: string;
}

export class QueryLancamentoDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: LancamentoTipo })
  @IsOptional()
  @IsString()
  tipo?: LancamentoTipo;

  @ApiPropertyOptional({ enum: LancamentoCategoria })
  @IsOptional()
  @IsString()
  categoria?: LancamentoCategoria;

  @ApiPropertyOptional({ enum: LancamentoStatus })
  @IsOptional()
  @IsString()
  status?: LancamentoStatus;
}

export class LancamentoResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: LancamentoTipo }) tipo: LancamentoTipo;
  @ApiProperty({ enum: LancamentoCategoria }) categoria: LancamentoCategoria;
  @ApiProperty() descricao: string;
  @ApiProperty() valor: number;
  @ApiProperty() dataVencimento: Date;
  @ApiProperty({ nullable: true }) dataLiquidacao: Date | null;
  @ApiProperty({ enum: LancamentoStatus }) status: LancamentoStatus;
  @ApiProperty({ nullable: true }) contratoId: string | null;
  @ApiProperty() comIcms: boolean;

  static fromEntity(e: LancamentoFinanceiro): LancamentoResponseDto {
    const dto = new LancamentoResponseDto();
    dto.id = e.id;
    dto.tipo = e.tipo;
    dto.categoria = e.categoria;
    dto.descricao = e.descricao;
    dto.valor = Number(e.valor);
    dto.dataVencimento = e.dataVencimento;
    dto.dataLiquidacao = e.dataLiquidacao;
    dto.status = e.status;
    dto.contratoId = e.contratoId;
    dto.comIcms = e.comIcms;
    return dto;
  }
}

export class FluxoCaixaDiaDto {
  @ApiProperty() data: string;
  @ApiProperty() entradas: number;
  @ApiProperty() saidas: number;
  @ApiProperty() saldoDia: number;
  @ApiProperty() saldoAcumulado: number;
}
