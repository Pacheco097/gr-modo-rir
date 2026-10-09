import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClassificacaoStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

/** 1ª etapa: lança o PREVISTO (total estimado) da classificação do contrato. */
export class DefinirPrevistoDto {
  @ApiProperty({ description: 'Custo previsto TOTAL estimado da classificação (R$)' })
  @IsNumber()
  previsto: number;

  @ApiPropertyOptional({ description: 'Classificadora (legado; use `classificadoras`)' })
  @IsOptional()
  @IsString()
  empresaClassificadora?: string;

  @ApiPropertyOptional({ description: 'Classificadoras previstas para o embarque (substitui a lista atual)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  classificadoras?: string[];
}

/** Lote de pagamentos realizados (um por classificadora, com valor e data). */
export class AdicionarPagamentosLoteDto {
  @ApiProperty({ type: () => [AdicionarPagamentoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdicionarPagamentoDto)
  itens: AdicionarPagamentoDto[];
}

/** Parcela de pagamento (lançamento semanal/mensal). */
export class AdicionarPagamentoDto {
  @ApiProperty({ description: 'Valor pago nesta parcela (R$)' })
  @IsNumber()
  valor: number;

  @ApiProperty({ description: 'Data de pagamento "YYYY-MM-DD"' })
  @IsString()
  dataPagamento: string;

  @ApiPropertyOptional({ description: 'Classificadora que recebeu esta parcela (default: a da amarração)' })
  @IsOptional()
  @IsString()
  empresaClassificadora?: string;
}

/** Uma parcela de pagamento da classificação. */
export class ClassificacaoPagamentoDto {
  @ApiProperty() id: string;
  @ApiProperty() valor: number;
  @ApiProperty() dataPagamento: string;
  @ApiPropertyOptional({ nullable: true }) empresaClassificadora: string | null;
}

/** Uma classificação por amarração (com dados dos contratos e as parcelas). */
export class ClassificacaoResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() amarracaoId: string;
  @ApiProperty({ description: 'Nº ERP do contrato de compra' }) compraNumero: string;
  @ApiProperty({ description: 'Nº ERP do contrato de venda' }) vendaNumero: string;
  @ApiPropertyOptional({ nullable: true }) contraparteCompra: string | null;
  @ApiPropertyOptional({ nullable: true }) contraparteVenda: string | null;
  @ApiPropertyOptional({ nullable: true }) produtoNome: string | null;
  @ApiProperty({ description: 'Quantidade amarrada (sc)' }) quantidadeSc: number;
  @ApiProperty({ description: 'Toneladas (sc × 60 / 1000)' }) tons: number;
  @ApiPropertyOptional({ nullable: true }) empresaClassificadora: string | null;
  @ApiProperty({ type: [String], description: 'Classificadoras previstas' }) classificadoras: string[];
  @ApiPropertyOptional({ nullable: true, description: 'Custo previsto total (R$)' }) previsto: number | null;
  @ApiProperty({ description: 'Realizado = soma das parcelas (R$)' }) realizado: number;
  @ApiPropertyOptional({ nullable: true, description: 'Saving = previsto − realizado (R$)' }) saving: number | null;
  @ApiProperty({ description: 'Quitada = realizado ≥ previsto (previsto > 0)' }) quitada: boolean;
  @ApiProperty({ type: ClassificacaoPagamentoDto, isArray: true }) pagamentos: ClassificacaoPagamentoDto[];
  @ApiProperty({ enum: ClassificacaoStatus }) status: ClassificacaoStatus;
}
