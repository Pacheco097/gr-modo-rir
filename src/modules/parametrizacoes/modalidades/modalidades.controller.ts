import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ModalidadesService } from './modalidades.service';
import { ModalidadeResponseDto } from './dto/modalidade-response.dto';
import { QueryModalidadeDto } from './dto/query-modalidade.dto';
import { CreateModalidadeDto } from './dto/create-modalidade.dto';
import { UpdateModalidadeDto } from './dto/update-modalidade.dto';

@ApiTags('parametrizacoes')
@Controller('parametrizacoes/modalidades')
export class ModalidadesController {
  constructor(private readonly service: ModalidadesService) {}

  @Get()
  @ApiOkResponse({ type: ModalidadeResponseDto, isArray: true })
  findAll(@Query() query: QueryModalidadeDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: ModalidadeResponseDto })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOkResponse({ type: ModalidadeResponseDto })
  criar(@Body() dto: CreateModalidadeDto, @CurrentUser() usuario: string) {
    return this.service.criar(dto, usuario);
  }

  @Put(':id')
  @ApiOkResponse({ type: ModalidadeResponseDto })
  atualizar(@Param('id') id: string, @Body() dto: UpdateModalidadeDto, @CurrentUser() usuario: string) {
    return this.service.atualizar(id, dto, usuario);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remover(@Param('id') id: string, @CurrentUser() usuario: string) {
    return this.service.remover(id, usuario);
  }
}
