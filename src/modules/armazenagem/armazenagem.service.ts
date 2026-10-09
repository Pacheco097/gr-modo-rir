import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ArmazenagemStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PaginatedResultDto } from '../../common/dto/paginated-result.dto';
import {
  ArmazenagemResponseDto,
  AtualizarArmazenagemDto,
  EncerrarArmazenagemDto,
  IniciarArmazenagemDto,
  LancarArmazenagemDto,
  QueryArmazenagemDto,
} from './dto/armazenagem.dto';

@Injectable()
export class ArmazenagemService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryArmazenagemDto): Promise<PaginatedResultDto<ArmazenagemResponseDto>> {
    const where: Prisma.ArmazenagemWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.contratoId ? { contratoId: query.contratoId } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.armazenagem.findMany({ where, skip: query.skip, take: query.take, orderBy: { createdAt: query.ordenarDirecao } }),
      this.prisma.armazenagem.count({ where }),
    ]);
    return new PaginatedResultDto(rows.map((r) => ArmazenagemResponseDto.fromEntity(r)), query.page, query.limit, total);
  }

  /** Coloca um contrato de compra "Em vigência" na armazenagem, herdando as taxas. */
  async iniciar(dto: IniciarArmazenagemDto, usuario: string): Promise<ArmazenagemResponseDto> {
    const contrato = await this.prisma.contrato.findFirst({ where: { id: dto.contratoId, deletedAt: null } });
    if (!contrato) throw new BadRequestException('Contrato não encontrado');
    if (!contrato.temArmazenagem) throw new BadRequestException('Este contrato não possui armazenagem');
    const jaExiste = await this.prisma.armazenagem.findFirst({
      where: { contratoId: dto.contratoId, deletedAt: null, status: ArmazenagemStatus.EM_VIGENCIA },
    });
    if (jaExiste) throw new BadRequestException('Já existe armazenagem em vigência para este contrato');

    const arm = await this.prisma.armazenagem.create({
      data: {
        contratoId: dto.contratoId,
        quantidadeSc: contrato.quantidadeContratadaSc,
        // rates do pop-up OU herdados do contrato (boleta)
        padronizacaoRate: dto.padronizacaoRate ?? contrato.armPadronizacaoRate,
        armazenagemRate: dto.armazenagemRate ?? contrato.armArmazenagemRate,
        quebraPct: dto.quebraPct ?? contrato.armQuebraTecnicaPct,
        carenciaQuinzenas: dto.carenciaQuinzenas ?? 0,
        precoScRs: dto.precoScRs ?? contrato.preco ?? null,
        quinzenas: dto.quinzenas ?? 0,
        // dataInicio = DATA DE RECEBIMENTO do produto (início da contagem)
        dataInicio: dto.dataRecebimento ? new Date(dto.dataRecebimento) : new Date(),
        dataEncerramento: dto.dataEncerramento ? new Date(dto.dataEncerramento) : null,
        createdBy: usuario,
        updatedBy: usuario,
      },
    });
    return ArmazenagemResponseDto.fromEntity(arm);
  }

  async atualizar(id: string, dto: AtualizarArmazenagemDto, usuario: string): Promise<ArmazenagemResponseDto> {
    const atual = await this.buscarOuFalhar(id);
    if (atual.status === ArmazenagemStatus.ENCERRADA) throw new BadRequestException('Armazenagem encerrada não pode ser alterada');
    const data: Prisma.ArmazenagemUpdateInput = { updatedBy: usuario };
    if (dto.quinzenas !== undefined) data.quinzenas = dto.quinzenas;
    if (dto.padronizacaoRate !== undefined) data.padronizacaoRate = dto.padronizacaoRate;
    if (dto.armazenagemRate !== undefined) data.armazenagemRate = dto.armazenagemRate;
    if (dto.quebraPct !== undefined) data.quebraPct = dto.quebraPct;
    if (dto.carenciaQuinzenas !== undefined) data.carenciaQuinzenas = dto.carenciaQuinzenas;
    if (dto.precoScRs !== undefined) data.precoScRs = dto.precoScRs;
    if (dto.dataRecebimento !== undefined) data.dataInicio = dto.dataRecebimento ? new Date(dto.dataRecebimento) : null;
    if (dto.dataEncerramento !== undefined) data.dataEncerramento = dto.dataEncerramento ? new Date(dto.dataEncerramento) : null;
    if (dto.valorPagamento !== undefined) data.valorPagamento = dto.valorPagamento;
    const arm = await this.prisma.armazenagem.update({ where: { id }, data });
    return ArmazenagemResponseDto.fromEntity(arm);
  }

  /** Custo previsto atual (fórmula por quinzena) — base padrão do valor a pagar. */
  private custoPrevisto(a: { quantidadeSc: unknown; padronizacaoRate: unknown; armazenagemRate: unknown; quebraPct: unknown; carenciaQuinzenas: number | null; precoScRs: unknown; dataInicio: Date | null; dataEncerramento: Date | null }): number {
    return ArmazenagemResponseDto.calcular({
      quantidadeSc: Number(a.quantidadeSc), padronizacaoRate: Number(a.padronizacaoRate),
      armazenagemRate: Number(a.armazenagemRate), quebraPct: Number(a.quebraPct),
      carenciaQuinzenas: a.carenciaQuinzenas ?? 0, precoScRs: a.precoScRs == null ? 0 : Number(a.precoScRs),
      dataInicio: a.dataInicio, dataEncerramento: a.dataEncerramento,
    }).custoPrevistoRs;
  }

  /** Lança o pagamento da armazenagem: cria o LancamentoFinanceiro (PAGAR/ARMAZENAGEM) na data informada. */
  async lancarPagamento(id: string, dto: LancarArmazenagemDto, usuario: string): Promise<ArmazenagemResponseDto> {
    const atual = await this.buscarOuFalhar(id);
    const contrato = await this.prisma.contrato.findFirst({ where: { id: atual.contratoId }, select: { numeroErpMaxicon: true, numeroSistema: true, contraparteNome: true } });
    const numero = contrato?.numeroErpMaxicon ?? contrato?.numeroSistema ?? '';
    const contraparte = contrato?.contraparteNome ?? '';
    const valor = dto.valorTotal != null ? Number(dto.valorTotal) : (atual.valorPagamento != null ? Number(atual.valorPagamento) : this.custoPrevisto(atual));
    if (!(valor > 0)) throw new BadRequestException('Informe um valor de pagamento maior que zero.');

    // Remove um lançamento anterior (relançar) para não duplicar.
    if (atual.lancamentoId) {
      await this.prisma.lancamentoFinanceiro.updateMany({ where: { id: atual.lancamentoId }, data: { deletedAt: new Date() } });
    }
    const lanc = await this.prisma.lancamentoFinanceiro.create({
      data: {
        tipo: 'PAGAR',
        categoria: 'ARMAZENAGEM',
        descricao: `Armazenagem contrato ${numero}${contraparte ? ' · ' + contraparte : ''}`,
        valor,
        dataVencimento: new Date(dto.dataPagamento),
        contratoId: atual.contratoId,
        createdBy: usuario,
      },
    });
    const arm = await this.prisma.armazenagem.update({
      where: { id },
      data: { valorPagamento: valor, dataPagamento: dto.dataPagamento, pagamentoStatus: 'LANCADO', lancamentoId: lanc.id, updatedBy: usuario },
    });
    return ArmazenagemResponseDto.fromEntity(arm);
  }

  /** Estorna o pagamento (soft-delete do lançamento, volta a PENDENTE). */
  async estornarPagamento(id: string, usuario: string): Promise<ArmazenagemResponseDto> {
    const atual = await this.buscarOuFalhar(id);
    if (atual.lancamentoId) {
      await this.prisma.lancamentoFinanceiro.updateMany({ where: { id: atual.lancamentoId }, data: { deletedAt: new Date() } });
    }
    const arm = await this.prisma.armazenagem.update({
      where: { id },
      data: { pagamentoStatus: 'PENDENTE', dataPagamento: null, lancamentoId: null, updatedBy: usuario },
    });
    return ArmazenagemResponseDto.fromEntity(arm);
  }

  async encerrar(id: string, dto: EncerrarArmazenagemDto, usuario: string): Promise<ArmazenagemResponseDto> {
    const atual = await this.buscarOuFalhar(id);
    if (atual.status === ArmazenagemStatus.ENCERRADA) throw new BadRequestException('Armazenagem já encerrada');
    const fim = new Date();
    // Se não informar o realizado, usa o previsto (fórmula por quinzena até o encerramento).
    const calc = ArmazenagemResponseDto.calcular({
      quantidadeSc: Number(atual.quantidadeSc), padronizacaoRate: Number(atual.padronizacaoRate),
      armazenagemRate: Number(atual.armazenagemRate), quebraPct: Number(atual.quebraPct),
      carenciaQuinzenas: atual.carenciaQuinzenas ?? 0, precoScRs: atual.precoScRs == null ? 0 : Number(atual.precoScRs),
      dataInicio: atual.dataInicio, dataEncerramento: atual.dataEncerramento ?? fim,
    });
    const arm = await this.prisma.armazenagem.update({
      where: { id },
      data: {
        status: ArmazenagemStatus.ENCERRADA,
        dataEncerramento: atual.dataEncerramento ?? fim,
        custoRealizadoRs: dto.custoRealizadoRs ?? calc.custoPrevistoRs,
        updatedBy: usuario,
      },
    });
    return ArmazenagemResponseDto.fromEntity(arm);
  }

  async remover(id: string, usuario: string): Promise<void> {
    await this.buscarOuFalhar(id);
    await this.prisma.armazenagem.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: usuario } });
  }

  private async buscarOuFalhar(id: string) {
    const arm = await this.prisma.armazenagem.findFirst({ where: { id, deletedAt: null } });
    if (!arm) throw new NotFoundException(`Armazenagem ${id} não encontrada`);
    return arm;
  }
}
