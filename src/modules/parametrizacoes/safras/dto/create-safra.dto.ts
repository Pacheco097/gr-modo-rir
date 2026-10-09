import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSafraDto {
  @ApiProperty({ example: '2026' })
  @IsString()
  @MinLength(1)
  codigo: string;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  inicio: string;

  @ApiProperty({ example: '2026-12-31' })
  @IsDateString()
  fim: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  ativa?: boolean = true;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descricao?: string;
}
