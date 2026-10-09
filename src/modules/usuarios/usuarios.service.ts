import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PerfilAcesso } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PaginatedResultDto } from '../../common/dto/paginated-result.dto';
import { UsuarioResponseDto } from './dto/usuario-response.dto';
import { QueryUsuarioDto } from './dto/query-usuario.dto';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UsuarioAutenticado } from '../auth/decorators/auth-user.decorator';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryUsuarioDto): Promise<PaginatedResultDto<UsuarioResponseDto>> {
    const where = {
      deletedAt: null,
      ...(query.busca ? { nome: { contains: query.busca, mode: 'insensitive' as const } } : {}),
      ...(query.perfil ? { perfil: query.perfil } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.usuario.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { [query.ordenarPor ?? 'nome']: query.ordenarDirecao },
      }),
      this.prisma.usuario.count({ where }),
    ]);

    return new PaginatedResultDto(
      rows.map((r) => UsuarioResponseDto.fromEntity(r)),
      query.page,
      query.limit,
      total,
    );
  }

  async findOne(id: string): Promise<UsuarioResponseDto> {
    const entity = await this.buscarOuFalhar(id);
    return UsuarioResponseDto.fromEntity(entity);
  }

  async criar(dto: CreateUsuarioDto, autorId: string): Promise<UsuarioResponseDto> {
    await this.garantirEmailUnico(dto.email);
    const senhaHash = await bcrypt.hash(dto.senha, 10);
    const entity = await this.prisma.usuario.create({
      data: {
        nome: dto.nome,
        email: dto.email,
        perfil: dto.perfil,
        telefone: dto.telefone,
        ativo: dto.ativo ?? true,
        senhaHash,
        createdBy: autorId,
        updatedBy: autorId,
      },
    });
    return UsuarioResponseDto.fromEntity(entity);
  }

  async atualizar(id: string, dto: UpdateUsuarioDto, autorId: string): Promise<UsuarioResponseDto> {
    await this.buscarOuFalhar(id);
    if (dto.email) await this.garantirEmailUnico(dto.email, id);
    const entity = await this.prisma.usuario.update({
      where: { id },
      data: { ...dto, updatedBy: autorId },
    });
    return UsuarioResponseDto.fromEntity(entity);
  }

  async remover(id: string, autor: UsuarioAutenticado): Promise<void> {
    const alvo = await this.buscarOuFalhar(id);
    if (id === autor.id) throw new BadRequestException('Você não pode remover o próprio usuário');
    // Impede remover o último administrador ativo
    if (alvo.perfil === PerfilAcesso.ADMINISTRADOR) {
      const admins = await this.prisma.usuario.count({
        where: { perfil: PerfilAcesso.ADMINISTRADOR, ativo: true, deletedAt: null },
      });
      if (admins <= 1) throw new BadRequestException('Não é possível remover o último administrador ativo');
    }
    await this.prisma.usuario.update({
      where: { id },
      data: { deletedAt: new Date(), refreshTokenHash: null, updatedBy: autor.id },
    });
  }

  /** Troca de senha: administrador troca de qualquer um; usuário troca a própria (exige senha atual). */
  async trocarSenha(
    id: string,
    novaSenha: string,
    senhaAtual: string | undefined,
    autor: UsuarioAutenticado,
  ): Promise<void> {
    const alvo = await this.buscarOuFalhar(id);
    const ehAdmin = autor.perfil === PerfilAcesso.ADMINISTRADOR;
    const ehProprio = autor.id === id;
    if (!ehAdmin && !ehProprio) {
      throw new ForbiddenException('Você só pode trocar a própria senha');
    }
    if (ehProprio && !ehAdmin) {
      if (!senhaAtual || !alvo.senhaHash || !(await bcrypt.compare(senhaAtual, alvo.senhaHash))) {
        throw new UnauthorizedException('Senha atual incorreta');
      }
    }
    const senhaHash = await bcrypt.hash(novaSenha, 10);
    // Invalida a sessão ativa (refresh) ao trocar a senha
    await this.prisma.usuario.update({
      where: { id },
      data: { senhaHash, refreshTokenHash: null, updatedBy: autor.id },
    });
  }

  private async buscarOuFalhar(id: string) {
    const entity = await this.prisma.usuario.findFirst({ where: { id, deletedAt: null } });
    if (!entity) throw new NotFoundException(`Usuário ${id} não encontrado`);
    return entity;
  }

  private async garantirEmailUnico(email: string, ignorarId?: string): Promise<void> {
    const existente = await this.prisma.usuario.findFirst({ where: { email, deletedAt: null } });
    if (existente && existente.id !== ignorarId) {
      throw new BadRequestException(`Já existe um usuário com o e-mail ${email}`);
    }
  }
}
