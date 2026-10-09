import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { MotivoOpcionalDto } from '../../../common/dto/motivo-opcional.dto';
import { FreteService } from './frete.service';
import { CreateFreteDto, FreteResponseDto, QueryFreteDto } from './dto/frete.dto';

@ApiTags('logistica')
@Controller('logistica/fretes')
export class FreteController {
  constructor(private readonly service: FreteService) {}

  @Get()
  @ApiOkResponse({ type: FreteResponseDto, isArray: true })
  findAll(@Query() query: QueryFreteDto) {
    return this.service.findAll(query);
  }

  @Post()
  @ApiOkResponse({ type: FreteResponseDto })
  criar(@Body() dto: CreateFreteDto, @CurrentUser() usuario: string) {
    return this.service.criar(dto, usuario);
  }

  @Patch(':id/aprovar')
  @ApiOkResponse({ type: FreteResponseDto })
  aprovar(@Param('id') id: string, @CurrentUser() usuario: string) {
    return this.service.aprovar(id, usuario);
  }

  @Patch(':id/reprovar')
  @ApiOkResponse({ type: FreteResponseDto })
  reprovar(@Param('id') id: string, @Body() dto: MotivoOpcionalDto, @CurrentUser() usuario: string) {
    return this.service.reprovar(id, usuario, dto.motivo);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remover(@Param('id') id: string, @CurrentUser() usuario: string) {
    return this.service.remover(id, usuario);
  }
}
