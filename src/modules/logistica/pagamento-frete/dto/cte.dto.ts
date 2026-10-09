import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Cte, CteStatus } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

/** Um CT-e do relatório importado (todos os campos são opcionais exceto a chave). */
export class CteImportItemDto {
  @ApiProperty({ description: 'Chave de acesso — identidade para dedupe' })
  @IsString()
  @MinLength(1)
  chave: string;

  @ApiPropertyOptional({ description: 'Nº do contrato de COMPRA (1ª coluna do Excel)' }) @IsOptional() @IsString() ctrCompra?: string;
  @ApiPropertyOptional({ description: 'Nº do contrato de VENDA (2ª coluna do Excel)' }) @IsOptional() @IsString() ctrVenda?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() codEmpresa?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() empresa?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() numDoc?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serie?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalICMS?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() tpFat?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cnpj?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() emitente?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dtEmissao?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() valorTotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() statusSefaz?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() stManifesto?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() stErp?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dataRegistro?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nf?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serieNf?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nsu?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() produtoCarga?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() obs?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cidadeOrigem?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cidadeDestino?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() qtdCarga?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() unidCarga?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tipoDest?: string;
}

export class ImportarCtesDto {
  @ApiProperty({ type: CteImportItemDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CteImportItemDto)
  itens: CteImportItemDto[];
}

export class ImportarCtesResultDto {
  @ApiProperty() novos: number;
  @ApiProperty({ description: 'CT-Es já existentes que foram atualizados com o relatório' }) atualizados: number;
  @ApiProperty({ description: 'Compatibilidade: igual a atualizados' }) repetidos: number;
  @ApiProperty() ignorados: number;
}

/** Atualização de um campo de controle por chave (frete previsto, nº processo, data pgto). */
export class SetCampoDto {
  @ApiProperty({ enum: ['fretePrevisto', 'numProcesso', 'dataPagamentoStr'] })
  @IsString()
  campo: 'fretePrevisto' | 'numProcesso' | 'dataPagamentoStr';

  @ApiPropertyOptional({ description: 'Novo valor (string; vazio limpa)' })
  @IsOptional()
  @IsString()
  valor?: string;
}

export class AprovarDto {
  @ApiProperty()
  @IsBoolean()
  aprovado: boolean;
}

export class RetirarDto {
  @ApiProperty({ description: 'Motivo da retirada (mín. 3 caracteres)' })
  @IsString()
  @MinLength(3)
  motivo: string;

  @ApiPropertyOptional({ type: String, isArray: true, description: 'Categorias: sefaz|dest|manifesto|manual' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categorias?: string[];

  @ApiPropertyOptional({ description: 'Carimbo de data/hora exibido (ex.: "31/07/2026 11:00")' })
  @IsOptional()
  @IsString()
  dataRetirada?: string;
}

export class CreateCteDto {
  @ApiProperty({ example: 'CTE-2026-000123' })
  @IsString()
  @MinLength(1)
  numeroCte: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  transportadoraNome: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  embarqueId?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  valorTotal: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  icmsPct?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dataEmissao?: string;
}

export class PagarCteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dataPagamento?: string;
}

export class QueryCteDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CteStatus })
  @IsOptional()
  @IsString()
  status?: CteStatus;
}

