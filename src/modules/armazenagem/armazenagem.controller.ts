import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ArmazenagemService } from './armazenagem.service';
import {
  ArmazenagemResponseDto,
  AtualizarArmazenagemDto,
  EncerrarArmazenagemDto,
  IniciarArmazenagemDto,
  LancarArmazenagemDto,
  QueryArmazenagemDto,
} from './dto/armazenagem.dto';

@ApiTags('armazenagem')
@Controller('armazenagem')
export class ArmazenagemController {
  constructor(private readonly service: ArmazenagemService) {}

  @Get()
  @ApiOkResponse({ type: ArmazenagemResponseDto, isArray: true })
  findAll(@Query() query: QueryArmazenagemDto) {
    return this.service.findAll(query);
  }

  @Post('iniciar')
  @ApiOkResponse({ type: ArmazenagemResponseDto })
  iniciar(@Body() dto: IniciarArmazenagemDto, @CurrentUser() usuario: string) {
    return this.service.iniciar(dto, usuario);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ArmazenagemResponseDto })
  atualizar(@Param('id') id: string, @Body() dto: AtualizarArmazenagemDto, @CurrentUser() usuario: string) {
    return this.service.atualizar(id, dto, usuario);
  }

  @Patch(':id/encerrar')
  @ApiOkResponse({ type: ArmazenagemResponseDto })
  encerrar(@Param('id') id: string, @Body() dto: EncerrarArmazenagemDto, @CurrentUser() usuario: string) {
    return this.service.encerrar(id, dto, usuario);
  }

  @Patch(':id/lancar-pagamento')
  @ApiOkResponse({ type: ArmazenagemResponseDto })
  lancarPagamento(@Param('id') id: string, @Body() dto: LancarArmazenagemDto, @CurrentUser() usuario: string) {
    return this.service.lancarPagamento(id, dto, usuario);
  }

  @Patch(':id/estornar-pagamento')
  @ApiOkResponse({ type: ArmazenagemResponseDto })
  estornarPagamento(@Param('id') id: string, @CurrentUser() usuario: string) {
    return this.service.estornarPagamento(id, usuario);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remover(@Param('id') id: string, @CurrentUser() usuario: string) {
    return this.service.remover(id, usuario);
  }
}
