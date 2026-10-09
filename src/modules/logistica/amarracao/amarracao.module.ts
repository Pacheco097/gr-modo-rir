import { Module } from '@nestjs/common';
import { AmarracaoController } from './amarracao.controller';
import { AmarracaoService } from './amarracao.service';
import { ClassificacaoModule } from '../../comercial/classificacao/classificacao.module';

@Module({
  imports: [ClassificacaoModule],
  controllers: [AmarracaoController],
  providers: [AmarracaoService],
  exports: [AmarracaoService],
})
export class AmarracaoModule {}
