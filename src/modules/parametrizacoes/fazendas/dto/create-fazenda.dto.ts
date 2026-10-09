import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class CreateFazendaDto {
  @ApiProperty({ example: 'Fazenda Santa Fé' })
  @IsString()
  @MinLength(1)
  nome: string;

  @ApiPropertyOptional({ description: 'Empresa do Grupo à qual a fazenda/unidade pertence' })
  @IsOptional()
  @IsUUID()
  empresaGrupoId?: string;

  @ApiPropertyOptional({ example: 'Sorriso' })
  @IsOptional()
  @IsString()
  municipio?: string;

  @ApiPropertyOptional({ example: 'MT' })
  @IsOptional()
  @IsString()
  uf?: string;

  @ApiPropertyOptional({ default: 0, description: 'Área em hectares' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  areaHectares?: number = 0;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  ativa?: boolean = true;
}
