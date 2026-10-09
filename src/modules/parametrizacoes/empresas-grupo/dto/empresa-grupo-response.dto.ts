import { ApiProperty } from '@nestjs/swagger';
import { EmpresaGrupo } from '@prisma/client';

export class EmpresaGrupoResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() codigo: string;
  @ApiProperty() nome: string;
  @ApiProperty() tipo: string;
  @ApiProperty({ nullable: true }) cnpj: string | null;
  @ApiProperty() municipio: string;
  @ApiProperty() uf: string;
  @ApiProperty() ativa: boolean;

  static fromEntity(entity: EmpresaGrupo): EmpresaGrupoResponseDto {
    const dto = new EmpresaGrupoResponseDto();
    dto.id = entity.id;
    dto.codigo = entity.codigo;
    dto.nome = entity.nome;
    dto.tipo = entity.tipo;
    dto.cnpj = entity.cnpj;
    dto.municipio = entity.municipio;
    dto.uf = entity.uf;
    dto.ativa = entity.ativa;
    return dto;
  }
}
