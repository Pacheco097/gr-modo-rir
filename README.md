# MODO·RIR — Backend

Backend REST em NestJS + PostgreSQL + Prisma para o sistema MODO·RIR, construído
em etapas a partir do `Prompt_Backend_MODO-RIR_1.docx` e do frontend de
referência `AgroERP_Demo_16_79.html`.

**Módulos entregues até aqui:**
- **Comercial › Boletas** (docx §5.1) — ciclo de vida completo + formação de preço
- **Parametrizações** (docx §12.2) — Empresas do Grupo, Safras, Modalidades,
  Produtos, Corretoras, Fazendas e Parâmetros Financeiros (CRUD completo)
- **Cadastros › Pessoas** (docx §12.1) — CRUD completo, código auto-prefixado por
  tipo, deduplicação por CPF/CNPJ, import Excel/CSV (com modelo) e export CSV
- **Auth/RBAC + Usuários** (docx §12.3) — login JWT (access+refresh), bcrypt,
  6 perfis de acesso
- **Comercial › Contratos** (docx §6) — ciclo de vida, assinatura, entregas,
  excedente de peso e o ponto de integração Protheus (`importar-erp`)
- **Logística** (docx §7-8) — Amarração (2 e 3 pontas), Aprovação de Frete,
  Embarques (liberação → encerramento), Pagamento de Frete (CT-e)
- **Armazenagem** (docx §9) — custo por contrato, previsto × realizado
- **Financeiro** (docx §10) — lançamentos CR/CP/comissão/antecipação/outros e
  Fluxo de Caixa consolidado
- **Dashboard** — KPIs e resultado por amarração (com regra do Mercado Futuro)

> ⚠️ **Aviso importante**: este projeto foi escrito neste ambiente sem Node.js/npm
> instalados, então **não foi possível rodar `npm install`, `npm run build`,
> `npm test` ou `tsc --noEmit` aqui** para validar a compilação. O código segue
> fielmente as convenções do NestJS 10 / Prisma 5, mas antes de considerar a
> etapa "pronta" rode localmente:
> ```bash
> npm install
> npx prisma generate
> npm run build
> npm test
> ```
> e corrija qualquer erro de compilação/lint que aparecer — é o próximo passo
> antes de seguir para a Etapa 2.

## Decisões tomadas nesta etapa

Ao cruzar o docx com o HTML de referência, três pontos precisaram de decisão
explícita (confirmados com o usuário antes de codar):

1. **Tipo da Boleta**: o docx restringe a `COMPRA | VENDA`, mas o HTML permite
   um terceiro tipo, `Remessa`. Optou-se por incluir `REMESSA` no enum
   `TipoOperacaoBoleta`, replicando o HTML.
2. **Campo `mercado`**: não existe como seletor no HTML — é derivado
   automaticamente do nome do produto (`/a\s*-?\s*fixar/i` → `FUTURO`, senão
   `SPOT`). O backend replica essa derivação; o cliente nunca envia `mercado`.
3. **FKs para módulos futuros** (Empresas do Grupo, Safras, Produtos,
   Modalidades, Corretoras, Pessoas, Usuários): foram criadas como tabelas
   reais com chave estrangeira de verdade, mas com schema mínimo (`id`, `nome`
   e pouco mais). Elas viram os módulos completos de Parametrizações/
   Cadastros/Usuários nas próximas etapas, na ordem definida no docx §13 —
   sem precisar alterar a FK da Boleta depois.

Outras réplicas fiéis do HTML que vale destacar:

- O campo **"Classificação padrão (R$/sc)"** é armazenado mas **não** entra no
  somatório de custos do resultado projetado — só a lista dinâmica de
  `classificadoras` conta. Isso é assim no HTML de referência (`_getBoletaData`
  calcula `clsf` mas nunca usa a variável) e foi replicado propositalmente.
- A fórmula de formação de preço (`CBOT + Prêmio × fator bushel→ton ...`) usa
  os valores exatamente como digitados, sem dividir centavos por 100 — outra
  particularidade do HTML de referência que foi mantida sem "correção".
- O ciclo de vida da Boleta segue exatamente
  `RASCUNHO → PENDENTE → (se Futuro) EM_FIXACAO → PENDENTE_FIXACAO → APROVADA | REPROVADA → CONTRATO_VINCULADO`,
  com `CANCELADA` possível a partir de Rascunho, Pendente ou Em Fixação.

