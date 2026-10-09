import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PerfilAcesso } from '@prisma/client';

/** Payload do usuário autenticado, anexado ao request pela JwtStrategy. */
export interface UsuarioAutenticado {
  id: string;
  email: string;
  nome: string;
  perfil: PerfilAcesso;
}

/**
 * Injeta o usuário autenticado (extraído do JWT) no handler.
 * Ex.: metodo(@AuthUser() usuario: UsuarioAutenticado)
 * Sem argumento retorna o objeto inteiro; com uma chave, retorna só o campo.
 */
export const AuthUser = createParamDecorator(
  (data: keyof UsuarioAutenticado | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as UsuarioAutenticado | undefined;
    return data && user ? user[data] : user;
  },
);
