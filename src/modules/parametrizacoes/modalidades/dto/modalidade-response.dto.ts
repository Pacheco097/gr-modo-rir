import { ApiProperty } from '@nestjs/swagger';
import { Modalidade, ModalidadeTipoOperacao } from '@prisma/client';

export class ModalidadeResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() empresaLabel: string;
  @ApiProperty() nome: string;
  @ApiProperty({ enum: ModalidadeTipoOperacao }) tipoOperacao: ModalidadeTipoOperacao;
  @ApiProperty({ nullable: true }) descricao: string | null;
  @ApiProperty() ativa: boolean;

  static fromEntity(entity: Modalidade): ModalidadeResponseDto {
    const dto = new ModalidadeResponseDto();
    dto.id = entity.id;
    dto.empresaLabel = entity.empresaLabel;
    dto.nome = entity.nome;
    dto.tipoOperacao = entity.tipoOperacao;
    dto.descricao = entity.descricao;
    dto.ativa = entity.ativa;
    return dto;
  }
}
