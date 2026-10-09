import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { PaginatedResultDto } from '../../../common/dto/paginated-result.dto';
import { MODALIDADES_COMPATIVEIS } from '../../../common/constants/modalidade-compativel.map';
import { ModalidadeResponseDto } from './dto/modalidade-response.dto';
import { QueryModalidadeDto } from './dto/query-modalidade.dto';
import { CreateModalidadeDto } from './dto/create-modalidade.dto';
import { UpdateModalidadeDto } from './dto/update-modalidade.dto';

@Injectable()
export class ModalidadesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryModalidadeDto): Promise<PaginatedResultDto<ModalidadeResponseDto>> {
    const where = {
      deletedAt: null,
      ...(query.busca ? { nome: { contains: query.busca, mode: 'insensitive' as const } } : {}),
      ...(query.tipoBoleta ? { tipoOperacao: { in: MODALIDADES_COMPATIVEIS[query.tipoBoleta] } } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.modalidade.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { [query.ordenarPor ?? 'nome']: query.ordenarDirecao },
      }),
      this.prisma.modalidade.count({ where }),
    ]);

    return new PaginatedResultDto(
      rows.map((r) => ModalidadeResponseDto.fromEntity(r)),
      query.page,
      query.limit,
      total,
    );
  }

  async findOne(id: string): Promise<ModalidadeResponseDto> {
    const entity = await this.buscarOuFalhar(id);
    return ModalidadeResponseDto.fromEntity(entity);
  }

  async criar(dto: CreateModalidadeDto, usuario: string): Promise<ModalidadeResponseDto> {
    await this.garantirNomeUnico(dto.nome);
    const entity = await this.prisma.modalidade.create({
      data: { ...dto, createdBy: usuario, updatedBy: usuario },
    });
    return ModalidadeResponseDto.fromEntity(entity);
  }

  async atualizar(id: string, dto: UpdateModalidadeDto, usuario: string): Promise<ModalidadeResponseDto> {
    await this.buscarOuFalhar(id);
    if (dto.nome) await this.garantirNomeUnico(dto.nome, id);
    const entity = await this.prisma.modalidade.update({
      where: { id },
      data: { ...dto, updatedBy: usuario },
    });
    return ModalidadeResponseDto.fromEntity(entity);
  }

  async remover(id: string, usuario: string): Promise<void> {
    await this.buscarOuFalhar(id);
    const emUso = await this.prisma.boleta.count({ where: { modalidadeId: id, deletedAt: null } });
    if (emUso > 0) throw new BadRequestException(`Modalidade em uso por ${emUso} boleta(s) — não pode ser removida`);
    await this.prisma.modalidade.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: usuario } });
  }

  private async buscarOuFalhar(id: string) {
    const entity = await this.prisma.modalidade.findFirst({ where: { id, deletedAt: null } });
    if (!entity) throw new NotFoundException(`Modalidade ${id} não encontrada`);
    return entity;
  }

  private async garantirNomeUnico(nome: string, ignorarId?: string): Promise<void> {
    const existente = await this.prisma.modalidade.findFirst({ where: { nome, deletedAt: null } });
    if (existente && existente.id !== ignorarId) {
      throw new BadRequestException(`Já existe uma modalidade com o nome "${nome}"`);
    }
  }
}
