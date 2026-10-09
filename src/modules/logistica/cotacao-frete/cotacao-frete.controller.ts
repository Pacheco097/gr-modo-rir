import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PerfilAcesso } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CotacaoFreteService } from './cotacao-frete.service';
import {
  ConfigIaDto,
  CotacaoFreteResponseDto,
  CotacaoVigenteDto,
  InterpretarCotacoesDto,
  SalvarCotacoesLoteDto,
} from './dto/cotacao-frete.dto';

@ApiTags('cotacao-frete')
@Controller('logistica/cotacoes-frete')
export class CotacaoFreteController {
  constructor(private readonly service: CotacaoFreteService) {}

  /** Interpreta o texto colado (IA se configurada; senão regras). Não grava. */
  @Post('interpretar')
  @HttpCode(200)
  interpretar(@Body() dto: InterpretarCotacoesDto) {
    return this.service.interpretar(dto);
  }

  /** Situação da IA (configurada? de onde? final da chave). */
  @Get('config-ia')
  statusIa() {
    return this.service.statusIa();
  }

  /** Salva (ou remove, se vazia) a chave da IA — só administrador. Valida a chave antes de gravar. */
  @Put('config-ia')
  @Roles(PerfilAcesso.ADMINISTRADOR)
  definirChaveIa(@Body() dto: ConfigIaDto, @CurrentUser() usuario: string) {
    return this.service.definirChaveIa(dto, usuario);
  }

  /** Grava as cotações conferidas pelo usuário. */
  @Post('lote')
  salvarLote(@Body() dto: SalvarCotacoesLoteDto, @CurrentUser() usuario: string) {
    return this.service.salvarLote(dto, usuario);
  }

  /** Frete vigente por transportadora × rota. */
  @Get('vigentes')
  @ApiOkResponse({ type: CotacaoVigenteDto, isArray: true })
  vigentes() {
    return this.service.vigentes();
  }

  /** Histórico de cotações. */
  @Get()
  @ApiOkResponse({ type: CotacaoFreteResponseDto, isArray: true })
  listar(
    @Query('transportadora') transportadora?: string,
    @Query('origem') origem?: string,
    @Query('destino') destino?: string,
    @Query('grupo') grupo?: string,
    @Query('de') de?: string,
    @Query('ate') ate?: string,
  ) {
    return this.service.listar({ transportadora, origem, destino, grupo, de, ate });
  }

  @Delete(':id')
  remover(@Param('id') id: string) {
    return this.service.remover(id);
  }
}
