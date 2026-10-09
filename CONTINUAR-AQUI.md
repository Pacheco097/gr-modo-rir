# MODO·RIR — Continuação (handoff de sessão) · atualizado 2026-08-19

> **Para retomar num chat novo:** abra o Claude Code em `C:\GR MODO` (a memória do projeto
> carrega sozinha) e peça para ler este arquivo + `ONBOARDING.md`. Trabalhamos SEMPRE em
> `C:\GR MODO`; publicamos em `M:\_PUBLICO\GR MODO` só quando eu disser "publica".
> Os detalhes técnicos de CADA feature estão na **memória** (`projeto-gr-modo-stack.md` e
> `projeto-boletas-modulo.md`) — este arquivo é o resumo/estado.

## Regras/princípios combinados
- **Dado nunca no código** (frete previsto, preços, rotas…) — só no backend/DB. No código, só lógica.
- **Dev + Docker em `C:\GR MODO`** (bind-mount `C:\GR MODO\public`). Frontend = só recarregar (Ctrl+F5); backend/schema = `docker compose up --build -d` (sem `| tail`).
- Publicar: `robocopy "C:\GR MODO" "M:\_PUBLICO\GR MODO" /E /XD ".git" "node_modules" "backups" "uploads" "dist" ".claude" /XF "*.log" /R:1 /W:1`
- Arquitetura: backend NestJS+Prisma (prefixo `/api/v1`); frontend = `public/index.html` (~17k linhas) ligado por **bridges** no fim do arquivo que sobrescrevem funções globais e usam `window.apiFetch(path)`.
- Login: `admin@modorir.com.br / admin123`. DB: `docker exec modorir-postgres psql -U modorir -d modorir`.
- **GOTCHA recorrente:** o **Docker Desktop cai** sozinho com frequência. Se `localhost:3000` der "conexão recusada": reabrir o Docker Desktop (`Start-Process "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"`), esperar ficar pronto; os containers sobem sozinhos.

## O que foi feito na sessão 2026-08-18/19 — tudo testado (detalhes na memória)
> Cada item abaixo tem o detalhe técnico (arquivos/linhas) na memória `projeto-gr-modo-stack.md`.

**Operacional › Classificação** (novo item de menu; SUBSTITUIU a antiga aba Financeiro › Classificação): classificação POR AMARRAÇÃO, paga em **PARCELAS** (lança previsto total → lança pagamentos semanais/mensais → realizado ACUMULA → saving). Gatilhos: amarração criada→pendente; classificadora no embarque→"programar p/ pagamento". No **Fluxo de Caixa a saída aparece com o NOME DA CLASSIFICADORA**.

**Painel Comercial** — painel **Long/Short Basis** (posição descasada compra/venda a descoberto, por cidade/estado, volume + preço médio ponderado).

**DACTE (PDF)** em Pagamento de Frete — agora **CRIA os CT-es a partir do PDF** (endpoint `POST /logistica/pagamento-frete/importar-dacte`, fill-only-empty). Validado com o PDF real (176 CT-es).

**Liberação de Embarque** — botão "Encerrar"→**"Editar embarque"**; **caminhões POR transportadora** (Embarque.transportadorasLote Json); encerramento movido p/ aba **Encerramento** (agora ligada ao backend real); aba **"Posições de Embarque" REMOVIDA**.

**Juros por PERÍODO/SALDO FINANCIADO** (Fases 1 e 2): Fase 2 = novo model `ContratoParcela` (cronograma de pagamento/recebimento por contrato, **reprogramável e parcial**), juros = saldo financiado dia a dia; alimenta o Fluxo de Caixa (entradas/saídas por contrato). Coluna Juros no dashboard mostra o **IMPACTO** (+ receita verde / − despesa vermelho). Regra: recebe da venda ANTES de pagar a compra = RECEITA.

