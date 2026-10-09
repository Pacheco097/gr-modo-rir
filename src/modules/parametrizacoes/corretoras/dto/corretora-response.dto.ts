import { ApiProperty } from '@nestjs/swagger';
import { Corretora } from '@prisma/client';

export class CorretoraResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() nome: string;
  @ApiProperty({ nullable: true }) cnpj: string | null;
  @ApiProperty({ nullable: true }) contato: string | null;
  @ApiProperty({ nullable: true }) telefone: string | null;
  @ApiProperty({ nullable: true }) email: string | null;
  @ApiProperty() corretagemPctPadrao: number;
  @ApiProperty() ativa: boolean;

  static fromEntity(entity: Corretora): CorretoraResponseDto {
    const dto = new CorretoraResponseDto();
    dto.id = entity.id;
    dto.nome = entity.nome;
    dto.cnpj = entity.cnpj;
    dto.contato = entity.contato;
    dto.telefone = entity.telefone;
    dto.email = entity.email;
    dto.corretagemPctPadrao = Number(entity.corretagemPctPadrao);
    dto.ativa = entity.ativa;
    return dto;
  }
}
