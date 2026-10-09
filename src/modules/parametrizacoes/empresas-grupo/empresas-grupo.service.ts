import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { PaginatedResultDto } from '../../../common/dto/paginated-result.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { EmpresaGrupoResponseDto } from './dto/empresa-grupo-response.dto';
import { CreateEmpresaGrupoDto } from './dto/create-empresa-grupo.dto';
import { UpdateEmpresaGrupoDto } from './dto/update-empresa-grupo.dto';

@Injectable()
export class EmpresasGrupoService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto): Promise<PaginatedResultDto<EmpresaGrupoResponseDto>> {
    const where = {
      deletedAt: null,
      ...(query.busca
        ? {
            OR: [
              { nome: { contains: query.busca, mode: 'insensitive' as const } },
              { codigo: { contains: query.busca, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.empresaGrupo.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { [query.ordenarPor ?? 'codigo']: query.ordenarDirecao },
      }),
      this.prisma.empresaGrupo.count({ where }),
    ]);

    return new PaginatedResultDto(
      rows.map((r) => EmpresaGrupoResponseDto.fromEntity(r)),
      query.page,
      query.limit,
      total,
    );
  }

  async findOne(id: string): Promise<EmpresaGrupoResponseDto> {
    const entity = await this.prisma.empresaGrupo.findFirst({ where: { id, deletedAt: null } });
    if (!entity) throw new NotFoundException(`Empresa do Grupo ${id} não encontrada`);
    return EmpresaGrupoResponseDto.fromEntity(entity);
  }

  async criar(dto: CreateEmpresaGrupoDto, usuario: string): Promise<EmpresaGrupoResponseDto> {
    await this.garantirCodigoUnico(dto.codigo);
    const entity = await this.prisma.empresaGrupo.create({
      data: { ...dto, createdBy: usuario, updatedBy: usuario },
    });
    return EmpresaGrupoResponseDto.fromEntity(entity);
  }

  async atualizar(id: string, dto: UpdateEmpresaGrupoDto, usuario: string): Promise<EmpresaGrupoResponseDto> {
    await this.buscarOuFalhar(id);
    if (dto.codigo) await this.garantirCodigoUnico(dto.codigo, id);
    const entity = await this.prisma.empresaGrupo.update({
      where: { id },
      data: { ...dto, updatedBy: usuario },
    });
    return EmpresaGrupoResponseDto.fromEntity(entity);
  }

  async remover(id: string, usuario: string): Promise<void> {
    await this.buscarOuFalhar(id);
    const emUso = await this.prisma.boleta.count({ where: { empresaGrupoId: id, deletedAt: null } });
    if (emUso > 0) {
      throw new BadRequestException(`Empresa do Grupo em uso por ${emUso} boleta(s) — não pode ser removida`);
    }
    await this.prisma.empresaGrupo.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: usuario } });
  }

  private async buscarOuFalhar(id: string) {
    const entity = await this.prisma.empresaGrupo.findFirst({ where: { id, deletedAt: null } });
    if (!entity) throw new NotFoundException(`Empresa do Grupo ${id} não encontrada`);
    return entity;
  }

  private async garantirCodigoUnico(codigo: string, ignorarId?: string): Promise<void> {
    const existente = await this.prisma.empresaGrupo.findFirst({ where: { codigo, deletedAt: null } });
    if (existente && existente.id !== ignorarId) {
      throw new BadRequestException(`Já existe uma empresa com o código ${codigo}`);
    }
  }
}
