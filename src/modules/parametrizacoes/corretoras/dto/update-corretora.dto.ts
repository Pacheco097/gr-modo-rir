import { PartialType } from '@nestjs/swagger';
import { CreateCorretoraDto } from './create-corretora.dto';

export class UpdateCorretoraDto extends PartialType(CreateCorretoraDto) {}
