# GR MODO·RIR — Plano de migração para a nuvem (GitHub + hospedagem)

> Documento de ações e sugestões. Data-base: 09/10/2026.
> Escrito a partir do mapeamento real da pasta `C:\GR MODO` (números verificados no código e no banco local).
> Valores de custo e regiões de provedores são **ordens de grandeza** — confirmar nos sites antes de contratar.

---

## 1. Resumo executivo

**Objetivo:** hoje o sistema roda só no seu computador (Docker). Queremos um **link único** que todas as pessoas autorizadas acessem, com código versionado no GitHub e deploy automático.

**Ponto-chave:** o **GitHub sozinho não hospeda o sistema**. O GitHub guarda o código (e roda automações); o site precisa de um servidor para a API e de um banco PostgreSQL. O GitHub Pages só serve páginas estáticas, então **não serve** para o GR.

**Recomendação (resumo):**

| Camada | Recomendação |
|---|---|
| Código | **GitHub**, repositório **privado**, dentro de uma **organização da empresa** (não conta pessoal) |
| Back-end + front-end | **1 contêiner Docker** (a API já serve o `index.html`) hospedado em **Render** ou **Railway** (deploy automático a cada merge no GitHub) |
| Banco | **PostgreSQL gerenciado** do próprio provedor, com backup diário |
| Segredos | Variáveis de ambiente do provedor / GitHub Secrets (nunca no código) |
| Domínio | Subdomínio da empresa (ex.: `gr.suaempresa.com.br`) com HTTPS automático |
| Alternativa | Se a TI da empresa já usa Microsoft/Google/AWS: **Azure Container Apps + PostgreSQL (Brazil South)** ou **Google Cloud Run + Cloud SQL (São Paulo)** — o contêiner é o mesmo |

**Dificuldade real:** não é "copiar arquivos". É preparar o sistema para vários usuários simultâneos. Há **4 pontos que precisam ser corrigidos antes do go-live** (seção 4): dados que vivem no navegador, atualização de banco sem migrations, credenciais de desenvolvimento e arquivos enviados em disco local.

**Prazo estimado:** 2 a 3 semanas, com a maior parte do esforço no endurecimento do código (seção 5, Fase 1).

---

## 2. O que já foi feito (hoje)

- As últimas alterações já estão **aplicadas no seu ambiente local** (API reconstruída; o front é lido direto da pasta).
- Criado o **repositório Git local** com a versão atual (`main`, commit `58e34df`, 182 arquivos). **Nada foi enviado para a internet.**
- Ajustes de preparação: `.gitignore` reforçado (não sobe `.env`, `backups/`, uploads, amostras `Boleta_*.html`, `.claude/`) e `.gitattributes` com **quebras de linha LF** — sem isso o `docker-entrypoint.sh` quebra em servidores Linux ("sh\r: not found") quando o arquivo é salvo no Windows.
- Próximo passo imediato do GitHub (precisa de você): criar o repositório privado vazio e me passar o endereço (seção 5, Fase 0). Para enviar o código é preciso estar autenticado no GitHub.

---

## 3. Inventário atual (mapeamento)

| Item | Situação verificada |
|---|---|
| Tamanho do projeto | ~2,7 MB sem `node_modules` (pequeno; sobe no GitHub sem problema) |
| Back-end | NestJS 10 + Prisma, **161 arquivos TypeScript**, prefixo `/api/v1`, Swagger em `/docs` |
| Banco | PostgreSQL 16, **34 tabelas, ~10 MB** (migração trivial) |
| Front-end | **1 arquivo**: `public/index.html` (~1,6 MB, ~20 mil linhas, vários scripts inline); servido pela própria API |
| Docker | `Dockerfile` único (`node:20-slim`, instala todas as dependências, roda `prisma db push` + `seed` a cada subida) + `docker-compose.yml` (Postgres + API) |
| Autenticação | JWT (access 15 min / refresh 7 dias), 6 perfis (Administrador, Comercial, Operações, Logística, Financeiro, Diretoria) |
| Arquivos enviados | pasta `uploads/boletas/` (hoje vazia) |
| Variáveis de ambiente usadas | `DATABASE_URL`, `API_PORT`, `API_PREFIX`, `CORS_ORIGIN`, `JWT_*`, `AUDITORIA_USUARIO_PADRAO`, `ANTHROPIC_API_KEY` (opcional) |
| Backup/restore | scripts em `scripts/` (`backup.sh/.ps1`, `restore.ps1`) |
| Git | não havia repositório (criado hoje, local) |

