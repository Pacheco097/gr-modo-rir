import { SetMetadata } from '@nestjs/common';
import { PerfilAcesso } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restringe o endpoint aos perfis informados (RBAC, docx §4).
 * Ex.: @Roles(PerfilAcesso.ADMINISTRADOR)
 */
export const Roles = (...perfis: PerfilAcesso[]) => SetMetadata(ROLES_KEY, perfis);
