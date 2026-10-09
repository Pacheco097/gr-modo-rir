import { ApiProperty } from '@nestjs/swagger';
import { ClassificacaoCredito, Pessoa, PessoaTipo } from '@prisma/client';

export class PessoaResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() codigo: string;
  @ApiProperty() nome: string;
  @ApiProperty({ enum: PessoaTipo }) tipo: PessoaTipo;
  @ApiProperty() documento: string;
  @ApiProperty({ nullable: true }) inscricaoEstadual: string | null;
  @ApiProperty({ nullable: true }) municipio: string | null;
  @ApiProperty({ nullable: true }) uf: string | null;
  @ApiProperty({ nullable: true }) telefone: string | null;
  @ApiProperty({ nullable: true }) email: string | null;
  @ApiProperty({ nullable: true }) banco: string | null;
  @ApiProperty({ nullable: true }) agenciaConta: string | null;
  @ApiProperty({ nullable: true }) pix: string | null;
  @ApiProperty({ enum: ClassificacaoCredito, nullable: true }) classificacaoCredito: ClassificacaoCredito | null;
  @ApiProperty() ativo: boolean;

  static fromEntity(entity: Pessoa): PessoaResponseDto {
    const dto = new PessoaResponseDto();
    dto.id = entity.id;
    dto.codigo = entity.codigo;
    dto.nome = entity.nome;
    dto.tipo = entity.tipo;
    dto.documento = entity.documento;
    dto.inscricaoEstadual = entity.inscricaoEstadual;
    dto.municipio = entity.municipio;
    dto.uf = entity.uf;
    dto.telefone = entity.telefone;
    dto.email = entity.email;
    dto.banco = entity.banco;
    dto.agenciaConta = entity.agenciaConta;
    dto.pix = entity.pix;
    dto.classificacaoCredito = entity.classificacaoCredito;
    dto.ativo = entity.ativo;
    return dto;
  }
}
