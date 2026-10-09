import { Module } from '@nestjs/common';
import { ParametrizacaoController } from './parametrizacao.controller';
import { ParametrizacaoService } from './parametrizacao.service';

@Module({
  controllers: [ParametrizacaoController],
  providers: [ParametrizacaoService],
  exports: [ParametrizacaoService],
})
export class ParametrizacaoModule {}
