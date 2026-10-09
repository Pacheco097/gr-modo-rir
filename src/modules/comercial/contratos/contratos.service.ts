import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AssinaturaStatus, ContratoEventoTipo, ContratoStatus, ContratoTipo, Prisma } from '@prisma/client';
import { tonParaSc } from '../../../common/utils/quantidade';
import { PrismaService } from '../../../database/prisma.service';
import { PaginatedResultDto } from '../../../common/dto/paginated-result.dto';
import { ContratoResponseDto } from './dto/contrato-response.dto';
import { CreateContratoDto } from './dto/create-contrato.dto';
import { UpdateContratoDto } from './dto/update-contrato.dto';
import { QueryContratoDto } from './dto/query-contrato.dto';
import { AssinaturaDto, MudarStatusDto, RegistrarEntregaDto, RegistrarExcedenteDto } from './dto/acoes-contrato.dto';
import { ImportarErpDto } from './dto/importar-erp.dto';

/** Transições de status válidas (docx §6). */
const TRANSICOES: Record<ContratoStatus, ContratoStatus[]> = {
  RASCUNHO: [ContratoStatus.EMITIDO, ContratoStatus.CANCELADO],
  EMITIDO: [ContratoStatus.EM_ANDAMENTO, ContratoStatus.CANCELADO],
  EM_ANDAMENTO: [ContratoStatus.EXECUTADO, ContratoStatus.CANCELADO],
  EXECUTADO: [],
  CANCELADO: [],
};

const EXCEDENTE_EVENTO: Record<string, ContratoEventoTipo> = {
  MESMO_PRECO: ContratoEventoTipo.EXCEDENTE_MESMO_PRECO,
  NOVA_BOLETA: ContratoEventoTipo.EXCEDENTE_NOVA_BOLETA,
  ADITIVO: ContratoEventoTipo.EXCEDENTE_ADITIVO,
  ABONO: ContratoEventoTipo.EXCEDENTE_ABONO,
};

