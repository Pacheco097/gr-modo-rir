import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * TEMPORÁRIO — enquanto o módulo de Auth/JWT (docx §13, etapa 3) não existe,
 * identificamos o usuário autor de uma ação via header `x-user` (nome ou
 * e-mail), caindo para AUDITORIA_USUARIO_PADRAO quando ausente. Isso alimenta
 * apenas createdBy/updatedBy e a trilha de auditoria (BoletaHistorico) desta
 * etapa. Quando o Auth Guard existir, substituir por `req.user.id` extraído
 * do JWT — nenhuma outra parte do código depende deste mecanismo.
 */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  const header = request.headers['x-user'];
  if (typeof header === 'string' && header.trim().length > 0) {
    return header.trim();
  }
  return process.env.AUDITORIA_USUARIO_PADRAO ?? 'sistema';
});
