import { PartialType } from '@nestjs/swagger';
import { CreateEmpresaGrupoDto } from './create-empresa-grupo.dto';

export class UpdateEmpresaGrupoDto extends PartialType(CreateEmpresaGrupoDto) {}
