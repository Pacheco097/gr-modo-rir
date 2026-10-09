import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PagamentoFreteService } from './pagamento-frete.service';
import {
  AprovarDto,
  CreateCteDto,
  CteResponseDto,
  ImportarCtesDto,
  ImportarCtesResultDto,
  PagarCteDto,
  QueryCteDto,
  RetirarDto,
  SetCampoDto,
} from './dto/cte.dto';
import { FretePrevistoInputDto, FretePrevistoResponseDto } from './dto/frete-previsto.dto';
import { DacteResponseDto, ReplaceDactesDto } from './dto/dacte.dto';

@ApiTags('logistica')
@Controller('logistica/pagamento-frete')
export class PagamentoFreteController {
  constructor(private readonly service: PagamentoFreteService) {}

  /** Estado completo da tela (ctes + retirados + previstos + dactes) numa só chamada. */
  @Get('estado')
  estado() {
    return this.service.estado();
  }

  @Get()
  @ApiOkResponse({ type: CteResponseDto, isArray: true })
  findAll(@Query() query: QueryCteDto) {
    return this.service.findAll(query);
  }

  @Post()
  @ApiOkResponse({ type: CteResponseDto })
  criar(@Body() dto: CreateCteDto, @CurrentUser() usuario: string) {
    return this.service.criar(dto, usuario);
  }

  @Post('importar')
  @ApiOkResponse({ type: ImportarCtesResultDto })
  importar(@Body() dto: ImportarCtesDto, @CurrentUser() usuario: string) {
    return this.service.importar(dto.itens, usuario);
  }

  /** Importa CT-Es a partir do DACTE (PDF): cria os que faltam e, nos existentes, só preenche campos vazios. */
  @Post('importar-dacte')
  @ApiOkResponse({ type: ImportarCtesResultDto })
  importarDacte(@Body() dto: ImportarCtesDto, @CurrentUser() usuario: string) {
    return this.service.importarDacte(dto.itens, usuario);
  }

  // ── Fretes previstos por rota + vigência (registros) ──
  @Get('previstos')
  @ApiOkResponse({ type: FretePrevistoResponseDto, isArray: true })
  listarPrevistos() {
    return this.service.listarPrevistos();
  }

  @Post('previstos')
  @ApiOkResponse({ type: FretePrevistoResponseDto })
  criarPrevisto(@Body() dto: FretePrevistoInputDto, @CurrentUser() usuario: string) {
    return this.service.criarPrevisto(dto, usuario);
  }

  @Put('previstos/:id')
  @ApiOkResponse({ type: FretePrevistoResponseDto })
  atualizarPrevisto(@Param('id') id: string, @Body() dto: FretePrevistoInputDto, @CurrentUser() usuario: string) {
    return this.service.atualizarPrevisto(id, dto, usuario);
  }

  @Delete('previstos/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removerPrevisto(@Param('id') id: string) {
    return this.service.removerPrevisto(id);
  }

  // ── DACTEs (conferência) ──
  @Get('dactes')
  @ApiOkResponse({ type: DacteResponseDto, isArray: true })
  listarDactes() {
    return this.service.listarDactes();
  }

  @Put('dactes')
  @ApiOkResponse({ type: DacteResponseDto, isArray: true })
  replaceDactes(@Body() dto: ReplaceDactesDto, @CurrentUser() usuario: string) {
    return this.service.replaceDactes(dto.itens, usuario);
  }

  // ── Ações por chave de acesso ──
  @Patch('chave/:chave/campo')
  @ApiOkResponse({ type: CteResponseDto })
  setCampo(@Param('chave') chave: string, @Body() dto: SetCampoDto, @CurrentUser() usuario: string) {
    return this.service.setCampo(chave, dto, usuario);
  }

  @Patch('chave/:chave/aprovar')
  @ApiOkResponse({ type: CteResponseDto })
  aprovar(@Param('chave') chave: string, @Body() dto: AprovarDto, @CurrentUser() usuario: string) {
    return this.service.aprovar(chave, dto, usuario);
  }

  @Patch('chave/:chave/retirar')
  @ApiOkResponse({ type: CteResponseDto })
  retirar(@Param('chave') chave: string, @Body() dto: RetirarDto, @CurrentUser() usuario: string) {
    return this.service.retirar(chave, dto, usuario);
  }

  @Patch('chave/:chave/devolver')
  @ApiOkResponse({ type: CteResponseDto })
  devolver(@Param('chave') chave: string, @CurrentUser() usuario: string) {
    return this.service.devolver(chave, usuario);
  }

  // ── CRUD por id ──
  @Patch(':id/pagar')
  @ApiOkResponse({ type: CteResponseDto })
  pagar(@Param('id') id: string, @Body() dto: PagarCteDto, @CurrentUser() usuario: string) {
    return this.service.pagar(id, dto.dataPagamento, usuario);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remover(@Param('id') id: string, @CurrentUser() usuario: string) {
    return this.service.remover(id, usuario);
  }
}
