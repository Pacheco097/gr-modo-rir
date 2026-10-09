import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CteStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { PaginatedResultDto } from '../../../common/dto/paginated-result.dto';
import {
  AprovarDto,
  CreateCteDto,
  CteImportItemDto,
  CteResponseDto,
  ImportarCtesResultDto,
  QueryCteDto,
  RetirarDto,
  SetCampoDto,
} from './dto/cte.dto';
import { FretePrevistoInputDto, FretePrevistoResponseDto } from './dto/frete-previsto.dto';
import { DacteItemDto, DacteResponseDto } from './dto/dacte.dto';

/** Normaliza a chave de acesso para dedupe (remove espaços e colchetes). */
function normChave(v: string | null | undefined): string {
  return String(v ?? '').replace(/[[\]\s]/g, '');
}

@Injectable()
export class PagamentoFreteService {
  constructor(private readonly prisma: PrismaService) {}

  // ───────────────────────── Estado agregado da tela ─────────────────────────
  /** Carrega, numa só chamada, tudo que a tela Pagamento de Frete precisa. */
  async estado() {
    const [ctes, previstos, dactes] = await Promise.all([
      this.prisma.cte.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'asc' } }),
      this.prisma.fretePrevisto.findMany({ orderBy: [{ rota: 'asc' }, { vigenciaInicio: 'asc' }] }),
      this.prisma.dacte.findMany({ orderBy: { cte: 'asc' } }),
    ]);
    const all = ctes.map((c) => CteResponseDto.fromEntity(c));
    return {
      ctes: all.filter((c) => !c.retirado),
      retirados: all.filter((c) => c.retirado),
      previstos: previstos.map((p) => FretePrevistoResponseDto.fromEntity(p)),
      dactes: dactes.map((d) => DacteResponseDto.fromEntity(d)),
    };
  }

  // ───────────────────────────── CRUD / listagem ─────────────────────────────
  async findAll(query: QueryCteDto): Promise<PaginatedResultDto<CteResponseDto>> {
    const where: Prisma.CteWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.busca ? { numeroCte: { contains: query.busca, mode: 'insensitive' } } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.cte.findMany({ where, skip: query.skip, take: query.take, orderBy: { createdAt: query.ordenarDirecao } }),
      this.prisma.cte.count({ where }),
    ]);
    return new PaginatedResultDto(rows.map((r) => CteResponseDto.fromEntity(r)), query.page, query.limit, total);
  }

  async criar(dto: CreateCteDto, usuario: string): Promise<CteResponseDto> {
    const cte = await this.prisma.cte.create({
      data: {
        numeroCte: dto.numeroCte,
        transportadoraNome: dto.transportadoraNome,
        emitente: dto.transportadoraNome,
        embarqueId: dto.embarqueId,
        valorTotal: dto.valorTotal,
        icmsPct: dto.icmsPct ?? 0,
        dataEmissao: dto.dataEmissao ? new Date(dto.dataEmissao) : null,
        createdBy: usuario,
        updatedBy: usuario,
      },
    });
    return CteResponseDto.fromEntity(cte);
  }

  // ─────────────────────────── Import (dedupe chave) ──────────────────────────
  /**
   * Importa CT-Es do relatório Excel. Dedupe por chave: CT-e novo é criado;
   * CT-e já existente é ATUALIZADO com os dados do relatório (número, NF, valores,
   * status SEFAZ, etc.) — assim reimportar um relatório corrigido reflete as
   * mudanças. Os campos de CONTROLE preenchidos na tela (aprovado, retirado,
   * data de pagamento, frete previsto, nº processo) são PRESERVADOS.
   */
  async importar(itens: CteImportItemDto[], usuario: string): Promise<ImportarCtesResultDto> {
    let novos = 0;
    let atualizados = 0;
    let ignorados = 0;

    // chaves já existentes → id (para atualizar em vez de duplicar)
    const existentes = new Map<string, string>();
    (await this.prisma.cte.findMany({ where: { deletedAt: null }, select: { id: true, chave: true } })).forEach((c) => {
      const k = normChave(c.chave);
      if (k) existentes.set(k, c.id);
    });

    // Monta TODAS as operações primeiro (sem await) e executa em lote — evita
    // 1 round-trip ao Postgres por linha do relatório (N+1), que deixava o
    // import muito lento em relatórios grandes (centenas/milhares de CT-Es).
    const vistasNesteImport = new Set<string>();
    const ops: Prisma.PrismaPromise<unknown>[] = [];

    for (const it of itens) {
      const chave = normChave(it.chave);
      if (!chave) {
        ignorados++;
        continue;
      }
      const emitente = it.emitente?.trim() || '';
      // Campos que vêm SEMPRE do relatório (sobrescrevem no re-import).
      const dadosRelatorio = {
        numeroCte: it.numDoc?.toString().trim() || chave,
        numDoc: it.numDoc?.toString() ?? null,
        ctrCompra: it.ctrCompra?.toString().trim() || null,
        ctrVenda: it.ctrVenda?.toString().trim() || null,
        codEmpresa: Number.isFinite(it.codEmpresa as number) ? (it.codEmpresa as number) : null,
        empresa: it.empresa ?? null,
        serie: it.serie?.toString() ?? null,
        totalICMS: it.totalICMS ?? 0,
        tpFat: it.tpFat ?? null,
        cnpj: it.cnpj ?? null,
        emitente: emitente || null,
        transportadoraNome: emitente || '(sem transportadora)',
        dtEmissao: it.dtEmissao ?? null,
        valorTotal: it.valorTotal ?? 0,
        statusSefaz: it.statusSefaz ?? null,
        stManifesto: it.stManifesto ?? null,
        stErp: it.stErp ?? null,
        dataRegistro: it.dataRegistro ?? null,
        nf: it.nf ?? null,
        serieNf: it.serieNf ?? null,
        nsu: it.nsu ?? null,
        produtoCarga: it.produtoCarga ?? null,
        observacao: it.obs ?? null,
        cidadeOrigem: it.cidadeOrigem?.trim() || null,
        cidadeDestino: it.cidadeDestino?.trim() || null,
        qtdCarga: it.qtdCarga ?? null,
        unidCarga: it.unidCarga?.trim() || null,
        tipoDest: it.tipoDest?.trim() || null,
        updatedBy: usuario,
      };

      // Mesma chave repetida dentro do PRÓPRIO relatório: já virou "atualizado" na
      // 1ª ocorrência (está em `existentes` com um id real), então cai no branch
      // de update normalmente — não precisa de tratamento especial aqui.
      const idExistente = existentes.get(chave);
      if (idExistente) {
        // Atualiza só os dados do relatório; preserva os campos de controle da tela.
        ops.push(this.prisma.cte.update({ where: { id: idExistente }, data: dadosRelatorio }));
        atualizados++;
      } else if (vistasNesteImport.has(chave)) {
        // Duplicata dentro do mesmo arquivo, ainda sem id (não houve round-trip
        // entre as duas ocorrências) — ignora a repetida para não tentar criar 2x.
        ignorados++;
      } else {
        // Novo: aplica a regra de auto-retirada (destinatário ≠ Tomador do Serviço).
        const ehDestinatario = /destinat/i.test(it.tipoDest ?? '');
        ops.push(
          this.prisma.cte.create({
            data: {
              chave,
              ...dadosRelatorio,
              ...(ehDestinatario
                ? {
                    retirado: true,
                    catRetirada: ['dest'],
                    motivoRetirada: `Retirada automática · Tipo de destinatário: ${it.tipoDest ?? '—'}`,
                    dataRetirada: this.agoraBR(),
                  }
                : {}),
              createdBy: usuario,
            },
          }),
        );
        vistasNesteImport.add(chave);
        novos++;
      }
    }

    // Executa em lotes (evita um único pacote gigante p/ relatórios muito grandes).
    const TAMANHO_LOTE = 200;
    for (let i = 0; i < ops.length; i += TAMANHO_LOTE) {
      await this.prisma.$transaction(ops.slice(i, i + TAMANHO_LOTE));
    }

    return { novos, atualizados, repetidos: atualizados, ignorados };
  }

  /**
   * Importa CT-Es a partir do DACTE (PDF). Cada página do DACTE vira um CT-e.
   * Regra ANTI-CLOBBER: se a chave já existe (ex.: veio do Excel), só PREENCHE
   * os campos que estão vazios — nunca sobrescreve dados já lançados. Assim o
   * DACTE alimenta a lógica de quebra/frete/divergência sem apagar o relatório.
   */
  async importarDacte(itens: CteImportItemDto[], usuario: string): Promise<ImportarCtesResultDto> {
    let ignorados = 0;

    const existentes = new Map<string, { id: string } & Partial<Record<string, unknown>>>();
    (await this.prisma.cte.findMany({ where: { deletedAt: null } })).forEach((c) => {
      const k = normChave(c.chave);
      if (k) existentes.set(k, c as unknown as { id: string });
    });

    const vazio = (v: unknown) => v === null || v === undefined || v === '' || v === 0 || (v instanceof Prisma.Decimal && Number(v) === 0);

    // Primeiro passo: MESCLA todas as ocorrências de cada chave em memória (um
    // CT-e pode ocupar mais de uma página/folha do DACTE — a mesma chave repete).
    // Isso também corrige um bug: a versão anterior tentava, na 2ª ocorrência de
    // uma chave NOVA dentro do mesmo arquivo, fazer update com um id fictício
    // ('novo') que não existe no banco — e quebrava o import inteiro com erro 500.
    type Pendente = { id?: string; novoRegistro: boolean; data: Record<string, unknown> };
    const porChave = new Map<string, Pendente>();

    for (const it of itens) {
      const chave = normChave(it.chave);
      if (!chave) {
        ignorados++;
        continue;
      }
      const emitente = it.emitente?.trim() || '';
      const numDoc = it.numDoc?.toString().trim() || null;
      const jaPendente = porChave.get(chave);
      const dbRecord = existentes.get(chave);
      // Estado "atual" = registro do banco (se existir) sobreposto pelo que já foi
      // mesclado neste import — nunca só o patch parcial (senão um campo que já
      // estava preenchido no banco, mas não entrou no patch por não ter mudado,
      // pareceria "vazio" na 2ª+ ocorrência da mesma chave e seria sobrescrito à toa).
      const atual = jaPendente || dbRecord ? { ...(dbRecord as Record<string, unknown> | undefined), ...jaPendente?.data, chave } : undefined;

      if (atual) {
        // Fill-only-empty: preserva o que já existe (no banco OU já mesclado neste import).
        const data: Record<string, unknown> = jaPendente ? { ...jaPendente.data } : {};
        const fill = (campo: string, novo: unknown) => {
          if (vazio((atual as Record<string, unknown>)[campo]) && !vazio(novo)) data[campo] = novo;
        };
        fill('numDoc', numDoc);
        // numeroCte: preenche se estiver vazio ou igual à chave (placeholder do import).
        if (numDoc && (vazio((atual as Record<string, unknown>).numeroCte) || (atual as Record<string, unknown>).numeroCte === normChave((atual as Record<string, unknown>).chave as string))) {
          data.numeroCte = numDoc;
        }
        fill('serie', it.serie ?? null);
        fill('emitente', emitente || null);
        if ((vazio((atual as Record<string, unknown>).transportadoraNome) || (atual as Record<string, unknown>).transportadoraNome === '(sem transportadora)') && emitente) {
          data.transportadoraNome = emitente;
        }
        fill('dtEmissao', it.dtEmissao ?? null);
        fill('valorTotal', it.valorTotal ?? null);
        fill('totalICMS', it.totalICMS ?? null);
        fill('nf', it.nf ?? null);
        fill('cnpj', it.cnpj ?? null);
        fill('produtoCarga', it.produtoCarga ?? null);
        fill('cidadeOrigem', it.cidadeOrigem ?? null);
        fill('cidadeDestino', it.cidadeDestino ?? null);
        fill('qtdCarga', it.qtdCarga ?? null);
        fill('unidCarga', it.unidCarga ?? null);
        if (jaPendente) {
          jaPendente.data = { ...jaPendente.data, ...data };
        } else {
          porChave.set(chave, { id: (dbRecord as { id: string }).id, novoRegistro: false, data });
        }
      } else {
        porChave.set(chave, {
          novoRegistro: true,
          data: {
            chave,
            numeroCte: numDoc || chave,
            numDoc,
            serie: it.serie ?? null,
            emitente: emitente || null,
            transportadoraNome: emitente || '(sem transportadora)',
            dtEmissao: it.dtEmissao ?? null,
            valorTotal: it.valorTotal ?? 0,
            totalICMS: it.totalICMS ?? 0,
            nf: it.nf ?? null,
            cnpj: it.cnpj ?? null,
            produtoCarga: it.produtoCarga ?? null,
            cidadeOrigem: it.cidadeOrigem ?? null,
            cidadeDestino: it.cidadeDestino ?? null,
            qtdCarga: it.qtdCarga ?? null,
            unidCarga: it.unidCarga ?? null,
            createdBy: usuario,
          },
        });
      }
    }

    // Segundo passo: UMA operação por chave (não por linha), em lote.
    let novos = 0;
    let atualizados = 0;
    const ops: Prisma.PrismaPromise<unknown>[] = [];
    porChave.forEach((p) => {
      if (p.novoRegistro) {
        ops.push(this.prisma.cte.create({ data: { ...p.data, updatedBy: usuario } as Prisma.CteCreateInput }));
        novos++;
      } else {
        ops.push(this.prisma.cte.update({ where: { id: p.id as string }, data: { ...p.data, updatedBy: usuario } }));
        atualizados++;
      }
    });

    const TAMANHO_LOTE = 200;
    for (let i = 0; i < ops.length; i += TAMANHO_LOTE) {
      await this.prisma.$transaction(ops.slice(i, i + TAMANHO_LOTE));
    }

    return { novos, atualizados, repetidos: atualizados, ignorados };
  }

  // ───────────────────── Campos de controle (por chave) ──────────────────────
  async setCampo(chave: string, dto: SetCampoDto, usuario: string): Promise<CteResponseDto> {
    const cte = await this.buscarPorChave(chave);
    const val = dto.valor ?? '';
    const data: Prisma.CteUpdateInput = { updatedBy: usuario };
    if (dto.campo === 'fretePrevisto') {
      data.fretePrevisto = val.trim() === '' ? null : new Prisma.Decimal(this.parseNum(val));
    } else if (dto.campo === 'numProcesso') {
      data.numProcesso = val.trim() === '' ? null : val;
    } else if (dto.campo === 'dataPagamentoStr') {
      data.dataPagamentoStr = val.trim() === '' ? null : val;
    }
    const updated = await this.prisma.cte.update({ where: { id: cte.id }, data });
    return CteResponseDto.fromEntity(updated);
  }

  async aprovar(chave: string, dto: AprovarDto, usuario: string): Promise<CteResponseDto> {
    const cte = await this.buscarPorChave(chave);
    const updated = await this.prisma.cte.update({
      where: { id: cte.id },
      data: { aprovado: dto.aprovado, updatedBy: usuario },
    });
    return CteResponseDto.fromEntity(updated);
  }

  async retirar(chave: string, dto: RetirarDto, usuario: string): Promise<CteResponseDto> {
    const cte = await this.buscarPorChave(chave);
    const updated = await this.prisma.cte.update({
      where: { id: cte.id },
      data: {
        retirado: true,
        motivoRetirada: dto.motivo,
        catRetirada: dto.categorias ?? ['manual'],
        dataRetirada: dto.dataRetirada ?? null,
        updatedBy: usuario,
      },
    });
    return CteResponseDto.fromEntity(updated);
  }

  async devolver(chave: string, usuario: string): Promise<CteResponseDto> {
    const cte = await this.buscarPorChave(chave);
    const updated = await this.prisma.cte.update({
      where: { id: cte.id },
      data: {
        retirado: false,
        motivoRetirada: null,
        catRetirada: [],
        dataRetirada: null,
        updatedBy: usuario,
      },
    });
    return CteResponseDto.fromEntity(updated);
  }

  async pagar(id: string, dataPagamento: string | undefined, usuario: string): Promise<CteResponseDto> {
    await this.buscarOuFalhar(id);
    const cte = await this.prisma.cte.update({
      where: { id },
      data: {
        status: CteStatus.PAGO,
        dataPagamento: dataPagamento ? new Date(dataPagamento) : new Date(),
        updatedBy: usuario,
      },
    });
    return CteResponseDto.fromEntity(cte);
  }

  async remover(id: string, usuario: string): Promise<void> {
    await this.buscarOuFalhar(id);
    await this.prisma.cte.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: usuario } });
  }

  // ───────────── Fretes previstos por PAR de contratos (CTR compra × venda) ─────────────
  async listarPrevistos(): Promise<FretePrevistoResponseDto[]> {
    const rows = await this.prisma.fretePrevisto.findMany({
      orderBy: [{ ctrCompra: 'asc' }, { ctrVenda: 'asc' }],
    });
    return rows.map((r) => FretePrevistoResponseDto.fromEntity(r));
  }

  /** Cria um registro de frete previsto para um par CTR compra × venda (ou rota legada). */
  async criarPrevisto(dto: FretePrevistoInputDto, usuario: string): Promise<FretePrevistoResponseDto> {
    if (!(dto.valor > 0)) throw new BadRequestException('Informe um valor de frete previsto (R$/t) maior que zero');
    const ctrCompra = (dto.ctrCompra ?? '').trim() || null;
    const ctrVenda = (dto.ctrVenda ?? '').trim() || null;
    const rota = (dto.rota ?? '').trim() || null;
    if (!ctrCompra && !ctrVenda && !rota) {
      throw new BadRequestException('Informe o par de contratos (CTR compra × venda)');
    }
    const row = await this.prisma.fretePrevisto.create({
      data: {
        ctrCompra,
        ctrVenda,
        rota,
        valor: dto.valor,
        vigenciaInicio: dto.vigenciaInicio ?? null,
        vigenciaFim: dto.vigenciaFim ?? null,
        createdBy: usuario,
        updatedBy: usuario,
      },
    });
    return FretePrevistoResponseDto.fromEntity(row);
  }

  /** Edita um registro existente. */
  async atualizarPrevisto(id: string, dto: FretePrevistoInputDto, usuario: string): Promise<FretePrevistoResponseDto> {
    const atual = await this.prisma.fretePrevisto.findUnique({ where: { id } });
    if (!atual) throw new NotFoundException(`Frete previsto ${id} não encontrado`);
    if (!(dto.valor > 0)) throw new BadRequestException('Informe um valor de frete previsto (R$/t) maior que zero');
    const row = await this.prisma.fretePrevisto.update({
      where: { id },
      data: {
        ctrCompra: (dto.ctrCompra ?? '').trim() || null,
        ctrVenda: (dto.ctrVenda ?? '').trim() || null,
        rota: (dto.rota ?? '').trim() || null,
        valor: dto.valor,
        vigenciaInicio: dto.vigenciaInicio ?? null,
        vigenciaFim: dto.vigenciaFim ?? null,
        updatedBy: usuario,
      },
    });
    return FretePrevistoResponseDto.fromEntity(row);
  }

  async removerPrevisto(id: string): Promise<void> {
    const atual = await this.prisma.fretePrevisto.findUnique({ where: { id } });
    if (!atual) throw new NotFoundException(`Frete previsto ${id} não encontrado`);
    await this.prisma.fretePrevisto.delete({ where: { id } });
  }

  // ───────────────────────────────── DACTEs ──────────────────────────────────
  async listarDactes(): Promise<DacteResponseDto[]> {
    const rows = await this.prisma.dacte.findMany({ orderBy: { cte: 'asc' } });
    return rows.map((d) => DacteResponseDto.fromEntity(d));
  }

  /** Substitui todo o conjunto de DACTEs (a tela reenvia tudo que leu do PDF). */
  async replaceDactes(itens: DacteItemDto[], usuario: string): Promise<DacteResponseDto[]> {
    await this.prisma.$transaction([
      this.prisma.dacte.deleteMany({}),
      ...itens
        .filter((it) => String(it.cte ?? '').trim() !== '')
        .map((it) =>
          this.prisma.dacte.create({
            data: {
              cte: it.cte.trim(),
              serie: it.serie ?? null,
              transp: it.transp ?? null,
              nf: it.nf ?? null,
              org: it.org ?? null,
              dst: it.dst ?? null,
              prod: it.prod ?? null,
              peso: it.peso ?? null,
              valor: it.valor ?? null,
              createdBy: usuario,
              updatedBy: usuario,
            },
          }),
        ),
    ]);
    return this.listarDactes();
  }

  // ───────────────────────────────── helpers ─────────────────────────────────
  /** Carimbo "dd/mm/aaaa hh:mm" para registrar a retirada automática no import. */
  private agoraBR(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  private parseNum(v: string): number {
    // O cliente envia decimal canônico (ponto, sem separador de milhar).
    // Também aceita vírgula decimal ("150,5") por robustez.
    let s = String(v).trim().replace(/[R$\s]/g, '');
    if (s.includes(',') && !s.includes('.')) s = s.replace(',', '.');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  }

  private async buscarOuFalhar(id: string) {
    const cte = await this.prisma.cte.findFirst({ where: { id, deletedAt: null } });
    if (!cte) throw new NotFoundException(`CT-e ${id} não encontrado`);
    return cte;
  }

  private async buscarPorChave(chave: string) {
    const cte = await this.prisma.cte.findFirst({ where: { chave: normChave(chave), deletedAt: null } });
    if (!cte) throw new NotFoundException(`CT-e com chave ${chave} não encontrado`);
    return cte;
  }
}
