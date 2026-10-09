import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateUsuarioDto } from './create-usuario.dto';

/** Atualização de dados do usuário. A senha é trocada por endpoint próprio. */
export class UpdateUsuarioDto extends PartialType(OmitType(CreateUsuarioDto, ['senha'] as const)) {}
