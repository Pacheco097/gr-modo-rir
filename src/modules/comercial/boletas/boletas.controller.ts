import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiConsumes, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { BoletasService } from './boletas.service';
import { CreateBoletaDto } from './dto/create-boleta.dto';
import { UpdateBoletaDto } from './dto/update-boleta.dto';
import { QueryBoletaDto } from './dto/query-boleta.dto';
import { MotivoDto } from './dto/motivo.dto';
import { VincularContratoDto } from './dto/vincular-contrato.dto';
import { BoletaResponseDto } from './dto/boleta-response.dto';
import { BoletaKpisResponseDto } from './dto/boleta-kpis-response.dto';

@ApiTags('boletas')
@Controller('comercial/boletas')
export class BoletasController {
  constructor(private readonly service: BoletasService) {}

  @Get()
  @ApiOkResponse({ type: BoletaResponseDto, isArray: true })
  findAll(@Query() query: QueryBoletaDto) {
    return this.service.findAll(query);
  }

  @Get('kpis')
  @ApiOkResponse({ type: BoletaKpisResponseDto })
  kpis() {
    return this.service.kpis();
  }

  @Get(':id')
  @ApiOkResponse({ type: BoletaResponseDto })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOkResponse({ type: BoletaResponseDto })
  criar(@Body() dto: CreateBoletaDto, @CurrentUser() usuario: string) {
    return this.service.criar(dto, usuario);
  }

  @Put(':id')
  @ApiOkResponse({ type: BoletaResponseDto })
  atualizar(@Param('id') id: string, @Body() dto: UpdateBoletaDto, @CurrentUser() usuario: string) {
    return this.service.atualizar(id, dto, usuario);
  }

  @Post(':id/enviar-para-aprovacao')
  @ApiOkResponse({ type: BoletaResponseDto })
  enviarParaAprovacao(@Param('id') id: string, @CurrentUser() usuario: string) {
    return this.service.enviarParaAprovacao(id, usuario);
  }

  @Post(':id/aprovar')
  @ApiOkResponse({ type: BoletaResponseDto })
  aprovar(@Param('id') id: string, @CurrentUser() usuario: string) {
    return this.service.aprovar(id, usuario);
  }

  @Post(':id/reprovar')
  @ApiOkResponse({ type: BoletaResponseDto })
  reprovar(@Param('id') id: string, @Body() dto: MotivoDto, @CurrentUser() usuario: string) {
    return this.service.reprovar(id, dto.motivo, usuario);
  }

  @Post(':id/cancelar')
  @ApiOkResponse({ type: BoletaResponseDto })
  cancelar(@Param('id') id: string, @Body() dto: MotivoDto, @CurrentUser() usuario: string) {
    return this.service.cancelar(id, dto.motivo, usuario);
  }

  @Post(':id/vincular-contrato')
  @ApiOkResponse({ type: BoletaResponseDto })
  vincularContrato(@Param('id') id: string, @Body() dto: VincularContratoDto, @CurrentUser() usuario: string) {
    return this.service.vincularContrato(id, dto.numeroContratoErp, usuario);
  }

  @Post(':id/documentos')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('arquivo', {
      storage: diskStorage({
        destination: './uploads/boletas',
        filename: (_req, file, callback) => {
          const sufixo = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          callback(null, `${sufixo}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  anexarDocumento(
    @Param('id') id: string,
    @UploadedFile() arquivo: Express.Multer.File,
    @CurrentUser() usuario: string,
  ) {
    return this.service.anexarDocumento(
      id,
      { nomeArquivo: arquivo.originalname, caminhoArquivo: arquivo.path, tamanhoBytes: arquivo.size },
      usuario,
    );
  }

  @Delete(':id/documentos/:documentoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removerDocumento(@Param('id') id: string, @Param('documentoId') documentoId: string) {
    return this.service.removerDocumento(id, documentoId);
  }
}
