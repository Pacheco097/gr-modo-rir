import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsUUID, Min, ValidateIf } from 'class-validator';

export class CreateAmarracaoDto {
  @ApiProperty({ description: 'Contrato de COMPRA (origem do produto)' })
  @IsUUID()
  compraContratoId: string;

  @ApiPropertyOptional({ description: 'Contrato de VENDA (destino comercial). Informe VENDA ou REMESSA.' })
  @IsOptional()
  @IsUUID()
  vendaContratoId?: string;

  @ApiPropertyOptional({ description: 'Contrato de REMESSA (destino operacional — sem venda ainda). Informe VENDA ou REMESSA.' })
  @IsOptional()
  @IsUUID()
  remessaContratoId?: string;

  @ApiPropertyOptional({ description: 'Quantidade a amarrar em TONELADAS (preferencial)' })
  @ValidateIf((o: CreateAmarracaoDto) => o.quantidadeSc === undefined || o.quantidadeSc === null || o.quantidadeTon !== undefined)
  @IsNumber()
  @Min(0.001)
  quantidadeTon?: number;

  @ApiPropertyOptional({ description: 'Legado: quantidade a amarrar em sacas (use quantidadeTon)' })
  @ValidateIf((o: CreateAmarracaoDto) => o.quantidadeTon === undefined || o.quantidadeTon === null)
  @IsNumber()
  @Min(0.001)
  quantidadeSc?: number;
}
