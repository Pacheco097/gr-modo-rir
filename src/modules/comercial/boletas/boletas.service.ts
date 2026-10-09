import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StatusBoleta, TipoOperacaoBoleta } from '@prisma/client';
import { resolverQuantidadeSc } from '../../../common/utils/quantidade';
import { PrismaService } from '../../../database/prisma.service';
import { PaginatedResultDto } from '../../../common/dto/paginated-result.dto';
import { MODALIDADES_COMPATIVEIS } from '../../../common/constants/modalidade-compativel.map';
import { BoletaCalculoService } from './boleta-calculo.service';
import { CreateBoletaDto } from './dto/create-boleta.dto';
import { UpdateBoletaDto } from './dto/update-boleta.dto';
import { QueryBoletaDto } from './dto/query-boleta.dto';
import { BoletaResponseDto } from './dto/boleta-response.dto';
import { BoletaKpisResponseDto } from './dto/boleta-kpis-response.dto';

const INCLUDE_COMPLETO = {
  classificadoras: true,
  documentosConfirmacao: true,
} satisfies Prisma.BoletaInclude;

@Injectable()
export class BoletasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculo: BoletaCalculoService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────
  // Leitura
  // ─────────────────────────────────────────────────────────────────────

  async findAll(query: QueryBoletaDto): Promise<PaginatedResultDto<BoletaResponseDto>> {
    const where: Prisma.BoletaWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.tipo ? { tipo: query.tipo } : {}),
      ...(query.empresaGrupoId ? { empresaGrupoId: query.empresaGrupoId } : {}),
      ...(query.safraId ? { safraId: query.safraId } : {}),
      ...(query.produtoId ? { produtoId: query.produtoId } : {}),
      ...(query.busca
        ? {
            OR: [
              { numero: { contains: query.busca, mode: 'insensitive' as const } },
              { contraparteNome: { contains: query.busca, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.boleta.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { [query.ordenarPor ?? 'createdAt']: query.ordenarDirecao },
        include: INCLUDE_COMPLETO,
      }),
      this.prisma.boleta.count({ where }),
    ]);

    return new PaginatedResultDto(
      rows.map((r) => this.toResponseDto(r)),
      query.page,
      query.limit,
      total,
    );
  }

  async findOne(id: string): Promise<BoletaResponseDto> {
    const entity = await this.buscarOuFalhar(id);
    return this.toResponseDto(entity);
  }

  async kpis(): Promise<BoletaKpisResponseDto> {
    const where = { deletedAt: null } as const;
    const [rascunho, pendente, aprovada, reprovada, cancelada, total] = await Promise.all([
      this.prisma.boleta.count({ where: { ...where, status: StatusBoleta.RASCUNHO } }),
      this.prisma.boleta.count({ where: { ...where, status: StatusBoleta.PENDENTE } }),
      this.prisma.boleta.count({ where: { ...where, status: StatusBoleta.APROVADA } }),
      this.prisma.boleta.count({ where: { ...where, status: StatusBoleta.REPROVADA } }),
      this.prisma.boleta.count({ where: { ...where, status: StatusBoleta.CANCELADA } }),
      this.prisma.boleta.count({ where }),
    ]);
    return { rascunho, pendente, aprovada, reprovada, cancelada, total };
  }

  // ─────────────────────────────────────────────────────────────────────
  // Escrita — ciclo de vida
  // ─────────────────────────────────────────────────────────────────────

  async criar(dto: CreateBoletaDto, usuario: string): Promise<BoletaResponseDto> {
    const produto = await this.buscarProdutoOuFalhar(dto.produtoId);
    const quantidadeSc = resolverQuantidadeSc(dto, dto.fatorKgPorSaca);
    await this.validarModalidadeCompativel(dto.tipo, dto.modalidadeId);
    this.validarPrecoObrigatorio(dto.preco, dto.tipo);

    const armazenagem = this.normalizarArmazenagem(dto);
    const preco = dto.preco ?? undefined;

    const resultado = this.calculo.calcularResultado({
      tipo: dto.tipo,
      quantidadeSc: quantidadeSc,
      preco: preco ?? 0,
      fatorKgPorSaca: dto.fatorKgPorSaca,
      freteRsPorTon: dto.freteRsPorTon,
      icmsPct: dto.icmsPct ?? 0,
      corretagemPct: dto.corretagemPct ?? 0,
      comissaoInternaPct: dto.comissaoInternaPct ?? 0,
      custoArmazenagemSimplificadaRsSc: dto.custoArmazenagemSimplificadaRsSc ?? 0,
      classificadoras: dto.classificadoras ?? [],
      produtoNome: produto.nome,
      contraparteNome: dto.contraparteNome,
    });

    const entity = await this.prisma.$transaction(async (tx) => {
      const numero = await this.gerarNumero(tx);

      const boleta = await tx.boleta.create({
        data: {
          numero,
          tipo: dto.tipo,
          status: StatusBoleta.RASCUNHO,
          empresaGrupoId: dto.empresaGrupoId,
          safraId: dto.safraId,
          dataNegociacao: new Date(dto.dataNegociacao),
          contraparteId: dto.contraparteId,
          contraparteNome: dto.contraparteNome,
          contraparteDocumento: dto.contraparteDocumento,
          contraparteIe: dto.contraparteIe,
          contraparteMunicipio: dto.contraparteMunicipio,
          contraparteUf: dto.contraparteUf,
          produtoId: dto.produtoId,
          modalidadeId: dto.modalidadeId,
          fatorKgPorSaca: dto.fatorKgPorSaca,
          quantidadeSc: quantidadeSc,
          pesoKg: resultado.pesoKg,
          preco: preco ?? null,
          moeda: dto.moeda,
          condicaoPagamento: dto.condicaoPagamento,
          dataPagamento: dto.dataPagamento ? new Date(dto.dataPagamento) : null,
          icmsPct: dto.icmsPct ?? 0,
          quebraTecnicaTradingPct: dto.quebraTecnicaTradingPct ?? 0,
          custoFinanceiroPct: dto.custoFinanceiroPct ?? 0,
          ...armazenagem,
          freteTipo: dto.freteTipo,
          freteRsPorTon: dto.freteRsPorTon,
          dataInicioEntrega: dto.dataInicioEntrega ? new Date(dto.dataInicioEntrega) : null,
          dataFimEntrega: dto.dataFimEntrega ? new Date(dto.dataFimEntrega) : null,
          localEntrega: dto.localEntrega,
          corretoraId: dto.corretoraId,
          corretagemPct: dto.corretagemPct ?? 0,
          comissaoInternaPct: dto.comissaoInternaPct ?? 0,
          custoArmazenagemSimplificadaRsSc: dto.custoArmazenagemSimplificadaRsSc ?? 0,
          classificacaoPadraoRsSc: dto.classificacaoPadraoRsSc ?? 1.9,
          temClassificacao: dto.temClassificacao ?? false,
          localArmazem: dto.localArmazem,
          comercialResponsavelId: dto.comercialResponsavelId,
          observacoes: dto.observacoes,
          ...this.resultadoParaColunas(resultado),
          createdBy: usuario,
          updatedBy: usuario,
          classificadoras: {
            create: (dto.classificadoras ?? []).map((c) => ({ nome: c.nome, valorRsPorSc: c.valorRsPorSc })),
          },
          historico: {
            create: { statusAnterior: null, statusNovo: StatusBoleta.RASCUNHO, usuario, motivo: 'Boleta criada' },
          },
        },
        include: INCLUDE_COMPLETO,
      });

      return boleta;
    });

    return this.toResponseDto(entity);
  }

  async atualizar(id: string, dto: UpdateBoletaDto, usuario: string): Promise<BoletaResponseDto> {
    const atual = await this.buscarOuFalhar(id);
    if (atual.status !== StatusBoleta.RASCUNHO) {
      throw new BadRequestException('Boleta só pode ser editada enquanto está em Rascunho');
    }

    const produto = await this.buscarProdutoOuFalhar(dto.produtoId);
    const quantidadeSc = resolverQuantidadeSc(dto, dto.fatorKgPorSaca);
    await this.validarModalidadeCompativel(dto.tipo, dto.modalidadeId);
    this.validarPrecoObrigatorio(dto.preco, dto.tipo);

    const armazenagem = this.normalizarArmazenagem(dto);
    const preco = dto.preco ?? undefined;

    const resultado = this.calculo.calcularResultado({
      tipo: dto.tipo,
      quantidadeSc: quantidadeSc,
      preco: preco ?? 0,
      fatorKgPorSaca: dto.fatorKgPorSaca,
      freteRsPorTon: dto.freteRsPorTon,
      icmsPct: dto.icmsPct ?? 0,
      corretagemPct: dto.corretagemPct ?? 0,
      comissaoInternaPct: dto.comissaoInternaPct ?? 0,
      custoArmazenagemSimplificadaRsSc: dto.custoArmazenagemSimplificadaRsSc ?? 0,
      classificadoras: dto.classificadoras ?? [],
      produtoNome: produto.nome,
      contraparteNome: dto.contraparteNome,
    });

    const entity = await this.prisma.$transaction(async (tx) => {
      await tx.boletaClassificadora.deleteMany({ where: { boletaId: id } });

      const boleta = await tx.boleta.update({
        where: { id },
        data: {
          tipo: dto.tipo,
          empresaGrupoId: dto.empresaGrupoId,
          safraId: dto.safraId,
          dataNegociacao: new Date(dto.dataNegociacao),
          contraparteId: dto.contraparteId,
          contraparteNome: dto.contraparteNome,
          contraparteDocumento: dto.contraparteDocumento,
          contraparteIe: dto.contraparteIe,
          contraparteMunicipio: dto.contraparteMunicipio,
          contraparteUf: dto.contraparteUf,
          produtoId: dto.produtoId,
          modalidadeId: dto.modalidadeId,
          fatorKgPorSaca: dto.fatorKgPorSaca,
          quantidadeSc: quantidadeSc,
          pesoKg: resultado.pesoKg,
          preco: preco ?? null,
          moeda: dto.moeda,
          condicaoPagamento: dto.condicaoPagamento,
          dataPagamento: dto.dataPagamento ? new Date(dto.dataPagamento) : null,
          icmsPct: dto.icmsPct ?? 0,
          quebraTecnicaTradingPct: dto.quebraTecnicaTradingPct ?? 0,
          custoFinanceiroPct: dto.custoFinanceiroPct ?? 0,
          ...armazenagem,
          freteTipo: dto.freteTipo,
          freteRsPorTon: dto.freteRsPorTon,
          dataInicioEntrega: dto.dataInicioEntrega ? new Date(dto.dataInicioEntrega) : null,
          dataFimEntrega: dto.dataFimEntrega ? new Date(dto.dataFimEntrega) : null,
          localEntrega: dto.localEntrega,
          corretoraId: dto.corretoraId,
          corretagemPct: dto.corretagemPct ?? 0,
          comissaoInternaPct: dto.comissaoInternaPct ?? 0,
          custoArmazenagemSimplificadaRsSc: dto.custoArmazenagemSimplificadaRsSc ?? 0,
          classificacaoPadraoRsSc: dto.classificacaoPadraoRsSc ?? 1.9,
          temClassificacao: dto.temClassificacao ?? false,
          localArmazem: dto.localArmazem,
          comercialResponsavelId: dto.comercialResponsavelId,
          observacoes: dto.observacoes,
          ...this.resultadoParaColunas(resultado),
          updatedBy: usuario,
          classificadoras: {
            create: (dto.classificadoras ?? []).map((c) => ({ nome: c.nome, valorRsPorSc: c.valorRsPorSc })),
          },
        },
        include: INCLUDE_COMPLETO,
      });

      return boleta;
    });

    return this.toResponseDto(entity);
  }

  async enviarParaAprovacao(id: string, usuario: string): Promise<BoletaResponseDto> {
    const atual = await this.buscarOuFalhar(id);
    if (atual.status !== StatusBoleta.RASCUNHO) {
      throw new BadRequestException('Somente boletas em Rascunho podem ser enviadas para aprovação');
    }
    if (atual.tipo !== TipoOperacaoBoleta.REMESSA && (atual.preco === null || Number(atual.preco) <= 0)) {
      throw new BadRequestException('Preencha o preço antes de enviar para aprovação');
    }

    const entity = await this.transicionar(id, atual.status, StatusBoleta.PENDENTE, usuario, 'Enviada para aprovação');
    return this.toResponseDto(entity);
  }

  async aprovar(id: string, usuario: string): Promise<BoletaResponseDto> {
    const atual = await this.buscarOuFalhar(id);

    if (atual.status !== StatusBoleta.PENDENTE) {
      throw new BadRequestException('Boleta precisa estar Pendente para ser aprovada');
    }

    const entity = await this.prisma.boleta.update({
      where: { id },
      data: {
        status: StatusBoleta.APROVADA,
        aprovadoPor: usuario,
        aprovadoEm: new Date(),
        updatedBy: usuario,
        historico: {
          create: { statusAnterior: atual.status, statusNovo: StatusBoleta.APROVADA, usuario, motivo: 'Boleta aprovada' },
        },
      },
      include: INCLUDE_COMPLETO,
    });
    return this.toResponseDto(entity);
  }

  async reprovar(id: string, motivo: string, usuario: string): Promise<BoletaResponseDto> {
    const atual = await this.buscarOuFalhar(id);
    if (atual.status !== StatusBoleta.PENDENTE) {
      throw new BadRequestException('Boleta precisa estar Pendente para ser reprovada');
    }

    const entity = await this.prisma.boleta.update({
      where: { id },
      data: {
        status: StatusBoleta.REPROVADA,
        reprovadoPor: usuario,
        reprovadoEm: new Date(),
        motivoReprovacao: motivo,
        updatedBy: usuario,
        historico: {
          create: { statusAnterior: atual.status, statusNovo: StatusBoleta.REPROVADA, usuario, motivo },
        },
      },
      include: INCLUDE_COMPLETO,
    });
    return this.toResponseDto(entity);
  }

  async cancelar(id: string, motivo: string, usuario: string): Promise<BoletaResponseDto> {
    const atual = await this.buscarOuFalhar(id);
    if (!([StatusBoleta.RASCUNHO, StatusBoleta.PENDENTE] as StatusBoleta[]).includes(atual.status)) {
      throw new BadRequestException('Boleta só pode ser cancelada em Rascunho ou Pendente');
    }

    const entity = await this.prisma.boleta.update({
      where: { id },
      data: {
        status: StatusBoleta.CANCELADA,
        canceladoPor: usuario,
        canceladoEm: new Date(),
        motivoCancelamento: motivo,
        updatedBy: usuario,
        historico: {
          create: { statusAnterior: atual.status, statusNovo: StatusBoleta.CANCELADA, usuario, motivo },
        },
      },
      include: INCLUDE_COMPLETO,
    });
    return this.toResponseDto(entity);
  }

  async vincularContrato(id: string, numeroContratoErp: string, usuario: string): Promise<BoletaResponseDto> {
    const atual = await this.buscarOuFalhar(id);
    if (atual.status !== StatusBoleta.APROVADA) {
      throw new BadRequestException('Somente boletas Aprovadas podem ser vinculadas a um contrato jurídico');
    }

    const entity = await this.prisma.boleta.update({
      where: { id },
      data: {
        status: StatusBoleta.CONTRATO_VINCULADO,
        numeroContratoVinculado: numeroContratoErp,
        dataVinculacaoContrato: new Date(),
        updatedBy: usuario,
        historico: {
          create: {
            statusAnterior: StatusBoleta.APROVADA,
            statusNovo: StatusBoleta.CONTRATO_VINCULADO,
            usuario,
            motivo: `Vinculada ao contrato jurídico ${numeroContratoErp}`,
          },
        },
      },
      include: INCLUDE_COMPLETO,
    });
    return this.toResponseDto(entity);
  }

  async anexarDocumento(
    id: string,
    arquivo: { nomeArquivo: string; caminhoArquivo: string; tamanhoBytes: number },
    usuario: string,
  ) {
    const atual = await this.buscarOuFalhar(id);
    if (atual.status !== StatusBoleta.RASCUNHO) {
      throw new BadRequestException('Documentos só podem ser anexados em Rascunho');
    }
    return this.prisma.boletaDocumento.create({
      data: { boletaId: id, ...arquivo, enviadoPor: usuario },
    });
  }

  async removerDocumento(id: string, documentoId: string): Promise<void> {
    const documento = await this.prisma.boletaDocumento.findFirst({ where: { id: documentoId, boletaId: id } });
    if (!documento) throw new NotFoundException('Documento não encontrado para esta boleta');
    await this.prisma.boletaDocumento.delete({ where: { id: documentoId } });
  }

  // ─────────────────────────────────────────────────────────────────────
  // Auxiliares privados
  // ─────────────────────────────────────────────────────────────────────

  private async transicionar(
    id: string,
    statusAnterior: StatusBoleta,
    statusNovo: StatusBoleta,
    usuario: string,
    motivo: string,
  ) {
    return this.prisma.boleta.update({
      where: { id },
      data: {
        status: statusNovo,
        updatedBy: usuario,
        historico: { create: { statusAnterior, statusNovo, usuario, motivo } },
      },
      include: INCLUDE_COMPLETO,
    });
  }

  private async gerarNumero(tx: Prisma.TransactionClient): Promise<string> {
    const ano = new Date().getFullYear();
    const prefixo = `BO-${ano}-`;
    // Reconcilia o contador com o maior número já existente no ano — evita
    // colisão quando há boletas pré-carregadas (seed) sem atualizar a sequência.
    const ultima = await tx.boleta.findFirst({
      where: { numero: { startsWith: prefixo } },
      orderBy: { numero: 'desc' },
      select: { numero: true },
    });
    const maxExistente = ultima ? parseInt(ultima.numero.slice(prefixo.length), 10) || 0 : 0;
    const atual = await tx.boletaSequencia.findUnique({ where: { ano } });
    const proximo = Math.max(atual?.ultimoNumero ?? 0, maxExistente) + 1;
    await tx.boletaSequencia.upsert({
      where: { ano },
      create: { ano, ultimoNumero: proximo },
      update: { ultimoNumero: proximo },
    });
    return `${prefixo}${String(proximo).padStart(6, '0')}`;
  }

  private async buscarOuFalhar(id: string) {
    const entity = await this.prisma.boleta.findFirst({
      where: { id, deletedAt: null },
      include: INCLUDE_COMPLETO,
    });
    if (!entity) throw new NotFoundException(`Boleta ${id} não encontrada`);
    return entity;
  }

  private async buscarProdutoOuFalhar(produtoId: string) {
    const produto = await this.prisma.produto.findUnique({ where: { id: produtoId } });
    if (!produto) throw new NotFoundException(`Produto ${produtoId} não encontrado`);
    return produto;
  }

  private async validarModalidadeCompativel(tipo: CreateBoletaDto['tipo'], modalidadeId: string): Promise<void> {
    const modalidade = await this.prisma.modalidade.findUnique({ where: { id: modalidadeId } });
    if (!modalidade) throw new NotFoundException(`Modalidade ${modalidadeId} não encontrada`);
    if (!MODALIDADES_COMPATIVEIS[tipo].includes(modalidade.tipoOperacao)) {
      throw new BadRequestException(
        `Modalidade "${modalidade.nome}" (${modalidade.tipoOperacao}) não é compatível com o tipo de operação ${tipo}`,
      );
    }
  }

  private validarPrecoObrigatorio(preco: number | undefined, tipo?: TipoOperacaoBoleta): void {
    // REMESSA (transferência p/ depósito/armazém) não tem preço — não exige.
    if (tipo === TipoOperacaoBoleta.REMESSA) return;
    if (preco === undefined || preco === null || preco <= 0) {
      throw new BadRequestException('Preço é obrigatório e deve ser maior que zero para esta boleta');
    }
  }

  /** Zera os 3 campos de armazenagem quando temArmazenagem = false (replica onBArmazToggle). */
  private normalizarArmazenagem(dto: CreateBoletaDto) {
    if (!dto.temArmazenagem) {
      return { temArmazenagem: false, armPadronizacaoRate: 0, armArmazenagemRate: 0, armQuebraTecnicaPct: 0 };
    }
    return {
      temArmazenagem: true,
      armPadronizacaoRate: dto.armPadronizacaoRate ?? 4.0,
      armArmazenagemRate: dto.armArmazenagemRate ?? 0.25,
      armQuebraTecnicaPct: dto.armQuebraTecnicaPct ?? 0.25,
    };
  }

  private resultadoParaColunas(resultado: ReturnType<BoletaCalculoService['calcularResultado']>) {
    return {
      valorBruto: resultado.valorBruto,
      valorFreteTotal: resultado.valorFreteTotal,
      valorCorretagem: resultado.valorCorretagem,
      valorComissaoInterna: resultado.valorComissaoInterna,
      valorArmazenagemSimplificada: resultado.valorArmazenagemSimplificada,
      valorClassificacao: resultado.valorClassificacao,
      valorCustosTotal: resultado.valorCustosTotal,
      valorLiquido: resultado.valorLiquido,
      margemPct: resultado.margemPct,
      resultadoPorSaca: resultado.resultadoPorSaca,
      resultadoPorKg: resultado.resultadoPorKg,
      creditoIcms: resultado.creditoIcms,
      creditoPisCofins: resultado.creditoPisCofins,
      valorLiquidoComFiscal: resultado.valorLiquidoComFiscal,
      resultadoPorSacaComFiscal: resultado.resultadoPorSacaComFiscal,
    };
  }

  private toResponseDto(entity: Parameters<typeof BoletaResponseDto.fromEntity>[0]): BoletaResponseDto {
    return BoletaResponseDto.fromEntity(entity);
  }
}
