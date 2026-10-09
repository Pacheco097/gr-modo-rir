# Imagem única, pensada para RODAR NO SEU PC (teste local).
# Mantém as ferramentas do Prisma e o seed disponíveis para que o contêiner
# consiga, sozinho, criar as tabelas e popular os dados de exemplo ao subir.
#
# Base Debian "slim" (não Alpine): o Prisma funciona sem ajustes de OpenSSL.
FROM node:20-slim
WORKDIR /app

# OpenSSL é exigido pelo motor do Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Dependências (todas — precisamos do Prisma CLI e do ts-node para o seed)
COPY package*.json ./
COPY prisma ./prisma
RUN npm install
RUN npx prisma generate

# Código e build
COPY . .
RUN npm run build

# Deixa o assistente de inicialização executável
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
CMD ["sh", "docker-entrypoint.sh"]
