import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { FazendasService } from './fazendas.service';
import { FazendaResponseDto } from './dto/fazenda-response.dto';
import { CreateFazendaDto } from './dto/create-fazenda.dto';
import { UpdateFazendaDto } from './dto/update-fazenda.dto';

@ApiTags('parametrizacoes')
@Controller('parametrizacoes/fazendas')
export class FazendasController {
  constructor(private readonly service: FazendasService) {}

  @Get()
  @ApiOkResponse({ type: FazendaResponseDto, isArray: true })
  findAll(@Query() query: PaginationQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: FazendaResponseDto })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOkResponse({ type: FazendaResponseDto })
  criar(@Body() dto: CreateFazendaDto, @CurrentUser() usuario: string) {
    return this.service.criar(dto, usuario);
  }

  @Put(':id')
  @ApiOkResponse({ type: FazendaResponseDto })
  atualizar(@Param('id') id: string, @Body() dto: UpdateFazendaDto, @CurrentUser() usuario: string) {
    return this.service.atualizar(id, dto, usuario);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remover(@Param('id') id: string, @CurrentUser() usuario: string) {
    return this.service.remover(id, usuario);
  }
}