---

## 4. Riscos e correções necessárias **antes** de abrir para todos

### 4.1 CRÍTICO — Dados que vivem só no navegador
Parte do sistema grava no **localStorage** de cada computador, não no banco:
- **Mercado Futuro** (vendas futuras, travas, liquidações, prêmio/FOBbings manuais) — chave `MODORIR_MF`.
- Camada de demonstração antiga (`modorir_v2`) — precisa de auditoria para confirmar o que ainda é usado.

**Efeito na nuvem:** cada usuário veria uma tela diferente e os dados somem se o navegador for limpo. **Ação:** criar tabelas + endpoints para o Mercado Futuro e migrar o front para a API; levantar tudo que ainda usa `localStorage` (31 ocorrências no `index.html`). Os resultados do Dashboard que dependem de derivativos usam esses dados.

### 4.2 CRÍTICO — Atualização do banco sem migrations
Hoje cada subida roda `prisma db push --accept-data-loss`, que **pode apagar colunas/dados** ao alterar o schema. Em produção isso é inaceitável.
**Ação:** gerar a migration inicial (baseline) e passar a usar `prisma migrate deploy` (só aplica mudanças versionadas). O `seed` de demonstração deixa de rodar na subida; em produção roda uma única vez e cria só o necessário (empresas, produtos, perfis) + 1 administrador com senha vinda de variável de ambiente.

### 4.3 ALTO — Credenciais e exposição
- Login padrão `admin@modorir.com.br / admin123`, **e a tela de login vem com usuário e senha já preenchidos** → remover o preenchimento e trocar a senha.
- `JWT_SECRET` e `JWT_REFRESH_SECRET` de desenvolvimento → gerar segredos longos e aleatórios.
- `CORS_ORIGIN=*` → restringir ao domínio do sistema.
- Swagger (`/docs`) público → desativar em produção ou proteger.
- Sem limite de tentativas de login → adicionar *rate limit* e cabeçalhos de segurança (helmet).
- A chave da IA (`ANTHROPIC_API_KEY`) hoje pode ser salva em texto no banco pela tela → em produção usar só variável de ambiente do provedor (ou criptografar).
- Dados comerciais são sensíveis (preços, margens, contrapartes): repositório **privado**, 2FA obrigatório no GitHub, poucos colaboradores.

### 4.4 ALTO — Arquivos em disco local
`uploads/` é apagado a cada novo deploy na maioria dos provedores. **Ação:** disco persistente do provedor ou armazenamento de objetos (S3/R2/Azure Blob). Hoje está vazio, então é o momento de resolver.

### 4.5 MÉDIO — Imagem Docker de desenvolvimento
O `Dockerfile` instala tudo (inclui `ts-node`/Prisma CLI) e roda como root. **Ação:** build em múltiplos estágios (só dependências de produção), usuário não-root, `.dockerignore`, *healthcheck* e compressão gzip do `index.html` (1,6 MB).

### 4.6 MÉDIO — Operação
Sem CI/testes automáticos no repositório, sem monitoramento, sem rotina de backup externa, sem HTTPS próprio. Tratados nas Fases 4 e 5.

---

## 5. Plano de ação por fases

