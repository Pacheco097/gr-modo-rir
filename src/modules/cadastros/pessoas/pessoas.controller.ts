import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { ApiConsumes, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PessoasService } from './pessoas.service';
import { PessoaResponseDto } from './dto/pessoa-response.dto';
import { QueryPessoaDto } from './dto/query-pessoa.dto';
import { CreatePessoaDto } from './dto/create-pessoa.dto';
import { UpdatePessoaDto } from './dto/update-pessoa.dto';
import { ImportResultadoDto } from './dto/import-resultado.dto';

@ApiTags('cadastros')
@Controller('cadastros/pessoas')
export class PessoasController {
  constructor(private readonly service: PessoasService) {}

  @Get()
  @ApiOkResponse({ type: PessoaResponseDto, isArray: true })
  findAll(@Query() query: QueryPessoaDto) {
    return this.service.findAll(query);
  }

  @Get('sugestoes')
  @ApiQuery({ name: 'q', required: true })
  @ApiOkResponse({ type: PessoaResponseDto, isArray: true })
  sugestoes(@Query('q') q: string) {
    return this.service.sugestoes(q);
  }

  @Get('modelo-importacao')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Disposition', 'attachment; filename="modelo-cadastros.xlsx"')
  baixarModelo(@Res() res: Response): void {
    res.send(this.service.gerarModeloXlsx());
  }

  @Get('exportar-csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="cadastros.csv"')
  async exportarCsv(@Query() query: QueryPessoaDto, @Res() res: Response): Promise<void> {
    const csv = await this.service.exportarCsv(query);
    // BOM para o Excel reconhecer UTF-8 corretamente
    res.send('﻿' + csv);
  }

  @Get(':id')
  @ApiOkResponse({ type: PessoaResponseDto })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOkResponse({ type: PessoaResponseDto })
  criar(@Body() dto: CreatePessoaDto, @CurrentUser() usuario: string) {
    return this.service.criar(dto, usuario);
  }

  @Post('importar')
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: ImportResultadoDto })
  @UseInterceptors(
    FileInterceptor('arquivo', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  importar(@UploadedFile() arquivo: Express.Multer.File, @CurrentUser() usuario: string) {
    return this.service.importar(arquivo.buffer, usuario);
  }

  @Put(':id')
  @ApiOkResponse({ type: PessoaResponseDto })
  atualizar(@Param('id') id: string, @Body() dto: UpdatePessoaDto, @CurrentUser() usuario: string) {
    return this.service.atualizar(id, dto, usuario);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remover(@Param('id') id: string, @CurrentUser() usuario: string) {
    return this.service.remover(id, usuario);
  }
}
