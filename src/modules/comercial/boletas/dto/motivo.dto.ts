import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

/** Usado em reprovar/cancelar — replica a validação do HTML: mínimo 10 caracteres. */
export class MotivoDto {
  @ApiProperty({ minLength: 10, example: 'Preço acima do mercado para esta data.' })
  @IsString()
  @MinLength(10, { message: 'Informe um motivo com pelo menos 10 caracteres.' })
  motivo: string;
}
