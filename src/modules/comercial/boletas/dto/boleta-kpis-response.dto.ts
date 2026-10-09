import { ApiProperty } from '@nestjs/swagger';

/** Réplica exata de `renderBoletasKPIs()` — contagem por correspondência exata de status. */
export class BoletaKpisResponseDto {
  @ApiProperty() rascunho: number;
  @ApiProperty() pendente: number;
  @ApiProperty() aprovada: number;
  @ApiProperty() reprovada: number;
  @ApiProperty() cancelada: number;
  @ApiProperty() total: number;
}
