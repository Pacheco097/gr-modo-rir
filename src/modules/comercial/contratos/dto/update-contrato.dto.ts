import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateContratoDto } from './create-contrato.dto';

/** Atualiza dados do contrato. Tipo e boleta não mudam por aqui. */
export class UpdateContratoDto extends PartialType(OmitType(CreateContratoDto, ['tipo', 'boletaId'] as const)) {}
