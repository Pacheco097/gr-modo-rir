import { Module } from '@nestjs/common';
import { CotacaoFreteController } from './cotacao-frete.controller';
import { CotacaoFreteService } from './cotacao-frete.service';

@Module({
  controllers: [CotacaoFreteController],
  providers: [CotacaoFreteService],
  exports: [CotacaoFreteService],
})
export class CotacaoFreteModule {}
