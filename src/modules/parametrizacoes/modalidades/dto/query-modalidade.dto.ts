import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipoOperacaoBoleta } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

export class QueryModalidadeDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: TipoOperacaoBoleta,
    description: 'Filtra modalidades compatíveis com este tipo de operação de Boleta',
  })
  @IsOptional()
  @IsEnum(TipoOperacaoBoleta)
  tipoBoleta?: TipoOperacaoBoleta;
}
