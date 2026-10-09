import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { PaginatedResultDto } from '../../../common/dto/paginated-result.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ProdutoResponseDto } from './dto/produto-response.dto';
import { CreateProdutoDto } from './dto/create-produto.dto';
import { UpdateProdutoDto } from './dto/update-produto.dto';

@Injectable()
export class ProdutosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto): Promise<PaginatedResultDto<ProdutoResponseDto>> {
    const where = {
      deletedAt: null,
      ...(query.busca ? { nome: { contains: query.busca, mode: 'insensitive' as const } } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.produto.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { [query.ordenarPor ?? 'nome']: query.ordenarDirecao },
      }),
      this.prisma.produto.count({ where }),
    ]);

    return new PaginatedResultDto(
      rows.map((r) => ProdutoResponseDto.fromEntity(r)),
      query.page,
      query.limit,
      total,
    );
  }

  async findOne(id: string): Promise<ProdutoResponseDto> {
    const entity = await this.buscarOuFalhar(id);
    return ProdutoResponseDto.fromEntity(entity);
  }

  async criar(dto: CreateProdutoDto, usuario: string): Promise<ProdutoResponseDto> {
    await this.garantirNomeUnico(dto.nome);
    if (dto.produtoFixoEquivalenteId) await this.garantirEquivalenteExiste(dto.produtoFixoEquivalenteId);
    const entity = await this.prisma.produto.create({
      data: { ...dto, createdBy: usuario, updatedBy: usuario },
    });
    return ProdutoResponseDto.fromEntity(entity);
  }

  async atualizar(id: string, dto: UpdateProdutoDto, usuario: string): Promise<ProdutoResponseDto> {
    await this.buscarOuFalhar(id);
    if (dto.nome) await this.garantirNomeUnico(dto.nome, id);
    if (dto.produtoFixoEquivalenteId) {
      if (dto.produtoFixoEquivalenteId === id) {
        throw new BadRequestException('Um produto não pode ser o equivalente FIXO de si mesmo');
      }
      await this.garantirEquivalenteExiste(dto.produtoFixoEquivalenteId);
    }
    const entity = await this.prisma.produto.update({
      where: { id },
      data: { ...dto, updatedBy: usuario },
    });
    return ProdutoResponseDto.fromEntity(entity);
  }

  async remover(id: string, usuario: string): Promise<void> {
    await this.buscarOuFalhar(id);
    const emUso = await this.prisma.boleta.count({ where: { produtoId: id, deletedAt: null } });
    if (emUso > 0) throw new BadRequestException(`Produto em uso por ${emUso} boleta(s) — não pode ser removido`);
    await this.prisma.produto.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: usuario } });
  }

  private async buscarOuFalhar(id: string) {
    const entity = await this.prisma.produto.findFirst({ where: { id, deletedAt: null } });
    if (!entity) throw new NotFoundException(`Produto ${id} não encontrado`);
    return entity;
  }

  private async garantirNomeUnico(nome: string, ignorarId?: string): Promise<void> {
    const existente = await this.prisma.produto.findFirst({ where: { nome, deletedAt: null } });
    if (existente && existente.id !== ignorarId) {
      throw new BadRequestException(`Já existe um produto com o nome "${nome}"`);
    }
  }

  private async garantirEquivalenteExiste(id: string): Promise<void> {
    const existe = await this.prisma.produto.findFirst({ where: { id, deletedAt: null } });
    if (!existe) throw new BadRequestException(`Produto FIXO equivalente ${id} não encontrado`);
  }
}