export class CteResponseDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional({ nullable: true }) chave: string | null;
  @ApiPropertyOptional({ nullable: true }) ctrCompra: string | null;
  @ApiPropertyOptional({ nullable: true }) ctrVenda: string | null;
  @ApiPropertyOptional({ nullable: true }) codEmpresa: number | null;
  @ApiPropertyOptional({ nullable: true }) empresa: string | null;
  @ApiPropertyOptional({ nullable: true }) numDoc: string | null;
  @ApiPropertyOptional({ nullable: true }) serie: string | null;
  @ApiProperty() numeroCte: string;
  @ApiPropertyOptional({ nullable: true }) cnpj: string | null;
  @ApiPropertyOptional({ nullable: true }) emitente: string | null;
  @ApiProperty() transportadoraNome: string;
  @ApiPropertyOptional({ nullable: true }) embarqueId: string | null;
  @ApiProperty() valorTotal: number;
  @ApiProperty() totalICMS: number;
  @ApiProperty() icmsPct: number;
  @ApiProperty({ description: 'Custo SEM ICMS (para resultado)' }) custoSemIcms: number;
  @ApiPropertyOptional({ nullable: true }) tpFat: string | null;
  @ApiPropertyOptional({ nullable: true }) dtEmissao: string | null;
  @ApiPropertyOptional({ nullable: true }) statusSefaz: string | null;
  @ApiPropertyOptional({ nullable: true }) stManifesto: string | null;
  @ApiPropertyOptional({ nullable: true }) stErp: string | null;
  @ApiPropertyOptional({ nullable: true }) dataRegistro: string | null;
  @ApiPropertyOptional({ nullable: true }) nf: string | null;
  @ApiPropertyOptional({ nullable: true }) serieNf: string | null;
  @ApiPropertyOptional({ nullable: true }) nsu: string | null;
  @ApiPropertyOptional({ nullable: true }) produtoCarga: string | null;
  @ApiPropertyOptional({ nullable: true }) obs: string | null;
  @ApiPropertyOptional({ nullable: true }) cidadeOrigem: string | null;
  @ApiPropertyOptional({ nullable: true }) cidadeDestino: string | null;
  @ApiPropertyOptional({ nullable: true }) qtdCarga: number | null;
  @ApiPropertyOptional({ nullable: true }) unidCarga: string | null;
  @ApiPropertyOptional({ nullable: true }) tipoDest: string | null;
  @ApiPropertyOptional({ nullable: true }) fretePrevisto: number | null;
  @ApiPropertyOptional({ nullable: true }) numProcesso: string | null;
  @ApiPropertyOptional({ nullable: true }) dataPagamentoStr: string | null;
  @ApiProperty() aprovado: boolean;
  @ApiProperty() retirado: boolean;
  @ApiPropertyOptional({ nullable: true }) motivoRetirada: string | null;
  @ApiProperty({ type: String, isArray: true }) catRetirada: string[];
  @ApiPropertyOptional({ nullable: true }) dataRetirada: string | null;
  @ApiProperty({ enum: CteStatus }) status: CteStatus;

  static fromEntity(e: Cte): CteResponseDto {
    const dto = new CteResponseDto();
    dto.id = e.id;
    dto.chave = e.chave;
    dto.ctrCompra = e.ctrCompra;
    dto.ctrVenda = e.ctrVenda;
    dto.codEmpresa = e.codEmpresa;
    dto.empresa = e.empresa;
    dto.numDoc = e.numDoc;
    dto.serie = e.serie;
    dto.numeroCte = e.numeroCte;
    dto.cnpj = e.cnpj;
    dto.emitente = e.emitente;
    dto.transportadoraNome = e.transportadoraNome;
    dto.embarqueId = e.embarqueId;
    dto.valorTotal = Number(e.valorTotal);
    dto.totalICMS = Number(e.totalICMS);
    dto.icmsPct = Number(e.icmsPct);
    // custoSemIcms: usa o ICMS absoluto (totalICMS) quando houver; senão deriva do %.
    dto.custoSemIcms = Number(
      (dto.totalICMS > 0 ? dto.valorTotal - dto.totalICMS : dto.valorTotal * (1 - dto.icmsPct / 100)).toFixed(2),
    );
    dto.tpFat = e.tpFat;
    dto.dtEmissao = e.dtEmissao;
    dto.statusSefaz = e.statusSefaz;
    dto.stManifesto = e.stManifesto;
    dto.stErp = e.stErp;
    dto.dataRegistro = e.dataRegistro;
    dto.nf = e.nf;
    dto.serieNf = e.serieNf;
    dto.nsu = e.nsu;
    dto.produtoCarga = e.produtoCarga;
    dto.obs = e.observacao;
    dto.cidadeOrigem = e.cidadeOrigem;
    dto.cidadeDestino = e.cidadeDestino;
    dto.qtdCarga = e.qtdCarga == null ? null : Number(e.qtdCarga);
    dto.unidCarga = e.unidCarga;
    dto.tipoDest = e.tipoDest;
    dto.fretePrevisto = e.fretePrevisto == null ? null : Number(e.fretePrevisto);
    dto.numProcesso = e.numProcesso;
    dto.dataPagamentoStr = e.dataPagamentoStr;
    dto.aprovado = e.aprovado;
    dto.retirado = e.retirado;
    dto.motivoRetirada = e.motivoRetirada;
    dto.catRetirada = e.catRetirada ?? [];
    dto.dataRetirada = e.dataRetirada;
    dto.status = e.status;
    return dto;
  }
}
