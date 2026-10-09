import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

/**
 * Placeholder de vínculo manual com o contrato jurídico (campo "Nº do
 * Contrato Jurídico (ERP)" do HTML). Vira uma relação de verdade com a
 * entidade Contrato quando o módulo de Contratos (docx §6) for construído.
 */
export class VincularContratoDto {
  @ApiProperty({ example: 'CT-JUR-2026-0089' })
  @IsString()
  @MinLength(1)
  numeroContratoErp: string;
}
