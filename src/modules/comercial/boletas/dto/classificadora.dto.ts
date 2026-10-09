import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Min, MinLength } from 'class-validator';

export class ClassificadoraDto {
  @ApiProperty({ example: 'Classificadora Sorriso' })
  @IsString()
  @MinLength(1)
  nome: string;

  @ApiProperty({ example: 0.6, description: 'R$ por saca' })
  @IsNumber()
  @Min(0)
  valorRsPorSc: number;
}
