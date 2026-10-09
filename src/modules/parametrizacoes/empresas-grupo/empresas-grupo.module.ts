import { Module } from '@nestjs/common';
import { EmpresasGrupoController } from './empresas-grupo.controller';
import { EmpresasGrupoService } from './empresas-grupo.service';

@Module({
  controllers: [EmpresasGrupoController],
  providers: [EmpresasGrupoService],
  exports: [EmpresasGrupoService],
})
export class EmpresasGrupoModule {}
