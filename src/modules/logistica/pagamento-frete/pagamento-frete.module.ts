import { Module } from '@nestjs/common';
import { PagamentoFreteController } from './pagamento-frete.controller';
import { PagamentoFreteService } from './pagamento-frete.service';

@Module({
  controllers: [PagamentoFreteController],
  providers: [PagamentoFreteService],
  exports: [PagamentoFreteService],
})
export class PagamentoFreteModule {}
