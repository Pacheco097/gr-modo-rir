import { ApiProperty } from '@nestjs/swagger';
import { Fazenda } from '@prisma/client';

export class FazendaResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() nome: string;
  @ApiProperty({ nullable: true }) empresaGrupoId: string | null;
  @ApiProperty({ nullable: true }) municipio: string | null;
  @ApiProperty({ nullable: true }) uf: string | null;
  @ApiProperty() areaHectares: number;
  @ApiProperty() ativa: boolean;

  static fromEntity(entity: Fazenda): FazendaResponseDto {
    const dto = new FazendaResponseDto();
    dto.id = entity.id;
    dto.nome = entity.nome;
    dto.empresaGrupoId = entity.empresaGrupoId;
    dto.municipio = entity.municipio;
    dto.uf = entity.uf;
    dto.areaHectares = Number(entity.areaHectares);
    dto.ativa = entity.ativa;
    return dto;
  }
}
