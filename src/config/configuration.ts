export interface AppConfig {
  port: number;
  apiPrefix: string;
  corsOrigin: string;
  auditoriaUsuarioPadrao: string;
}

export interface JwtConfig {
  secret: string;
  accessExpiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
}

export default (): { app: AppConfig; jwt: JwtConfig } => ({
  app: {
    // PORT é definido automaticamente por provedores como Render/Koyeb.
    port: parseInt(process.env.PORT ?? process.env.API_PORT ?? '3000', 10),
    apiPrefix: process.env.API_PREFIX ?? 'api/v1',
    corsOrigin: process.env.CORS_ORIGIN ?? '*',
    auditoriaUsuarioPadrao: process.env.AUDITORIA_USUARIO_PADRAO ?? 'sistema',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-trocar-em-producao',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-trocar-em-producao',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
});