@Injectable()
export class ContratosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryContratoDto): Promise<PaginatedResultDto<ContratoResponseDto>> {
    const where: Prisma.ContratoWhereInput = {
      deletedAt: null,
      ...(query.tipo ? { tipo: query.tipo } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.boletaId ? { boletaId: query.boletaId } : {}),
      ...(query.numeroErpMaxicon ? { numeroErpMaxicon: { contains: query.numeroErpMaxicon, mode: 'insensitive' } } : {}),
      ...(query.busca
        ? {
            OR: [
              { numeroSistema: { contains: query.busca, mode: 'insensitive' as const } },
              { contraparteNome: { contains: query.busca, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.contrato.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { [query.ordenarPor ?? 'createdAt']: query.ordenarDirecao },
        include: {
          boleta: { select: { contraparteMunicipio: true, contraparteUf: true, dataInicioEntrega: true, dataFimEntrega: true, corretora: { select: { nome: true } } } },
          contraparte: { select: { municipio: true, uf: true } },
          produto: { select: { nome: true } },
        },
      }),
      this.prisma.contrato.count({ where }),
    ]);

    return new PaginatedResultDto(
      rows.map((r) => ContratoResponseDto.fromEntity(r)),
      query.page,
      query.limit,
      total,
    );
  }

  async findOne(id: string): Promise<ContratoResponseDto> {
    return ContratoResponseDto.fromEntity(await this.buscarOuFalhar(id));
  }

  /** Detalhe com histórico e documentos. */
  async detalhe(id: string) {
    const contrato = await this.prisma.contrato.findFirst({
      where: { id, deletedAt: null },
      include: { historico: { orderBy: { criadoEm: 'desc' } }, documentos: true, produto: { select: { nome: true } } },
    });
    if (!contrato) throw new NotFoundException(`Contrato ${id} não encontrado`);
    return { ...ContratoResponseDto.fromEntity(contrato), historico: contrato.historico, documentos: contrato.documentos };
  }

  async criar(dto: CreateContratoDto, usuario: string): Promise<ContratoResponseDto> {
    if (dto.quantidadeContratadaTon !== undefined && dto.quantidadeContratadaTon !== null) dto.quantidadeContratadaSc = tonParaSc(dto.quantidadeContratadaTon);
    const base = await this.herdarDaBoleta(dto);
    if (!base.contraparteNome) throw new BadRequestException('Informe a contraparte (ou vincule uma boleta)');
    if (!base.quantidadeContratadaSc || base.quantidadeContratadaSc <= 0) {
      throw new BadRequestException('Informe a quantidade contratada (ou vincule uma boleta)');
    }
    // Nº do ERP é o identificador do contrato em todo o fluxo → obrigatório e único.
    const erp = (dto.numeroErpMaxicon ?? '').trim();
    if (!erp) throw new BadRequestException('Informe o número do contrato no ERP');
    await this.garantirErpUnico(erp);
    await this.validarRelacoes(base.boletaId, base.contraparteId, base.produtoId);

    const contrato = await this.prisma.contrato.create({
      data: {
        numeroErpMaxicon: erp,
        tipo: dto.tipo,
        status: ContratoStatus.RASCUNHO,
        boletaId: base.boletaId,
        contraparteId: base.contraparteId,
        contraparteNome: base.contraparteNome,
        produtoId: base.produtoId,
        quantidadeContratadaSc: base.quantidadeContratadaSc,
        preco: base.preco ?? null,
        dataVencimento: base.dataVencimento ? new Date(base.dataVencimento) : null,
        temArmazenagem: base.temArmazenagem,
        armPadronizacaoRate: base.armPadronizacaoRate,
        armArmazenagemRate: base.armArmazenagemRate,
        armQuebraTecnicaPct: base.armQuebraTecnicaPct,
        quebraTecnicaPct: base.quebraTecnicaPct,
        custoFinanceiroPct: base.custoFinanceiroPct,
        icmsPct: base.icmsPct,
        temClassificacao: base.temClassificacao,
        observacoes: dto.observacoes,
        createdBy: usuario,
        updatedBy: usuario,
        historico: {
          create: { evento: ContratoEventoTipo.CRIACAO, para: ContratoStatus.RASCUNHO, usuario },
        },
      },
    });
    return ContratoResponseDto.fromEntity(contrato);
  }

  async atualizar(id: string, dto: UpdateContratoDto, usuario: string): Promise<ContratoResponseDto> {
    if (dto.quantidadeContratadaTon !== undefined && dto.quantidadeContratadaTon !== null) dto.quantidadeContratadaSc = tonParaSc(dto.quantidadeContratadaTon);
    const atual = await this.buscarOuFalhar(id);
    if (atual.status === ContratoStatus.EXECUTADO || atual.status === ContratoStatus.CANCELADO) {
      throw new BadRequestException(`Contrato ${atual.status} não pode ser editado`);
    }
    await this.validarRelacoes(undefined, dto.contraparteId, dto.produtoId);
    // Se está trocando o nº do ERP, garante que não colide com outro contrato.
    if (dto.numeroErpMaxicon != null && dto.numeroErpMaxicon.trim() && dto.numeroErpMaxicon.trim() !== atual.numeroErpMaxicon) {
      const dup = await this.prisma.contrato.findFirst({
        where: { numeroErpMaxicon: dto.numeroErpMaxicon.trim(), deletedAt: null, id: { not: id } },
        select: { id: true },
      });
      if (dup) throw new BadRequestException(`Já existe contrato com o número de ERP ${dto.numeroErpMaxicon.trim()}`);
    }

    const precoMudou = dto.preco != null && Number(atual.preco ?? -1) !== dto.preco;
    const contrato = await this.prisma.contrato.update({
      where: { id },
      data: {
        numeroErpMaxicon: dto.numeroErpMaxicon,
        contraparteId: dto.contraparteId,
        contraparteNome: dto.contraparteNome,
        produtoId: dto.produtoId,
        quantidadeContratadaSc: dto.quantidadeContratadaSc,
        preco: dto.preco,
        dataVencimento: dto.dataVencimento ? new Date(dto.dataVencimento) : undefined,
        temArmazenagem: dto.temArmazenagem,
        observacoes: dto.observacoes,
        updatedBy: usuario,
        ...(precoMudou
          ? {
              historico: {
                create: {
                  evento: ContratoEventoTipo.PRECO,
                  de: String(atual.preco ?? ''),
                  para: String(dto.preco),
                  usuario,
                },
              },
            }
          : {}),
      },
    });
    return ContratoResponseDto.fromEntity(contrato);
  }

  async mudarStatus(id: string, dto: MudarStatusDto, usuario: string): Promise<ContratoResponseDto> {
    const atual = await this.buscarOuFalhar(id);
    if (atual.status === dto.status) return ContratoResponseDto.fromEntity(atual);
    if (!TRANSICOES[atual.status].includes(dto.status)) {
      throw new BadRequestException(`Transição ${atual.status} → ${dto.status} não permitida`);
    }
    const contrato = await this.prisma.contrato.update({
      where: { id },
      data: {
        status: dto.status,
        updatedBy: usuario,
        historico: {
          create: { evento: ContratoEventoTipo.STATUS, de: atual.status, para: dto.status, detalhe: dto.motivo, usuario },
        },
      },
    });
    return ContratoResponseDto.fromEntity(contrato);
  }

  async atualizarAssinatura(id: string, dto: AssinaturaDto, usuario: string): Promise<ContratoResponseDto> {
    const atual = await this.buscarOuFalhar(id);
    // Regra: enviar para assinatura (ou já assinado) EMITE o contrato automaticamente
    // — tira do RASCUNHO → EMITIDO sem precisar de outra edição.
    const emiteAuto =
      atual.status === ContratoStatus.RASCUNHO &&
      (dto.assinatura === AssinaturaStatus.ENVIADO || dto.assinatura === AssinaturaStatus.ASSINADO);
    const eventos: Prisma.ContratoHistoricoCreateWithoutContratoInput[] = [
      { evento: ContratoEventoTipo.ASSINATURA, de: atual.assinatura, para: dto.assinatura, usuario },
    ];
    if (emiteAuto) {
      eventos.push({ evento: ContratoEventoTipo.STATUS, de: atual.status, para: ContratoStatus.EMITIDO, usuario });
    }
    const contrato = await this.prisma.contrato.update({
      where: { id },
      data: {
        assinatura: dto.assinatura,
        dataEnvioAssinatura: dto.dataEnvioAssinatura ? new Date(dto.dataEnvioAssinatura) : undefined,
        dataAssinatura: dto.dataAssinatura ? new Date(dto.dataAssinatura) : undefined,
        ...(emiteAuto ? { status: ContratoStatus.EMITIDO } : {}),
        updatedBy: usuario,
        historico: { create: eventos },
      },
    });
    return ContratoResponseDto.fromEntity(contrato);
  }

  async registrarEntrega(id: string, dto: RegistrarEntregaDto, usuario: string): Promise<ContratoResponseDto> {
    const atual = await this.buscarOuFalhar(id);
    if (atual.status === ContratoStatus.CANCELADO || atual.status === ContratoStatus.RASCUNHO) {
      throw new BadRequestException('Só é possível registrar entrega em contrato emitido/em andamento');
    }
    const novaEntregue = Number(atual.quantidadeEntregueSc) + dto.quantidadeSc;
    const contratada = Number(atual.quantidadeContratadaSc);
    // Define status derivado da entrega
    let novoStatus = atual.status;
    if (novaEntregue >= contratada) novoStatus = ContratoStatus.EXECUTADO;
    else if (atual.status === ContratoStatus.EMITIDO) novoStatus = ContratoStatus.EM_ANDAMENTO;

    const contrato = await this.prisma.contrato.update({
      where: { id },
      data: {
        quantidadeEntregueSc: novaEntregue,
        status: novoStatus,
        updatedBy: usuario,
        historico: {
          create: {
            evento: ContratoEventoTipo.ENTREGA,
            detalhe: `+${dto.quantidadeSc} sc (acumulado ${novaEntregue} de ${contratada})`,
            usuario,
          },
        },
      },
    });
    return ContratoResponseDto.fromEntity(contrato);
  }

  /** Tratamento de excedente de peso (docx §6): mesmo preço, nova boleta, aditivo ou abono. */
  async registrarExcedente(id: string, dto: RegistrarExcedenteDto, usuario: string): Promise<ContratoResponseDto> {
    const atual = await this.buscarOuFalhar(id);
    const evento = EXCEDENTE_EVENTO[dto.tratamento];
    const contrato = await this.prisma.contrato.update({
      where: { id },
      data: {
        // Aditivo aumenta a quantidade contratada; os demais só registram
        ...(dto.tratamento === 'ADITIVO'
          ? { quantidadeContratadaSc: Number(atual.quantidadeContratadaSc) + dto.quantidadeSc }
          : {}),
        updatedBy: usuario,
        historico: {
          create: { evento, detalhe: `${dto.quantidadeSc} sc — ${dto.detalhe ?? dto.tratamento}`, usuario },
        },
      },
    });
    return ContratoResponseDto.fromEntity(contrato);
  }

  async vincularBoleta(id: string, boletaId: string, usuario: string): Promise<ContratoResponseDto> {
    await this.buscarOuFalhar(id);
    const boleta = await this.prisma.boleta.findFirst({ where: { id: boletaId, deletedAt: null } });
    if (!boleta) throw new BadRequestException(`Boleta ${boletaId} não encontrada`);
    const contrato = await this.prisma.contrato.update({
      where: { id },
      data: {
        boletaId,
        updatedBy: usuario,
        historico: { create: { evento: ContratoEventoTipo.VINCULO_BOLETA, para: boleta.numero, usuario } },
      },
    });
    return ContratoResponseDto.fromEntity(contrato);
  }

  /**
   * Importa um contrato "aberto no ERP/Protheus" (docx §6). Enquanto a API real
   * não existe, registra o contrato já em EMITIDO com o vínculo à boleta.
   */
  async importarDoErp(dto: ImportarErpDto, usuario: string): Promise<ContratoResponseDto> {
    const existente = await this.prisma.contrato.findFirst({
      where: { numeroErpMaxicon: dto.numeroErpMaxicon, deletedAt: null },
    });
    if (existente) throw new BadRequestException(`Já existe contrato para o ERP ${dto.numeroErpMaxicon}`);
    await this.validarRelacoes(dto.boletaId, dto.contraparteId, dto.produtoId);

    const contrato = await this.prisma.contrato.create({
      data: {
        numeroErpMaxicon: dto.numeroErpMaxicon,
        tipo: dto.tipo,
        status: ContratoStatus.EMITIDO,
        boletaId: dto.boletaId,
        contraparteId: dto.contraparteId,
        contraparteNome: dto.contraparteNome,
        produtoId: dto.produtoId,
        quantidadeContratadaSc: dto.quantidadeContratadaSc,
        preco: dto.preco ?? null,
        dataVencimento: dto.dataVencimento ? new Date(dto.dataVencimento) : null,
        createdBy: usuario,
        updatedBy: usuario,
        historico: {
          create: [
            { evento: ContratoEventoTipo.IMPORTACAO_ERP, para: dto.numeroErpMaxicon, usuario },
            { evento: ContratoEventoTipo.STATUS, para: ContratoStatus.EMITIDO, usuario },
          ],
        },
      },
    });
    return ContratoResponseDto.fromEntity(contrato);
  }

  async remover(id: string, usuario: string): Promise<void> {
    const atual = await this.buscarOuFalhar(id);
    if (atual.status === ContratoStatus.EXECUTADO) {
      throw new BadRequestException('Contrato executado não pode ser removido');
    }
    await this.prisma.contrato.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: usuario } });
  }

  // ── auxiliares ────────────────────────────────────────────────────────

  private async buscarOuFalhar(id: string) {
    const entity = await this.prisma.contrato.findFirst({ where: { id, deletedAt: null }, include: { produto: { select: { nome: true } } } });
    if (!entity) throw new NotFoundException(`Contrato ${id} não encontrado`);
    return entity;
  }

  /** Preenche campos ausentes a partir da boleta vinculada (docx §6: herança). */
  private async herdarDaBoleta(dto: CreateContratoDto) {
    const base = {
      boletaId: dto.boletaId,
      contraparteId: dto.contraparteId,
      contraparteNome: dto.contraparteNome,
      produtoId: dto.produtoId,
      quantidadeContratadaSc: dto.quantidadeContratadaSc,
      preco: dto.preco,
      temArmazenagem: dto.temArmazenagem ?? false,
      armPadronizacaoRate: 0,
      armArmazenagemRate: 0,
      armQuebraTecnicaPct: 0,
      quebraTecnicaPct: 0,
      custoFinanceiroPct: 0,
      icmsPct: 0,
      temClassificacao: dto.temClassificacao ?? false,
      dataVencimento: dto.dataVencimento as string | Date | undefined,
    };
    if (!dto.boletaId) return base;

    const boleta = await this.prisma.boleta.findFirst({ where: { id: dto.boletaId, deletedAt: null } });
    if (!boleta) throw new BadRequestException(`Boleta ${dto.boletaId} não encontrada`);

    // Preço do contrato = preço COM ICMS (bruto). A boleta guarda o preço SEM
    // ICMS; quando há ICMS, brutamos: bruto = líquido / (1 - icms/100). Sem ICMS,
    // bruto = líquido. (O Dashboard volta a derivar o líquido a partir do bruto.)
    const icmsPct = Number(boleta.icmsPct);
    const precoNet = boleta.preco === null ? undefined : Number(boleta.preco);
    const precoComIcms =
      precoNet != null && icmsPct > 0 ? Number((precoNet / (1 - icmsPct / 100)).toFixed(4)) : precoNet;

    return {
      boletaId: dto.boletaId,
      contraparteId: dto.contraparteId ?? boleta.contraparteId ?? undefined,
      contraparteNome: dto.contraparteNome ?? boleta.contraparteNome,
      produtoId: dto.produtoId ?? boleta.produtoId,
      quantidadeContratadaSc: dto.quantidadeContratadaSc ?? Number(boleta.quantidadeSc),
      preco: dto.preco ?? precoComIcms,
      temArmazenagem: dto.temArmazenagem ?? boleta.temArmazenagem,
      armPadronizacaoRate: Number(boleta.armPadronizacaoRate),
      armArmazenagemRate: Number(boleta.armArmazenagemRate),
      armQuebraTecnicaPct: Number(boleta.armQuebraTecnicaPct),
      quebraTecnicaPct: Number(boleta.quebraTecnicaTradingPct),
      custoFinanceiroPct: Number(boleta.custoFinanceiroPct),
      icmsPct: Number(boleta.icmsPct),
      temClassificacao: dto.temClassificacao ?? boleta.temClassificacao,
      // vencimento do contrato = data de vencimento informada OU a data de pagamento da boleta
      dataVencimento: (dto.dataVencimento ?? boleta.dataPagamento ?? undefined) as string | Date | undefined,
    };
  }

  private async validarRelacoes(boletaId?: string | null, contraparteId?: string | null, produtoId?: string | null) {
    if (contraparteId) {
      const p = await this.prisma.pessoa.findFirst({ where: { id: contraparteId, deletedAt: null } });
      if (!p) throw new BadRequestException(`Contraparte ${contraparteId} não encontrada`);
    }
    if (produtoId) {
      const pr = await this.prisma.produto.findFirst({ where: { id: produtoId, deletedAt: null } });
      if (!pr) throw new BadRequestException(`Produto ${produtoId} não encontrado`);
    }
    if (boletaId) {
      const b = await this.prisma.boleta.findFirst({ where: { id: boletaId, deletedAt: null } });
      if (!b) throw new BadRequestException(`Boleta ${boletaId} não encontrada`);
    }
  }

  /** Garante que o número do ERP é único entre os contratos ativos. */
  private async garantirErpUnico(erp: string): Promise<void> {
    const existente = await this.prisma.contrato.findFirst({
      where: { numeroErpMaxicon: erp, deletedAt: null },
      select: { id: true },
    });
    if (existente) throw new BadRequestException(`Já existe contrato com o número de ERP ${erp}`);
  }
}
