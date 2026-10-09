import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { EmbarqueService } from './embarque.service';
import { AtualizarLoteEmbarqueDto, EmbarqueResponseDto, EncerrarEmbarqueDto, LiberarEmbarqueDto, QueryEmbarqueDto } from './dto/embarque.dto';

@ApiTags('logistica')
@Controller('logistica/embarques')
export class EmbarqueController {
  constructor(private readonly service: EmbarqueService) {}

  @Get()
  @ApiOkResponse({ type: EmbarqueResponseDto, isArray: true })
  findAll(@Query() query: QueryEmbarqueDto) {
    return this.service.findAll(query);
  }

  @Post('liberar')
  @ApiOkResponse({ type: EmbarqueResponseDto })
  liberar(@Body() dto: LiberarEmbarqueDto, @CurrentUser() usuario: string) {
    return this.service.liberar(dto, usuario);
  }

  @Patch(':id/encerrar')
  @ApiOkResponse({ type: EmbarqueResponseDto })
  encerrar(@Param('id') id: string, @Body() dto: EncerrarEmbarqueDto, @CurrentUser() usuario: string) {
    return this.service.encerrar(id, dto, usuario);
  }

  @Patch(':id/lote')
  @ApiOkResponse({ type: EmbarqueResponseDto })
  atualizarLote(@Param('id') id: string, @Body() dto: AtualizarLoteEmbarqueDto, @CurrentUser() usuario: string) {
    return this.service.atualizarLote(id, dto, usuario);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remover(@Param('id') id: string, @CurrentUser() usuario: string) {
    return this.service.remover(id, usuario);
  }
}
