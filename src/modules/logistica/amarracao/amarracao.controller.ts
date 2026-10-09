import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AmarracaoService } from './amarracao.service';
import { AmarracaoResponseDto } from './dto/amarracao-response.dto';
import { CreateAmarracaoDto } from './dto/create-amarracao.dto';
import { ComponentesAmarracaoDto } from './dto/componentes-amarracao.dto';
import { ConciliacaoVolumeDto } from './dto/conciliacao-volume.dto';

@ApiTags('logistica')
@Controller('logistica/amarracoes')
export class AmarracaoController {
  constructor(private readonly service: AmarracaoService) {}

  @Get()
  @ApiOkResponse({ type: AmarracaoResponseDto, isArray: true })
  findAll(@Query() query: PaginationQueryDto) {
    return this.service.findAll(query);
  }

  @Get('saldo-compra/:contratoId')
  @ApiQuery({ name: 'contratoId', required: true })
  async saldoCompra(@Param('contratoId') contratoId: string) {
    return { contratoId, saldoSc: await this.service.saldoCompra(contratoId) };
  }

  @Get('saldo-venda/:contratoId')
  async saldoVenda(@Param('contratoId') contratoId: string) {
    return { contratoId, saldoSc: await this.service.saldoVenda(contratoId) };
  }

  @Post()
  @ApiOkResponse({ type: AmarracaoResponseDto })
  criar(@Body() dto: CreateAmarracaoDto, @CurrentUser() usuario: string) {
    return this.service.criar(dto, usuario);
  }

  @Patch(':id/componentes')
  @ApiOkResponse({ type: AmarracaoResponseDto })
  atualizarComponentes(@Param('id') id: string, @Body() dto: ComponentesAmarracaoDto, @CurrentUser() usuario: string) {
    return this.service.atualizarComponentes(id, dto, usuario);
  }

  @Patch(':id/conciliacao-volume')
  @ApiOkResponse({ type: AmarracaoResponseDto })
  atualizarConciliacaoVolume(@Param('id') id: string, @Body() dto: ConciliacaoVolumeDto, @CurrentUser() usuario: string) {
    return this.service.atualizarConciliacaoVolume(id, dto, usuario);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remover(@Param('id') id: string, @CurrentUser() usuario: string) {
    return this.service.remover(id, usuario);
  }
}
