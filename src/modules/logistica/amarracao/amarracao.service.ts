import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContratoTipo } from '@prisma/client';
import { resolverQuantidadeSc } from '../../../common/utils/quantidade';
import { PrismaService } from '../../../database/prisma.service';
import { PaginatedResultDto } from '../../../common/dto/paginated-result.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { AmarracaoResponseDto } from './dto/amarracao-response.dto';
import { CreateAmarracaoDto } from './dto/create-amarracao.dto';
import { ComponentesAmarracaoDto } from './dto/componentes-amarracao.dto';
import { ConciliacaoVolumeDto } from './dto/conciliacao-volume.dto';
import { ClassificacaoService } from '../../comercial/classificacao/classificacao.service';

const INCLUDE = {
  compraContrato: { select: { numeroErpMaxicon: true, contraparteNome: true } },
  vendaContrato: { select: { numeroErpMaxicon: true, contraparteNome: true } },
  remessaContrato: { select: { numeroErpMaxicon: true, contraparteNome: true } },
};

@Injectable()
export class AmarracaoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly classificacao: ClassificacaoService,
  ) {}

  async findAll(query: PaginationQueryDto): Promise<PaginatedResultDto<AmarracaoResponseDto>> {
    const where = { deletedAt: null };
    const [rows, total] = await Promise.all([
      this.prisma.amarracao.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { criadoEm: query.ordenarDirecao },
        include: INCLUDE,
      }),
      this.prisma.amarracao.count({ where }),
    ]);
    return new PaginatedResultDto(
      rows.map((r) => AmarracaoResponseDto.fromEntity(r)),
      query.page,
      query.limit,
      total,
    );
  }

  /** Saldos por contrato: contratado − já amarrado. */
  async saldoCompra(contratoId: string): Promise<number> {
    const contrato = await this.prisma.contrato.findFirst({ where: { id: contratoId, deletedAt: null } });
    if (!contrato) return 0;
    const usado = await this.usadoCompra(contratoId);
    return Number(contrato.quantidadeContratadaSc) - usado;
  }

  async saldoVenda(contratoId: string): Promise<number> {
    const contrato = await this.prisma.contrato.findFirst({ where: { id: contratoId, deletedAt: null } });
    if (!contrato) return 0;
    const usado = await this.usadoVenda(contratoId);
    return Number(contrato.quantidadeContratadaSc) - usado;
  }

  async criar(dto: CreateAmarracaoDto, usuario: string): Promise<AmarracaoResponseDto> {
    const quantidadeSc = resolverQuantidadeSc(dto);
    const compra = await this.prisma.contrato.findFirst({ where: { id: dto.compraContratoId, deletedAt: null } });
    if (!compra) throw new BadRequestException('Contrato de compra não encontrado');
    if (compra.tipo !== ContratoTipo.COMPRA) throw new BadRequestException('O contrato de origem deve ser de COMPRA');

    // O destino é VENDA (amarração comercial) OU REMESSA (amarração operacional, sem venda ainda).
    const temVenda = !!dto.vendaContratoId;
    const temRemessa = !!dto.remessaContratoId;
    if (temVenda && temRemessa) throw new BadRequestException('A amarração é compra × VENDA ou compra × REMESSA — não os dois ao mesmo tempo');
    if (!temVenda && !temRemessa) throw new BadRequestException('Informe o contrato de VENDA ou o de REMESSA');

    const saldoC = temVenda ? await this.saldoCompra(dto.compraContratoId) : await this.saldoCompraRemessa(dto.compraContratoId);
    if (quantidadeSc - 1e-6 > saldoC) {
      throw new BadRequestException(`Quantidade maior que o saldo da compra (${saldoC} sc)`);
    }

    if (temVenda) {
      const venda = await this.prisma.contrato.findFirst({ where: { id: dto.vendaContratoId, deletedAt: null } });
      if (!venda) throw new BadRequestException('Contrato de venda não encontrado');
      if (venda.tipo !== ContratoTipo.VENDA) throw new BadRequestException('O contrato de destino deve ser de VENDA');
      const saldoV = await this.saldoVenda(dto.vendaContratoId!);
      if (quantidadeSc - 1e-6 > saldoV) {
        throw new BadRequestException(`Quantidade maior que o saldo da venda (${saldoV} sc)`);
      }
    }

    // Destino REMESSA (compra A → remessa B, sem venda) — operacional.
    if (temRemessa) {
      const remessa = await this.prisma.contrato.findFirst({ where: { id: dto.remessaContratoId, deletedAt: null } });
      if (!remessa) throw new BadRequestException('Contrato de remessa não encontrado');
      if (remessa.tipo !== ContratoTipo.REMESSA) throw new BadRequestException('O contrato de destino deve ser de REMESSA');
      const saldoR = await this.saldoRemessa(dto.remessaContratoId!);
      if (quantidadeSc - 1e-6 > saldoR) {
        throw new BadRequestException(`Quantidade maior que o saldo da remessa (${saldoR} sc)`);
      }
    }

    const amarr = await this.prisma.amarracao.create({
      data: {
        compraContratoId: dto.compraContratoId,
        vendaContratoId: dto.vendaContratoId ?? null,
        remessaContratoId: dto.remessaContratoId ?? null,
        quantidadeSc,
        criadoPor: usuario,
      },
      include: INCLUDE,
    });
    // Gatilho: se compra OU venda tem classificação, cai no subsetor Operações › Classificação.
    await this.classificacao.gerarPendenteDaAmarracao(amarr.id, usuario);
    return AmarracaoResponseDto.fromEntity(amarr);
  }

  async remover(id: string, usuario: string): Promise<void> {
    const amarr = await this.prisma.amarracao.findFirst({ where: { id, deletedAt: null } });
    if (!amarr) throw new NotFoundException(`Amarração ${id} não encontrada`);
    await this.prisma.amarracao.update({ where: { id }, data: { deletedAt: new Date(), criadoPor: usuario } });
  }

  /** Salva os componentes do resultado (override manual). null volta ao AUTO. */
  async atualizarComponentes(id: string, dto: ComponentesAmarracaoDto, usuario: string): Promise<AmarracaoResponseDto> {
    const amarr = await this.prisma.amarracao.findFirst({ where: { id, deletedAt: null }, include: INCLUDE });
    if (!amarr) throw new NotFoundException(`Amarração ${id} não encontrada`);
    const data: Record<string, number | null> = {};
    (['custoArmazenagem', 'custoClassificacao', 'custoJuros', 'custoFrete', 'fretePisCofins', 'freteIcms', 'classifPisCofins', 'corretagemPisCofins', 'icmsManual', 'receitaPisCofins'] as const).forEach((k) => {
      if (dto[k] !== undefined) data[k] = dto[k] === null ? null : Number(dto[k]);
    });
    const atualizado = await this.prisma.amarracao.update({ where: { id }, data: { ...data, criadoPor: usuario }, include: INCLUDE });
    return AmarracaoResponseDto.fromEntity(atualizado);
  }

  /**
   * Salva a conciliação de VOLUME (sobra performada acima do previsto).
   * COMPLEMENTO exige sobra, preço e data de recebimento; SEM_COMPLEMENTO finaliza sem cobrar;
   * status null limpa a decisão (volta a pendente).
   */
  async atualizarConciliacaoVolume(id: string, dto: ConciliacaoVolumeDto, usuario: string): Promise<AmarracaoResponseDto> {
    const amarr = await this.prisma.amarracao.findFirst({ where: { id, deletedAt: null }, include: INCLUDE });
    if (!amarr) throw new NotFoundException(`Amarração ${id} não encontrada`);

    const data: Record<string, string | number | null> = {
      volConcStatus: null, volConcSobraSc: null, volConcPrecoModo: null, volConcPrecoRsSc: null,
      volConcValor: null, volConcDescReceita: null, volConcDescCusto: null, volConcDataRecebimento: null,
    };
    if (dto.volConcStatus === 'COMPLEMENTO') {
      const sobra = Number(dto.volConcSobraSc ?? 0);
      const preco = Number(dto.volConcPrecoRsSc ?? 0);
      const valor = dto.volConcValor != null ? Number(dto.volConcValor) : Number((sobra * preco).toFixed(2));
      if (!(sobra > 0)) throw new BadRequestException('Sobra performada deve ser maior que zero para lançar complemento.');
      if (!(preco > 0)) throw new BadRequestException('Informe o preço (R$/sc) do complemento.');
      if (!dto.volConcDataRecebimento) throw new BadRequestException('Informe a data de recebimento do complemento.');
      data.volConcStatus = 'COMPLEMENTO';
      data.volConcSobraSc = sobra;
      data.volConcPrecoModo = dto.volConcPrecoModo ?? 'MESMO';
      data.volConcPrecoRsSc = preco;
      data.volConcValor = valor;
      data.volConcDataRecebimento = dto.volConcDataRecebimento;
    } else if (dto.volConcStatus === 'DESCONTO') {
      const falta = Number(dto.volConcSobraSc ?? 0);
      const descRec = Number(dto.volConcDescReceita ?? 0);
      const descCus = Number(dto.volConcDescCusto ?? 0);
      if (!(descRec > 0 || descCus > 0)) throw new BadRequestException('Informe o desconto na receita e/ou no custo de compra.');
      if (!dto.volConcDataRecebimento) throw new BadRequestException('Informe a data do ajuste no fluxo de caixa.');
      data.volConcStatus = 'DESCONTO';
      data.volConcSobraSc = falta > 0 ? falta : null;
      data.volConcDescReceita = descRec;
      data.volConcDescCusto = descCus;
      data.volConcDataRecebimento = dto.volConcDataRecebimento;
    } else if (dto.volConcStatus === 'SEM_COMPLEMENTO') {
      data.volConcStatus = 'SEM_COMPLEMENTO';
      data.volConcSobraSc = dto.volConcSobraSc != null ? Number(dto.volConcSobraSc) : null;
    }
    // else: null → limpa a decisão (todos os campos já são null no default)
    const atualizado = await this.prisma.amarracao.update({ where: { id }, data: { ...data, criadoPor: usuario }, include: INCLUDE });
    return AmarracaoResponseDto.fromEntity(atualizado);
  }

  async saldoRemessa(contratoId: string): Promise<number> {
    const contrato = await this.prisma.contrato.findFirst({ where: { id: contratoId, deletedAt: null } });
    if (!contrato) return 0;
    const agg = await this.prisma.amarracao.aggregate({
      where: { remessaContratoId: contratoId, deletedAt: null },
      _sum: { quantidadeSc: true },
    });
    return Number(contrato.quantidadeContratadaSc) - Number(agg._sum.quantidadeSc ?? 0);
  }

  /** Saldo da compra p/ amarração COMERCIAL (compra × venda). Amarrações de REMESSA NÃO consomem. */
  private async usadoCompra(contratoId: string): Promise<number> {
    const agg = await this.prisma.amarracao.aggregate({
      where: { compraContratoId: contratoId, deletedAt: null, vendaContratoId: { not: null } },
      _sum: { quantidadeSc: true },
    });
    return Number(agg._sum.quantidadeSc ?? 0);
  }

  /** Saldo da compra p/ amarração de REMESSA (não remessar mais do que se comprou). */
  async saldoCompraRemessa(contratoId: string): Promise<number> {
    const contrato = await this.prisma.contrato.findFirst({ where: { id: contratoId, deletedAt: null } });
    if (!contrato) return 0;
    const agg = await this.prisma.amarracao.aggregate({
      where: { compraContratoId: contratoId, deletedAt: null, remessaContratoId: { not: null } },
      _sum: { quantidadeSc: true },
    });
    return Number(contrato.quantidadeContratadaSc) - Number(agg._sum.quantidadeSc ?? 0);
  }

  private async usadoVenda(contratoId: string): Promise<number> {
    const agg = await this.prisma.amarracao.aggregate({
      where: { vendaContratoId: contratoId, deletedAt: null },
      _sum: { quantidadeSc: true },
    });
    return Number(agg._sum.quantidadeSc ?? 0);
  }
}
