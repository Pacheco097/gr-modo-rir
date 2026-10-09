import { Module } from '@nestjs/common';
import { ParametrosFinanceirosController } from './parametros-financeiros.controller';
import { ParametrosFinanceirosService } from './parametros-financeiros.service';

@Module({
  controllers: [ParametrosFinanceirosController],
  providers: [ParametrosFinanceirosService],
  exports: [ParametrosFinanceirosService],
})
export class ParametrosFinanceirosModule {}
