import { scParaTon } from '../../../../common/utils/quantidade';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AmarracaoResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() compraContratoId: string;
  @ApiProperty({ nullable: true }) compraNumero: string | null;
  @ApiProperty({ nullable: true }) compraContraparte: string | null;
  @ApiProperty({ nullable: true }) vendaContratoId: string | null;
  @ApiProperty({ nullable: true }) vendaNumero: string | null;
  @ApiProperty({ nullable: true }) vendaContraparte: string | null;
  @ApiPropertyOptional({ nullable: true }) remessaContratoId: string | null;
  @ApiPropertyOptional({ nullable: true }) remessaNumero: string | null;
  @ApiPropertyOptional({ nullable: true }) remessaContraparte: string | null;
  @ApiPropertyOptional({ description: 'true = amarração de REMESSA (compra × remessa, sem venda)' }) ehRemessa: boolean;
  @ApiProperty() quantidadeSc: number;
  @ApiProperty({ description: 'Quantidade amarrada em toneladas' }) quantidadeTon: number;
  @ApiProperty() criadoEm: Date;
  @ApiPropertyOptional({ nullable: true, description: 'Conciliação: PIS/COFINS do frete (+receita/−despesa)' }) fretePisCofins: number | null;
  @ApiPropertyOptional({ nullable: true, description: 'Conciliação: ICMS do frete (+receita/−despesa)' }) freteIcms: number | null;
  @ApiPropertyOptional({ nullable: true, description: 'Conciliação: PIS/COFINS da classificação (+receita/−despesa)' }) classifPisCofins: number | null;
  @ApiPropertyOptional({ nullable: true, description: 'Conciliação: PIS/COFINS da corretagem (+receita/−despesa)' }) corretagemPisCofins: number | null;
  @ApiPropertyOptional({ nullable: true, description: 'Conciliação: ICMS do contrato (override auto)' }) icmsManual: number | null;
  @ApiPropertyOptional({ nullable: true, description: 'Conciliação: PIS/COFINS do contrato (+receita/−despesa)' }) receitaPisCofins: number | null;
  @ApiPropertyOptional({ nullable: true, description: 'Conciliação de volume: NULL|COMPLEMENTO|SEM_COMPLEMENTO' }) volConcStatus: string | null;
  @ApiPropertyOptional({ nullable: true }) volConcSobraSc: number | null;
  @ApiPropertyOptional({ nullable: true, description: 'MESMO|NOVO' }) volConcPrecoModo: string | null;
  @ApiPropertyOptional({ nullable: true }) volConcPrecoRsSc: number | null;
  @ApiPropertyOptional({ nullable: true }) volConcValor: number | null;
  @ApiPropertyOptional({ nullable: true, description: 'DESCONTO: redução na receita (quebra)' }) volConcDescReceita: number | null;
  @ApiPropertyOptional({ nullable: true, description: 'DESCONTO: redução no custo de compra (quebra)' }) volConcDescCusto: number | null;
  @ApiPropertyOptional({ nullable: true, description: 'Data do complemento/ajuste (YYYY-MM-DD)' }) volConcDataRecebimento: string | null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromEntity(e: any): AmarracaoResponseDto {
    const dto = new AmarracaoResponseDto();
    dto.id = e.id;
    dto.compraContratoId = e.compraContratoId;
    dto.compraNumero = e.compraContrato?.numeroErpMaxicon ?? null;
    dto.compraContraparte = e.compraContrato?.contraparteNome ?? null;
    dto.vendaContratoId = e.vendaContratoId;
    dto.vendaNumero = e.vendaContrato?.numeroErpMaxicon ?? null;
    dto.vendaContraparte = e.vendaContrato?.contraparteNome ?? null;
    dto.remessaContratoId = e.remessaContratoId ?? null;
    dto.remessaNumero = e.remessaContrato?.numeroErpMaxicon ?? null;
    dto.remessaContraparte = e.remessaContrato?.contraparteNome ?? null;
    dto.ehRemessa = !e.vendaContratoId && !!e.remessaContratoId;
    dto.quantidadeSc = Number(e.quantidadeSc);
    dto.quantidadeTon = scParaTon(e.quantidadeSc);
    dto.criadoEm = e.criadoEm;
    dto.fretePisCofins = e.fretePisCofins == null ? null : Number(e.fretePisCofins);
    dto.freteIcms = e.freteIcms == null ? null : Number(e.freteIcms);
    dto.classifPisCofins = e.classifPisCofins == null ? null : Number(e.classifPisCofins);
    dto.corretagemPisCofins = e.corretagemPisCofins == null ? null : Number(e.corretagemPisCofins);
    dto.icmsManual = e.icmsManual == null ? null : Number(e.icmsManual);
    dto.receitaPisCofins = e.receitaPisCofins == null ? null : Number(e.receitaPisCofins);
    dto.volConcStatus = e.volConcStatus ?? null;
    dto.volConcSobraSc = e.volConcSobraSc == null ? null : Number(e.volConcSobraSc);
    dto.volConcPrecoModo = e.volConcPrecoModo ?? null;
    dto.volConcPrecoRsSc = e.volConcPrecoRsSc == null ? null : Number(e.volConcPrecoRsSc);
    dto.volConcValor = e.volConcValor == null ? null : Number(e.volConcValor);
    dto.volConcDescReceita = e.volConcDescReceita == null ? null : Number(e.volConcDescReceita);
    dto.volConcDescCusto = e.volConcDescCusto == null ? null : Number(e.volConcDescCusto);
    dto.volConcDataRecebimento = e.volConcDataRecebimento ?? null;
    return dto;
  }
}
