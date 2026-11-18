# Publicar o GR MODO·RIR de graça (GitHub + Neon + Render)

Resultado: um link como `https://gr-modo-rir.onrender.com` (HTTPS incluso).
Domínio próprio é opcional (passo 6).

## 1. Instalar o Git
Baixe em https://git-scm.com/download/win e instale (opções padrão). Feche e reabra o terminal.

## 2. Enviar o código para o GitHub (repositório PRIVADO)
1. Crie uma conta em https://github.com (ative 2FA).
2. **New repository** → nome `gr-modo-rir` → **Private** → sem README → Create.
3. Na pasta do projeto:
   ```powershell
   git init -b main
   git add .
   git commit -m "Versão inicial pronta para produção"
   git remote add origin https://github.com/SEU_USUARIO/gr-modo-rir.git
   git push -u origin main
   ```

## 3. Banco PostgreSQL gratuito (Neon)
1. Crie conta em https://neon.tech → **New project** → Postgres 16 → região **AWS São Paulo** (se houver) ou US East.
2. Em **Connection details**, desmarque *Pooled connection* e copie a string
   `postgresql://usuario:senha@ep-xxxx.../neondb?sslmode=require`. Guarde-a.

## 4. Servidor gratuito (Render)
1. Crie conta em https://render.com entrando com o GitHub.
2. **New → Blueprint** → escolha o repositório `gr-modo-rir` (o arquivo `render.yaml` já configura tudo).
3. Preencha as variáveis pedidas:
   | Variável | Valor |
   |---|---|
   | `DATABASE_URL` | string do Neon (passo 3) |
   | `ADMIN_INICIAL_EMAIL` | seu e-mail de administrador |
   | `ADMIN_INICIAL_SENHA` | senha forte (mín. 10 caracteres) |
   | `CORS_ORIGIN` | `https://gr-modo-rir.onrender.com` (o link que o Render mostrar) |
   `JWT_SECRET` e `JWT_REFRESH_SECRET` são gerados automaticamente.
4. **Apply**. O primeiro build leva ~5–10 min. Depois acesse o link e entre com o admin.
5. A cada `git push` na `main`, o Render publica sozinho.

## 5. Limitações do plano gratuito
- O servidor **dorme após ~15 min sem acesso**; o primeiro acesso depois disso demora ~1 min.
- **Arquivos enviados (`uploads/`) se perdem** a cada deploy/reinício — o disco é temporário.
- Neon gratuito: ~0,5 GB de banco (o atual tem ~10 MB).
- Dados que ainda ficam no **localStorage** do navegador (Mercado Futuro, Relatórios de Descarga) **não são compartilhados** entre usuários.
- Bom para teste/homologação. Para uso diário da empresa, considerar o plano pago (~US$ 7/mês) ou VPS.

## 6. Domínio próprio (opcional, ~R$ 40/ano)
1. Registre em https://registro.br (ex.: `modorir.com.br`).
2. No Render: serviço → **Settings → Custom Domains** → adicione `gr.modorir.com.br`.
3. No Registro.br (DNS): crie um registro **CNAME** `gr` → `gr-modo-rir.onrender.com`.
4. Aguarde o HTTPS ficar verde no Render e atualize `CORS_ORIGIN` para `https://gr.modorir.com.br`.
