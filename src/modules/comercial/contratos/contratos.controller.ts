import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ContratosService } from './contratos.service';
import { ContratoResponseDto } from './dto/contrato-response.dto';
import { CreateContratoDto } from './dto/create-contrato.dto';
import { UpdateContratoDto } from './dto/update-contrato.dto';
import { QueryContratoDto } from './dto/query-contrato.dto';
import {
  AssinaturaDto,
  MudarStatusDto,
  RegistrarEntregaDto,
  RegistrarExcedenteDto,
  VincularBoletaDto,
} from './dto/acoes-contrato.dto';
import { ImportarErpDto } from './dto/importar-erp.dto';

@ApiTags('contratos')
@Controller('contratos')
export class ContratosController {
  constructor(private readonly service: ContratosService) {}

  @Get()
  @ApiOkResponse({ type: ContratoResponseDto, isArray: true })
  findAll(@Query() query: QueryContratoDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: ContratoResponseDto })
  detalhe(@Param('id') id: string) {
    return this.service.detalhe(id);
  }

  @Post()
  @ApiOkResponse({ type: ContratoResponseDto })
  criar(@Body() dto: CreateContratoDto, @CurrentUser() usuario: string) {
    return this.service.criar(dto, usuario);
  }

  @Post('importar-erp')
  @ApiOkResponse({ type: ContratoResponseDto })
  importarDoErp(@Body() dto: ImportarErpDto, @CurrentUser() usuario: string) {
    return this.service.importarDoErp(dto, usuario);
  }

  @Put(':id')
  @ApiOkResponse({ type: ContratoResponseDto })
  atualizar(@Param('id') id: string, @Body() dto: UpdateContratoDto, @CurrentUser() usuario: string) {
    return this.service.atualizar(id, dto, usuario);
  }

  @Patch(':id/status')
  @ApiOkResponse({ type: ContratoResponseDto })
  mudarStatus(@Param('id') id: string, @Body() dto: MudarStatusDto, @CurrentUser() usuario: string) {
    return this.service.mudarStatus(id, dto, usuario);
  }

  @Patch(':id/assinatura')
  @ApiOkResponse({ type: ContratoResponseDto })
  assinatura(@Param('id') id: string, @Body() dto: AssinaturaDto, @CurrentUser() usuario: string) {
    return this.service.atualizarAssinatura(id, dto, usuario);
  }

  @Post(':id/entrega')
  @ApiOkResponse({ type: ContratoResponseDto })
  entrega(@Param('id') id: string, @Body() dto: RegistrarEntregaDto, @CurrentUser() usuario: string) {
    return this.service.registrarEntrega(id, dto, usuario);
  }

  @Post(':id/excedente')
  @ApiOkResponse({ type: ContratoResponseDto })
  excedente(@Param('id') id: string, @Body() dto: RegistrarExcedenteDto, @CurrentUser() usuario: string) {
    return this.service.registrarExcedente(id, dto, usuario);
  }

  @Patch(':id/vincular-boleta')
  @ApiOkResponse({ type: ContratoResponseDto })
  vincularBoleta(@Param('id') id: string, @Body() dto: VincularBoletaDto, @CurrentUser() usuario: string) {
    return this.service.vincularBoleta(id, dto.boletaId, usuario);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remover(@Param('id') id: string, @CurrentUser() usuario: string) {
    return this.service.remover(id, usuario);
  }
}
