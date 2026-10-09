import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ParametrizacaoStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  ParametrizacaoResponseDto,
  UpsertParametrizacaoDto,
} from './dto/parametrizacao.dto';

const INCLUDE = {
  amarracao: {
    select: {
      quantidadeSc: true,
      compraContrato: { select: { numeroErpMaxicon: true, contraparteNome: true } },
      vendaContrato: { select: { numeroErpMaxicon: true, contraparteNome: true } },
    },
  },
};

@Injectable()
export class ParametrizacaoService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista as parametrizações (uma por amarração). Opcionalmente filtra por status. */
  async findAll(status?: ParametrizacaoStatus): Promise<ParametrizacaoResponseDto[]> {
    const rows = await this.prisma.parametrizacao.findMany({
      where: { deletedAt: null, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      include: INCLUDE,
    });
    return rows.map((r) => ParametrizacaoResponseDto.fromEntity(r));
  }

  /** Retorna true se a amarração já está PARAMETRIZADO (usado como gate do embarque). */
  async estaParametrizada(amarracaoId: string): Promise<boolean> {
    const p = await this.prisma.parametrizacao.findFirst({
      where: { amarracaoId, deletedAt: null, status: ParametrizacaoStatus.PARAMETRIZADO },
      select: { id: true },
    });
    return !!p;
  }

  /**
   * Upsert por amarração: grava as instruções de faturamento (CSC) e marca a
   * amarração como PARAMETRIZADO. A instrução (CSC) é obrigatória para concluir.
   */
  async upsert(
    amarracaoId: string,
    dto: UpsertParametrizacaoDto,
    usuario: string,
  ): Promise<ParametrizacaoResponseDto> {
    const amarr = await this.prisma.amarracao.findFirst({
      where: { id: amarracaoId, deletedAt: null },
    });
    if (!amarr) throw new BadRequestException('Amarração não encontrada');
    if (!dto.instrucaoDoc || !dto.instrucaoDoc.trim()) {
      throw new BadRequestException('Anexe a instrução de faturamento (CSC) para parametrizar');
    }

    const dados = {
      tipoOperacao: dto.tipoOperacao ?? 'Exportação',
      instrucaoDoc: dto.instrucaoDoc.trim(),
      // só sobrescreve o conteúdo quando um novo arquivo é enviado
      ...(dto.instrucaoDocConteudo !== undefined ? { instrucaoDocConteudo: dto.instrucaoDocConteudo || null } : {}),
      observacao: dto.observacao ?? null,
      status: ParametrizacaoStatus.PARAMETRIZADO,
      dataParametrizacao: new Date(),
    };

    const row = await this.prisma.parametrizacao.upsert({
      where: { amarracaoId },
      create: { amarracaoId, ...dados, createdBy: usuario, updatedBy: usuario },
      update: { ...dados, updatedBy: usuario },
      include: INCLUDE,
    });
    return ParametrizacaoResponseDto.fromEntity(row);
  }

  /** Documento do CSC (nome + conteúdo data URL) para download. */
  async documento(amarracaoId: string): Promise<{ nome: string; conteudo: string }> {
    const p = await this.prisma.parametrizacao.findFirst({
      where: { amarracaoId, deletedAt: null },
      select: { instrucaoDoc: true, instrucaoDocConteudo: true },
    });
    if (!p || !p.instrucaoDocConteudo) {
      throw new NotFoundException('Documento do CSC não disponível para esta amarração');
    }
    return { nome: p.instrucaoDoc || 'documento-csc', conteudo: p.instrucaoDocConteudo };
  }
}
