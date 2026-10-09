import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ParametrizacaoStatus } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ParametrizacaoService } from './parametrizacao.service';
import {
  ParametrizacaoResponseDto,
  UpsertParametrizacaoDto,
} from './dto/parametrizacao.dto';

@ApiTags('logistica')
@Controller('logistica/parametrizacoes')
export class ParametrizacaoController {
  constructor(private readonly service: ParametrizacaoService) {}

  @Get()
  @ApiOkResponse({ type: ParametrizacaoResponseDto, isArray: true })
  findAll(@Query('status') status?: ParametrizacaoStatus) {
    return this.service.findAll(status);
  }

  @Get(':amarracaoId/documento')
  documento(@Param('amarracaoId') amarracaoId: string) {
    return this.service.documento(amarracaoId);
  }

  @Put(':amarracaoId')
  @ApiOkResponse({ type: ParametrizacaoResponseDto })
  upsert(
    @Param('amarracaoId') amarracaoId: string,
    @Body() dto: UpsertParametrizacaoDto,
    @CurrentUser() usuario: string,
  ) {
    return this.service.upsert(amarracaoId, dto, usuario);
  }
}
