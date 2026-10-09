import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Dacte } from '@prisma/client';
import { IsArray, IsNumber, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/** Um registro lido do DACTE (PDF MaxDACTE). */
export class DacteItemDto {
  @ApiProperty({ description: 'Número do CT-e' })
  @IsString()
  @MinLength(1)
  cte: string;

  @ApiPropertyOptional() @IsOptional() @IsString() serie?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() transp?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nf?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() org?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dst?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() prod?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() peso?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() valor?: number;
}

/** Substitui o conjunto de DACTEs carregado (a tela envia tudo que leu do PDF). */
export class ReplaceDactesDto {
  @ApiProperty({ type: DacteItemDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DacteItemDto)
  itens: DacteItemDto[];
}

export class DacteResponseDto {
  @ApiProperty() cte: string;
  @ApiPropertyOptional({ nullable: true }) serie: string | null;
  @ApiPropertyOptional({ nullable: true }) transp: string | null;
  @ApiPropertyOptional({ nullable: true }) nf: string | null;
  @ApiPropertyOptional({ nullable: true }) org: string | null;
  @ApiPropertyOptional({ nullable: true }) dst: string | null;
  @ApiPropertyOptional({ nullable: true }) prod: string | null;
  @ApiPropertyOptional({ nullable: true }) peso: number | null;
  @ApiPropertyOptional({ nullable: true }) valor: number | null;

  static fromEntity(e: Dacte): DacteResponseDto {
    return {
      cte: e.cte,
      serie: e.serie,
      transp: e.transp,
      nf: e.nf,
      org: e.org,
      dst: e.dst,
      prod: e.prod,
      peso: e.peso == null ? null : Number(e.peso),
      valor: e.valor == null ? null : Number(e.valor),
    };
  }
}
