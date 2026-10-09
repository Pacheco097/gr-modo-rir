import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { EmpresasGrupoService } from './empresas-grupo.service';
import { EmpresaGrupoResponseDto } from './dto/empresa-grupo-response.dto';
import { CreateEmpresaGrupoDto } from './dto/create-empresa-grupo.dto';
import { UpdateEmpresaGrupoDto } from './dto/update-empresa-grupo.dto';

@ApiTags('parametrizacoes')
@Controller('parametrizacoes/empresas-grupo')
export class EmpresasGrupoController {
  constructor(private readonly service: EmpresasGrupoService) {}

  @Get()
  @ApiOkResponse({ type: EmpresaGrupoResponseDto, isArray: true })
  findAll(@Query() query: PaginationQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: EmpresaGrupoResponseDto })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOkResponse({ type: EmpresaGrupoResponseDto })
  criar(@Body() dto: CreateEmpresaGrupoDto, @CurrentUser() usuario: string) {
    return this.service.criar(dto, usuario);
  }

  @Put(':id')
  @ApiOkResponse({ type: EmpresaGrupoResponseDto })
  atualizar(@Param('id') id: string, @Body() dto: UpdateEmpresaGrupoDto, @CurrentUser() usuario: string) {
    return this.service.atualizar(id, dto, usuario);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remover(@Param('id') id: string, @CurrentUser() usuario: string) {
    return this.service.remover(id, usuario);
  }
}
