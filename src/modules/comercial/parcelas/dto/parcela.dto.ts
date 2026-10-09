import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/** Uma parcela de entrada (input): valor + data. */
export class ParcelaItemDto {
  @ApiProperty({ description: 'Valor da parcela (R$)' })
  @IsNumber()
  valor: number;

  @ApiProperty({ description: 'Data do movimento "YYYY-MM-DD"' })
  @IsString()
  data: string;
}

/** Substitui todo o cronograma de parcelas do contrato. */
export class SubstituirParcelasDto {
  @ApiProperty({ type: [ParcelaItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParcelaItemDto)
  itens: ParcelaItemDto[];
}

export class ParcelaResponseDto {
  @ApiPropertyOptional({ nullable: true, description: 'null quando é a parcela padrão (ainda não editada)' }) id: string | null;
  @ApiProperty() valor: number;
  @ApiProperty() data: string;
}

/** Cronograma de um contrato + metadados. */
export class ParcelasContratoDto {
  @ApiProperty() contratoId: string;
  @ApiProperty({ description: 'PAGAR (compra) | RECEBER (venda)' }) tipo: 'PAGAR' | 'RECEBER';
  @ApiProperty({ description: 'Nº ERP do contrato' }) contratoNumero: string;
  @ApiProperty({ description: 'Valor total do contrato (qtd × preço)' }) valorContrato: number;
  @ApiProperty({ description: 'true = usando a parcela padrão (data de vencimento, valor cheio)' }) isDefault: boolean;
  @ApiProperty() soma: number;
  @ApiProperty({ type: [ParcelaResponseDto] }) parcelas: ParcelaResponseDto[];
}

/** Um movimento de caixa vindo das parcelas (para o Fluxo de Caixa). */
export class ParcelaFluxoDto {
  @ApiProperty() contratoId: string;
  @ApiProperty() contratoNumero: string;
  @ApiProperty({ nullable: true }) contraparteNome: string | null;
  @ApiProperty({ description: 'PAGAR | RECEBER' }) tipo: 'PAGAR' | 'RECEBER';
  @ApiProperty() valor: number;
  @ApiProperty() data: string;
}
