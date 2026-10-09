import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PerfilAcesso } from '@prisma/client';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUsuarioDto {
  @ApiProperty({ example: 'Ruber Dallamaria' })
  @IsString()
  @MinLength(1)
  nome: string;

  @ApiProperty({ example: 'ruber.dallamaria@modorir.com.br' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'senhaForte123', minLength: 6 })
  @IsString()
  @MinLength(6)
  senha: string;

  @ApiProperty({ enum: PerfilAcesso })
  @IsEnum(PerfilAcesso)
  perfil: PerfilAcesso;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telefone?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean = true;
}
