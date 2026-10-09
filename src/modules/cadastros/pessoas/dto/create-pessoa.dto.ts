import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClassificacaoCredito, PessoaTipo } from '@prisma/client';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreatePessoaDto {
  @ApiProperty({ example: 'Cargill Brasil Ltda' })
  @IsString()
  @MinLength(1)
  nome: string;

  @ApiProperty({ enum: PessoaTipo, description: 'Determina o prefixo do código gerado' })
  @IsEnum(PessoaTipo)
  tipo: PessoaTipo;

  @ApiProperty({ example: '60.498.706/0001-57', description: 'CPF ou CNPJ (com ou sem máscara)' })
  @IsString()
  @MinLength(1)
  documento: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  inscricaoEstadual?: string;

  @ApiPropertyOptional({ example: 'Sorriso' })
  @IsOptional()
  @IsString()
  municipio?: string;

  @ApiPropertyOptional({ example: 'MT', description: 'Determina operação intra/interestadual (ICMS do frete)' })
  @IsOptional()
  @IsString()
  uf?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telefone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Dados bancários — relevantes sobretudo para Produtor Rural' })
  @IsOptional()
  @IsString()
  banco?: string;

  @ApiPropertyOptional({ example: '1234 / 56789-0' })
  @IsOptional()
  @IsString()
  agenciaConta?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pix?: string;

  @ApiPropertyOptional({ enum: ClassificacaoCredito, description: 'Avaliação de crédito A/B/C/D (opcional; nulo = a avaliar)' })
  @IsOptional()
  @IsEnum(ClassificacaoCredito)
  classificacaoCredito?: ClassificacaoCredito;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean = true;
}
