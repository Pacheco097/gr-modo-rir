import { scParaTon } from '../../../../common/utils/quantidade';
import { ApiProperty } from '@nestjs/swagger';
import { AssinaturaStatus, Contrato, ContratoStatus, ContratoTipo } from '@prisma/client';

/** Contrato + relações opcionais (boleta/contraparte) para expor cidade/UF da praça. */
type ContratoComPraca = Contrato & {
  boleta?: { contraparteMunicipio: string | null; contraparteUf: string | null; dataInicioEntrega?: Date | null; dataFimEntrega?: Date | null; corretora?: { nome: string } | null } | null;
  contraparte?: { municipio: string | null; uf: string | null } | null;
  produto?: { nome: string } | null;
};

/** Mercado FUTURO ("a fixar") é derivado do nome do produto — mesma regra do módulo de boletas. */
const A_FIXAR_RE = /a\s*-?\s*fixar/i;

export class ContratoResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ nullable: true }) numeroSistema: string | null;
  @ApiProperty({ nullable: true }) numeroErpMaxicon: string | null;
  @ApiProperty({ enum: ContratoTipo }) tipo: ContratoTipo;
  @ApiProperty({ enum: ContratoStatus }) status: ContratoStatus;

  @ApiProperty({ nullable: true }) boletaId: string | null;
  @ApiProperty({ nullable: true }) contraparteId: string | null;
  @ApiProperty() contraparteNome: string;
  @ApiProperty({ nullable: true }) produtoId: string | null;

  @ApiProperty() quantidadeContratadaSc: number;
  @ApiProperty() quantidadeEntregueSc: number;
  @ApiProperty({ description: 'Quantidade contratada em toneladas' }) quantidadeContratadaTon: number;
  @ApiProperty() quantidadeEntregueTon: number;
  @ApiProperty() saldoTon: number;
  @ApiProperty({ description: 'Saldo a entregar = contratada − entregue' }) saldoSc: number;
  @ApiProperty({ nullable: true }) preco: number | null;
  @ApiProperty({ nullable: true }) dataVencimento: Date | null;

  @ApiProperty({ enum: AssinaturaStatus }) assinatura: AssinaturaStatus;
  @ApiProperty({ nullable: true }) dataEnvioAssinatura: Date | null;
  @ApiProperty({ nullable: true }) dataAssinatura: Date | null;

  @ApiProperty() temArmazenagem: boolean;
  @ApiProperty() temClassificacao: boolean;
  @ApiProperty() icmsPct: number;
  @ApiProperty({ nullable: true }) observacoes: string | null;
  @ApiProperty() createdAt: Date;

  /** Praça da operação (município/UF): snapshot da boleta, fallback do cadastro da contraparte. */
  @ApiProperty({ nullable: true }) municipio: string | null;
  @ApiProperty({ nullable: true }) uf: string | null;
  /** Janela de embarque/entrega herdada da boleta (base p/ datas de armazenagem). */
  @ApiProperty({ nullable: true }) dataInicioEntrega: Date | null;
  @ApiProperty({ nullable: true }) dataFimEntrega: Date | null;
  @ApiProperty({ nullable: true }) corretoraNome: string | null;
  /** Nome do produto do contrato (para exibição e derivação do mercado). */
  @ApiProperty({ nullable: true }) produtoNome: string | null;
  /** true quando o produto é "A Fixar" (mercado FUTURO) — contrato aberto com preço fictício. */
  @ApiProperty() aFixar: boolean;

  static fromEntity(e: ContratoComPraca): ContratoResponseDto {
    const dto = new ContratoResponseDto();
    dto.id = e.id;
    dto.numeroSistema = e.numeroSistema;
    dto.numeroErpMaxicon = e.numeroErpMaxicon;
    dto.tipo = e.tipo;
    dto.status = e.status;
    dto.boletaId = e.boletaId;
    dto.contraparteId = e.contraparteId;
    dto.contraparteNome = e.contraparteNome;
    dto.produtoId = e.produtoId;
    dto.quantidadeContratadaSc = Number(e.quantidadeContratadaSc);
    dto.quantidadeEntregueSc = Number(e.quantidadeEntregueSc);
    dto.saldoSc = Number(e.quantidadeContratadaSc) - Number(e.quantidadeEntregueSc);
    dto.quantidadeContratadaTon = scParaTon(e.quantidadeContratadaSc);
    dto.quantidadeEntregueTon = scParaTon(e.quantidadeEntregueSc);
    dto.saldoTon = scParaTon(dto.saldoSc);
    dto.preco = e.preco === null ? null : Number(e.preco);
    dto.dataVencimento = e.dataVencimento;
    dto.assinatura = e.assinatura;
    dto.dataEnvioAssinatura = e.dataEnvioAssinatura;
    dto.dataAssinatura = e.dataAssinatura;
    dto.temArmazenagem = e.temArmazenagem;
    dto.temClassificacao = e.temClassificacao;
    dto.icmsPct = Number(e.icmsPct);
    dto.observacoes = e.observacoes;
    dto.createdAt = e.createdAt;
    dto.municipio = e.boleta?.contraparteMunicipio ?? e.contraparte?.municipio ?? null;
    dto.uf = e.boleta?.contraparteUf ?? e.contraparte?.uf ?? null;
    dto.dataInicioEntrega = e.boleta?.dataInicioEntrega ?? null;
    dto.dataFimEntrega = e.boleta?.dataFimEntrega ?? null;
    dto.corretoraNome = e.boleta?.corretora?.nome ?? null;
    dto.produtoNome = e.produto?.nome ?? null;
    dto.aFixar = !!e.produto?.nome && A_FIXAR_RE.test(e.produto.nome);
    return dto;
  }
}
