import { Module } from '@nestjs/common';
import { ArmazenagemController } from './armazenagem.controller';
import { ArmazenagemService } from './armazenagem.service';

@Module({
  controllers: [ArmazenagemController],
  providers: [ArmazenagemService],
  exports: [ArmazenagemService],
})
export class ArmazenagemModule {}
