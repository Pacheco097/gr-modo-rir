import { ApiProperty } from '@nestjs/swagger';

export class ImportErroDto {
  @ApiProperty() linha: number;
  @ApiProperty() motivo: string;
}

/** Réplica dos contadores do painel "Resultado da Importação" do HTML. */
export class ImportResultadoDto {
  @ApiProperty({ description: 'Linhas lidas' }) total: number;
  @ApiProperty({ description: 'Importados com sucesso' }) importados: number;
  @ApiProperty({ description: 'Ignorados por CPF/CNPJ já existente' }) duplicados: number;
  @ApiProperty({ description: 'Linhas com erro de validação' }) erros: number;
  @ApiProperty({ type: ImportErroDto, isArray: true }) detalhesErros: ImportErroDto[];
}
