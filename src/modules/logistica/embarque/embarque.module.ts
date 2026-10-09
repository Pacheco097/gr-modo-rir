import { Module } from '@nestjs/common';
import { EmbarqueController } from './embarque.controller';
import { EmbarqueService } from './embarque.service';
import { ClassificacaoModule } from '../../comercial/classificacao/classificacao.module';
import { ParametrizacaoModule } from '../parametrizacao/parametrizacao.module';

@Module({
  imports: [ClassificacaoModule, ParametrizacaoModule],
  controllers: [EmbarqueController],
  providers: [EmbarqueService],
  exports: [EmbarqueService],
})
export class EmbarqueModule {}
