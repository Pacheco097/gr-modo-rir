import { ApiProperty } from '@nestjs/swagger';
import {
  Boleta,
  BoletaClassificadora,
  BoletaDocumento,
  FreteTipoBoleta,
  MoedaBoleta,
  StatusBoleta,
  TipoOperacaoBoleta,
} from '@prisma/client';

type BoletaComRelacoes = Boleta & {
  classificadoras?: BoletaClassificadora[];
  documentosConfirmacao?: BoletaDocumento[];
};

const n = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

export class BoletaClassificadoraResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() nome: string;
  @ApiProperty() valorRsPorSc: number;
}

export class BoletaDocumentoResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() nomeArquivo: string;
  @ApiProperty() tamanhoBytes: number;
  @ApiProperty() enviadoEm: Date;
}

export class BoletaResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() numero: string;
  @ApiProperty({ enum: TipoOperacaoBoleta }) tipo: TipoOperacaoBoleta;
  @ApiProperty({ enum: StatusBoleta }) status: StatusBoleta;

  @ApiProperty() empresaGrupoId: string;
  @ApiProperty() safraId: string;
  @ApiProperty() dataNegociacao: Date;

  @ApiProperty({ nullable: true }) contraparteId: string | null;
  @ApiProperty() contraparteNome: string;
  @ApiProperty() contraparteDocumento: string;
  @ApiProperty({ nullable: true }) contraparteIe: string | null;
  @ApiProperty({ nullable: true }) contraparteMunicipio: string | null;
  @ApiProperty({ nullable: true }) contraparteUf: string | null;

  @ApiProperty() produtoId: string;
  @ApiProperty() modalidadeId: string;
  @ApiProperty() fatorKgPorSaca: number;

  @ApiProperty() quantidadeSc: number;
  @ApiProperty({ description: 'Quantidade em toneladas (pesoKg ÷ 1000)' }) quantidadeTon: number;
  @ApiProperty() pesoKg: number;

  @ApiProperty({ nullable: true }) preco: number | null;
  @ApiProperty({ enum: MoedaBoleta }) moeda: MoedaBoleta;
  @ApiProperty() condicaoPagamento: string;
  @ApiProperty({ nullable: true }) dataPagamento: Date | null;
  @ApiProperty() icmsPct: number;
  @ApiProperty() quebraTecnicaTradingPct: number;
  @ApiProperty() custoFinanceiroPct: number;

  @ApiProperty() temArmazenagem: boolean;
  @ApiProperty() armPadronizacaoRate: number;
  @ApiProperty() armArmazenagemRate: number;
  @ApiProperty() armQuebraTecnicaPct: number;

  @ApiProperty({ enum: FreteTipoBoleta }) freteTipo: FreteTipoBoleta;
  @ApiProperty() freteRsPorTon: number;
  @ApiProperty({ nullable: true }) dataInicioEntrega: Date | null;
  @ApiProperty({ nullable: true }) dataFimEntrega: Date | null;
  @ApiProperty({ nullable: true }) localEntrega: string | null;

  @ApiProperty({ nullable: true }) corretoraId: string | null;
  @ApiProperty() corretagemPct: number;

  @ApiProperty() comissaoInternaPct: number;
  @ApiProperty() custoArmazenagemSimplificadaRsSc: number;
  @ApiProperty() classificacaoPadraoRsSc: number;
  @ApiProperty() temClassificacao: boolean;
  @ApiProperty({ nullable: true }) localArmazem: string | null;

  @ApiProperty() comercialResponsavelId: string;
  @ApiProperty({ nullable: true }) observacoes: string | null;

  // Resultado projetado
  @ApiProperty() valorBruto: number;
  @ApiProperty() valorFreteTotal: number;
  @ApiProperty() valorCorretagem: number;
  @ApiProperty() valorComissaoInterna: number;
  @ApiProperty() valorArmazenagemSimplificada: number;
  @ApiProperty() valorClassificacao: number;
  @ApiProperty() valorCustosTotal: number;
  @ApiProperty() valorLiquido: number;
  @ApiProperty() margemPct: number;
  @ApiProperty() resultadoPorSaca: number;
  @ApiProperty() resultadoPorKg: number;
  @ApiProperty() creditoIcms: number;
  @ApiProperty() creditoPisCofins: number;
  @ApiProperty({ nullable: true }) valorLiquidoComFiscal: number | null;
  @ApiProperty({ nullable: true }) resultadoPorSacaComFiscal: number | null;

  @ApiProperty({ nullable: true }) aprovadoPor: string | null;
  @ApiProperty({ nullable: true }) aprovadoEm: Date | null;
  @ApiProperty({ nullable: true }) motivoReprovacao: string | null;
  @ApiProperty({ nullable: true }) reprovadoPor: string | null;
  @ApiProperty({ nullable: true }) reprovadoEm: Date | null;
  @ApiProperty({ nullable: true }) motivoCancelamento: string | null;
  @ApiProperty({ nullable: true }) canceladoPor: string | null;
  @ApiProperty({ nullable: true }) canceladoEm: Date | null;

  @ApiProperty({ nullable: true }) numeroContratoVinculado: string | null;
  @ApiProperty({ nullable: true }) dataVinculacaoContrato: Date | null;

  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty({ nullable: true }) createdBy: string | null;
  @ApiProperty({ nullable: true }) updatedBy: string | null;

  @ApiProperty({ type: BoletaClassificadoraResponseDto, isArray: true })
  classificadoras: BoletaClassificadoraResponseDto[];

  @ApiProperty({ type: BoletaDocumentoResponseDto, isArray: true })
  documentosConfirmacao: BoletaDocumentoResponseDto[];

  static fromEntity(entity: BoletaComRelacoes): BoletaResponseDto {
    const dto = new BoletaResponseDto();
    Object.assign(dto, {
      id: entity.id,
      numero: entity.numero,
      tipo: entity.tipo,
      status: entity.status,
      empresaGrupoId: entity.empresaGrupoId,
      safraId: entity.safraId,
      dataNegociacao: entity.dataNegociacao,
      contraparteId: entity.contraparteId,
      contraparteNome: entity.contraparteNome,
      contraparteDocumento: entity.contraparteDocumento,
      contraparteIe: entity.contraparteIe,
      contraparteMunicipio: entity.contraparteMunicipio,
      contraparteUf: entity.contraparteUf,
      produtoId: entity.produtoId,
      modalidadeId: entity.modalidadeId,
      fatorKgPorSaca: entity.fatorKgPorSaca,
      quantidadeSc: n(entity.quantidadeSc),
      quantidadeTon: Number(entity.pesoKg) / 1000,
      pesoKg: n(entity.pesoKg),
      preco: n(entity.preco),
      moeda: entity.moeda,
      condicaoPagamento: entity.condicaoPagamento,
      dataPagamento: entity.dataPagamento,
      icmsPct: n(entity.icmsPct),
      quebraTecnicaTradingPct: n(entity.quebraTecnicaTradingPct),
      custoFinanceiroPct: n(entity.custoFinanceiroPct),
      temArmazenagem: entity.temArmazenagem,
      armPadronizacaoRate: n(entity.armPadronizacaoRate),
      armArmazenagemRate: n(entity.armArmazenagemRate),
      armQuebraTecnicaPct: n(entity.armQuebraTecnicaPct),
      freteTipo: entity.freteTipo,
      freteRsPorTon: n(entity.freteRsPorTon),
      dataInicioEntrega: entity.dataInicioEntrega,
      dataFimEntrega: entity.dataFimEntrega,
      localEntrega: entity.localEntrega,
      corretoraId: entity.corretoraId,
      corretagemPct: n(entity.corretagemPct),
      comissaoInternaPct: n(entity.comissaoInternaPct),
      custoArmazenagemSimplificadaRsSc: n(entity.custoArmazenagemSimplificadaRsSc),
      classificacaoPadraoRsSc: n(entity.classificacaoPadraoRsSc),
      temClassificacao: entity.temClassificacao,
      localArmazem: entity.localArmazem,
      comercialResponsavelId: entity.comercialResponsavelId,
      observacoes: entity.observacoes,
      valorBruto: n(entity.valorBruto),
      valorFreteTotal: n(entity.valorFreteTotal),
      valorCorretagem: n(entity.valorCorretagem),
      valorComissaoInterna: n(entity.valorComissaoInterna),
      valorArmazenagemSimplificada: n(entity.valorArmazenagemSimplificada),
      valorClassificacao: n(entity.valorClassificacao),
      valorCustosTotal: n(entity.valorCustosTotal),
      valorLiquido: n(entity.valorLiquido),
      margemPct: n(entity.margemPct),
      resultadoPorSaca: n(entity.resultadoPorSaca),
      resultadoPorKg: n(entity.resultadoPorKg),
      creditoIcms: n(entity.creditoIcms),
      creditoPisCofins: n(entity.creditoPisCofins),
      valorLiquidoComFiscal: n(entity.valorLiquidoComFiscal),
      resultadoPorSacaComFiscal: n(entity.resultadoPorSacaComFiscal),
      aprovadoPor: entity.aprovadoPor,
      aprovadoEm: entity.aprovadoEm,
      motivoReprovacao: entity.motivoReprovacao,
      reprovadoPor: entity.reprovadoPor,
      reprovadoEm: entity.reprovadoEm,
      motivoCancelamento: entity.motivoCancelamento,
      canceladoPor: entity.canceladoPor,
      canceladoEm: entity.canceladoEm,
      numeroContratoVinculado: entity.numeroContratoVinculado,
      dataVinculacaoContrato: entity.dataVinculacaoContrato,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      createdBy: entity.createdBy,
      updatedBy: entity.updatedBy,
      classificadoras: (entity.classificadoras ?? []).map((c) => ({
        id: c.id,
        nome: c.nome,
        valorRsPorSc: n(c.valorRsPorSc)!,
      })),
      documentosConfirmacao: (entity.documentosConfirmacao ?? []).map((d) => ({
        id: d.id,
        nomeArquivo: d.nomeArquivo,
        tamanhoBytes: d.tamanhoBytes,
        enviadoEm: d.enviadoEm,
      })),
    });
    return dto;
  }
}
