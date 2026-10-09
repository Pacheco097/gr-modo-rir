# Como rodar o MODO·RIR no meu computador 🖥️

> Guia feito para quem **não é da área de tecnologia**. Você vai instalar **um
> único programa** e rodar **um único comando**. Leva uns 20–30 minutos na
> primeira vez (a maior parte é só esperar downloads). Nas próximas, são
> segundos.

Ao final, você vai conseguir **criar um cadastro / uma boleta e ver que ela
fica salva de verdade** — inclusive depois de desligar e ligar o sistema de novo.

---

## Passo 1 — Instalar o "Docker Desktop"

O Docker é um programa que "monta o restaurante inteiro" pra você (o banco de
dados + o sistema), sem você precisar instalar cada peça na mão.

1. Acesse: **https://www.docker.com/products/docker-desktop/**
2. Clique em **"Download for Windows"**.
3. Abra o arquivo baixado (`Docker Desktop Installer.exe`) e vá clicando em
   **OK / Next / Finish**. Se ele perguntar sobre "WSL 2", **aceite** (é normal).
4. Ao terminar, **reinicie o computador** se ele pedir.
5. Abra o **Docker Desktop** (ícone da baleia 🐳). Espere até aparecer, no canto,
   que o Docker está **"Running"** (rodando). Pode deixar essa janela aberta.

> 💡 Você só faz este passo **uma vez na vida**. Depois o Docker já fica instalado.

---

## Passo 2 — Abrir o "terminal" na pasta do projeto

O terminal é aquela telinha onde a gente digita comandos. Calma, é só copiar e colar.

1. Abra o **Explorador de Arquivos** e navegue até a pasta **`C:\GR MODO`**.
2. Clique na **barra de endereço** lá em cima (onde aparece o caminho da pasta).
3. Apague o que estiver escrito, digite **`powershell`** e aperte **Enter**.
4. Vai abrir uma tela azul (ou preta) — esse é o terminal, já na pasta certa. ✅

---

## Passo 3 — Ligar o sistema (o comando mágico)

No terminal que abriu, **copie e cole** a linha abaixo e aperte **Enter**:

```powershell
docker compose up --build
```

Agora é só **esperar**. Na primeira vez ele baixa e monta tudo (pode levar
alguns minutos). Você vai ver **muito texto correndo** na tela — isso é normal,
não precisa entender nada dele.

Quando aparecer algo como:

```
==> [3/3] Ligando a API MODO-RIR...
    Acesse no navegador: http://localhost:3000/docs
```

**Pronto! O sistema está no ar** (dentro do seu PC). Deixe essa janela aberta —
ela é o "motor ligado". Se fechar, o sistema desliga.

---

## Passo 4 — Abrir o sistema e testar

1. Abra o seu navegador (Chrome, Edge...) e acesse:
   **http://localhost:3000/**
2. Vai aparecer a **tela de login** do MODO·RIR (usuário e senha já vêm
   preenchidos — é um login de demonstração). Clique em **"Entrar no Sistema"**.
3. Você está no sistema! Navegue pelo menu à esquerda.
4. **Teste que salva de verdade** — vá em **Cadastros** (no menu, seção Admin):
   - Clique em **"+ Novo Cadastro"**.
   - Preencha Nome, CPF/CNPJ e UF (o resto é opcional) e clique em
     **"Salvar Cadastro"**.
   - O cadastro aparece na lista com um código automático (ex.: `CLI-006`).
     **Esse foi salvo no banco de dados de verdade.** 🎉

> **Importante:** por enquanto, **só a tela de Cadastros** está ligada ao banco
> de dados real. As outras telas (Boletas, Contratos, Financeiro...) funcionam
> em modo demonstração (salvam só no navegador) até construirmos o backend
> delas. A tela técnica de testes continua disponível em
> **http://localhost:3000/docs** se você quiser.

---

## Passo 5 — A prova final: os dados NÃO somem

Esta é a resposta prática pra sua dúvida ("será que fica salvo?"):

1. Volte no terminal e aperte **`Ctrl + C`** para desligar o sistema.
2. Ligue de novo com:
   ```powershell
   docker compose up
   ```
   (sem o `--build` desta vez — fica mais rápido)
3. Abra de novo **http://localhost:3000/**, entre e vá em **Cadastros**.
4. **O cadastro que você criou continua lá.** ✅ Os dados ficaram guardados
   mesmo depois de desligar. É exatamente assim que vai funcionar quando
   publicarmos.

---

## Como desligar

No terminal, aperte **`Ctrl + C`**. Para limpar tudo (inclusive o motor):
```powershell
docker compose down
```
> Isso **não apaga seus dados** — eles ficam guardados. Para apagar *também* os
> dados e começar do zero, use `docker compose down -v`.

---

## Deu algum erro? 🆘

Sem problema — é super comum na primeira vez. Faça assim:

1. No terminal, **selecione o texto em vermelho** (ou as últimas linhas).
2. Copie (Ctrl+C depois de selecionar) e **cole aqui pra mim no chat**.
3. Eu te digo exatamente o que ajustar. É o nosso ciclo normal:
   **testar → achou problema → eu corrijo → testar de novo.**

---

## E as telas bonitas (o frontend)?

Por enquanto você está testando pela tela técnica (Swagger). O **próximo passo**,
assim que você confirmar que isso rodou, é **conectar as telas bonitas do
sistema** (aquele visual do `AgroERP_Demo`) neste motor — aí você cria uma boleta
clicando nos botões, do jeito final. Vamos fazer isso logo depois, com calma.
