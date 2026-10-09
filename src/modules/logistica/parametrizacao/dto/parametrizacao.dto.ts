import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ParametrizacaoStatus } from '@prisma/client';
import { IsOptional, IsString } from 'class-validator';

export class UpsertParametrizacaoDto {
  @ApiPropertyOptional({ description: 'Tipo de operação (ex.: Exportação)' })
  @IsOptional()
  @IsString()
  tipoOperacao?: string;

  @ApiPropertyOptional({ description: 'Instrução de faturamento (CSC) — nome do documento anexado' })
  @IsOptional()
  @IsString()
  instrucaoDoc?: string;

  @ApiPropertyOptional({ description: 'Conteúdo do documento (data URL base64) para download pelo CSC' })
  @IsOptional()
  @IsString()
  instrucaoDocConteudo?: string;

  @ApiPropertyOptional({ description: 'Observações da parametrização' })
  @IsOptional()
  @IsString()
  observacao?: string;
}

export class ParametrizacaoResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() amarracaoId: string;
  @ApiProperty({ nullable: true }) compraNumero: string | null;
  @ApiProperty({ nullable: true }) compraContraparte: string | null;
  @ApiProperty({ nullable: true }) vendaNumero: string | null;
  @ApiProperty({ nullable: true }) vendaContraparte: string | null;
  @ApiProperty() quantidadeSc: number;
  @ApiProperty({ nullable: true }) tipoOperacao: string | null;
  @ApiProperty({ nullable: true }) instrucaoDoc: string | null;
  @ApiProperty({ description: 'Há arquivo do CSC armazenado (baixável)' }) temInstrucaoDoc: boolean;
  @ApiProperty({ nullable: true }) observacao: string | null;
  @ApiProperty({ enum: ParametrizacaoStatus }) status: ParametrizacaoStatus;
  @ApiProperty({ nullable: true }) dataParametrizacao: Date | null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromEntity(e: any): ParametrizacaoResponseDto {
    const dto = new ParametrizacaoResponseDto();
    dto.id = e.id;
    dto.amarracaoId = e.amarracaoId;
    dto.compraNumero = e.amarracao?.compraContrato?.numeroErpMaxicon ?? null;
    dto.compraContraparte = e.amarracao?.compraContrato?.contraparteNome ?? null;
    dto.vendaNumero = e.amarracao?.vendaContrato?.numeroErpMaxicon ?? null;
    dto.vendaContraparte = e.amarracao?.vendaContrato?.contraparteNome ?? null;
    dto.quantidadeSc = e.amarracao ? Number(e.amarracao.quantidadeSc) : 0;
    dto.tipoOperacao = e.tipoOperacao ?? null;
    dto.instrucaoDoc = e.instrucaoDoc ?? null;
    dto.temInstrucaoDoc = !!e.instrucaoDocConteudo;
    dto.observacao = e.observacao ?? null;
    dto.status = e.status;
    dto.dataParametrizacao = e.dataParametrizacao ?? null;
    return dto;
  }
}
