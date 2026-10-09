import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContratoStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { LancarCorretagemDto, AtualizarCorretagemDto } from './dto/corretagem.dto';

@Injectable()
export class CorretagemService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Todos os contratos EM ABERTO (compra ou venda, não cancelados) com a corretagem:
   * a linha persistida OU o padrão herdado da boleta (corretora + valorCorretagem).
   */
  async listar() {
    const contratos = await this.prisma.contrato.findMany({
      where: { deletedAt: null, status: { not: ContratoStatus.CANCELADO } },
      select: {
        id: true,
        numeroErpMaxicon: true,
        numeroSistema: true,
        tipo: true,
        contraparteNome: true,
        corretagem: true,
        boleta: { select: { valorCorretagem: true, corretora: { select: { nome: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return contratos
      .map((c) => {
        const cor = c.corretagem;
        const defNome = c.boleta?.corretora?.nome ?? null;
        const defValor = c.boleta?.valorCorretagem != null ? Number(c.boleta.valorCorretagem) : 0;
        return {
          contratoId: c.id,
          numero: c.numeroErpMaxicon ?? c.numeroSistema ?? '',
          tipo: c.tipo,
          contraparteNome: c.contraparteNome,
          corretoraNome: cor ? cor.corretoraNome : defNome,
          valorTotal: cor ? Number(cor.valorTotal) : Number(defValor.toFixed(2)),
          dataPagamento: cor?.dataPagamento ?? null,
          status: cor?.status ?? 'PENDENTE',
          _hasLinha: !!cor,
        };
      })
      // Só entram contratos que TÊM corretagem: corretora informada, valor > 0,
      // ou uma linha já persistida (editada/lançada). Contratos sem corretagem na
      // boleta (ex.: remessa/transferência) não devem aparecer aqui.
      .filter((r) => r._hasLinha || !!r.corretoraNome || r.valorTotal > 0)
      .map(({ _hasLinha, ...r }) => r);
  }

  private async contratoOu404(contratoId: string) {
    const c = await this.prisma.contrato.findFirst({
      where: { id: contratoId, deletedAt: null },
      select: { id: true, numeroErpMaxicon: true, numeroSistema: true, corretagem: true, boleta: { select: { valorCorretagem: true, corretora: { select: { nome: true } } } } },
    });
    if (!c) throw new NotFoundException(`Contrato ${contratoId} não encontrado`);
    return c;
  }

  /** Cria a linha de corretagem se ainda não existir (herdando o padrão da boleta). */
  private async garantirLinha(contratoId: string, usuario: string) {
    const c = await this.contratoOu404(contratoId);
    if (c.corretagem) return c.corretagem;
    return this.prisma.corretagemContrato.create({
      data: {
        contratoId,
        corretoraNome: c.boleta?.corretora?.nome ?? null,
        valorTotal: c.boleta?.valorCorretagem != null ? Number(c.boleta.valorCorretagem) : 0,
        status: 'PENDENTE',
        createdBy: usuario,
        updatedBy: usuario,
      },
    });
  }

  /** Edita corretora/valor (antes de lançar). */
  async atualizar(contratoId: string, dto: AtualizarCorretagemDto, usuario: string) {
    await this.garantirLinha(contratoId, usuario);
    const data: Record<string, string | number | null> = {};
    if (dto.corretoraNome !== undefined) data.corretoraNome = dto.corretoraNome;
    if (dto.valorTotal !== undefined) data.valorTotal = Number(dto.valorTotal);
    const row = await this.prisma.corretagemContrato.update({ where: { contratoId }, data: { ...data, updatedBy: usuario } });
    return row;
  }

  /** Lança a corretagem: cria o LancamentoFinanceiro (PAGAR/COMISSAO) na data informada. */
  async lancar(contratoId: string, dto: LancarCorretagemDto, usuario: string) {
    const linha = await this.garantirLinha(contratoId, usuario);
    const c = await this.contratoOu404(contratoId);
    const numero = c.numeroErpMaxicon ?? c.numeroSistema ?? '';
    const corretora = dto.corretoraNome ?? linha.corretoraNome;
    const valor = dto.valorTotal != null ? Number(dto.valorTotal) : Number(linha.valorTotal);
    if (!(valor > 0)) throw new BadRequestException('Informe um valor de corretagem maior que zero.');
    if (!dto.dataPagamento) throw new BadRequestException('Informe a data de pagamento.');

    // Remove um lançamento anterior (relançar) para não duplicar.
    if (linha.lancamentoId) {
      await this.prisma.lancamentoFinanceiro.updateMany({ where: { id: linha.lancamentoId }, data: { deletedAt: new Date() } });
    }
    const lanc = await this.prisma.lancamentoFinanceiro.create({
      data: {
        tipo: 'PAGAR',
        categoria: 'COMISSAO',
        descricao: `Corretagem contrato ${numero}${corretora ? ' · ' + corretora : ''}`,
        valor,
        dataVencimento: new Date(dto.dataPagamento),
        contratoId,
        createdBy: usuario,
      },
    });
    return this.prisma.corretagemContrato.update({
      where: { contratoId },
      data: {
        corretoraNome: corretora ?? null,
        valorTotal: valor,
        dataPagamento: dto.dataPagamento,
        status: 'LANCADO',
        lancamentoId: lanc.id,
        updatedBy: usuario,
      },
    });
  }

  /** Estorna o lançamento (volta a PENDENTE). */
  async estornar(contratoId: string, usuario: string) {
    const linha = await this.prisma.corretagemContrato.findUnique({ where: { contratoId } });
    if (!linha) throw new NotFoundException('Corretagem não encontrada');
    if (linha.lancamentoId) {
      await this.prisma.lancamentoFinanceiro.updateMany({ where: { id: linha.lancamentoId }, data: { deletedAt: new Date() } });
    }
    return this.prisma.corretagemContrato.update({
      where: { contratoId },
      data: { status: 'PENDENTE', dataPagamento: null, lancamentoId: null, updatedBy: usuario },
    });
  }
}
