import { ApiProperty } from '@nestjs/swagger';
import { PerfilAcesso } from '@prisma/client';

export class UsuarioLogadoDto {
  @ApiProperty() id: string;
  @ApiProperty() nome: string;
  @ApiProperty() email: string;
  @ApiProperty({ enum: PerfilAcesso }) perfil: PerfilAcesso;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'Access token JWT (curta duração)' })
  accessToken: string;

  @ApiProperty({ description: 'Refresh token (renova o access token)' })
  refreshToken: string;

  @ApiProperty({ type: UsuarioLogadoDto })
  usuario: UsuarioLogadoDto;
}
