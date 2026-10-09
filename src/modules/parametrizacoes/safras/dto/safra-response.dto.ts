import { ApiProperty } from '@nestjs/swagger';
import { Safra } from '@prisma/client';

export class SafraResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() codigo: string;
  @ApiProperty() inicio: Date;
  @ApiProperty() fim: Date;
  @ApiProperty() ativa: boolean;
  @ApiProperty({ nullable: true }) descricao: string | null;

  static fromEntity(entity: Safra): SafraResponseDto {
    const dto = new SafraResponseDto();
    dto.id = entity.id;
    dto.codigo = entity.codigo;
    dto.inicio = entity.inicio;
    dto.fim = entity.fim;
    dto.ativa = entity.ativa;
    dto.descricao = entity.descricao;
    return dto;
  }
}
