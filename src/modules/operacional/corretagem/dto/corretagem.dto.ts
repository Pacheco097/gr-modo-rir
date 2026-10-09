import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';

export class AtualizarCorretagemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  corretoraNome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  valorTotal?: number;
}

export class LancarCorretagemDto {
  @ApiProperty({ description: 'Data de pagamento (YYYY-MM-DD)' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dataPagamento deve ser YYYY-MM-DD' })
  dataPagamento: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  corretoraNome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  valorTotal?: number;
}
