import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContratoStatus, ContratoTipo } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

export class QueryContratoDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ContratoTipo })
  @IsOptional()
  @IsEnum(ContratoTipo)
  tipo?: ContratoTipo;

  @ApiPropertyOptional({ enum: ContratoStatus })
  @IsOptional()
  @IsEnum(ContratoStatus)
  status?: ContratoStatus;

  @ApiPropertyOptional({ description: 'Filtra pelos contratos de uma boleta' })
  @IsOptional()
  @IsUUID()
  boletaId?: string;

  @ApiPropertyOptional({ description: 'Filtra por número no ERP/Protheus' })
  @IsOptional()
  @IsString()
  numeroErpMaxicon?: string;
}
