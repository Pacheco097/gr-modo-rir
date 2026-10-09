import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { PaginatedResultDto } from '../../../common/dto/paginated-result.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { CorretoraResponseDto } from './dto/corretora-response.dto';
import { CreateCorretoraDto } from './dto/create-corretora.dto';
import { UpdateCorretoraDto } from './dto/update-corretora.dto';

@Injectable()
export class CorretorasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto): Promise<PaginatedResultDto<CorretoraResponseDto>> {
    const where = {
      deletedAt: null,
      ...(query.busca ? { nome: { contains: query.busca, mode: 'insensitive' as const } } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.corretora.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { [query.ordenarPor ?? 'nome']: query.ordenarDirecao },
      }),
      this.prisma.corretora.count({ where }),
    ]);

    return new PaginatedResultDto(
      rows.map((r) => CorretoraResponseDto.fromEntity(r)),
      query.page,
      query.limit,
      total,
    );
  }

  async findOne(id: string): Promise<CorretoraResponseDto> {
    const entity = await this.buscarOuFalhar(id);
    return CorretoraResponseDto.fromEntity(entity);
  }

  async criar(dto: CreateCorretoraDto, usuario: string): Promise<CorretoraResponseDto> {
    const entity = await this.prisma.corretora.create({
      data: { ...dto, createdBy: usuario, updatedBy: usuario },
    });
    return CorretoraResponseDto.fromEntity(entity);
  }

  async atualizar(id: string, dto: UpdateCorretoraDto, usuario: string): Promise<CorretoraResponseDto> {
    await this.buscarOuFalhar(id);
    const entity = await this.prisma.corretora.update({
      where: { id },
      data: { ...dto, updatedBy: usuario },
    });
    return CorretoraResponseDto.fromEntity(entity);
  }

  async remover(id: string, usuario: string): Promise<void> {
    await this.buscarOuFalhar(id);
    const emUso = await this.prisma.boleta.count({ where: { corretoraId: id, deletedAt: null } });
    if (emUso > 0) throw new BadRequestException(`Corretora em uso por ${emUso} boleta(s) — não pode ser removida`);
    await this.prisma.corretora.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: usuario } });
  }

  private async buscarOuFalhar(id: string) {
    const entity = await this.prisma.corretora.findFirst({ where: { id, deletedAt: null } });
    if (!entity) throw new NotFoundException(`Corretora ${id} não encontrada`);
    return entity;
  }
}
