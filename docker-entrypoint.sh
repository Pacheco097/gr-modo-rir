#!/bin/sh
# Assistente de inicialização — roda automaticamente quando o contêiner sobe.
# Faz, em ordem: (1) prepara o banco, (2) popula os dados-base, (3) liga a API.
# Seguro para rodar várias vezes (o seed é idempotente).
set -e

if [ "$NODE_ENV" = "production" ]; then
  # Produção: só aplica migrations versionadas (nunca apaga dados).
  echo "==> [1/3] Aplicando migrations (prisma migrate deploy)..."
  npx prisma migrate deploy
else
  # Desenvolvimento local: sincroniza o schema direto (pode descartar dados).
  echo "==> [1/3] Preparando o banco de dados (criando as tabelas)..."
  npx prisma db push --skip-generate --accept-data-loss
fi

echo "==> [2/3] Populando dados-base..."
npm run prisma:seed

echo "==> [3/3] Ligando a API MODO-RIR..."
exec node dist/main
