import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PerfilAcesso } from '@prisma/client';
import { UsuariosService } from './usuarios.service';
import { UsuarioResponseDto } from './dto/usuario-response.dto';
import { QueryUsuarioDto } from './dto/query-usuario.dto';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { TrocarSenhaDto } from './dto/trocar-senha.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUser, UsuarioAutenticado } from '../auth/decorators/auth-user.decorator';

/**
 * Usuários (docx §12.3). Todo o módulo exige autenticação; mutações exigem
 * perfil ADMINISTRADOR (RBAC). A troca de senha permite ao próprio usuário
 * alterar a sua (com senha atual).
 */
@ApiTags('usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly service: UsuariosService) {}

  @Get()
  @ApiOkResponse({ type: UsuarioResponseDto, isArray: true })
  findAll(@Query() query: QueryUsuarioDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: UsuarioResponseDto })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(PerfilAcesso.ADMINISTRADOR)
  @ApiOkResponse({ type: UsuarioResponseDto })
  criar(@Body() dto: CreateUsuarioDto, @AuthUser('id') autorId: string) {
    return this.service.criar(dto, autorId);
  }

  @Put(':id')
  @Roles(PerfilAcesso.ADMINISTRADOR)
  @ApiOkResponse({ type: UsuarioResponseDto })
  atualizar(@Param('id') id: string, @Body() dto: UpdateUsuarioDto, @AuthUser('id') autorId: string) {
    return this.service.atualizar(id, dto, autorId);
  }

  @Patch(':id/senha')
  @HttpCode(HttpStatus.NO_CONTENT)
  trocarSenha(@Param('id') id: string, @Body() dto: TrocarSenhaDto, @AuthUser() autor: UsuarioAutenticado) {
    return this.service.trocarSenha(id, dto.novaSenha, dto.senhaAtual, autor);
  }

  @Delete(':id')
  @Roles(PerfilAcesso.ADMINISTRADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  remover(@Param('id') id: string, @AuthUser() autor: UsuarioAutenticado) {
    return this.service.remover(id, autor);
  }
}
