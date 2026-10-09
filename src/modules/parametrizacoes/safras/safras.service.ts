import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { PaginatedResultDto } from '../../../common/dto/paginated-result.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { SafraResponseDto } from './dto/safra-response.dto';
import { CreateSafraDto } from './dto/create-safra.dto';
import { UpdateSafraDto } from './dto/update-safra.dto';

@Injectable()
export class SafrasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto): Promise<PaginatedResultDto<SafraResponseDto>> {
    const where = {
      deletedAt: null,
      ...(query.busca ? { codigo: { contains: query.busca, mode: 'insensitive' as const } } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.safra.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { [query.ordenarPor ?? 'codigo']: query.ordenarDirecao },
      }),
      this.prisma.safra.count({ where }),
    ]);

    return new PaginatedResultDto(
      rows.map((r) => SafraResponseDto.fromEntity(r)),
      query.page,
      query.limit,
      total,
    );
  }

  async findOne(id: string): Promise<SafraResponseDto> {
    const entity = await this.buscarOuFalhar(id);
    return SafraResponseDto.fromEntity(entity);
  }

  async criar(dto: CreateSafraDto, usuario: string): Promise<SafraResponseDto> {
    await this.garantirCodigoUnico(dto.codigo);
    const entity = await this.prisma.safra.create({
      data: {
        codigo: dto.codigo,
        inicio: new Date(dto.inicio),
        fim: new Date(dto.fim),
        ativa: dto.ativa ?? true,
        descricao: dto.descricao,
        createdBy: usuario,
        updatedBy: usuario,
      },
    });
    return SafraResponseDto.fromEntity(entity);
  }

  async atualizar(id: string, dto: UpdateSafraDto, usuario: string): Promise<SafraResponseDto> {
    await this.buscarOuFalhar(id);
    if (dto.codigo) await this.garantirCodigoUnico(dto.codigo, id);
    const entity = await this.prisma.safra.update({
      where: { id },
      data: {
        codigo: dto.codigo,
        inicio: dto.inicio ? new Date(dto.inicio) : undefined,
        fim: dto.fim ? new Date(dto.fim) : undefined,
        ativa: dto.ativa,
        descricao: dto.descricao,
        updatedBy: usuario,
      },
    });
    return SafraResponseDto.fromEntity(entity);
  }

  async remover(id: string, usuario: string): Promise<void> {
    await this.buscarOuFalhar(id);
    const emUso = await this.prisma.boleta.count({ where: { safraId: id, deletedAt: null } });
    if (emUso > 0) throw new BadRequestException(`Safra em uso por ${emUso} boleta(s) — não pode ser removida`);
    await this.prisma.safra.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: usuario } });
  }

  private async buscarOuFalhar(id: string) {
    const entity = await this.prisma.safra.findFirst({ where: { id, deletedAt: null } });
    if (!entity) throw new NotFoundException(`Safra ${id} não encontrada`);
    return entity;
  }

  private async garantirCodigoUnico(codigo: string, ignorarId?: string): Promise<void> {
    const existente = await this.prisma.safra.findFirst({ where: { codigo, deletedAt: null } });
    if (existente && existente.id !== ignorarId) {
      throw new BadRequestException(`Já existe uma safra com o código ${codigo}`);
    }
  }
}
