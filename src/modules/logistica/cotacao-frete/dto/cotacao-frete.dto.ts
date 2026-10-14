import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsNumber, IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';

/** Imagem (cartaz, tabela, print do WhatsApp) em base64, já reduzida pelo navegador. */
export class ImagemCotacaoDto {
  @ApiProperty({ description: 'image/jpeg | image/png | image/webp | image/gif' })
  @IsString()
  @Matches(/^image\/(jpeg|png|webp|gif)$/)
  tipo: string;

  @ApiProperty({ description: 'Conteúdo em base64 (sem o prefixo data:)' })
  @IsString()
  @MaxLength(7_000_000)
  dados: string;
}

/** Texto bruto e/ou imagens (conversa do WhatsApp, cartazes, e-mail...) a serem interpretados. */
export class InterpretarCotacoesDto {
  @ApiPropertyOptional({ description: 'Texto colado da conversa do grupo' })
  @IsOptional()
  @IsString()
  @MaxLength(200000)
  texto?: string;

  @ApiPropertyOptional({ type: () => [ImagemCotacaoDto], description: 'Imagens com cotações (requer IA configurada)' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ImagemCotacaoDto)
  imagens?: ImagemCotacaoDto[];

  @ApiPropertyOptional({ description: 'Grupo de cotação de onde veio o texto' })
  @IsOptional()
  @IsString()
  grupo?: string;

  @ApiPropertyOptional({ description: 'Transportadora a usar quando o texto não informa' })
  @IsOptional()
  @IsString()
  transportadoraPadrao?: string;

  @ApiPropertyOptional({ description: 'Data padrão (YYYY-MM-DD) para mensagens sem data' })
  @IsOptional()
  @IsString()
  dataPadrao?: string;
}

/** Uma cotação de frete (sugerida pela interpretação ou confirmada pelo usuário). */
export class CotacaoFreteItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString() grupo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() transportadora?: string;
  @ApiProperty() @IsString() origem: string;
  @ApiProperty() @IsString() destino: string;
  @ApiPropertyOptional() @IsOptional() @IsString() produto?: string;
  @ApiPropertyOptional({ description: 'Tipo de veículo (Bitrem, Rodocaçamba...)' }) @IsOptional() @IsString() veiculo?: string;
  @ApiProperty({ description: 'Valor do frete na unidade informada' }) @IsNumber() valor: number;
  @ApiPropertyOptional({ description: 'R$/t ou R$/sc (padrão R$/t)' }) @IsOptional() @IsString() unidade?: string;
  @ApiProperty({ description: 'Data da cotação YYYY-MM-DD' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dataCotacao deve ser YYYY-MM-DD' })
  dataCotacao: string;
  @ApiPropertyOptional() @IsOptional() @IsString() observacao?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) textoOrigem?: string;
}

export class SalvarCotacoesLoteDto {
  @ApiProperty({ type: () => [CotacaoFreteItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CotacaoFreteItemDto)
  itens: CotacaoFreteItemDto[];
}

export class CotacaoFreteResponseDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional({ nullable: true }) grupo: string | null;
  @ApiPropertyOptional({ nullable: true }) transportadora: string | null;
  @ApiProperty() origem: string;
  @ApiProperty() destino: string;
  @ApiPropertyOptional({ nullable: true }) produto: string | null;
  @ApiPropertyOptional({ nullable: true }) veiculo: string | null;
  @ApiProperty() valor: number;
  @ApiProperty() unidade: string;
  @ApiProperty() dataCotacao: string;
  @ApiPropertyOptional({ nullable: true }) observacao: string | null;
}

/** Cotação vigente (a mais recente) de uma transportadora numa rota, com a anterior para variação. */
export class CotacaoVigenteDto extends CotacaoFreteResponseDto {
  @ApiPropertyOptional({ nullable: true, description: 'Valor da cotação anterior da mesma transportadora/rota' }) valorAnterior: number | null;
  @ApiPropertyOptional({ nullable: true, description: 'Variação % vs a anterior' }) variacaoPct: number | null;
  @ApiProperty({ description: 'Dias desde a cotação' }) diasDesde: number;
}

/** Chave da API da IA (Anthropic). Vazia = remover. */
export class ConfigIaDto {
  @ApiProperty({ description: 'Chave da API (sk-ant-...). Vazia remove a chave salva.' })
  @IsString()
  @MaxLength(300)
  chave: string;
}
