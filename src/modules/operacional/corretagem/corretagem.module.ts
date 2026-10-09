import { Module } from '@nestjs/common';
import { CorretagemController } from './corretagem.controller';
import { CorretagemService } from './corretagem.service';

@Module({
  controllers: [CorretagemController],
  providers: [CorretagemService],
  exports: [CorretagemService],
})
export class CorretagemModule {}
