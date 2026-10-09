import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Contrato, ContratoParcela, ContratoTipo } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { ParcelaFluxoDto, ParcelaItemDto, ParcelasContratoDto } from './dto/parcela.dto';

/** Data de vencimento do contrato como "YYYY-MM-DD" (fallback p/ a parcela padrão). */
function isoDe(d: Date | null): string {
  return d ? new Date(d).toISOString().slice(0, 10) : '';
}
function tipoDe(c: { tipo: ContratoTipo }): 'PAGAR' | 'RECEBER' {
  return c.tipo === ContratoTipo.VENDA ? 'RECEBER' : 'PAGAR';
}
function valorContratoDe(c: { quantidadeContratadaSc: unknown; preco: unknown }): number {
  return Number((Number(c.quantidadeContratadaSc) * Number(c.preco ?? 0)).toFixed(2));
}

@Injectable()
export class ParcelasService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Parcelas efetivas de um contrato: as persistidas OU, se não houver, a parcela
   * PADRÃO = valor cheio na data de vencimento. Usado pelo juros e pelo fluxo.
   */
  parcelasEfetivas(c: Contrato & { parcelas?: ContratoParcela[] }): { id: string | null; valor: number; data: string }[] {
    const persistidas = c.parcelas ?? [];
    if (persistidas.length) {
      return persistidas
        .map((p) => ({ id: p.id, valor: Number(p.valor), data: p.data }))
        .sort((a, b) => (a.data < b.data ? -1 : 1));
    }
    const data = isoDe(c.dataVencimento);
    if (!data) return [];
    return [{ id: null, valor: valorContratoDe(c), data }];
  }

  async listar(contratoId: string): Promise<ParcelasContratoDto> {
    const c = await this.prisma.contrato.findFirst({ where: { id: contratoId, deletedAt: null }, include: { parcelas: true } });
    if (!c) throw new NotFoundException(`Contrato ${contratoId} não encontrado`);
    const parcelas = this.parcelasEfetivas(c);
    const isDefault = (c.parcelas ?? []).length === 0;
    return {
      contratoId: c.id,
      tipo: tipoDe(c),
      contratoNumero: c.numeroErpMaxicon ?? c.numeroSistema ?? '',
      valorContrato: valorContratoDe(c),
      isDefault,
      soma: Number(parcelas.reduce((s, p) => s + p.valor, 0).toFixed(2)),
      parcelas,
    };
  }

  /** Substitui todo o cronograma do contrato (reprogramação/parcelamento). */
  async substituir(contratoId: string, itens: ParcelaItemDto[], usuario: string): Promise<ParcelasContratoDto> {
    const c = await this.prisma.contrato.findFirst({ where: { id: contratoId, deletedAt: null } });
    if (!c) throw new NotFoundException(`Contrato ${contratoId} não encontrado`);
    const limpos = (itens ?? [])
      .map((it) => ({ valor: Number(it.valor), data: String(it.data ?? '').trim() }))
      .filter((it) => it.valor > 0 && /^\d{4}-\d{2}-\d{2}$/.test(it.data));
    if (!limpos.length) throw new BadRequestException('Informe ao menos uma parcela com valor > 0 e data (YYYY-MM-DD)');
    await this.prisma.$transaction([
      this.prisma.contratoParcela.deleteMany({ where: { contratoId } }),
      ...limpos.map((it) => this.prisma.contratoParcela.create({ data: { contratoId, valor: it.valor, data: it.data, createdBy: usuario } })),
    ]);
    return this.listar(contratoId);
  }

  /** Todos os movimentos de caixa das parcelas (persistidas + padrão) para o Fluxo de Caixa. */
  async fluxo(): Promise<ParcelaFluxoDto[]> {
    const contratos = await this.prisma.contrato.findMany({
      where: { deletedAt: null, preco: { not: null } },
      include: { parcelas: true },
    });
    const out: ParcelaFluxoDto[] = [];
    for (const c of contratos) {
      const tipo = tipoDe(c);
      const numero = c.numeroErpMaxicon ?? c.numeroSistema ?? '';
      for (const p of this.parcelasEfetivas(c)) {
        out.push({ contratoId: c.id, contratoNumero: numero, contraparteNome: c.contraparteNome ?? null, tipo, valor: p.valor, data: p.data });
      }
    }
    return out;
  }
}
