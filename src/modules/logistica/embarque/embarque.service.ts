import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EmbarqueStatus, FreteStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { PaginatedResultDto } from '../../../common/dto/paginated-result.dto';
import {
  AtualizarLoteEmbarqueDto,
  EmbarqueResponseDto,
  EncerrarEmbarqueDto,
  LiberarEmbarqueDto,
  QueryEmbarqueDto,
} from './dto/embarque.dto';
import { ClassificacaoService } from '../../comercial/classificacao/classificacao.service';
import { ParametrizacaoService } from '../parametrizacao/parametrizacao.service';

@Injectable()
export class EmbarqueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly classificacao: ClassificacaoService,
    private readonly parametrizacao: ParametrizacaoService,
  ) {}

  async findAll(query: QueryEmbarqueDto): Promise<PaginatedResultDto<EmbarqueResponseDto>> {
    const where: Prisma.EmbarqueWhereInput = {
      deletedAt: null,
      ...(query.amarracaoId ? { amarracaoId: query.amarracaoId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.embarque.findMany({ where, skip: query.skip, take: query.take, orderBy: { createdAt: query.ordenarDirecao } }),
      this.prisma.embarque.count({ where }),
    ]);
    return new PaginatedResultDto(rows.map((r) => EmbarqueResponseDto.fromEntity(r)), query.page, query.limit, total);
  }

  /** Liberação de embarque — exige frete APROVADO na amarração (docx §7). */
  async liberar(dto: LiberarEmbarqueDto, usuario: string): Promise<EmbarqueResponseDto> {
    const amarr = await this.prisma.amarracao.findFirst({ where: { id: dto.amarracaoId, deletedAt: null } });
    if (!amarr) throw new BadRequestException('Amarração não encontrada');
    const freteAprovado = await this.prisma.frete.count({
      where: { amarracaoId: dto.amarracaoId, status: FreteStatus.APROVADO, deletedAt: null },
    });
    if (freteAprovado === 0) {
      throw new BadRequestException('Libere o embarque só após aprovar o frete da amarração');
    }
    const parametrizada = await this.parametrizacao.estaParametrizada(dto.amarracaoId);
    if (!parametrizada) {
      throw new BadRequestException('Libere o embarque só após a parametrização do contrato (Operações)');
    }
    const embarque = await this.prisma.embarque.create({
      data: {
        amarracaoId: dto.amarracaoId,
        quantidadeSc: dto.quantidadeSc,
        status: EmbarqueStatus.LIBERADO,
        dataLiberacao: new Date(),
        observacao: dto.observacao,
        createdBy: usuario,
        updatedBy: usuario,
      },
    });
    // Rede de segurança: garante a pendência de classificação da amarração
    // (o gatilho principal é a criação da amarração).
    await this.classificacao.gerarPendenteDaAmarracao(dto.amarracaoId, usuario);
    return EmbarqueResponseDto.fromEntity(embarque);
  }

  /** Encerramento — registra o peso descarregado (base de % performado/comissão). */
  async encerrar(id: string, dto: EncerrarEmbarqueDto, usuario: string): Promise<EmbarqueResponseDto> {
    const embarque = await this.buscarOuFalhar(id);
    if (embarque.status === EmbarqueStatus.ENCERRADO) {
      throw new BadRequestException('Embarque já encerrado');
    }
    const atualizado = await this.prisma.embarque.update({
      where: { id },
      data: {
        status: EmbarqueStatus.ENCERRADO,
        dataEncerramento: new Date(),
        pesoDescarregadoKg: dto.pesoDescarregadoKg ?? 0,
        updatedBy: usuario,
      },
    });
    return EmbarqueResponseDto.fromEntity(atualizado);
  }

  /** Lote (pós-liberação): transportadoras + classificadora. Editável; segue para o CSC. */
  async atualizarLote(id: string, dto: AtualizarLoteEmbarqueDto, usuario: string): Promise<EmbarqueResponseDto> {
    const embarque = await this.buscarOuFalhar(id);
    // Classificadora definida → move a classificação da amarração para "programar para pagamento".
    if (dto.classificadora !== undefined) {
      await this.classificacao.definirClassificadora(embarque.amarracaoId, dto.classificadora ?? null, usuario);
    }
    const data: Record<string, unknown> = { updatedBy: usuario };
    if (dto.transportadorasLote !== undefined) {
      // Fonte da verdade: normaliza e DERIVA os campos legados (compat. com o CSC e telas antigas).
      const lote = (dto.transportadorasLote ?? [])
        .map((t) => ({
          nome: String(t?.nome ?? '').trim(),
          vigente: !!t?.vigente,
          caminhoes: Math.max(0, Math.round(Number(t?.caminhoes) || 0)),
        }))
        .filter((t) => t.nome);
      data.transportadorasLote = lote;
      data.transportadoras = lote.map((t) => t.nome);
      data.transportadorasVigentes = lote.filter((t) => t.vigente).map((t) => t.nome);
      data.caminhoesPosicionados = lote.filter((t) => t.vigente).reduce((s, t) => s + t.caminhoes, 0);
    } else {
      // Caminho legado (sem lote detalhado): mantém o comportamento antigo.
      if (dto.transportadoras !== undefined) data.transportadoras = dto.transportadoras.map((t) => String(t).trim()).filter(Boolean);
      if (dto.transportadorasVigentes !== undefined) data.transportadorasVigentes = dto.transportadorasVigentes.map((t) => String(t).trim()).filter(Boolean);
      if (dto.caminhoesPosicionados !== undefined) data.caminhoesPosicionados = Math.max(0, Math.round(Number(dto.caminhoesPosicionados) || 0));
    }
    if (dto.classificadora !== undefined) data.classificadora = dto.classificadora?.trim() || null;
    const atualizado = await this.prisma.embarque.update({ where: { id }, data });
    return EmbarqueResponseDto.fromEntity(atualizado);
  }

  async remover(id: string, usuario: string): Promise<void> {
    await this.buscarOuFalhar(id);
    await this.prisma.embarque.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: usuario } });
  }

  private async buscarOuFalhar(id: string) {
    const embarque = await this.prisma.embarque.findFirst({ where: { id, deletedAt: null } });
    if (!embarque) throw new NotFoundException(`Embarque ${id} não encontrado`);
    return embarque;
  }
}
