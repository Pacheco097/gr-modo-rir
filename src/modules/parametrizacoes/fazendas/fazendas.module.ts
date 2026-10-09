import { Module } from '@nestjs/common';
import { FazendasController } from './fazendas.controller';
import { FazendasService } from './fazendas.service';

@Module({
  controllers: [FazendasController],
  providers: [FazendasService],
  exports: [FazendasService],
})
export class FazendasModule {}
