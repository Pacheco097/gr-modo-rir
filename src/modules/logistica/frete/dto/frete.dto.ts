import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Frete, FreteStatus } from '@prisma/client';
import { IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

export class CreateFreteDto {
  @ApiProperty({ description: 'Amarração à qual o frete se refere' })
  @IsUUID()
  amarracaoId: string;

  @ApiProperty({ example: '2026-03', description: 'Período/mês de embarque' })
  @IsString()
  @MinLength(1)
  referencia: string;

  @ApiProperty({ description: 'Quantidade do período (sc)' })
  @IsNumber()
  @Min(0.001)
  quantidadeSc: number;

  @ApiProperty({ description: 'Frete em R$/tonelada' })
  @IsNumber()
  @Min(0)
  freteRsPorTon: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacao?: string;
}

export class QueryFreteDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  amarracaoId?: string;

  @ApiPropertyOptional({ enum: FreteStatus })
  @IsOptional()
  @IsString()
  status?: FreteStatus;
}

export class FreteResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() amarracaoId: string;
  @ApiProperty() referencia: string;
  @ApiProperty() quantidadeSc: number;
  @ApiProperty() freteRsPorTon: number;
  @ApiProperty({ description: 'Valor total = R$/t × toneladas (fator 60kg)' }) valorTotal: number;
  @ApiProperty({ enum: FreteStatus }) status: FreteStatus;
  @ApiProperty({ nullable: true }) aprovadoPor: string | null;
  @ApiProperty({ nullable: true }) aprovadoEm: Date | null;

  static fromEntity(e: Frete): FreteResponseDto {
    const dto = new FreteResponseDto();
    dto.id = e.id;
    dto.amarracaoId = e.amarracaoId;
    dto.referencia = e.referencia;
    dto.quantidadeSc = Number(e.quantidadeSc);
    dto.freteRsPorTon = Number(e.freteRsPorTon);
    // toneladas = sc × 60kg ÷ 1000
    dto.valorTotal = Number((dto.freteRsPorTon * ((dto.quantidadeSc * 60) / 1000)).toFixed(2));
    dto.status = e.status;
    dto.aprovadoPor = e.aprovadoPor;
    dto.aprovadoEm = e.aprovadoEm;
    return dto;
  }
}
