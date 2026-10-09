import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PerfilAcesso } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UsuarioAutenticado } from '../decorators/auth-user.decorator';

/**
 * Verifica se o perfil do usuário autenticado está entre os perfis exigidos
 * por @Roles(). Deve ser usado após o JwtAuthGuard (que popula req.user).
 * ADMINISTRADOR tem acesso irrestrito.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const perfisExigidos = this.reflector.getAllAndOverride<PerfilAcesso[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!perfisExigidos || perfisExigidos.length === 0) return true;

    const user = context.switchToHttp().getRequest().user as UsuarioAutenticado | undefined;
    if (!user) throw new ForbiddenException('Usuário não autenticado');
    if (user.perfil === PerfilAcesso.ADMINISTRADOR) return true;
    if (!perfisExigidos.includes(user.perfil)) {
      throw new ForbiddenException('Seu perfil não tem permissão para esta ação');
    }
    return true;
  }
}
