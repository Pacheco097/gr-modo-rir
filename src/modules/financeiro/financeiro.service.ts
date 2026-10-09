import { Injectable, NotFoundException } from '@nestjs/common';
import { LancamentoStatus, LancamentoTipo, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PaginatedResultDto } from '../../common/dto/paginated-result.dto';
import {
  CreateLancamentoDto,
  FluxoCaixaDiaDto,
  LancamentoResponseDto,
  QueryLancamentoDto,
} from './dto/financeiro.dto';

@Injectable()
export class FinanceiroService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryLancamentoDto): Promise<PaginatedResultDto<LancamentoResponseDto>> {
    const where: Prisma.LancamentoFinanceiroWhereInput = {
      deletedAt: null,
      ...(query.tipo ? { tipo: query.tipo } : {}),
      ...(query.categoria ? { categoria: query.categoria } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.lancamentoFinanceiro.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { dataVencimento: query.ordenarDirecao },
      }),
      this.prisma.lancamentoFinanceiro.count({ where }),
    ]);
    return new PaginatedResultDto(rows.map((r) => LancamentoResponseDto.fromEntity(r)), query.page, query.limit, total);
  }

  async criar(dto: CreateLancamentoDto, usuario: string): Promise<LancamentoResponseDto> {
    const l = await this.prisma.lancamentoFinanceiro.create({
      data: {
        tipo: dto.tipo,
        categoria: dto.categoria,
        descricao: dto.descricao,
        valor: dto.valor,
        dataVencimento: new Date(dto.dataVencimento),
        contratoId: dto.contratoId,
        comIcms: dto.comIcms ?? false,
        observacao: dto.observacao,
        createdBy: usuario,
        updatedBy: usuario,
      },
    });
    return LancamentoResponseDto.fromEntity(l);
  }

  async liquidar(id: string, dataLiquidacao: string | undefined, usuario: string): Promise<LancamentoResponseDto> {
    await this.buscarOuFalhar(id);
    const l = await this.prisma.lancamentoFinanceiro.update({
      where: { id },
      data: {
        status: LancamentoStatus.LIQUIDADO,
        dataLiquidacao: dataLiquidacao ? new Date(dataLiquidacao) : new Date(),
        updatedBy: usuario,
      },
    });
    return LancamentoResponseDto.fromEntity(l);
  }

  async remover(id: string, usuario: string): Promise<void> {
    await this.buscarOuFalhar(id);
    await this.prisma.lancamentoFinanceiro.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: usuario } });
  }

  /**
   * Materializa CR/CP a partir dos contratos com data de vencimento (docx §10.1):
   * compra = a pagar, venda = a receber. Idempotente por contrato.
   */
  async sincronizarContratos(usuario: string): Promise<{ criados: number }> {
    const contratos = await this.prisma.contrato.findMany({
      where: { deletedAt: null, dataVencimento: { not: null }, preco: { not: null } },
    });
    let criados = 0;
    for (const c of contratos) {
      const jaExiste = await this.prisma.lancamentoFinanceiro.findFirst({
        where: { contratoId: c.id, categoria: 'CONTRATO', deletedAt: null },
      });
      if (jaExiste) continue;
      const valor = Number(c.quantidadeContratadaSc) * Number(c.preco ?? 0);
      await this.prisma.lancamentoFinanceiro.create({
        data: {
          tipo: c.tipo === 'COMPRA' ? LancamentoTipo.PAGAR : LancamentoTipo.RECEBER,
          categoria: 'CONTRATO',
          descricao: `${c.numeroErpMaxicon ?? c.numeroSistema ?? 'contrato'} · ${c.contraparteNome}`,
          valor,
          dataVencimento: c.dataVencimento!,
          contratoId: c.id,
          createdBy: usuario,
          updatedBy: usuario,
        },
      });
      criados++;
    }
    return { criados };
  }

  /** Fluxo de caixa consolidado por dia (entradas − saídas, saldo acumulado). */
  async fluxoCaixa(dataInicio?: string, dataFim?: string): Promise<FluxoCaixaDiaDto[]> {
    const where: Prisma.LancamentoFinanceiroWhereInput = {
      deletedAt: null,
      ...(dataInicio || dataFim
        ? {
            dataVencimento: {
              ...(dataInicio ? { gte: new Date(dataInicio) } : {}),
              ...(dataFim ? { lte: new Date(dataFim) } : {}),
            },
          }
        : {}),
    };
    const rows = await this.prisma.lancamentoFinanceiro.findMany({ where, orderBy: { dataVencimento: 'asc' } });

    const porDia = new Map<string, { entradas: number; saidas: number }>();
    for (const l of rows) {
      const data = (l.dataLiquidacao ?? l.dataVencimento).toISOString().slice(0, 10);
      const acc = porDia.get(data) ?? { entradas: 0, saidas: 0 };
      if (l.tipo === LancamentoTipo.RECEBER) acc.entradas += Number(l.valor);
      else acc.saidas += Number(l.valor);
      porDia.set(data, acc);
    }

    let acumulado = 0;
    return [...porDia.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, { entradas, saidas }]) => {
        const saldoDia = Number((entradas - saidas).toFixed(2));
        acumulado = Number((acumulado + saldoDia).toFixed(2));
        return {
          data,
          entradas: Number(entradas.toFixed(2)),
          saidas: Number(saidas.toFixed(2)),
          saldoDia,
          saldoAcumulado: acumulado,
        };
      });
  }

  private async buscarOuFalhar(id: string) {
    const l = await this.prisma.lancamentoFinanceiro.findFirst({ where: { id, deletedAt: null } });
    if (!l) throw new NotFoundException(`Lançamento ${id} não encontrado`);
    return l;
  }
}
