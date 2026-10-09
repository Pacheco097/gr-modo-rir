import { Module } from '@nestjs/common';
import { BoletasController } from './boletas.controller';
import { BoletasService } from './boletas.service';
import { BoletaCalculoService } from './boleta-calculo.service';

@Module({
  controllers: [BoletasController],
  providers: [BoletasService, BoletaCalculoService],
  exports: [BoletasService, BoletaCalculoService],
})
export class BoletasModule {}
