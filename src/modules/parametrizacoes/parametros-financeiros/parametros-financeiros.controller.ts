import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ParametrosFinanceirosService } from './parametros-financeiros.service';
import { ParametroFinanceiroResponseDto } from './dto/parametro-financeiro-response.dto';
import { UpdateParametroFinanceiroDto } from './dto/update-parametro-financeiro.dto';

/** Registro único (singleton) — não há coleção, apenas GET e PUT. */
@ApiTags('parametrizacoes')
@Controller('parametrizacoes/parametros-financeiros')
export class ParametrosFinanceirosController {
  constructor(private readonly service: ParametrosFinanceirosService) {}

  @Get()
  @ApiOkResponse({ type: ParametroFinanceiroResponseDto })
  obter() {
    return this.service.obter();
  }

  @Put()
  @ApiOkResponse({ type: ParametroFinanceiroResponseDto })
  atualizar(@Body() dto: UpdateParametroFinanceiroDto, @CurrentUser() usuario: string) {
    return this.service.atualizar(dto, usuario);
  }
}
