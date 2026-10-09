import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { PaginatedResultDto } from '../../../common/dto/paginated-result.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { FazendaResponseDto } from './dto/fazenda-response.dto';
import { CreateFazendaDto } from './dto/create-fazenda.dto';
import { UpdateFazendaDto } from './dto/update-fazenda.dto';

@Injectable()
export class FazendasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto): Promise<PaginatedResultDto<FazendaResponseDto>> {
    const where = {
      deletedAt: null,
      ...(query.busca
        ? {
            OR: [
              { nome: { contains: query.busca, mode: 'insensitive' as const } },
              { municipio: { contains: query.busca, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.fazenda.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { [query.ordenarPor ?? 'nome']: query.ordenarDirecao },
      }),
      this.prisma.fazenda.count({ where }),
    ]);

    return new PaginatedResultDto(
      rows.map((r) => FazendaResponseDto.fromEntity(r)),
      query.page,
      query.limit,
      total,
    );
  }

  async findOne(id: string): Promise<FazendaResponseDto> {
    const entity = await this.buscarOuFalhar(id);
    return FazendaResponseDto.fromEntity(entity);
  }

  async criar(dto: CreateFazendaDto, usuario: string): Promise<FazendaResponseDto> {
    if (dto.empresaGrupoId) await this.garantirEmpresaExiste(dto.empresaGrupoId);
    const entity = await this.prisma.fazenda.create({
      data: { ...dto, createdBy: usuario, updatedBy: usuario },
    });
    return FazendaResponseDto.fromEntity(entity);
  }

  async atualizar(id: string, dto: UpdateFazendaDto, usuario: string): Promise<FazendaResponseDto> {
    await this.buscarOuFalhar(id);
    if (dto.empresaGrupoId) await this.garantirEmpresaExiste(dto.empresaGrupoId);
    const entity = await this.prisma.fazenda.update({
      where: { id },
      data: { ...dto, updatedBy: usuario },
    });
    return FazendaResponseDto.fromEntity(entity);
  }

  async remover(id: string, usuario: string): Promise<void> {
    await this.buscarOuFalhar(id);
    await this.prisma.fazenda.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: usuario } });
  }

  private async buscarOuFalhar(id: string) {
    const entity = await this.prisma.fazenda.findFirst({ where: { id, deletedAt: null } });
    if (!entity) throw new NotFoundException(`Fazenda ${id} não encontrada`);
    return entity;
  }

  private async garantirEmpresaExiste(empresaGrupoId: string): Promise<void> {
    const existe = await this.prisma.empresaGrupo.findFirst({ where: { id: empresaGrupoId, deletedAt: null } });
    if (!existe) throw new BadRequestException(`Empresa do Grupo ${empresaGrupoId} não encontrada`);
  }
}
