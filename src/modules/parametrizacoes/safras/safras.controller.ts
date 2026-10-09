import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { SafrasService } from './safras.service';
import { SafraResponseDto } from './dto/safra-response.dto';
import { CreateSafraDto } from './dto/create-safra.dto';
import { UpdateSafraDto } from './dto/update-safra.dto';

@ApiTags('parametrizacoes')
@Controller('parametrizacoes/safras')
export class SafrasController {
  constructor(private readonly service: SafrasService) {}

  @Get()
  @ApiOkResponse({ type: SafraResponseDto, isArray: true })
  findAll(@Query() query: PaginationQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: SafraResponseDto })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOkResponse({ type: SafraResponseDto })
  criar(@Body() dto: CreateSafraDto, @CurrentUser() usuario: string) {
    return this.service.criar(dto, usuario);
  }

  @Put(':id')
  @ApiOkResponse({ type: SafraResponseDto })
  atualizar(@Param('id') id: string, @Body() dto: UpdateSafraDto, @CurrentUser() usuario: string) {
    return this.service.atualizar(id, dto, usuario);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remover(@Param('id') id: string, @CurrentUser() usuario: string) {
    return this.service.remover(id, usuario);
  }
}
