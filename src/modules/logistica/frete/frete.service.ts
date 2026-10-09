import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FreteStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { PaginatedResultDto } from '../../../common/dto/paginated-result.dto';
import { CreateFreteDto, FreteResponseDto, QueryFreteDto } from './dto/frete.dto';

@Injectable()
export class FreteService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryFreteDto): Promise<PaginatedResultDto<FreteResponseDto>> {
    const where: Prisma.FreteWhereInput = {
      deletedAt: null,
      ...(query.amarracaoId ? { amarracaoId: query.amarracaoId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.frete.findMany({ where, skip: query.skip, take: query.take, orderBy: { createdAt: query.ordenarDirecao } }),
      this.prisma.frete.count({ where }),
    ]);
    return new PaginatedResultDto(rows.map((r) => FreteResponseDto.fromEntity(r)), query.page, query.limit, total);
  }

  async criar(dto: CreateFreteDto, usuario: string): Promise<FreteResponseDto> {
    const amarr = await this.prisma.amarracao.findFirst({ where: { id: dto.amarracaoId, deletedAt: null } });
    if (!amarr) throw new BadRequestException('Amarração não encontrada');
    const frete = await this.prisma.frete.create({
      data: {
        amarracaoId: dto.amarracaoId,
        referencia: dto.referencia,
        quantidadeSc: dto.quantidadeSc,
        freteRsPorTon: dto.freteRsPorTon,
        observacao: dto.observacao,
        createdBy: usuario,
        updatedBy: usuario,
      },
    });
    return FreteResponseDto.fromEntity(frete);
  }

  async aprovar(id: string, usuario: string): Promise<FreteResponseDto> {
    const frete = await this.buscarOuFalhar(id);
    if (frete.status === FreteStatus.APROVADO) return FreteResponseDto.fromEntity(frete);
    const atualizado = await this.prisma.frete.update({
      where: { id },
      data: { status: FreteStatus.APROVADO, aprovadoPor: usuario, aprovadoEm: new Date(), updatedBy: usuario },
    });
    return FreteResponseDto.fromEntity(atualizado);
  }

  async reprovar(id: string, usuario: string, motivo?: string): Promise<FreteResponseDto> {
    await this.buscarOuFalhar(id);
    const atualizado = await this.prisma.frete.update({
      where: { id },
      data: { status: FreteStatus.REPROVADO, observacao: motivo, updatedBy: usuario },
    });
    return FreteResponseDto.fromEntity(atualizado);
  }

  async remover(id: string, usuario: string): Promise<void> {
    await this.buscarOuFalhar(id);
    await this.prisma.frete.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: usuario } });
  }

  private async buscarOuFalhar(id: string) {
    const frete = await this.prisma.frete.findFirst({ where: { id, deletedAt: null } });
    if (!frete) throw new NotFoundException(`Frete ${id} não encontrado`);
    return frete;
  }
}
