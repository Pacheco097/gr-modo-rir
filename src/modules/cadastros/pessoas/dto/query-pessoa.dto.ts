import { ApiPropertyOptional } from '@nestjs/swagger';
import { PessoaTipo } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

export class QueryPessoaDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PessoaTipo })
  @IsOptional()
  @IsEnum(PessoaTipo)
  tipo?: PessoaTipo;

  @ApiPropertyOptional({ example: 'MT', description: 'Filtra por UF' })
  @IsOptional()
  @IsString()
  uf?: string;
}
