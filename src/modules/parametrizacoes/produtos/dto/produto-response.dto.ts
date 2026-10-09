import { ApiProperty } from '@nestjs/swagger';
import { Produto } from '@prisma/client';

export class ProdutoResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() nome: string;
  @ApiProperty() fatorKgPorSaca: number;
  @ApiProperty() unidade: string;
  @ApiProperty({ nullable: true }) ncm: string | null;
  @ApiProperty() ativo: boolean;
  @ApiProperty({ description: "true quando o nome do produto contém 'A Fixar' (mercado FUTURO)" })
  aFixar: boolean;
  @ApiProperty({ nullable: true }) produtoFixoEquivalenteId: string | null;

  static fromEntity(entity: Produto): ProdutoResponseDto {
    const dto = new ProdutoResponseDto();
    dto.id = entity.id;
    dto.nome = entity.nome;
    dto.fatorKgPorSaca = entity.fatorKgPorSaca;
    dto.unidade = entity.unidade;
    dto.ncm = entity.ncm;
    dto.ativo = entity.ativo;
    dto.aFixar = /a\s*-?\s*fixar/i.test(entity.nome);
    dto.produtoFixoEquivalenteId = entity.produtoFixoEquivalenteId;
    return dto;
  }
}