### Fase 0 — GitHub (1 dia)
1. Criar (ou usar) uma **Organização GitHub da empresa**; ativar 2FA para todos.
2. Criar o repositório **privado** `gr-modo-rir` (vazio, sem README).
3. Me passar a URL. Com a conta autenticada, o envio é:
   ```bash
   git remote add origin https://github.com/ORGANIZACAO/gr-modo-rir.git
   git push -u origin main
   ```
   (alternativa: instalar o GitHub CLI e rodar `gh auth login`).
4. Proteger a branch `main` (exigir *pull request* e aprovação), ativar Dependabot e *secret scanning*.
5. Convidar apenas quem vai mexer no código; usuários finais **não** precisam de acesso ao GitHub — só ao link do sistema.

### Fase 1 — Preparar o código para produção (3–5 dias) ⟵ eu executo
| # | Tarefa | Risco que resolve |
|---|---|---|
| 1 | Migrar Mercado Futuro (e demais usos de `localStorage` de negócio) para banco + API | 4.1 |
| 2 | Migration baseline do Prisma + `migrate deploy`; seed de produção separado | 4.2 |
| 3 | Remover preenchimento do login; senha do admin via variável; política de senha | 4.3 |
| 4 | Segredos JWT por variável; CORS restrito; Swagger desligado em produção; helmet + rate limit | 4.3 |
| 5 | Chave da IA só por variável de ambiente | 4.3 |
| 6 | Uploads em disco persistente/objeto | 4.4 |
| 7 | Dockerfile multi-estágio + `.dockerignore` + usuário não-root + endpoint `/health` + gzip | 4.5 |
| 8 | `docker-compose.yml` separado: `dev` (atual) e `prod` | — |
| 9 | Testes mínimos (cálculo de resultado/frete/classificação) rodando no CI | 4.6 |
| 10 | Auditoria de uso de `localStorage` restante e do arquivo `index.html` (separar em arquivos? opcional, ver 7) | 4.1 |

### Fase 2 — Infraestrutura (1–2 dias)
1. Criar conta no provedor escolhido (seção 6) **em nome da empresa**.
2. Criar o **PostgreSQL gerenciado** (versão 16, backup diário automático, acesso privado).
3. Criar o **serviço web a partir do Dockerfile**, apontando para o repositório do GitHub; variáveis de ambiente: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `ADMIN_INICIAL_EMAIL/SENHA`, `NODE_ENV=production`.
4. Domínio próprio + HTTPS (certificado automático).
5. Ambientes: **staging** (testes) e **produção**; no começo pode ser só um + banco separado para teste.

### Fase 3 — Migração dos dados (meio dia)
O banco atual tem ~10 MB e hoje contém basicamente **cadastros + dados de simulação**. Duas opções:

- **A) Só cadastros (recomendado):** subir o schema vazio no ambiente novo, rodar o seed de produção e **reimportar os cadastros** (pessoas, empresas, produtos…). Dados de teste não vão para produção.
- **B) Cópia completa (se os dados atuais forem reais):**
  ```bash
  # no seu computador (Postgres do Docker)
  docker exec modorir-postgres pg_dump -U modorir -d modorir -Fc -f /tmp/gr.dump
  docker cp modorir-postgres:/tmp/gr.dump ./gr.dump
  # restaurar no banco da nuvem (string de conexão do provedor)
  pg_restore --no-owner --no-privileges -d "postgresql://USUARIO:SENHA@HOST:5432/BANCO" gr.dump
  ```
Validação: comparar contagem de linhas por tabela (script de conferência) e abrir 5–10 telas-chave (Dashboard, Contratos, Boletas, Classificação, Pagamento de Frete). Fazer um **ensaio** antes do dia do corte.

### Fase 4 — CI/CD com GitHub Actions (1 dia)
- A cada *pull request*: instalar, `prisma validate`, `npm run build`, `npm test`.
- A cada merge em `main`: deploy automático (o provedor escuta o GitHub) → `prisma migrate deploy` roda antes de subir a nova versão.
- Fluxo de trabalho: ramo `feature/...` → PR → revisão → merge → deploy em staging → promoção para produção.

