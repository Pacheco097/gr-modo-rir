import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FretePrevisto } from '@prisma/client';
import { IsNumber, IsOptional, IsString } from 'class-validator';

/** Cria/edita um frete previsto por PAR de contratos (CTR compra × CTR venda). */
export class FretePrevistoInputDto {
  @ApiPropertyOptional({ description: 'Nº do contrato de COMPRA da amarração' })
  @IsOptional()
  @IsString()
  ctrCompra?: string;

  @ApiPropertyOptional({ description: 'Nº do contrato de VENDA da amarração' })
  @IsOptional()
  @IsString()
  ctrVenda?: string;

  @ApiProperty({ description: 'R$/t' })
  @IsNumber()
  valor: number;

  // ── Legado (rota + vigência) — opcionais ──
  @ApiPropertyOptional({ description: 'Legado: Origem»Destino' })
  @IsOptional()
  @IsString()
  rota?: string;

  @ApiPropertyOptional({ description: 'Legado: início da vigência (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  vigenciaInicio?: string;

  @ApiPropertyOptional({ description: 'Legado: fim da vigência (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  vigenciaFim?: string;
}

export class FretePrevistoResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ nullable: true }) ctrCompra: string | null;
  @ApiProperty({ nullable: true }) ctrVenda: string | null;
  @ApiProperty() valor: number;
  @ApiProperty({ nullable: true }) rota: string | null;
  @ApiProperty({ nullable: true }) vigenciaInicio: string | null;
  @ApiProperty({ nullable: true }) vigenciaFim: string | null;

  static fromEntity(e: FretePrevisto): FretePrevistoResponseDto {
    return {
      id: e.id,
      ctrCompra: e.ctrCompra ?? null,
      ctrVenda: e.ctrVenda ?? null,
      valor: Number(e.valor),
      rota: e.rota ?? null,
      vigenciaInicio: e.vigenciaInicio ?? null,
      vigenciaFim: e.vigenciaFim ?? null,
    };
  }
}
