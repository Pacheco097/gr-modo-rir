import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FinanceiroService } from './financeiro.service';
import {
  CreateLancamentoDto,
  FluxoCaixaDiaDto,
  LancamentoResponseDto,
  LiquidarDto,
  QueryLancamentoDto,
} from './dto/financeiro.dto';

@ApiTags('financeiro')
@Controller('financeiro')
export class FinanceiroController {
  constructor(private readonly service: FinanceiroService) {}

  @Get('lancamentos')
  @ApiOkResponse({ type: LancamentoResponseDto, isArray: true })
  findAll(@Query() query: QueryLancamentoDto) {
    return this.service.findAll(query);
  }

  @Post('lancamentos')
  @ApiOkResponse({ type: LancamentoResponseDto })
  criar(@Body() dto: CreateLancamentoDto, @CurrentUser() usuario: string) {
    return this.service.criar(dto, usuario);
  }

  @Patch('lancamentos/:id/liquidar')
  @ApiOkResponse({ type: LancamentoResponseDto })
  liquidar(@Param('id') id: string, @Body() dto: LiquidarDto, @CurrentUser() usuario: string) {
    return this.service.liquidar(id, dto.dataLiquidacao, usuario);
  }

  @Delete('lancamentos/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remover(@Param('id') id: string, @CurrentUser() usuario: string) {
    return this.service.remover(id, usuario);
  }

  @Post('sincronizar-contratos')
  @ApiOkResponse({ description: 'Materializa CR/CP dos contratos com vencimento (docx §10.1)' })
  sincronizarContratos(@CurrentUser() usuario: string) {
    return this.service.sincronizarContratos(usuario);
  }

  @Get('fluxo-caixa')
  @ApiQuery({ name: 'dataInicio', required: false })
  @ApiQuery({ name: 'dataFim', required: false })
  @ApiOkResponse({ type: FluxoCaixaDiaDto, isArray: true })
  fluxoCaixa(@Query('dataInicio') dataInicio?: string, @Query('dataFim') dataFim?: string) {
    return this.service.fluxoCaixa(dataInicio, dataFim);
  }
}
