# MODO·RIR — Handoff / Continuação do desenvolvimento

> Documento para retomar o projeto em uma nova sessão do Claude Code. **Leia inteiro antes de mexer.**
> Projeto em `C:\GR MODO`. **Handoff atualizado: 2026-09-02.**

## 0. LEIA A MEMÓRIA PRIMEIRO (fonte de verdade do estado recente)
Este projeto tem memória persistente em `C:\Users\ian.dallamaria\.claude\projects\C--GR-MODO\memory\`.
O índice `MEMORY.md` é carregado automaticamente. Os 4 arquivos têm o **detalhe fino de cada feature** (arquivos, `file:line`, decisões do usuário, validações):
- **`projeto-gr-modo-stack.md`** — stack, como rodar, e o estado de TUDO (dashboard, conciliação, remessa, corretagem, armazenagem, frete, embarques, fluxo de caixa…). É o mais completo.
- **`projeto-boletas-modulo.md`** — módulo Comercial › Boletas (regras, ciclo de vida, REMESSA aceita preço 0).
- **`ui-polish-2026-09.md`** — ajustes de UI de set/2026 (filtros fluxo de caixa, tabela de preços, dashboard composição, Long/Short Basis dinâmico, conciliação corretagem, herança de custos da remessa).
- IMPORTANTE: memórias são pontos no tempo. Confirme `file:line` contra o código atual antes de afirmar como fato.

## 1. O que é
ERP de gestão operacional e de risco para trading/originação de grãos (soja, milho, sorgo) da MODO.
Backend **NestJS + PostgreSQL + Prisma** (prefixo global `/api/v1`). Frontend = **um HTML único** (`public/index.html`, ~18k linhas, herdado de protótipo) servido pelo próprio backend e ligado por **"bridges"** (ver §4). Fonte de verdade do domínio: `Prompt_Backend_MODO-RIR_1.docx` + HTML de referência `AgroERP_Demo_16_79.html`.

## 2. Como rodar (Docker)
```bash
docker compose up -d          # sobe Postgres + API (entrypoint faz db push + seed)
docker compose up --build -d  # SEMPRE que mudar backend/schema/seed (frontend NÃO precisa)
```
- Sistema: **http://localhost:3000/** · Swagger: **http://localhost:3000/docs**
- Login: **admin@modorir.com.br / admin123**
- DB: `docker exec modorir-postgres psql -U modorir -d modorir`
- Após `up --build`, espere ~15-20s e cheque `docker logs modorir-api | tail` ("Nest application successfully started").
- Frontend é **bind-mount** (`public/`) → mudança de HTML/JS vale só recarregando o navegador (**Ctrl+F5** — cache costuma segurar a versão antiga). SEM rebuild.

## 3. Estado atual — features recentes (todas ligadas ao backend e validadas)
Fluxo central compra → contrato → **amarração** → parametrização (Operações) → frete → embarque → CT-e → conciliação → financeiro/dashboard. Novidades recentes:

- **REMESSA (compra A → remessa B → venda C):** amarração pode ser **compra × VENDA** (comercial) OU **compra × REMESSA** (operacional, sem venda). Feita na **Aprovação de Frete** (toggle Venda/Remessa). A compra amarrada só em remessa fica **descoberta** (Painel Comercial) e livre p/ casar com venda depois. **Herança de custos POR COMPONENTE:** frete da remessa → classe Frete, armazenagem → classe Armazenagem da futura compra × venda (NÃO é linha única). Cai em Operações p/ parametrizar. (ver stack + ui-polish)
- **Conciliação (Operacional › Conciliação):** previsto × performado; blocos Compra/Venda/Frete/Classificação/**Corretagem**/Performance; conciliação de impostos (PIS/COFINS frete/classif/**corretagem**, ICMS frete/contrato); **conciliação de VOLUME** (sobra→complemento a receber; quebra→desconto receita/custo; só após encerrar embarque); aba Pendências.
- **Corretagem (Operacional › Corretagem):** todo contrato aberto cai aqui; lança corretora + valor (editável) + data → vira LancamentoFinanceiro (COMISSAO) no fluxo de caixa + custo no dashboard. Aba Comissões do Financeiro foi removida.
- **Armazenagem:** pop-up detalhado (padronização, armazenagem/15d, quebra composta, carência em quinzenas, data de recebimento = janela de embarque da boleta). Custo por quinzena.
- **Financeiro › Fluxo de Caixa:** filtros Ano + Mês + período (De/Até) + **Exportar Excel** (fluxo por data + rateamento por fonte + consolidado).
- **Dashboard (Resultado):** filtros Ano + Produto funcionando; Composição/Descontos com corretagem, PIS/COFINS corretagem, conciliação de volume; herança de remessa nas classes certas.
- **Painel Comercial › Long/Short Basis:** dinâmico (filtros estado/cidade/recebimento) + quebra por contrato, redesenhado.
- **Resumo Gerencial:** alimentado pelos **contratos reais** do backend (não só Excel); Top Corretores puxa a corretora da boleta.
- **Tabela de Preços:** histórico persiste (bug corrigido); cards redesenhados. É DEMO/localStorage (não backend).
- **Boleta REMESSA aceita preço 0** (transferência não tem preço).

## 4. Arquitetura do frontend — PADRÃO (bridges)
`public/index.html` é o protótipo demo (usa `localStorage`). Cada tela real é ligada ao backend por **bridges**: blocos `<script>` no fim do arquivo que **sobrescrevem** as funções globais do demo (`window.dashRender`, `window.fcxRender`, `window.conciliacaoRender`, `pcRender`, `amCriar`, etc.) e usam **`window.apiFetch(path, opts)`** (Bearer + refresh no 401; `path` relativo, prefixa `/api/v1`). Ache-os pelos `console.log('%c[MODO·RIR] ...')` no fim do arquivo. Para editar: mexa direto no `public/index.html`.
- **Cálculos que vivem no FRONTEND:** frete realizado (líquido c/ quebra, dos CT-es via localStorage DESCARGAS), e o merge de fontes no fluxo de caixa. O dashboard recomputa `custoFrete`/`resultado` no front trocando o frete bruto pelo realizado.

## 5. GOTCHAS (erros que já custaram tempo)
- **`limit` máximo = 100** no `PaginationQueryDto` (200/300 → 400 → listas vazias).
- **Ctrl+F5:** o navegador segura o HTML em cache; testes via browser tool exigem `navigate` (reload) p/ pegar o JS novo.
- **Produto: `PARAM_DB.produtos` (demo p01..p17) NÃO casa com `contrato.produtoId` (UUID real).** Para nome de produto real, buscar `GET /parametrizacoes/produtos`. Já corrigido em ngRender/Resumo/filtro do dashboard; o `dashCarregarBackend` geral ainda tem esse bug (nome de produto não resolve p/ contratos reais).
- **Reverter dados de teste SEMPRE por id específico** (`WHERE id=`/`WHERE numeroErpMaxicon LIKE 'TST-%'`). Já quase apagou dados reais do usuário com UPDATE amplo. Ex.: existe corretagem real (A. MOREIRA R$3.375) e complementos reais que NÃO podem ser tocados.
- **Persistência localStorage:** o `lsSalvar` geral sobrescreve o `LS_KEY` — ao adicionar estado novo (ex.: TABELA_HISTORICO), incluir no payload de `lsSalvar` E no `lsCarregar`, senão some no reload.
- **Filtros que "não funcionam":** o padrão é o bridge ignorar os selects. O fix é ler os selects, popular as opções dos dados presentes, filtrar e **recomputar os totais do recorte** (feito em fcx/dashboard/ng/basis).
- **Build:** NÃO use `docker compose up --build -d | tail` (mascara exit). `@IsUUID()` exige UUID RFC4122 válido (variante correta).
- **Seed:** base inicia limpa (`BASE_LIMPA=true`; seeds de exemplo desativados). Cadastros base (pessoas, corretoras, produtos, empresas, safras, fazendas, modalidades, usuários) são semeados/preservados.

## 6. Como o usuário trabalha
- Manda **prints** e pede ajustes de tela/regra de negócio, rápido e iterativo. Português.
- **Valide ponta a ponta** (API + browser tool) e **reverta dados de teste**. Diga o que validou.
- Confirme ambiguidade de regra antes de assumir (docx é a fonte). Ao criar feature, atualize a MEMÓRIA.
- Objetivo: sistema rodando 100% na máquina para uso/stress test; refinamentos contínuos de tela e regra.
