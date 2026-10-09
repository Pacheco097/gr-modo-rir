import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateCorretoraDto {
  @ApiProperty({ example: 'IDEAL CORRETORA DE CEREAIS' })
  @IsString()
  @MinLength(1)
  nome: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cnpj?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contato?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telefone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ default: 0.3, description: '% de corretagem padrão sugerido na boleta' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  corretagemPctPadrao?: number = 0.3;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  ativa?: boolean = true;
}
