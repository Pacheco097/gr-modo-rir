import { ApiPropertyOptional } from '@nestjs/swagger';
import { StatusBoleta, TipoOperacaoBoleta } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

export class QueryBoletaDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: StatusBoleta })
  @IsOptional()
  @IsEnum(StatusBoleta)
  status?: StatusBoleta;

  @ApiPropertyOptional({ enum: TipoOperacaoBoleta })
  @IsOptional()
  @IsEnum(TipoOperacaoBoleta)
  tipo?: TipoOperacaoBoleta;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  empresaGrupoId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  safraId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  produtoId?: string;
}
