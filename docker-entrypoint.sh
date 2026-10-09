#!/bin/sh
# Assistente de inicialização — roda automaticamente quando o contêiner sobe.
# Faz, em ordem: (1) cria as tabelas no banco, (2) popula os dados de exemplo,
# (3) liga a API. Seguro para rodar várias vezes (o seed é idempotente).
set -e

echo "==> [1/3] Preparando o banco de dados (criando as tabelas)..."
npx prisma db push --skip-generate --accept-data-loss

echo "==> [2/3] Populando dados de demonstração..."
npm run prisma:seed

echo "==> [3/3] Ligando a API MODO-RIR..."
echo "    Acesse no navegador: http://localhost:3000/docs"
node dist/main
