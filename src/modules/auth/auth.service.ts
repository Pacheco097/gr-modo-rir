import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Usuario } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { JwtConfig } from '../../config/configuration';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private readonly jwtCfg: JwtConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.jwtCfg = config.get<JwtConfig>('jwt')!;
  }

  /** Autentica e-mail + senha e emite os tokens. */
  async login(email: string, senha: string): Promise<AuthResponseDto> {
    const usuario = await this.prisma.usuario.findFirst({ where: { email, deletedAt: null } });
    if (!usuario || !usuario.ativo || !usuario.senhaHash) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    const senhaOk = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaOk) throw new UnauthorizedException('Credenciais inválidas');

    return this.emitirTokens(usuario, true);
  }

  /** Renova os tokens a partir de um refresh token válido (com rotação). */
  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, { secret: this.jwtCfg.refreshSecret });
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }
    const usuario = await this.prisma.usuario.findFirst({
      where: { id: payload.sub, deletedAt: null, ativo: true },
    });
    if (!usuario || !usuario.refreshTokenHash) throw new UnauthorizedException('Sessão encerrada');

    const confere = await bcrypt.compare(refreshToken, usuario.refreshTokenHash);
    if (!confere) throw new UnauthorizedException('Refresh token não corresponde à sessão ativa');

    return this.emitirTokens(usuario, false);
  }

  /** Encerra a sessão (invalida o refresh token). */
  async logout(usuarioId: string): Promise<void> {
    await this.prisma.usuario.update({ where: { id: usuarioId }, data: { refreshTokenHash: null } });
  }

  private async emitirTokens(usuario: Usuario, atualizarUltimoAcesso: boolean): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: usuario.id,
      email: usuario.email,
      perfil: usuario.perfil,
      nome: usuario.nome,
    };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.jwtCfg.secret,
      expiresIn: this.jwtCfg.accessExpiresIn,
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.jwtCfg.refreshSecret,
      expiresIn: this.jwtCfg.refreshExpiresIn,
    });
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        refreshTokenHash,
        ...(atualizarUltimoAcesso ? { ultimoAcesso: new Date() } : {}),
      },
    });

    return {
      accessToken,
      refreshToken,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil },
    };
  }
}
