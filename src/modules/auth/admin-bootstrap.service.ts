import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PerfilAcesso } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';

/**
 * Garante que exista um administrador com acesso ao sistema.
 *
 * Roda a cada subida da API, independentemente do comando de início
 * (entrypoint do Docker, `node dist/main` etc.). Só CRIA o usuário quando ele
 * não existe — nunca sobrescreve a senha de um usuário existente, então trocas
 * de senha feitas pela tela são preservadas.
 *
 * E-mail/senha podem ser definidos por variável de ambiente
 * (ADMIN_INICIAL_EMAIL / ADMIN_INICIAL_SENHA). Sem elas, usa o administrador
 * padrão abaixo (a senha fica aqui apenas como hash bcrypt).
 */
@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminBootstrapService.name);

  private static readonly EMAIL_PADRAO = 'administrador@modorir.com.br';
  private static readonly HASH_PADRAO = '$2a$10$pFcShfmJ8Gh.rl8gtSQxnubCuPcqe6IydXHs7Uzrdv2GV3O.6mTEa';

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const email = (process.env.ADMIN_INICIAL_EMAIL || AdminBootstrapService.EMAIL_PADRAO).trim().toLowerCase();
      const existente = await this.prisma.usuario.findUnique({ where: { email } });
      if (existente) return;

      const senhaEnv = process.env.ADMIN_INICIAL_SENHA;
      const senhaHash = senhaEnv ? await bcrypt.hash(senhaEnv, 10) : AdminBootstrapService.HASH_PADRAO;

      await this.prisma.usuario.create({
        data: {
          nome: 'ADMINISTRADOR',
          email,
          perfil: PerfilAcesso.ADMINISTRADOR,
          senhaHash,
          ativo: true,
          createdBy: 'sistema',
        },
      });
      this.logger.log(`Administrador inicial criado: ${email}`);
    } catch (err) {
      // Nunca impede a API de subir por causa disso.
      this.logger.error(`Falha ao garantir administrador inicial: ${(err as Error).message}`);
    }
  }
}
