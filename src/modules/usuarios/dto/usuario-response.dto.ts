import { ApiProperty } from '@nestjs/swagger';
import { PerfilAcesso, Usuario } from '@prisma/client';

/** Nunca expõe senhaHash nem refreshTokenHash. */
export class UsuarioResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() nome: string;
  @ApiProperty() email: string;
  @ApiProperty({ nullable: true }) telefone: string | null;
  @ApiProperty({ enum: PerfilAcesso }) perfil: PerfilAcesso;
  @ApiProperty() ativo: boolean;
  @ApiProperty({ nullable: true }) ultimoAcesso: Date | null;

  static fromEntity(entity: Usuario): UsuarioResponseDto {
    const dto = new UsuarioResponseDto();
    dto.id = entity.id;
    dto.nome = entity.nome;
    dto.email = entity.email;
    dto.telefone = entity.telefone;
    dto.perfil = entity.perfil;
    dto.ativo = entity.ativo;
    dto.ultimoAcesso = entity.ultimoAcesso;
    return dto;
  }
}
