import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { PrismaModule } from './database/prisma.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { EmpresasGrupoModule } from './modules/parametrizacoes/empresas-grupo/empresas-grupo.module';
import { SafrasModule } from './modules/parametrizacoes/safras/safras.module';
import { ProdutosModule } from './modules/parametrizacoes/produtos/produtos.module';
import { ModalidadesModule } from './modules/parametrizacoes/modalidades/modalidades.module';
import { CorretorasModule } from './modules/parametrizacoes/corretoras/corretoras.module';
import { FazendasModule } from './modules/parametrizacoes/fazendas/fazendas.module';
import { ParametrosFinanceirosModule } from './modules/parametrizacoes/parametros-financeiros/parametros-financeiros.module';
import { PessoasModule } from './modules/cadastros/pessoas/pessoas.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { AuthModule } from './modules/auth/auth.module';
import { BoletasModule } from './modules/comercial/boletas/boletas.module';
import { ContratosModule } from './modules/comercial/contratos/contratos.module';
import { ClassificacaoModule } from './modules/comercial/classificacao/classificacao.module';
import { ParcelasModule } from './modules/comercial/parcelas/parcelas.module';
import { AmarracaoModule } from './modules/logistica/amarracao/amarracao.module';
import { FreteModule } from './modules/logistica/frete/frete.module';
import { EmbarqueModule } from './modules/logistica/embarque/embarque.module';
import { ParametrizacaoModule } from './modules/logistica/parametrizacao/parametrizacao.module';
import { PagamentoFreteModule } from './modules/logistica/pagamento-frete/pagamento-frete.module';
import { CotacaoFreteModule } from './modules/logistica/cotacao-frete/cotacao-frete.module';
import { ArmazenagemModule } from './modules/armazenagem/armazenagem.module';
import { CorretagemModule } from './modules/operacional/corretagem/corretagem.module';
import { FinanceiroModule } from './modules/financeiro/financeiro.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    PrismaModule,
    // Parametrizações (docx §12.2)
    EmpresasGrupoModule,
    SafrasModule,
    ProdutosModule,
    ModalidadesModule,
    CorretorasModule,
    FazendasModule,
    ParametrosFinanceirosModule,
    // Cadastros (docx §12.1)
    PessoasModule,
    // Auth/RBAC (docx §12.3) + Usuários
    AuthModule,
    UsuariosModule,
    // Comercial › Boletas e Contratos
    BoletasModule,
    ContratosModule,
    ClassificacaoModule,
    ParcelasModule,
    // Logística (docx §7-8)
    AmarracaoModule,
    FreteModule,
    ParametrizacaoModule,
    EmbarqueModule,
    PagamentoFreteModule,
    CotacaoFreteModule,
    // Armazenagem (docx §9)
    ArmazenagemModule,
    // Operacional › Corretagem (por contrato)
    CorretagemModule,
    // Financeiro (docx §10)
    FinanceiroModule,
    // Read-models (Dashboard de Resultado)
    DashboardModule,
  ],
  providers: [
    // Login obrigatório em todos os módulos (exceto rotas @Public) + RBAC por perfil
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
