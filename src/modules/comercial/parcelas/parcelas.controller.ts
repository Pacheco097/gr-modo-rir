import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ParcelasService } from './parcelas.service';
import { ParcelaFluxoDto, ParcelasContratoDto, SubstituirParcelasDto } from './dto/parcela.dto';

@ApiTags('parcelas')
@Controller('comercial')
export class ParcelasController {
  constructor(private readonly service: ParcelasService) {}

  /** Todos os movimentos das parcelas (para o Fluxo de Caixa). */
  @Get('parcelas/fluxo')
  @ApiOkResponse({ type: ParcelaFluxoDto, isArray: true })
  fluxo() {
    return this.service.fluxo();
  }

  /** Cronograma de um contrato (parcelas persistidas ou a padrão). */
  @Get('contratos/:contratoId/parcelas')
  @ApiOkResponse({ type: ParcelasContratoDto })
  listar(@Param('contratoId') contratoId: string) {
    return this.service.listar(contratoId);
  }

  /** Substitui o cronograma do contrato (reprogramar/parcelar). */
  @Put('contratos/:contratoId/parcelas')
  @ApiOkResponse({ type: ParcelasContratoDto })
  substituir(@Param('contratoId') contratoId: string, @Body() dto: SubstituirParcelasDto, @CurrentUser() usuario: string) {
    return this.service.substituir(contratoId, dto.itens, usuario);
  }
}