**Frete no resultado** — coluna **"Frete realizado"** no dashboard (soma dos CT-es da amarração, líquido c/ quebra) + **consolidado por par** na aba CT-es. Fix: `_pgTon` normaliza o peso em qualquer formato/zeros (frete R$/t correto).

**Fluxo de Caixa** — cada linha por data é **clicável** e abre o detalhe por fonte; o **frete cai com o nome da transportadora** (não "FRETE (CT-e)").

**Operacional › Conciliação** (novo item de menu): tabela previsto × performado por amarração (performado do **relatório de descarga ao vivo** + peso do **encerramento**), **alerta "hora de conciliar"** ao encerrar o embarque. Botão **"Conciliação"** → pop-up (blocos minimalistas) com: datas pagamento/recebimento, valores a pagar/receber, frete, classificação, e os blocos de conciliação editáveis (valor COM SINAL): **PIS/COFINS frete, ICMS frete, PIS/COFINS classificação, PIS/COFINS contrato, ICMS contrato** (ICMS contrato SOBRESCREVE o ICMS auto). Cada um vira **coluna no dashboard** e entra no resultado.

**Dashboard (Resultado Consolidado)** — Composição e Descontos atualizados com todas as novas linhas (a composição FECHA no resultado líquido). Botão **"Limpar descargas"** criado na aba Relatórios de Descarga.

**Base de dados** — limpa (só cadastros) em 2026-08-19. Backups em `scratchpad/backup-pre-limpeza*.sql`.

## O que foi feito nesta sessão (2026-08-11 e adjacentes) — tudo testado
Detalhes técnicos/arquivos → memória `projeto-gr-modo-stack.md`. Resumo por área:

**Boletas**
- **E-mail ao APROVAR** a boleta (mailto, abre Outlook preenchido). Gatilho movido de "salvar" → "aprovar".
- **BUG corrigido:** "Enviar para Aprovação" em rascunho reaberto criava CÓPIA e travava a original; agora atualiza e envia a própria boleta.

**Contratos**
- **Nº do ERP é o identificador** do contrato em todo o fluxo (o `numeroSistema`/CS-XXXX foi desativado). ERP obrigatório e único ao abrir.
- **Enviar para assinatura EMITE automático** (Rascunho→Emitido).
- Campo "Qtd entregue/realizada" **removido** do modal.
- Painel "**Boletas aprovadas aguardando contrato**" na tela de Contratos.
- Upload de documentos do contrato aceita **qualquer arquivo**.

**ICMS / Resultado por contrato**
- Preço do contrato voltou a ser **COM ICMS** (líquido derivado no dashboard).
- **Resultado por contrato destrinchado**: Receita venda, Custo compra, ICMS, e **4 componentes editáveis** (Armazenagem, Classificação, Juros, PIS/COFINS) — salvos por amarração, pré-preenchidos automático (juros = %custoFin×custo; classificação = ClassificacaoContrato; **armazenagem = subsetor Armazenagem**; pis/cofins = 0).

**Fluxo Amarração → Parametrização → Embarque**
- Amarração criada → cai em **Operações/Parametrização** (persistida); embarque só libera após parametrizar + frete aprovado.
- **Parametrização**: doc CSC agora é **armazenado e baixável** na aba Embarques (`temInstrucaoDoc`, `GET /parametrizacoes/:amId/documento`).
- **Pop-up de lote** ao liberar embarque: transportadoras + classificadora. Transportadoras têm **checkbox "em vigência"** (só as vigentes caem para Embarques) + campo **"Caminhões posicionados"**.
- Aba **Embarques = planilha de faturamento**: contrato compra/venda + preços, **frete faturamento** (só R$/t), transportadoras (vigência), caminhões, classificadora, CSC (download).

