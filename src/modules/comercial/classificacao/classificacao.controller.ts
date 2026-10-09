import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ClassificacaoStatus } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ClassificacaoService } from './classificacao.service';
import { AdicionarPagamentoDto, AdicionarPagamentosLoteDto, ClassificacaoResponseDto, DefinirPrevistoDto } from './dto/classificacao.dto';

@ApiTags('classificacao')
@Controller('comercial/classificacoes')
export class ClassificacaoController {
  constructor(private readonly service: ClassificacaoService) {}

  @Get()
  @ApiOkResponse({ type: ClassificacaoResponseDto, isArray: true })
  findAll(@Query('status') status?: ClassificacaoStatus) {
    return this.service.findAll(status);
  }

  /** 1ª etapa: lança o previsto (total estimado). */
  @Patch(':amarracaoId/previsto')
  @ApiOkResponse({ type: ClassificacaoResponseDto })
  definirPrevisto(
    @Param('amarracaoId') amarracaoId: string,
    @Body() dto: DefinirPrevistoDto,
    @CurrentUser() usuario: string,
  ) {
    return this.service.definirPrevisto(amarracaoId, dto, usuario);
  }

  /** Lança uma parcela de pagamento (semanal/mensal). */
  @Post(':amarracaoId/pagamentos')
  @ApiOkResponse({ type: ClassificacaoResponseDto })
  adicionarPagamento(
    @Param('amarracaoId') amarracaoId: string,
    @Body() dto: AdicionarPagamentoDto,
    @CurrentUser() usuario: string,
  ) {
    return this.service.adicionarPagamento(amarracaoId, dto, usuario);
  }

  /** Lança o realizado de várias classificadoras de uma vez (valor + data de cada uma). */
  @Post(':amarracaoId/pagamentos-lote')
  @ApiOkResponse({ type: ClassificacaoResponseDto })
  adicionarPagamentosLote(
    @Param('amarracaoId') amarracaoId: string,
    @Body() dto: AdicionarPagamentosLoteDto,
    @CurrentUser() usuario: string,
  ) {
    return this.service.adicionarPagamentosLote(amarracaoId, dto, usuario);
  }

  /** Define o realizado completo (todas as classificadoras, cada uma com 1+ pagamentos). */
  @Put(':amarracaoId/pagamentos')
  @ApiOkResponse({ type: ClassificacaoResponseDto })
  definirPagamentos(
    @Param('amarracaoId') amarracaoId: string,
    @Body() dto: AdicionarPagamentosLoteDto,
    @CurrentUser() usuario: string,
  ) {
    return this.service.definirPagamentos(amarracaoId, dto, usuario);
  }

  /** Remove uma parcela de pagamento (correção). */
  @Delete('pagamentos/:pagamentoId')
  @ApiOkResponse({ type: ClassificacaoResponseDto })
  removerPagamento(@Param('pagamentoId') pagamentoId: string) {
    return this.service.removerPagamento(pagamentoId);
  }
}
