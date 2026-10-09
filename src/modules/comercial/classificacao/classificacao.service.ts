import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ClassificacaoStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AdicionarPagamentoDto, AdicionarPagamentosLoteDto, ClassificacaoResponseDto, DefinirPrevistoDto } from './dto/classificacao.dto';

const FATOR_SC_TON = 60 / 1000; // 1 saca = 60 kg → toneladas

type ClassificacaoComAmarracao = Prisma.ClassificacaoAmarracaoGetPayload<{
  include: {
    pagamentos: true;
    amarracao: {
      include: {
        compraContrato: { include: { produto: true } };
        vendaContrato: { include: { produto: true } };
      };
    };
  };
}>;

const INCLUDE_AMARR = {
  pagamentos: { orderBy: { dataPagamento: 'asc' } },
  amarracao: {
    include: {
      compraContrato: { include: { produto: true } },
      vendaContrato: { include: { produto: true } },
    },
  },
} satisfies Prisma.ClassificacaoAmarracaoInclude;

@Injectable()
export class ClassificacaoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gatilho da CRIAÇÃO da amarração: se o contrato de compra OU de venda tem
   * `temClassificacao`, cria uma pendência de classificação por amarração
   * (idempotente — não duplica se já existir).
   */
  async gerarPendenteDaAmarracao(amarracaoId: string, usuario: string): Promise<boolean> {
    const amarr = await this.prisma.amarracao.findFirst({
      where: { id: amarracaoId, deletedAt: null },
      include: { compraContrato: true, vendaContrato: true },
    });
    if (!amarr) return false;
    const temClassif = !!amarr.compraContrato?.temClassificacao || !!amarr.vendaContrato?.temClassificacao;
    if (!temClassif) return false;
    const existe = await this.prisma.classificacaoAmarracao.findUnique({ where: { amarracaoId } });
    if (existe) return false;
    await this.prisma.classificacaoAmarracao.create({
      data: {
        amarracaoId,
        status: ClassificacaoStatus.PENDENTE,
        createdBy: usuario,
        updatedBy: usuario,
      },
    });
    return true;
  }

  /**
   * Gatilho da liberação do embarque com classificadora definida: grava a
   * classificadora e move PENDENTE → AGUARDANDO_PAGAMENTO ("programar para
   * pagamento"). Não rebaixa uma classificação já PROGRAMADA.
   */
  async definirClassificadora(amarracaoId: string, classificadora: string | null, usuario: string): Promise<void> {
    const nome = classificadora?.trim() || null;
    if (!nome) return;
    let atual = await this.prisma.classificacaoAmarracao.findUnique({ where: { amarracaoId } });
    // Se a amarração tem classificação (contrato marcado) mas a pendência ainda não nasceu, cria agora.
    if (!atual) {
      const criou = await this.gerarPendenteDaAmarracao(amarracaoId, usuario);
      if (!criou) return;
      atual = await this.prisma.classificacaoAmarracao.findUnique({ where: { amarracaoId } });
      if (!atual) return;
    }
    // A amarração já aparece na aba Classificação desde que é criada; a classificadora do embarque
    // apenas semeia a lista de previstas (se ainda vazia). O status só muda ao lançar o previsto.
    const semeia = (atual.classificadoras ?? []).length === 0 ? { classificadoras: [nome] } : {};
    await this.prisma.classificacaoAmarracao.update({
      where: { amarracaoId },
      data: { empresaClassificadora: atual.empresaClassificadora ?? nome, ...semeia, updatedBy: usuario },
    });
  }

  /** Lista todas as classificações por amarração (todos os status). */
  async findAll(status?: ClassificacaoStatus): Promise<ClassificacaoResponseDto[]> {
    const rows = await this.prisma.classificacaoAmarracao.findMany({
      where: { ...(status ? { status } : {}) },
      include: INCLUDE_AMARR,
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => this.toResponse(r));
  }

  /** 1ª etapa: lança o PREVISTO (total estimado) → PROGRAMADA (habilita os pagamentos). Editável. */
  async definirPrevisto(amarracaoId: string, dto: DefinirPrevistoDto, usuario: string): Promise<ClassificacaoResponseDto> {
    const atual = await this.prisma.classificacaoAmarracao.findUnique({ where: { amarracaoId } });
    if (!atual) throw new NotFoundException(`Classificação da amarração ${amarracaoId} não encontrada`);
    // Lista de classificadoras previstas: trim, sem vazios e sem repetidas (case-insensitive).
    const vistos = new Set<string>();
    const lista = dto.classificadoras
      ? dto.classificadoras.map((n) => (n ?? '').trim()).filter((n) => n && !vistos.has(n.toLowerCase()) && vistos.add(n.toLowerCase()))
      : null;
    await this.prisma.classificacaoAmarracao.update({
      where: { amarracaoId },
      data: {
        previsto: dto.previsto,
        ...(lista ? { classificadoras: lista, empresaClassificadora: lista[0] ?? null } : {}),
        ...(!lista && dto.empresaClassificadora?.trim() ? { empresaClassificadora: dto.empresaClassificadora.trim() } : {}),
        status: ClassificacaoStatus.PROGRAMADA,
        updatedBy: usuario,
      },
    });
    return this.buscar(amarracaoId);
  }

  /** Lança uma PARCELA de pagamento (semanal/mensal). O realizado é a soma das parcelas. */
  async adicionarPagamento(amarracaoId: string, dto: AdicionarPagamentoDto, usuario: string): Promise<ClassificacaoResponseDto> {
    const atual = await this.prisma.classificacaoAmarracao.findUnique({ where: { amarracaoId } });
    if (!atual) throw new NotFoundException(`Classificação da amarração ${amarracaoId} não encontrada`);
    if (atual.previsto == null) throw new BadRequestException('Lance o previsto (total estimado) antes de registrar pagamentos');
    if (!(dto.valor > 0)) throw new BadRequestException('Informe um valor de pagamento maior que zero');
    if (!/^\d{4}-\d{2}-\d{2}$/.test((dto.dataPagamento ?? '').trim())) throw new BadRequestException('Informe a data de pagamento (YYYY-MM-DD)');
    await this.prisma.classificacaoPagamento.create({
      data: {
        classificacaoId: atual.id,
        valor: dto.valor,
        dataPagamento: dto.dataPagamento.trim(),
        empresaClassificadora: dto.empresaClassificadora?.trim() || atual.empresaClassificadora || null,
        createdBy: usuario,
      },
    });
    return this.buscar(amarracaoId);
  }

  /** Lança vários pagamentos de uma vez (um por classificadora do previsto). */
  async adicionarPagamentosLote(amarracaoId: string, dto: AdicionarPagamentosLoteDto, usuario: string): Promise<ClassificacaoResponseDto> {
    const atual = await this.prisma.classificacaoAmarracao.findUnique({ where: { amarracaoId } });
    if (!atual) throw new NotFoundException(`Classificação da amarração ${amarracaoId} não encontrada`);
    if (atual.previsto == null) throw new BadRequestException('Lance o previsto (classificadoras e total estimado) antes de registrar o realizado');
    const itens = (dto.itens ?? []).filter((i) => i && Number(i.valor) > 0);
    if (!itens.length) throw new BadRequestException('Informe o valor realizado de ao menos uma classificadora');
    for (const i of itens) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test((i.dataPagamento ?? '').trim())) {
        throw new BadRequestException(`Informe a data de pagamento de ${i.empresaClassificadora?.trim() || 'cada classificadora'}`);
      }
    }
    await this.prisma.classificacaoPagamento.createMany({
      data: itens.map((i) => ({
        classificacaoId: atual.id,
        valor: i.valor,
        dataPagamento: i.dataPagamento.trim(),
        empresaClassificadora: i.empresaClassificadora?.trim() || null,
        createdBy: usuario,
      })),
    });
    return this.buscar(amarracaoId);
  }

  /**
   * Substitui TODOS os pagamentos (realizado) da amarração pelos informados — é o que o pop-up
   * "Realizado" envia: cada classificadora com uma ou mais linhas (valor + data de pagamento).
   */
  async definirPagamentos(amarracaoId: string, dto: AdicionarPagamentosLoteDto, usuario: string): Promise<ClassificacaoResponseDto> {
    const atual = await this.prisma.classificacaoAmarracao.findUnique({ where: { amarracaoId } });
    if (!atual) throw new NotFoundException(`Classificação da amarração ${amarracaoId} não encontrada`);
    if (atual.previsto == null) throw new BadRequestException('Lance o previsto (classificadoras e total estimado) antes de registrar o realizado');
    const itens = (dto.itens ?? []).filter((i) => i && Number(i.valor) > 0);
    for (const i of itens) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test((i.dataPagamento ?? '').trim())) {
        throw new BadRequestException(`Informe a data de pagamento de ${i.empresaClassificadora?.trim() || 'cada lançamento'}`);
      }
    }
    await this.prisma.$transaction([
      this.prisma.classificacaoPagamento.deleteMany({ where: { classificacaoId: atual.id } }),
      this.prisma.classificacaoPagamento.createMany({
        data: itens.map((i) => ({
          classificacaoId: atual.id,
          valor: i.valor,
          dataPagamento: i.dataPagamento.trim(),
          empresaClassificadora: i.empresaClassificadora?.trim() || null,
          createdBy: usuario,
        })),
      }),
    ]);
    return this.buscar(amarracaoId);
  }

  /** Remove uma parcela de pagamento (correção). */
  async removerPagamento(pagamentoId: string): Promise<ClassificacaoResponseDto> {
    const pg = await this.prisma.classificacaoPagamento.findUnique({ where: { id: pagamentoId }, include: { classificacao: true } });
    if (!pg) throw new NotFoundException(`Pagamento ${pagamentoId} não encontrado`);
    const amarracaoId = pg.classificacao.amarracaoId;
    await this.prisma.classificacaoPagamento.delete({ where: { id: pagamentoId } });
    return this.buscar(amarracaoId);
  }

  private async buscar(amarracaoId: string): Promise<ClassificacaoResponseDto> {
    const row = await this.prisma.classificacaoAmarracao.findUnique({ where: { amarracaoId }, include: INCLUDE_AMARR });
    if (!row) throw new NotFoundException(`Classificação da amarração ${amarracaoId} não encontrada`);
    return this.toResponse(row);
  }

  private toResponse(r: ClassificacaoComAmarracao): ClassificacaoResponseDto {
    const a = r.amarracao;
    const qtd = Number(a?.quantidadeSc ?? 0);
    const tons = Number((qtd * FATOR_SC_TON).toFixed(3));
    const previsto = r.previsto == null ? null : Number(r.previsto);
    const pagamentos = (r.pagamentos ?? []).map((p) => ({ id: p.id, valor: Number(p.valor), dataPagamento: p.dataPagamento, empresaClassificadora: p.empresaClassificadora ?? r.empresaClassificadora ?? null }));
    const realizado = Number(pagamentos.reduce((s, p) => s + p.valor, 0).toFixed(2));
    const saving = previsto != null ? Number((previsto - realizado).toFixed(2)) : null;
    const quitada = previsto != null && previsto > 0 && realizado >= previsto;
    const produtoNome = a?.compraContrato?.produto?.nome ?? a?.vendaContrato?.produto?.nome ?? null;
    return {
      id: r.id,
      amarracaoId: r.amarracaoId,
      compraNumero: a?.compraContrato?.numeroErpMaxicon ?? a?.compraContrato?.numeroSistema ?? '',
      vendaNumero: a?.vendaContrato?.numeroErpMaxicon ?? a?.vendaContrato?.numeroSistema ?? '',
      contraparteCompra: a?.compraContrato?.contraparteNome ?? null,
      contraparteVenda: a?.vendaContrato?.contraparteNome ?? null,
      produtoNome,
      quantidadeSc: qtd,
      tons,
      empresaClassificadora: r.empresaClassificadora,
      classificadoras: (r.classificadoras ?? []).length ? r.classificadoras : r.empresaClassificadora ? [r.empresaClassificadora] : [],
      previsto,
      realizado,
      saving,
      quitada,
      pagamentos,
      status: r.status,
    };
  }
}