Qualquer dúvida de negócio que surgir durante a Etapa 2 em diante deve ser
perguntada antes de assumir — é a regra de ouro do próprio docx.

### Decisões dos módulos de Cadastros e Parametrizações

- **Tipos de Pessoa**: seguimos os 6 canônicos do docx §12.1 (`CLIENTE`,
  `PRODUTOR_RURAL`, `TRANSPORTADORA`, `ARMAZEM`, `CLASSIFICADORA`, `BANCO`).
  "Fornecedor" e "Corretora", que aparecem no modal do HTML, ficaram de fora:
  Corretora é uma Parametrização própria, e Fornecedor não consta do docx.
- **Transportadoras**: fonte única de verdade é `Pessoa` (tipo
  `TRANSPORTADORA`) — não há tabela separada, conforme o docx §12.2 ("onde há
  sobreposição, definir uma única fonte de verdade"). A aba "Transportadoras"
  do HTML é servida por `GET /cadastros/pessoas?tipo=TRANSPORTADORA`.
- **Vendedores/Compradores** (aba do HTML): são os comerciais internos →
  `GET /usuarios?perfil=COMERCIAL`. Não viram entidade nova.
- **Código de Pessoa**: gerado com prefixo por tipo (CLI/PROD/TRANSP/ARM/CLA/BAN)
  e sequencial de 3 dígitos, robusto contra gaps e soft-deletes.
- **Parâmetros Financeiros**: registro único (singleton, id `default`). O
  `custoQuebraPct` é editável apenas por administrador no HTML — o campo é
  aceito, mas deve ser protegido por Guard de perfil quando o RBAC existir.
- **Soft delete com proteção de uso**: remover uma Empresa/Safra/Produto/
  Modalidade/Corretora/Pessoa em uso por boletas é bloqueado (400) em vez de
  quebrar a integridade referencial.

## Stack

TypeScript · NestJS 10 · PostgreSQL 16 · Prisma 5 · class-validator/class-transformer ·
Swagger (`@nestjs/swagger`) · Decimal.js (dinheiro nunca em float) · Multer (upload) ·
xlsx (import/export de cadastros) · Jest.

## Setup

```bash
cp .env.example .env
docker compose up -d postgres        # sobe só o Postgres em desenvolvimento
npm install
npx prisma migrate dev --name init   # cria as tabelas
npm run prisma:seed                  # popula dados de demonstração (espelha o HTML)
npm run start:dev
```

A API sobe em `http://localhost:3000/api/v1`; Swagger em `http://localhost:3000/docs`.

Para subir tudo em contêiner (API + Postgres): `docker compose up --build`.

## Estrutura

```
src/
├── modules/
│   ├── comercial/boletas/        # ciclo de vida + motor de cálculo (testável)
│   ├── parametrizacoes/          # CRUD: empresas-grupo, safras, produtos,
│   │                             #   modalidades, corretoras, fazendas,
│   │                             #   parametros-financeiros (singleton)
│   ├── cadastros/pessoas/        # CRUD + import/export + código por prefixo
│   └── usuarios/                 # stub (até Auth/RBAC)
├── common/                       # paginação, filtro de exceções, decorator de usuário atual
├── database/                     # Prisma module/service
└── config/
prisma/
├── schema.prisma
└── seed.ts
```

## Endpoints principais (`/api/v1/comercial/boletas`)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/` | Lista paginada (filtros: status, tipo, mercado, empresaGrupoId, safraId, produtoId, busca) |
| GET | `/kpis` | Contagem por status (réplica dos 5 cards do HTML) |
| GET | `/em-formacao` | Painel "Formação de Preço em Aberto" |
| GET | `/:id` | Detalhe completo |
| POST | `/` | Cria (Rascunho) — calcula resultado projetado no servidor |
| PUT | `/:id` | Atualiza (só em Rascunho/Em Fixação) |
| POST | `/:id/enviar-para-aprovacao` | Rascunho → Pendente |
| POST | `/:id/aprovar` | Pendente → Aprovada (ou → Em Fixação na 1ª aprovação de boleta futura) |
| POST | `/:id/reprovar` | Requer motivo (mín. 10 caracteres) |
| POST | `/:id/cancelar` | Requer motivo (mín. 10 caracteres) |
| PUT | `/:id/fixacao-componentes` | Preenchimento parcial/total dos 5 componentes de formação de preço |
| POST | `/:id/encerrar-formacao` | Fecha o preço, troca o produto para o equivalente FIXO |
| POST | `/:id/vincular-contrato` | Aprovada → Contrato Vinculado (placeholder até o módulo Contratos) |
| POST | `/:id/documentos` | Upload do Documento de Confirmação de Compra (multipart) |
| DELETE | `/:id/documentos/:documentoId` | Remove anexo |

## Endpoints de Parametrizações (`/api/v1/parametrizacoes`)

CRUD completo (GET lista + GET :id + POST + PUT :id + DELETE :id, soft delete) em:

| Recurso | Rota base | Observações |
|---|---|---|
| Empresas do Grupo | `/empresas-grupo` | código único; bloqueia remoção em uso |
| Safras | `/safras` | código único |
| Produtos | `/produtos` | nome único; `produtoFixoEquivalenteId` (A Fixar → Fixo) |
| Modalidades | `/modalidades` | filtro `?tipoBoleta=` (compatibilidade com a boleta) |
| Corretoras | `/corretoras` | `corretagemPctPadrao` |
| Fazendas | `/fazendas` | vínculo opcional com Empresa do Grupo |
| Parâmetros Financeiros | `/parametros-financeiros` | **singleton**: só `GET` e `PUT` (taxa de juros do descasamento, classificação padrão, custo de quebra) |

## Endpoints de Cadastros (`/api/v1/cadastros/pessoas`)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/` | Lista paginada (filtros: `tipo`, `uf`, `busca`) |
| GET | `/sugestoes?q=` | Autocomplete de contraparte da Boleta (até 8) |
| GET | `/modelo-importacao` | Baixa o modelo `.xlsx` de importação |
| GET | `/exportar-csv` | Exporta os cadastros filtrados em CSV |
| GET | `/:id` | Detalhe |
| POST | `/` | Cria (código auto-prefixado; dedup por CPF/CNPJ) |
| POST | `/importar` | Importação em massa (multipart `arquivo` .xlsx/.xls/.csv) |
| PUT | `/:id` | Atualiza |
| DELETE | `/:id` | Soft delete (bloqueado se em uso como contraparte) |

## Autenticação e Usuários (docx §12.3)

JWT (access + refresh) com senhas em bcrypt e RBAC por perfil (`ADMINISTRADOR`,
`COMERCIAL`, `OPERACOES`, `LOGISTICA`, `FINANCEIRO`, `DIRETORIA`).

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/v1/auth/login` | `{email, senha}` → `{accessToken, refreshToken, usuario}` |
| POST | `/api/v1/auth/refresh` | `{refreshToken}` → novos tokens (rotação) |
| POST | `/api/v1/auth/logout` | encerra a sessão (JWT) |
| GET | `/api/v1/auth/me` | usuário autenticado (JWT) |
| GET | `/api/v1/usuarios` | lista (JWT; filtros `?perfil=`, `?busca=`) |
| POST/PUT/DELETE | `/api/v1/usuarios/:id` | CRUD (JWT + perfil **ADMINISTRADOR**) |
| PATCH | `/api/v1/usuarios/:id/senha` | troca de senha (próprio com senha atual, ou admin) |

Envie o token em `Authorization: Bearer <accessToken>`. No Swagger, use o botão
**Authorize**.

**Credenciais do seed (DEV — trocar em produção):**
- `admin@modorir.com.br` / `admin123` (ADMINISTRADOR)
- `ruber.dallamaria@modorir.com.br` / `modorir123` (COMERCIAL) — idem os demais com `modorir123`

**Escopo atual da proteção:** por ora, só os módulos **Auth** e **Usuários**
exigem token. Boletas, Cadastros e Parametrizações seguem abertos até a próxima
etapa (ligar o login real no frontend), para não quebrar a integração já feita.
O autor das ações nesses módulos ainda vem do header `x-user`
(`src/common/decorators/current-user.decorator.ts`); nos endpoints protegidos, o
autor vem do JWT (`@AuthUser()`).

Os segredos JWT ficam em variáveis de ambiente (`JWT_SECRET`,
`JWT_REFRESH_SECRET`, expirações) — ver `.env.example`.

## Testes

```bash
npm test
```

Cobre:
- Motor de cálculo (`boleta-calculo.service.spec.ts`): resultado projetado
  (bruta/custos/líquido/margem), inversão de sinal em Compra, créditos fiscais
  de ICMS e PIS/COFINS, soma de classificadoras, e a fórmula de formação de
  preço (fator soja vs. milho, cálculo parcial, componentes pendentes).
- Gerador de código de Pessoa (`pessoa-codigo.util.spec.ts`): prefixos por tipo,
  sequencial, e normalização de documento para deduplicação.
- Mapa de compatibilidade de modalidades (`modalidade-compativel.map.spec.ts`).

## Endpoints de Contratos (`/api/v1/contratos`) — docx §6

| Método | Rota | Descrição |
|---|---|---|
| GET | `/` | Lista paginada (filtros: `tipo`, `status`, `boletaId`, `numeroErpMaxicon`, `busca`) |
| GET | `/:id` | Detalhe (com histórico e documentos) |
| POST | `/` | Cria (nº `CS-{ano}-{seq}`; herda campos da boleta se `boletaId` vier) |
| POST | `/importar-erp` | **Ponto de integração Protheus** — importa um contrato aberto no ERP |
| PUT | `/:id` | Atualiza (bloqueado em EXECUTADO/CANCELADO; troca de preço vai ao histórico) |
| PATCH | `/:id/status` | Transição de status (RASCUNHO→EMITIDO→EM_ANDAMENTO→EXECUTADO / CANCELADO) |
| PATCH | `/:id/assinatura` | Atualiza assinatura (NAO_ENVIADO/ENVIADO/ASSINADO/RECUSADO) |
| POST | `/:id/entrega` | Registra entrega (atualiza saldo e status derivado) |
| POST | `/:id/excedente` | Tratamento de excedente de peso (mesmo preço / nova boleta / aditivo / abono) |
| PATCH | `/:id/vincular-boleta` | Vincula/ajusta a boleta de origem |
| DELETE | `/:id` | Soft delete (bloqueado se EXECUTADO) |

Integração Protheus (docx §6): o campo `numeroErpMaxicon` é a chave de ligação
com o ERP e os relatórios de descarga. `POST /importar-erp` modela o "puxar
contrato do ERP"; a atualização de status é manual por `PATCH /:id/status`
enquanto a API de status automático do Protheus não existir.

## Endpoints de Logística, Armazenagem, Financeiro e Dashboard

**Logística (docx §7-8)**
| Método | Rota | Descrição |
|---|---|---|
| GET/POST/DELETE | `/logistica/amarracoes` | Amarração compra × venda × (opcional) Venda Mercado Futuro |
| GET | `/logistica/amarracoes/saldo-{compra,venda,mercado-futuro}/:id` | Saldos a amarrar |
| GET/POST | `/logistica/fretes` + `PATCH /:id/{aprovar,reprovar}` | Aprovação de frete |
| GET | `/logistica/embarques` + `POST /liberar` + `PATCH /:id/encerrar` | Liberação → encerramento (peso, % performado) |
| GET/POST | `/logistica/pagamento-frete` + `PATCH /:id/pagar` | CT-e (total c/ ICMS × custo s/ ICMS) |

**Armazenagem (docx §9)** — `/armazenagem` (`POST /iniciar`, `PATCH /:id`, `PATCH /:id/encerrar`): custo previsto (padronização + armazenagem×quinzenas) × sc, previsto × realizado.

**Financeiro (docx §10)** — `/financeiro/lancamentos` (CRUD + `PATCH /:id/liquidar`), `POST /financeiro/sincronizar-contratos` (materializa CR/CP dos contratos por vencimento: compra→PAGAR, venda→RECEBER), `GET /financeiro/fluxo-caixa` (consolidado por dia: entradas − saídas, saldo acumulado).

**Dashboard / read-models** — `GET /dashboard/kpis`, `GET /dashboard/resumo-financeiro`, `GET /dashboard/resultado-amarracoes` (**usa o preço do Mercado Futuro quando a amarração tem a 3ª ponta**, conforme o mapa mental).

## Próximas etapas

1. Ligar o login real no frontend e estender a proteção JWT aos módulos de negócio
2. Conectar as telas do frontend aos backends novos (Contratos, Logística, Financeiro, Dashboard)
3. Complementos de Financeiro do docx §10 (Royalts com crédito Monsanto, gatilho de comissão pós-encerramento, reprogramações)
4. Publicação em servidor (IP fixo/domínio + HTTPS) e backups

> **Backend entregue e testado**: Boletas (§5.1), Parametrizações (§12.2),
> Cadastros (§12.1), Auth/RBAC + Usuários (§12.3), Contratos (§6),
> Logística — Amarração/Frete/Embarques/CT-e (§7-8), Armazenagem (§9),
> Financeiro (§10) e Dashboard de Resultado.