### Fase 5 — Segurança e operação (contínuo)
- **Backups:** automático diário do provedor + `pg_dump` semanal para armazenamento separado; **testar a restauração** a cada trimestre.
- **Monitoramento:** verificação de disponibilidade (UptimeRobot ou similar) e erros (Sentry); alerta por e-mail.
- **Usuários:** criar cada pessoa com o perfil correto; desativar a conta `admin` padrão; considerar 2FA/SSO (Microsoft Entra ID ou Google) numa segunda etapa.
- **LGPD/sigilo:** acesso por perfil, log de auditoria (já existe `createdBy/updatedBy`), política de retenção de backups.

### Fase 6 — Go-live (meio dia)
1. Congelar lançamentos no sistema local (comunicado).
2. Backup final local → restaurar (opção B) ou reimportar cadastros (opção A).
3. Trocar a senha do admin, criar usuários, validar telas.
4. Divulgar o link; manter o ambiente local **somente leitura** por alguns dias como plano B (rollback = voltar a usar o local).

---

## 6. Opções de hospedagem (comparativo)

| Opção | Como funciona | Custo (ordem de grandeza) | Prós | Contras |
|---|---|---|---|---|
| **A. PaaS: Render / Railway** *(recomendada p/ começar)* | Conecta o GitHub; build do Dockerfile; Postgres gerenciado | ~US$ 15–50/mês | Mais simples; deploy automático; HTTPS; backup; pouca manutenção | Região pode não ter São Paulo (latência ~150–250 ms, aceitável p/ ERP); custo cresce com uso |
| **B. VPS único** (Hetzner, DigitalOcean, Locaweb etc.) | Você roda `docker compose` num servidor, com Caddy/Nginx para HTTPS | ~US$ 5–20/mês | Mais barato; controle total | **Você** cuida de atualizações, backup, segurança, queda — exige perfil técnico |
| **C. Cloud corporativa** (AWS ECS/RDS, GCP Cloud Run/Cloud SQL, Azure Container Apps/PostgreSQL) | Mesmos contêineres em serviços gerenciados | ~US$ 50–150+/mês | Região em São Paulo; integra com TI/SSO; escala | Mais complexa e cara; precisa de quem administre a conta |
| ~~D. GitHub Pages~~ | Só arquivos estáticos | — | — | **Não roda API nem banco → não serve** |

**Como escolher:** se o objetivo é ter o link no ar rápido com pouca manutenção → **A**. Se a TI da empresa já tem contrato e quer tudo no mesmo cloud/SSO → **C**. Se há alguém técnico disposto a administrar servidor e o custo for o principal → **B**. Como o sistema é um contêiner padrão, **dá para começar em A e mudar para C depois** sem reescrever nada.

> Sobre região: usuários no Brasil ficam mais rápidos com servidor em São Paulo (AWS `sa-east-1`, GCP `southamerica-east1`, Azure Brazil South, Fly.io GRU). Confirmar regiões atuais de cada provedor.

---

## 7. Sobre o front-end em um arquivo só
`public/index.html` (1,6 MB, ~20 mil linhas) funciona e é servido pela API — **não é obrigatório separar agora**. Mantê-lo junto simplifica o deploy (um único link, sem problemas de CORS). Pontos de atenção na nuvem:
- ativar compressão (gzip/brotli) — reduz ~1,6 MB para ~300 KB;
- cache com versão no nome do arquivo (para os usuários receberem atualizações sem Ctrl+F5);
- no futuro, separar em módulos (e opcionalmente servir por CDN) reduz o risco de conflito quando várias pessoas editarem o mesmo arquivo no Git.

---

