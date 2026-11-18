import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AppConfig } from './config/configuration';

const isProd = process.env.NODE_ENV === 'production';

function exigirSegredosDeProducao(): void {
  if (!isProd) return;
  const fracos = ['JWT_SECRET', 'JWT_REFRESH_SECRET'].filter((k) => {
    const v = process.env[k] ?? '';
    return v.length < 32 || /trocar|troque|dev-/i.test(v);
  });
  if (fracos.length) {
    throw new Error(
      `Produção: defina ${fracos.join(' e ')} com valores longos e aleatórios (>= 32 caracteres).`,
    );
  }
}

async function bootstrap(): Promise<void> {
  exigirSegredosDeProducao();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Atrás do proxy HTTPS do provedor (Render/Koyeb etc.)
  app.set('trust proxy', 1);
  const configService = app.get(ConfigService);
  const appConfig = configService.get<AppConfig>('app')!;

  // Serve o frontend (public/index.html) na raiz. A API fica sob /api/v1 e o
  // Swagger sob /docs, então não há conflito com os arquivos estáticos.
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // Limite padrão do Express é ~100kb — relatórios grandes (CT-e, descarga) em
  // JSON facilmente passam disso e a requisição falhava de cara (parecia "lento/
  // travado", mas era rejeitada antes de chegar no controller).
  app.useBodyParser('json', { limit: '25mb' });
  app.useBodyParser('urlencoded', { limit: '25mb', extended: true });

  app.setGlobalPrefix(appConfig.apiPrefix);
  app.enableCors({ origin: appConfig.corsOrigin });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('MODO·RIR — API')
    .setDescription(
      'Backend REST do sistema MODO·RIR — gerenciamento operacional e de risco para trading e originação de grãos. ' +
        'Etapa 1: módulo Comercial › Boletas.',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .addTag('auth', 'Autenticação (login, refresh, logout) — docx §12.3')
    .addTag('usuarios', 'Usuários e RBAC (docx §12.3)')
    .addTag('boletas', 'Boletas Comerciais (docx §5.1)')
    .addTag('contratos', 'Contratos + integração Protheus (docx §6)')
    .addTag('logistica', 'Logística: amarração, frete, embarques, CT-e (docx §7-8)')
    .addTag('armazenagem', 'Armazenagem: custos por contrato (docx §9)')
    .addTag('financeiro', 'Financeiro: lançamentos e fluxo de caixa (docx §10)')
    .addTag('dashboard', 'Read-models: KPIs e resultado por amarração')
    .addTag('parametrizacoes', 'Tabelas base do sistema (docx §12.2)')
    .addTag('cadastros', 'Base mestre de pessoas (docx §12.1)')
    .build();
  // Em produção o Swagger fica desligado (expõe a API inteira), a não ser que
  // SWAGGER_ENABLED=true seja definido explicitamente.
  if (!isProd || process.env.SWAGGER_ENABLED === 'true') {
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(appConfig.port);
  // eslint-disable-next-line no-console
  console.log(`MODO·RIR API rodando em http://localhost:${appConfig.port}/${appConfig.apiPrefix}`);
  // eslint-disable-next-line no-console
  console.log(`Swagger disponível em http://localhost:${appConfig.port}/docs`);
}

bootstrap();