**Frete (REORGANIZADO — importante)**
- O antigo painel de frete previsto (na aba Pagamento de Frete) foi **REMOVIDO**.
- Agora, em **Aprovação de Frete › Frete**, cada amarração tem botão **"Liberar frete"** → pop-up com **2 fretes**: **Frete previsto** (R$/t, segue para o CT-e, por par CTR compra×venda) + **Frete para faturamento** (R$/t, cria+aprova o Frete, vai para o Embarque). O de faturamento fica readonly se já lançado.

**Pagamento de Frete (CT-e)**
- CT-e no Excel: **2 primeiras colunas = CTR COMPRA e CTR VENDA** (por posição). Colunas na tabela.
- **Frete previsto** casa por par (ctrCompra, ctrVenda) → coluna FRETE PREVISTO do CT-e.
- **Valor líquido a pagar** = bruto ajustado pela descarga: **QUEBRA desconta** (frete sempre + produto se passar da tolerância 0,4% do peso; preço saca vem do relatório de descarga); **SOBRA só sinaliza** (líquido = bruto, SEM acréscimo).
- **Data de pagamento** = campo texto com **máscara BR dd/mm/aaaa** (guarda ISO).
- **Frete alimenta o Fluxo de Caixa** (Financeiro): CT-es aprovados entram como saída por data, no valor líquido.

## Estado atual do banco (2026-08-19)
- **Base LIMPA "menos cadastros"** (última limpeza 2026-08-19). Preservados: pessoas(21), empresas(11), produtos(17), modalidades(31), corretoras(14), safras(4), fazendas(3), usuários(5), parâmetros financeiros.
- O usuário RECRIA dados de teste entre as sessões (havia ~2 amarrações reais 5213/5652→5212). Backups: `...\scratchpad\backup-pre-limpeza3.sql` (e anteriores).
- **LIÇÃO IMPORTANTE:** ao reverter dados de teste, use SEMPRE `WHERE id=` específico. Um `UPDATE` amplo quase apagou valores REAIS que o usuário tinha lançado (fretePisCofins/freteIcms) — foram restaurados. Nunca `UPDATE`/`DELETE` sem WHERE em tabelas com dados do usuário.

## PENDÊNCIAS (prioridade)
1. **Quebra/sobra do frete depende do RELATÓRIO DE DESCARGA** que o usuário ainda vai mandar. O CT-e Excel ("xml maxicon") e o DACTE (PDF) só têm o **peso de ORIGEM** ("Quantidade Carga CTE"), NÃO o **peso DESCARREGADO**. A quebra = origem − descarregado; o descarregado só vem do relatório de descarga (planilha "troca de notas" com `Ps. Descarregado` + `numeroCte`), importado na aba **Pagamento de Frete › Relatórios de Descarga**, casado ao CT-e pelo número (`_pgDescargaDoCte`). ATENÇÃO: DACTE gera nº "001.381.xxx" e o Excel gera "1377565" — se importar de meses/fontes diferentes os números não casam.
2. **Publicar em `M:\_PUBLICO\GR MODO`** (só quando o usuário disser "publica" E o drive M: estiver conectado — já caiu offline antes).
3. `DESCARGAS` (Relatórios de Descarga) ainda é **frontend/localStorage** — não persistido no backend (por isso o líquido/quebra só vale na máquina onde a descarga foi importada). Persistir seria o próximo passo.
4. Editar o **frete de faturamento** depois de lançado (hoje readonly — falta endpoint de update).

## Dicas de teste pela tela (browser)
- Frontend é bind-mount: **precisa de Ctrl+F5 (reload)** para pegar edições do `index.html` — `go()`/render rodam a JS já carregada.
- Token do app: chave localStorage `modorir_token`. Em teste, logar via `window.setToken(j.accessToken)`/`window.setRefresh(j.refreshToken)` após `POST /api/v1/auth/login` e recarregar (o `apiFetch` renova no 401).

## Como validar rápido
`docker compose up -d` → http://localhost:3000/ → login `admin@modorir.com.br / admin123`. Backend/schema mudou: `docker compose up --build -d` (sem `| tail`).