## 8. Estrutura sugerida do repositório
```
gr-modo-rir/
├─ src/                 # back-end NestJS
├─ prisma/              # schema + migrations + seed
├─ public/              # front-end (index.html)
├─ scripts/             # backup/restore
├─ .github/workflows/   # ci.yml (testes) e, se necessário, deploy.yml
├─ Dockerfile           # produção (multi-estágio)
├─ docker-compose.yml   # desenvolvimento local
├─ .env.example         # modelo (sem segredos)
├─ MIGRACAO-NUVEM.md    # este documento
└─ README.md            # como rodar / como publicar
```
Boas práticas: `main` protegida; PR obrigatório; mensagens de commit claras; `.env` **nunca** no Git; segredos só no provedor/GitHub Secrets.

---

## 9. Variáveis de ambiente (produção)

| Variável | Para quê | Observação |
|---|---|---|
| `DATABASE_URL` | Conexão com o PostgreSQL | fornecida pelo provedor |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Assinatura dos tokens | longas e aleatórias, diferentes entre si |
| `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | Validade dos tokens | ex.: `15m` / `7d` |
| `CORS_ORIGIN` | Domínio permitido | ex.: `https://gr.suaempresa.com.br` |
| `API_PORT`, `API_PREFIX` | Porta e prefixo | normalmente `3000` e `api/v1` |
| `NODE_ENV` | Modo produção | `production` |
| `ADMIN_INICIAL_EMAIL`, `ADMIN_INICIAL_SENHA` | Primeiro administrador (nova) | usada só na 1ª subida |
| `ANTHROPIC_API_KEY` | IA da Cotação de Fretes (opcional) | só se for usar IA |

---

## 10. Cronograma sugerido

| Semana | Entregas |
|---|---|
| 1 | Fase 0 (GitHub) + Fase 1 (endurecimento do código) |
| 2 | Fase 2 (infra) + Fase 4 (CI/CD) + ensaio de migração de dados + testes com 2–3 usuários |
| 3 | Ajustes, treinamento rápido, Fase 6 (go-live) e acompanhamento |

---

## 11. Decisões que preciso de você

1. **Provedor:** A (Render/Railway), B (VPS) ou C (cloud corporativa)? A TI da empresa tem preferência/contrato?
2. **GitHub:** existe organização da empresa? Quem será o administrador?
3. **Domínio:** qual endereço usar (ex.: `gr.empresa.com.br`) e quem controla o DNS?
4. **Dados:** migrar só cadastros (recomendado) ou cópia completa?
5. **Janela de corte:** quando congelar os lançamentos locais?
6. **Acesso:** quantos usuários e quais perfis? Precisa de login corporativo (Microsoft/Google) já na primeira versão?
7. **Orçamento mensal** aproximado.
8. **IA da Cotação de Fretes:** ficará só na leitura gratuita (padrão atual) ou será contratada a IA paga no futuro?

---

## 12. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Dados do Mercado Futuro perdidos (localStorage) | Migrar para o banco **antes** do go-live; exportar o que existir hoje nos navegadores |
| Perda de dados por `db push --accept-data-loss` | Migrations versionadas + backup antes de cada deploy |
| Vazamento de dados comerciais | Repositório privado + 2FA + segredos fora do código + perfis de acesso |
| Queda do serviço | Monitoramento, backup testado, plano B local por alguns dias |
| Conflito de edição no `index.html` | PRs pequenos e revisão; evolução gradual para módulos |
| Custos subirem | Alertas de orçamento no provedor; começar com plano mínimo |
| Dependência de uma pessoa | Documentar (este arquivo + README), mais de um administrador no GitHub e no provedor |

---

## 13. Resumo de próximos passos

1. Responder as decisões da seção 11 (principalmente 1, 2 e 3).
2. Criar a organização/repositório privado no GitHub e me passar a URL → eu envio o código.
3. Eu executo a Fase 1 (correções de produção) e abro um *pull request* para revisão.
4. Subir o ambiente de teste no provedor escolhido, validar com 2–3 usuários e marcar a data do corte.
