import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('kpis')
  @ApiOkResponse({ description: 'Contadores gerais do sistema' })
  kpis() {
    return this.service.kpis();
  }

  @Get('resultado-amarracoes')
  @ApiOkResponse({ description: 'Resultado por amarração (compra × venda)' })
  resultadoAmarracoes() {
    return this.service.resultadoAmarracoes();
  }

  @Get('resumo-financeiro')
  @ApiOkResponse({ description: 'A receber × a pagar (lançamentos em aberto)' })
  resumoFinanceiro() {
    return this.service.resumoFinanceiro();
  }

  @Get('credito')
  @ApiQuery({ name: 'ano', required: false, description: 'Filtra o histórico por ano' })
  @ApiOkResponse({ description: 'Compras/vendas por nível de crédito (histórico por ano + vigência)' })
  analiseCredito(@Query('ano') ano?: string) {
    return this.service.analiseCredito(ano ? parseInt(ano, 10) : undefined);
  }
}
