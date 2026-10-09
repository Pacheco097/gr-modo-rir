import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FreteTipoBoleta, MoedaBoleta, TipoOperacaoBoleta } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ClassificadoraDto } from './classificadora.dto';

export class CreateBoletaDto {
  // ① Tipo e Identificação
  @ApiProperty({ description: 'Empresa do Grupo negociante' })
  @IsUUID()
  empresaGrupoId: string;

  @ApiProperty({ enum: TipoOperacaoBoleta })
  @IsEnum(TipoOperacaoBoleta)
  tipo: TipoOperacaoBoleta;

  @ApiProperty()
  @IsUUID()
  safraId: string;

  @ApiProperty({ example: '2026-07-21' })
  @IsDateString()
  dataNegociacao: string;

  // ② Empresa Contraparte
  @ApiPropertyOptional({ description: 'Preenchido quando selecionado via autocomplete do cadastro de Pessoas' })
  @IsOptional()
  @IsUUID()
  contraparteId?: string;

  @ApiProperty({ example: 'Cargill Brasil Ltda' })
  @IsString()
  @MinLength(1)
  contraparteNome: string;

  @ApiProperty({ example: '00.000.000/0001-00' })
  @IsString()
  @MinLength(1)
  contraparteDocumento: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contraparteIe?: string;

  @ApiPropertyOptional({ example: 'Sorriso' })
  @IsOptional()
  @IsString()
  contraparteMunicipio?: string;

  @ApiPropertyOptional({ example: 'MT' })
  @IsOptional()
  @IsString()
  contraparteUf?: string;

  // ③ Produto e Modalidade
  @ApiProperty()
  @IsUUID()
  produtoId: string;

  @ApiProperty()
  @IsUUID()
  modalidadeId: string;

  @ApiProperty({ default: 60, description: 'Auto-preenchido a partir do produto; editável' })
  @IsNumber()
  @IsPositive()
  fatorKgPorSaca: number;

  // ④ Quantidade — informada em TONELADAS (a operação é negociada em toneladas).
  // `quantidadeSc` continua aceita por compatibilidade; se vierem as duas, vale a de toneladas.
  @ApiPropertyOptional({ example: 600, description: 'Quantidade em toneladas (preferencial)' })
  @ValidateIf((o: CreateBoletaDto) => o.quantidadeSc === undefined || o.quantidadeSc === null || o.quantidadeTon !== undefined)
  @IsNumber()
  @IsPositive()
  quantidadeTon?: number;

  @ApiPropertyOptional({ example: 10000, description: 'Legado: quantidade em sacas (use quantidadeTon)' })
  @ValidateIf((o: CreateBoletaDto) => o.quantidadeTon === undefined || o.quantidadeTon === null)
  @IsNumber()
  @IsPositive()
  quantidadeSc?: number;

  // ⑤ Preço e pagamento
  @ApiPropertyOptional({
    description: 'Obrigatório exceto para boleta futura ("A Fixar") ainda em formação de preço',
    example: 98.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  preco?: number;

  @ApiPropertyOptional({ enum: MoedaBoleta, default: MoedaBoleta.BRL })
  @IsOptional()
  @IsEnum(MoedaBoleta)
  moeda?: MoedaBoleta = MoedaBoleta.BRL;

  @ApiProperty({ example: '30 dias' })
  @IsString()
  @MinLength(1)
  condicaoPagamento: string;

  @ApiPropertyOptional({ description: 'Data de pagamento/recebimento — vira o vencimento do contrato' })
  @IsOptional()
  @IsDateString()
  dataPagamento?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  icmsPct?: number = 0;

  @ApiPropertyOptional({ default: 0, description: 'Quebra técnica da operação comercial (trading) — NÃO é a quebra do armazém' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quebraTecnicaTradingPct?: number = 0;

  @ApiPropertyOptional({ default: 0, description: '% da taxa de juros do descasamento financeiro' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  custoFinanceiroPct?: number = 0;

  // Armazenagem (bloco condicional — alimenta o subsetor Armazenagem, docx §9)
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  temArmazenagem?: boolean = false;

  @ApiPropertyOptional({ default: 0, description: 'R$/sc — custo único de padronização (só se temArmazenagem)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  armPadronizacaoRate?: number = 0;

  @ApiPropertyOptional({ default: 0, description: 'R$/sc por quinzena (só se temArmazenagem)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  armArmazenagemRate?: number = 0;

  @ApiPropertyOptional({ default: 0, description: '% quebra técnica DO ARMAZÉM (só se temArmazenagem)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  armQuebraTecnicaPct?: number = 0;

  // ⑥ Frete / Logística
  @ApiProperty({ enum: FreteTipoBoleta })
  @IsEnum(FreteTipoBoleta)
  freteTipo: FreteTipoBoleta;

  @ApiProperty({ example: 160.0, description: 'R$ por tonelada' })
  @IsNumber()
  @Min(0)
  freteRsPorTon: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dataInicioEntrega?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dataFimEntrega?: string;

  @ApiPropertyOptional({ example: 'Armazém Sorriso / Porto Santos' })
  @IsOptional()
  @IsString()
  localEntrega?: string;

  // ⑦ Corretora / Intermediação
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  corretoraId?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  corretagemPct?: number = 0;

  // ⑧ Outros custos operacionais
  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  comissaoInternaPct?: number = 0;

  @ApiPropertyOptional({ default: 0, description: '"Armazenagem simplificada" (R$/sc) — distinta do bloco de armazenagem condicional' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  custoArmazenagemSimplificadaRsSc?: number = 0;

  @ApiPropertyOptional({
    default: 1.9,
    description: 'Apenas exibição/histórico — não entra no somatório de custos do resultado projetado',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  classificacaoPadraoRsSc?: number = 1.9;

  @ApiPropertyOptional({ type: ClassificadoraDto, isArray: true, default: [] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ClassificadoraDto)
  classificadoras?: ClassificadoraDto[] = [];

  @ApiPropertyOptional({
    default: false,
    description:
      'Esta operação passa por classificação de grãos. Se true, o contrato gerado herda o flag e, após a liberação do embarque, cai na aba Financeiro › Classificação.',
  })
  @IsOptional()
  @IsBoolean()
  temClassificacao?: boolean = false;

  @ApiPropertyOptional({ example: 'Armazém Geral Sorriso · Silo 3' })
  @IsOptional()
  @IsString()
  localArmazem?: string;

  // ⑪ Comercial responsável
  @ApiProperty()
  @IsUUID()
  comercialResponsavelId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacoes?: string;
}
