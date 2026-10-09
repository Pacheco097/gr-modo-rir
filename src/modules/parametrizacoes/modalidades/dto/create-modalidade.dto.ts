import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ModalidadeTipoOperacao } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateModalidadeDto {
  @ApiProperty({ example: 'MODO', description: 'Rótulo da empresa (MODO | ROSLER etc.)' })
  @IsString()
  @MinLength(1)
  empresaLabel: string;

  @ApiProperty({ example: 'MODO 2022 - VENDA FIXA MERC.INTERNO' })
  @IsString()
  @MinLength(1)
  nome: string;

  @ApiProperty({ enum: ModalidadeTipoOperacao })
  @IsEnum(ModalidadeTipoOperacao)
  tipoOperacao: ModalidadeTipoOperacao;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  ativa?: boolean = true;
}
