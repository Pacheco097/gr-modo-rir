import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CorretagemService } from './corretagem.service';
import { AtualizarCorretagemDto, LancarCorretagemDto } from './dto/corretagem.dto';

@ApiTags('operacional')
@Controller('operacional/corretagem')
export class CorretagemController {
  constructor(private readonly service: CorretagemService) {}

  @Get()
  listar() {
    return this.service.listar();
  }

  @Patch(':contratoId')
  atualizar(@Param('contratoId') contratoId: string, @Body() dto: AtualizarCorretagemDto, @CurrentUser() usuario: string) {
    return this.service.atualizar(contratoId, dto, usuario);
  }

  @Patch(':contratoId/lancar')
  lancar(@Param('contratoId') contratoId: string, @Body() dto: LancarCorretagemDto, @CurrentUser() usuario: string) {
    return this.service.lancar(contratoId, dto, usuario);
  }

  @Patch(':contratoId/estornar')
  estornar(@Param('contratoId') contratoId: string, @CurrentUser() usuario: string) {
    return this.service.estornar(contratoId, usuario);
  }
}
