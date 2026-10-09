import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../database/prisma.service';
import { JwtConfig } from '../../../config/configuration';
import { UsuarioAutenticado } from '../decorators/auth-user.decorator';

/** Payload assinado no access token. */
export interface JwtPayload {
  sub: string;
  email: string;
  perfil: string;
  nome: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<JwtConfig>('jwt')!.secret,
    });
  }

  /** Valida o usuário a cada request e devolve o objeto anexado em req.user. */
  async validate(payload: JwtPayload): Promise<UsuarioAutenticado> {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id: payload.sub, deletedAt: null, ativo: true },
    });
    if (!usuario) {
      throw new UnauthorizedException('Usuário inválido ou inativo');
    }
    return { id: usuario.id, email: usuario.email, nome: usuario.nome, perfil: usuario.perfil };
  }
}
