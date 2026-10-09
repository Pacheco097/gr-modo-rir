import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Armazenagem, ArmazenagemStatus } from '@prisma/client';
import { IsInt, IsNumber, IsOptional, IsString, IsUUID, Matches, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** Campos do pop-up de armazenagem (rates + carência + data de recebimento + preço da saca). */
class ArmazenagemParamsDto {
  @ApiPropertyOptional({ description: 'Padronização (R$/sc, única)' })
  @IsOptional() @IsNumber() @Min(0)
  padronizacaoRate?: number;

  @ApiPropertyOptional({ description: 'Armazenagem (R$/sc a cada 15 dias)' })
  @IsOptional() @IsNumber() @Min(0)
  armazenagemRate?: number;

  @ApiPropertyOptional({ description: 'Quebra técnica (% do saldo a cada 15 dias)' })
  @IsOptional() @IsNumber() @Min(0)
  quebraPct?: number;

  @ApiPropertyOptional({ description: 'Carência em quinzenas isentas de armazenagem/quebra' })
  @IsOptional() @IsInt() @Min(0)
  carenciaQuinzenas?: number;

  @ApiPropertyOptional({ description: 'Preço da saca (R$/sc) p/ valorar a quebra' })
  @IsOptional() @IsNumber() @Min(0)
  precoScRs?: number;

  @ApiPropertyOptional({ description: 'Data de recebimento do produto (YYYY-MM-DD)' })
  @IsOptional() @IsString()
  dataRecebimento?: string;

  @ApiPropertyOptional({ description: 'Data de encerramento / saída (YYYY-MM-DD) — vazio = até hoje' })
  @IsOptional() @IsString()
  dataEncerramento?: string;
}

export class IniciarArmazenagemDto extends ArmazenagemParamsDto {
  @ApiProperty({ description: 'Contrato de compra com armazenagem' })
  @IsUUID()
  contratoId: string;

  @ApiPropertyOptional({ description: 'Quinzenas (opcional — normalmente derivadas da data de recebimento)', default: 0 })
  @IsOptional() @IsInt() @Min(0)
  quinzenas?: number;
}

export class AtualizarArmazenagemDto extends ArmazenagemParamsDto {
  @ApiPropertyOptional()
  @IsOptional() @IsInt() @Min(0)
  quinzenas?: number;

  @ApiPropertyOptional({ description: 'Valor total do pagamento da armazenagem (R$) — editável' })
  @IsOptional() @IsNumber() @Min(0)
  valorPagamento?: number;
}

/** Programa/lança o pagamento da armazenagem → vira LancamentoFinanceiro no Fluxo de Caixa. */
export class LancarArmazenagemDto {
  @ApiProperty({ description: 'Data de pagamento (YYYY-MM-DD)' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dataPagamento deve ser YYYY-MM-DD' })
  dataPagamento: string;

  @ApiPropertyOptional({ description: 'Valor total a pagar (R$). Se omitido, usa o valor já definido ou o custo previsto.' })
  @IsOptional() @IsNumber() @Min(0)
  valorTotal?: number;
}

export class EncerrarArmazenagemDto {
  @ApiPropertyOptional({ description: 'Custo total realizado (R$). Se omitido, usa o previsto.' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  custoRealizadoRs?: number;
}

export class QueryArmazenagemDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ArmazenagemStatus })
  @IsOptional()
  @IsString()
  status?: ArmazenagemStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  contratoId?: string;
}

export class ArmazenagemResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() contratoId: string;
  @ApiProperty({ enum: ArmazenagemStatus }) status: ArmazenagemStatus;
  @ApiProperty() quantidadeSc: number;
  @ApiProperty() padronizacaoRate: number;
  @ApiProperty() armazenagemRate: number;
  @ApiProperty() quebraPct: number;
  @ApiProperty() quinzenas: number;
  @ApiProperty() carenciaQuinzenas: number;
  @ApiProperty({ nullable: true }) precoScRs: number | null;
  @ApiProperty({ nullable: true, description: 'Data de recebimento (YYYY-MM-DD)' }) dataRecebimento: string | null;
  @ApiProperty({ nullable: true, description: 'Data de encerramento (YYYY-MM-DD)' }) dataEncerramento: string | null;
  @ApiProperty({ description: 'Quinzenas decorridas desde o recebimento' }) quinzenasDecorridas: number;
  @ApiProperty({ description: 'Quinzenas efetivamente cobradas (decorridas − carência)' }) quinzenasCobradas: number;
  @ApiProperty({ description: 'Custo de padronização (R$)' }) custoPadronizacaoRs: number;
  @ApiProperty({ description: 'Custo de armazenagem (R$)' }) custoArmazenagemRs: number;
  @ApiProperty({ description: 'Sacas perdidas na quebra' }) quebraSacas: number;
  @ApiProperty({ description: 'Custo da quebra (R$)' }) custoQuebraRs: number;
  @ApiProperty({ description: 'Custo previsto total = padronização + armazenagem + quebra' }) custoPrevistoRs: number;
  @ApiProperty({ nullable: true }) custoRealizadoRs: number | null;
  @ApiProperty({ nullable: true, description: 'Valor total do pagamento (R$) — editável; default = custo previsto' }) valorPagamento: number | null;
  @ApiProperty({ nullable: true, description: 'Data de pagamento (YYYY-MM-DD)' }) dataPagamento: string | null;
  @ApiProperty({ description: 'PENDENTE | LANCADO' }) pagamentoStatus: string;

  /** Cálculo: padronização única + armazenagem×quinzenas cobradas + quebra composta (valorada pelo preço). */
  static calcular(e: {
    quantidadeSc: number; padronizacaoRate: number; armazenagemRate: number; quebraPct: number;
    carenciaQuinzenas: number; precoScRs: number; dataInicio: Date | null; dataEncerramento: Date | null;
  }) {
    const sacas = e.quantidadeSc;
    const padr = e.padronizacaoRate * sacas;
    const ini = e.dataInicio ? e.dataInicio.getTime() : null;
    const fim = (e.dataEncerramento ? e.dataEncerramento : new Date()).getTime();
    const dias = ini != null ? Math.max(0, Math.round((fim - ini) / 86400000)) : 0;
    const per15 = Math.floor(dias / 15);
    const cobradas = Math.max(0, per15 - (e.carenciaQuinzenas || 0));
    const armaz = e.armazenagemRate * sacas * cobradas;
    const q = (e.quebraPct || 0) / 100;
    const sacasApos = sacas * Math.pow(1 - q, cobradas);
    const quebraSacas = Math.max(0, sacas - sacasApos);
    const quebra = quebraSacas * (e.precoScRs || 0);
    return {
      quinzenasDecorridas: per15,
      quinzenasCobradas: cobradas,
      custoPadronizacaoRs: Number(padr.toFixed(2)),
      custoArmazenagemRs: Number(armaz.toFixed(2)),
      quebraSacas: Number(quebraSacas.toFixed(3)),
      custoQuebraRs: Number(quebra.toFixed(2)),
      custoPrevistoRs: Number((padr + armaz + quebra).toFixed(2)),
    };
  }

  static fromEntity(e: Armazenagem): ArmazenagemResponseDto {
    const dto = new ArmazenagemResponseDto();
    dto.id = e.id;
    dto.contratoId = e.contratoId;
    dto.status = e.status;
    dto.quantidadeSc = Number(e.quantidadeSc);
    dto.padronizacaoRate = Number(e.padronizacaoRate);
    dto.armazenagemRate = Number(e.armazenagemRate);
    dto.quebraPct = Number(e.quebraPct);
    dto.quinzenas = e.quinzenas;
    dto.carenciaQuinzenas = e.carenciaQuinzenas ?? 0;
    dto.precoScRs = e.precoScRs === null || e.precoScRs === undefined ? null : Number(e.precoScRs);
    dto.dataRecebimento = e.dataInicio ? e.dataInicio.toISOString().slice(0, 10) : null;
    dto.dataEncerramento = e.dataEncerramento ? e.dataEncerramento.toISOString().slice(0, 10) : null;
    const calc = ArmazenagemResponseDto.calcular({
      quantidadeSc: dto.quantidadeSc, padronizacaoRate: dto.padronizacaoRate, armazenagemRate: dto.armazenagemRate,
      quebraPct: dto.quebraPct, carenciaQuinzenas: dto.carenciaQuinzenas, precoScRs: dto.precoScRs ?? 0,
      dataInicio: e.dataInicio, dataEncerramento: e.dataEncerramento,
    });
    dto.quinzenasDecorridas = calc.quinzenasDecorridas;
    dto.quinzenasCobradas = calc.quinzenasCobradas;
    dto.custoPadronizacaoRs = calc.custoPadronizacaoRs;
    dto.custoArmazenagemRs = calc.custoArmazenagemRs;
    dto.quebraSacas = calc.quebraSacas;
    dto.custoQuebraRs = calc.custoQuebraRs;
    dto.custoPrevistoRs = calc.custoPrevistoRs;
    dto.custoRealizadoRs = e.custoRealizadoRs === null ? null : Number(e.custoRealizadoRs);
    dto.valorPagamento = e.valorPagamento === null || e.valorPagamento === undefined ? null : Number(e.valorPagamento);
    dto.dataPagamento = e.dataPagamento ?? null;
    dto.pagamentoStatus = e.pagamentoStatus ?? 'PENDENTE';
    return dto;
  }
}
