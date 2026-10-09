import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marca uma rota como pública (sem exigir JWT), mesmo com o guard global ativo. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
