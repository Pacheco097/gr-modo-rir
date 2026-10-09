import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CorretorasService } from './corretoras.service';
import { CorretoraResponseDto } from './dto/corretora-response.dto';
import { CreateCorretoraDto } from './dto/create-corretora.dto';
import { UpdateCorretoraDto } from './dto/update-corretora.dto';

@ApiTags('parametrizacoes')
@Controller('parametrizacoes/corretoras')
export class CorretorasController {
  constructor(private readonly service: CorretorasService) {}

  @Get()
  @ApiOkResponse({ type: CorretoraResponseDto, isArray: true })
  findAll(@Query() query: PaginationQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: CorretoraResponseDto })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOkResponse({ type: CorretoraResponseDto })
  criar(@Body() dto: CreateCorretoraDto, @CurrentUser() usuario: string) {
    return this.service.criar(dto, usuario);
  }

  @Put(':id')
  @ApiOkResponse({ type: CorretoraResponseDto })
  atualizar(@Param('id') id: string, @Body() dto: UpdateCorretoraDto, @CurrentUser() usuario: string) {
    return this.service.atualizar(id, dto, usuario);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remover(@Param('id') id: string, @CurrentUser() usuario: string) {
    return this.service.remover(id, usuario);
  }
}
