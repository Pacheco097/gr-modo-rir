import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateEmpresaGrupoDto {
  @ApiProperty({ example: '453' })
  @IsString()
  @MinLength(1)
  codigo: string;

  @ApiProperty({ example: 'MODO AGROLOGISTICA LTDA' })
  @IsString()
  @MinLength(1)
  nome: string;

  @ApiProperty({ example: 'Trading', description: 'Armazém | Trading | Produtora' })
  @IsString()
  @MinLength(1)
  tipo: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cnpj?: string;

  @ApiProperty({ example: 'Nova Monte Verde' })
  @IsString()
  @MinLength(1)
  municipio: string;

  @ApiProperty({ example: 'MT' })
  @IsString()
  @MinLength(2)
  uf: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  ativa?: boolean = true;
}
