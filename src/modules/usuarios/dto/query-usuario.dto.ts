import { ApiPropertyOptional } from '@nestjs/swagger';
import { PerfilAcesso } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryUsuarioDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: PerfilAcesso,
    description: 'Filtra por perfil de acesso — ex.: COMERCIAL para popular o campo "Comercial Responsável" da Boleta',
  })
  @IsOptional()
  @IsEnum(PerfilAcesso)
  perfil?: PerfilAcesso;
}
