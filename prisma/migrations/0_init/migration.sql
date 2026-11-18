-- CreateEnum
CREATE TYPE "PerfilAcesso" AS ENUM ('ADMINISTRADOR', 'COMERCIAL', 'OPERACOES', 'LOGISTICA', 'FINANCEIRO', 'DIRETORIA');

-- CreateEnum
CREATE TYPE "ContratoTipo" AS ENUM ('COMPRA', 'VENDA', 'REMESSA');

-- CreateEnum
CREATE TYPE "ContratoStatus" AS ENUM ('RASCUNHO', 'EMITIDO', 'EM_ANDAMENTO', 'EXECUTADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "AssinaturaStatus" AS ENUM ('NAO_ENVIADO', 'ENVIADO', 'ASSINADO', 'RECUSADO');

-- CreateEnum
CREATE TYPE "FreteStatus" AS ENUM ('PENDENTE', 'APROVADO', 'REPROVADO');

-- CreateEnum
CREATE TYPE "CteStatus" AS ENUM ('A_PAGAR', 'PAGO');

-- CreateEnum
CREATE TYPE "LancamentoTipo" AS ENUM ('RECEBER', 'PAGAR');

-- CreateEnum
CREATE TYPE "LancamentoCategoria" AS ENUM ('CONTRATO', 'FRETE', 'COMISSAO', 'ARMAZENAGEM', 'ANTECIPACAO', 'ROYALTS', 'OUTROS');

-- CreateEnum
CREATE TYPE "LancamentoStatus" AS ENUM ('ABERTO', 'LIQUIDADO');

-- CreateEnum
CREATE TYPE "ArmazenagemStatus" AS ENUM ('EM_VIGENCIA', 'ENCERRADA');

-- CreateEnum
CREATE TYPE "EmbarqueStatus" AS ENUM ('LIBERADO', 'EM_TRANSITO', 'ENTREGUE', 'ENCERRADO');

-- CreateEnum
CREATE TYPE "ParametrizacaoStatus" AS ENUM ('PENDENTE', 'PARAMETRIZADO');

-- CreateEnum
CREATE TYPE "ContratoEventoTipo" AS ENUM ('CRIACAO', 'STATUS', 'ASSINATURA', 'PRECO', 'EXCEDENTE_MESMO_PRECO', 'EXCEDENTE_NOVA_BOLETA', 'EXCEDENTE_ADITIVO', 'EXCEDENTE_ABONO', 'VINCULO_BOLETA', 'IMPORTACAO_ERP', 'ENTREGA');

-- CreateEnum
CREATE TYPE "ClassificacaoCredito" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "PessoaTipo" AS ENUM ('CLIENTE', 'PRODUTOR_RURAL', 'TRANSPORTADORA', 'ARMAZEM', 'CLASSIFICADORA', 'BANCO');

-- CreateEnum
CREATE TYPE "ModalidadeTipoOperacao" AS ENUM ('COMPRA', 'VENDA', 'REMESSA', 'ENTRADA', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "TipoOperacaoBoleta" AS ENUM ('COMPRA', 'VENDA', 'REMESSA');

-- CreateEnum
CREATE TYPE "MoedaBoleta" AS ENUM ('BRL', 'USD');

-- CreateEnum
CREATE TYPE "FreteTipoBoleta" AS ENUM ('CIF', 'FOB', 'FCA');

-- CreateEnum
CREATE TYPE "StatusBoleta" AS ENUM ('RASCUNHO', 'PENDENTE', 'APROVADA', 'REPROVADA', 'CANCELADA', 'CONTRATO_VINCULADO');

-- CreateEnum
CREATE TYPE "ClassificacaoStatus" AS ENUM ('PENDENTE', 'AGUARDANDO_PAGAMENTO', 'PROGRAMADA', 'PREENCHIDA');

-- CreateTable
CREATE TABLE "empresas_grupo" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "cnpj" TEXT,
    "municipio" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "empresas_grupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safras" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "descricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "safras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "fatorKgPorSaca" INTEGER NOT NULL,
    "unidade" TEXT NOT NULL,
    "ncm" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "produtoFixoEquivalenteId" TEXT,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modalidades" (
    "id" TEXT NOT NULL,
    "empresaLabel" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipoOperacao" "ModalidadeTipoOperacao" NOT NULL,
    "descricao" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "modalidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corretoras" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "contato" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "corretagemPctPadrao" DECIMAL(6,2) NOT NULL DEFAULT 0.30,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "corretoras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fazendas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "empresaGrupoId" TEXT,
    "municipio" TEXT,
    "uf" TEXT,
    "areaHectares" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "fazendas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametros_financeiros" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "taxaJurosDescasamentoAmPct" DECIMAL(8,4) NOT NULL DEFAULT 1.50,
    "classificacaoPadraoRsSc" DECIMAL(10,4) NOT NULL DEFAULT 1.90,
    "custoQuebraPct" DECIMAL(8,4) NOT NULL DEFAULT 0.25,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "parametros_financeiros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pessoas" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "PessoaTipo" NOT NULL,
    "documento" TEXT NOT NULL,
    "inscricaoEstadual" TEXT,
    "municipio" TEXT,
    "uf" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "banco" TEXT,
    "agenciaConta" TEXT,
    "pix" TEXT,
    "classificacaoCredito" "ClassificacaoCredito",
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "pessoas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT,
    "perfil" "PerfilAcesso" NOT NULL,
    "senhaHash" TEXT,
    "refreshTokenHash" TEXT,
    "ultimoAcesso" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boletas" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "tipo" "TipoOperacaoBoleta" NOT NULL,
    "status" "StatusBoleta" NOT NULL DEFAULT 'RASCUNHO',
    "empresaGrupoId" TEXT NOT NULL,
    "safraId" TEXT NOT NULL,
    "dataNegociacao" TIMESTAMP(3) NOT NULL,
    "contraparteId" TEXT,
    "contraparteNome" TEXT NOT NULL,
    "contraparteDocumento" TEXT NOT NULL,
    "contraparteIe" TEXT,
    "contraparteMunicipio" TEXT,
    "contraparteUf" TEXT,
    "produtoId" TEXT NOT NULL,
    "modalidadeId" TEXT NOT NULL,
    "fatorKgPorSaca" INTEGER NOT NULL,
    "quantidadeSc" DECIMAL(18,6) NOT NULL,
    "pesoKg" DECIMAL(16,3) NOT NULL,
    "preco" DECIMAL(14,4),
    "moeda" "MoedaBoleta" NOT NULL DEFAULT 'BRL',
    "condicaoPagamento" TEXT NOT NULL,
    "dataPagamento" TIMESTAMP(3),
    "icmsPct" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "quebraTecnicaTradingPct" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "custoFinanceiroPct" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "temArmazenagem" BOOLEAN NOT NULL DEFAULT false,
    "armPadronizacaoRate" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "armArmazenagemRate" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "armQuebraTecnicaPct" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "freteTipo" "FreteTipoBoleta" NOT NULL,
    "freteRsPorTon" DECIMAL(12,4) NOT NULL,
    "dataInicioEntrega" TIMESTAMP(3),
    "dataFimEntrega" TIMESTAMP(3),
    "localEntrega" TEXT,
    "corretoraId" TEXT,
    "corretagemPct" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "comissaoInternaPct" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "custoArmazenagemSimplificadaRsSc" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "classificacaoPadraoRsSc" DECIMAL(10,4) NOT NULL DEFAULT 1.90,
    "temClassificacao" BOOLEAN NOT NULL DEFAULT false,
    "localArmazem" TEXT,
    "comercialResponsavelId" TEXT NOT NULL,
    "observacoes" TEXT,
    "valorBruto" DECIMAL(16,4) NOT NULL DEFAULT 0,
    "valorFreteTotal" DECIMAL(16,4) NOT NULL DEFAULT 0,
    "valorCorretagem" DECIMAL(16,4) NOT NULL DEFAULT 0,
    "valorComissaoInterna" DECIMAL(16,4) NOT NULL DEFAULT 0,
    "valorArmazenagemSimplificada" DECIMAL(16,4) NOT NULL DEFAULT 0,
    "valorClassificacao" DECIMAL(16,4) NOT NULL DEFAULT 0,
    "valorCustosTotal" DECIMAL(16,4) NOT NULL DEFAULT 0,
    "valorLiquido" DECIMAL(16,4) NOT NULL DEFAULT 0,
    "margemPct" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "resultadoPorSaca" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "resultadoPorKg" DECIMAL(14,6) NOT NULL DEFAULT 0,
    "creditoIcms" DECIMAL(16,4) NOT NULL DEFAULT 0,
    "creditoPisCofins" DECIMAL(16,4) NOT NULL DEFAULT 0,
    "valorLiquidoComFiscal" DECIMAL(16,4),
    "resultadoPorSacaComFiscal" DECIMAL(14,4),
    "aprovadoPor" TEXT,
    "aprovadoEm" TIMESTAMP(3),
    "motivoReprovacao" TEXT,
    "reprovadoPor" TEXT,
    "reprovadoEm" TIMESTAMP(3),
    "motivoCancelamento" TEXT,
    "canceladoPor" TEXT,
    "canceladoEm" TIMESTAMP(3),
    "numeroContratoVinculado" TEXT,
    "dataVinculacaoContrato" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "boletas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boleta_classificadoras" (
    "id" TEXT NOT NULL,
    "boletaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "valorRsPorSc" DECIMAL(10,4) NOT NULL,

    CONSTRAINT "boleta_classificadoras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boleta_documentos" (
    "id" TEXT NOT NULL,
    "boletaId" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "caminhoArquivo" TEXT NOT NULL,
    "tamanhoBytes" INTEGER NOT NULL,
    "enviadoPor" TEXT,
    "enviadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boleta_documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boleta_historico" (
    "id" TEXT NOT NULL,
    "boletaId" TEXT NOT NULL,
    "statusAnterior" "StatusBoleta",
    "statusNovo" "StatusBoleta" NOT NULL,
    "usuario" TEXT NOT NULL,
    "motivo" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boleta_historico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boleta_sequencia" (
    "ano" INTEGER NOT NULL,
    "ultimoNumero" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "boleta_sequencia_pkey" PRIMARY KEY ("ano")
);

-- CreateTable
CREATE TABLE "contratos" (
    "id" TEXT NOT NULL,
    "numeroSistema" TEXT,
    "numeroErpMaxicon" TEXT,
    "tipo" "ContratoTipo" NOT NULL,
    "status" "ContratoStatus" NOT NULL DEFAULT 'RASCUNHO',
    "boletaId" TEXT,
    "contraparteId" TEXT,
    "contraparteNome" TEXT NOT NULL,
    "produtoId" TEXT,
    "quantidadeContratadaSc" DECIMAL(18,6) NOT NULL,
    "quantidadeEntregueSc" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "preco" DECIMAL(14,4),
    "dataVencimento" TIMESTAMP(3),
    "assinatura" "AssinaturaStatus" NOT NULL DEFAULT 'NAO_ENVIADO',
    "dataEnvioAssinatura" TIMESTAMP(3),
    "dataAssinatura" TIMESTAMP(3),
    "quebraTecnicaPct" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "custoFinanceiroPct" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "icmsPct" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "temArmazenagem" BOOLEAN NOT NULL DEFAULT false,
    "armPadronizacaoRate" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "armArmazenagemRate" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "armQuebraTecnicaPct" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "temClassificacao" BOOLEAN NOT NULL DEFAULT false,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "contratos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classificacoes_amarracao" (
    "id" TEXT NOT NULL,
    "amarracaoId" TEXT NOT NULL,
    "empresaClassificadora" TEXT,
    "classificadoras" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "previsto" DECIMAL(16,4),
    "realizado" DECIMAL(16,4),
    "dataPagamento" TEXT,
    "status" "ClassificacaoStatus" NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "classificacoes_amarracao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classificacoes_pagamentos" (
    "id" TEXT NOT NULL,
    "classificacaoId" TEXT NOT NULL,
    "valor" DECIMAL(16,4) NOT NULL,
    "dataPagamento" TEXT NOT NULL,
    "empresaClassificadora" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "classificacoes_pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classificacoes_contrato" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "embarqueId" TEXT,
    "empresaClassificadora" TEXT,
    "empresaClassificadoraId" TEXT,
    "valor" DECIMAL(16,4),
    "data" TEXT,
    "status" "ClassificacaoStatus" NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "classificacoes_contrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contrato_parcelas" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "valor" DECIMAL(16,4) NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "contrato_parcelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contrato_documentos" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "caminho" TEXT NOT NULL,
    "tamanhoKb" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadoPor" TEXT,

    CONSTRAINT "contrato_documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contrato_historico" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "evento" "ContratoEventoTipo" NOT NULL,
    "de" TEXT,
    "para" TEXT,
    "detalhe" TEXT,
    "usuario" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contrato_historico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contrato_sequencia" (
    "ano" INTEGER NOT NULL,
    "ultimoNumero" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "contrato_sequencia_pkey" PRIMARY KEY ("ano")
);

-- CreateTable
CREATE TABLE "amarracoes" (
    "id" TEXT NOT NULL,
    "compraContratoId" TEXT NOT NULL,
    "vendaContratoId" TEXT,
    "remessaContratoId" TEXT,
    "quantidadeSc" DECIMAL(18,6) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadoPor" TEXT,
    "deletedAt" TIMESTAMP(3),
    "custoArmazenagem" DECIMAL(14,2),
    "custoClassificacao" DECIMAL(14,2),
    "custoJuros" DECIMAL(14,2),
    "custoFrete" DECIMAL(14,2),
    "fretePisCofins" DECIMAL(14,2),
    "freteIcms" DECIMAL(14,2),
    "classifPisCofins" DECIMAL(14,2),
    "corretagemPisCofins" DECIMAL(14,2),
    "icmsManual" DECIMAL(14,2),
    "receitaPisCofins" DECIMAL(14,2),
    "volConcStatus" TEXT,
    "volConcSobraSc" DECIMAL(18,6),
    "volConcPrecoModo" TEXT,
    "volConcPrecoRsSc" DECIMAL(14,4),
    "volConcValor" DECIMAL(14,2),
    "volConcDescReceita" DECIMAL(14,2),
    "volConcDescCusto" DECIMAL(14,2),
    "volConcDataRecebimento" TEXT,

    CONSTRAINT "amarracoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametrizacoes" (
    "id" TEXT NOT NULL,
    "amarracaoId" TEXT NOT NULL,
    "tipoOperacao" TEXT,
    "instrucaoDoc" TEXT,
    "instrucaoDocConteudo" TEXT,
    "observacao" TEXT,
    "status" "ParametrizacaoStatus" NOT NULL DEFAULT 'PENDENTE',
    "dataParametrizacao" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "parametrizacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fretes" (
    "id" TEXT NOT NULL,
    "amarracaoId" TEXT NOT NULL,
    "referencia" TEXT NOT NULL,
    "quantidadeSc" DECIMAL(18,6) NOT NULL,
    "freteRsPorTon" DECIMAL(12,4) NOT NULL,
    "status" "FreteStatus" NOT NULL DEFAULT 'PENDENTE',
    "aprovadoPor" TEXT,
    "aprovadoEm" TIMESTAMP(3),
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "fretes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "embarques" (
    "id" TEXT NOT NULL,
    "amarracaoId" TEXT NOT NULL,
    "quantidadeSc" DECIMAL(18,6) NOT NULL,
    "status" "EmbarqueStatus" NOT NULL DEFAULT 'LIBERADO',
    "dataLiberacao" TIMESTAMP(3),
    "dataEncerramento" TIMESTAMP(3),
    "pesoDescarregadoKg" DECIMAL(16,3) NOT NULL DEFAULT 0,
    "observacao" TEXT,
    "transportadoras" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "transportadorasVigentes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "caminhoesPosicionados" INTEGER NOT NULL DEFAULT 0,
    "transportadorasLote" JSONB,
    "classificadora" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "embarques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ctes" (
    "id" TEXT NOT NULL,
    "numeroCte" TEXT NOT NULL,
    "embarqueId" TEXT,
    "transportadoraId" TEXT,
    "transportadoraNome" TEXT NOT NULL,
    "valorTotal" DECIMAL(16,4) NOT NULL,
    "icmsPct" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "dataEmissao" TIMESTAMP(3),
    "dataPagamento" TIMESTAMP(3),
    "status" "CteStatus" NOT NULL DEFAULT 'A_PAGAR',
    "observacao" TEXT,
    "chave" TEXT,
    "ctrCompra" TEXT,
    "ctrVenda" TEXT,
    "codEmpresa" INTEGER,
    "empresa" TEXT,
    "numDoc" TEXT,
    "serie" TEXT,
    "totalICMS" DECIMAL(16,4) NOT NULL DEFAULT 0,
    "tpFat" TEXT,
    "cnpj" TEXT,
    "emitente" TEXT,
    "dtEmissao" TEXT,
    "statusSefaz" TEXT,
    "stManifesto" TEXT,
    "stErp" TEXT,
    "dataRegistro" TEXT,
    "nf" TEXT,
    "serieNf" TEXT,
    "nsu" TEXT,
    "produtoCarga" TEXT,
    "cidadeOrigem" TEXT,
    "cidadeDestino" TEXT,
    "qtdCarga" DECIMAL(16,4),
    "unidCarga" TEXT,
    "tipoDest" TEXT,
    "fretePrevisto" DECIMAL(16,4),
    "numProcesso" TEXT,
    "dataPagamentoStr" TEXT,
    "aprovado" BOOLEAN NOT NULL DEFAULT false,
    "retirado" BOOLEAN NOT NULL DEFAULT false,
    "motivoRetirada" TEXT,
    "catRetirada" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dataRetirada" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ctes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fretes_previstos" (
    "id" TEXT NOT NULL,
    "ctrCompra" TEXT,
    "ctrVenda" TEXT,
    "rota" TEXT,
    "valor" DECIMAL(16,4) NOT NULL,
    "vigenciaInicio" TEXT,
    "vigenciaFim" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "fretes_previstos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dactes" (
    "id" TEXT NOT NULL,
    "cte" TEXT NOT NULL,
    "serie" TEXT,
    "transp" TEXT,
    "nf" TEXT,
    "org" TEXT,
    "dst" TEXT,
    "prod" TEXT,
    "peso" DECIMAL(16,4),
    "valor" DECIMAL(16,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "dactes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "armazenagens" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "status" "ArmazenagemStatus" NOT NULL DEFAULT 'EM_VIGENCIA',
    "quantidadeSc" DECIMAL(18,6) NOT NULL,
    "padronizacaoRate" DECIMAL(10,4) NOT NULL,
    "armazenagemRate" DECIMAL(10,4) NOT NULL,
    "quebraPct" DECIMAL(6,3) NOT NULL,
    "quinzenas" INTEGER NOT NULL DEFAULT 0,
    "carenciaQuinzenas" INTEGER NOT NULL DEFAULT 0,
    "precoScRs" DECIMAL(14,4),
    "custoRealizadoRs" DECIMAL(16,4),
    "dataInicio" TIMESTAMP(3),
    "dataEncerramento" TIMESTAMP(3),
    "valorPagamento" DECIMAL(16,4),
    "dataPagamento" TEXT,
    "pagamentoStatus" TEXT NOT NULL DEFAULT 'PENDENTE',
    "lancamentoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "armazenagens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corretagem_contratos" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "corretoraNome" TEXT,
    "valorTotal" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "dataPagamento" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "lancamentoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "corretagem_contratos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lancamentos_financeiros" (
    "id" TEXT NOT NULL,
    "tipo" "LancamentoTipo" NOT NULL,
    "categoria" "LancamentoCategoria" NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(16,4) NOT NULL,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "dataLiquidacao" TIMESTAMP(3),
    "status" "LancamentoStatus" NOT NULL DEFAULT 'ABERTO',
    "contratoId" TEXT,
    "comIcms" BOOLEAN NOT NULL DEFAULT false,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "lancamentos_financeiros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotacoes_frete" (
    "id" TEXT NOT NULL,
    "grupo" TEXT,
    "transportadora" TEXT,
    "origem" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "produto" TEXT,
    "veiculo" TEXT,
    "valor" DECIMAL(14,4) NOT NULL,
    "unidade" TEXT NOT NULL DEFAULT 'R$/t',
    "dataCotacao" TEXT NOT NULL,
    "observacao" TEXT,
    "textoOrigem" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "cotacoes_frete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_sistema" (
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "config_sistema_pkey" PRIMARY KEY ("chave")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresas_grupo_codigo_key" ON "empresas_grupo"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "safras_codigo_key" ON "safras"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "produtos_nome_key" ON "produtos"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "modalidades_nome_key" ON "modalidades"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "pessoas_codigo_key" ON "pessoas"("codigo");

-- CreateIndex
CREATE INDEX "pessoas_tipo_idx" ON "pessoas"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "boletas_numero_key" ON "boletas"("numero");

-- CreateIndex
CREATE INDEX "boletas_status_idx" ON "boletas"("status");

-- CreateIndex
CREATE INDEX "boletas_tipo_idx" ON "boletas"("tipo");

-- CreateIndex
CREATE INDEX "boletas_empresaGrupoId_idx" ON "boletas"("empresaGrupoId");

-- CreateIndex
CREATE INDEX "boletas_safraId_idx" ON "boletas"("safraId");

-- CreateIndex
CREATE INDEX "boletas_produtoId_idx" ON "boletas"("produtoId");

-- CreateIndex
CREATE UNIQUE INDEX "contratos_numeroSistema_key" ON "contratos"("numeroSistema");

-- CreateIndex
CREATE UNIQUE INDEX "contratos_numeroErpMaxicon_key" ON "contratos"("numeroErpMaxicon");

-- CreateIndex
CREATE INDEX "contratos_status_idx" ON "contratos"("status");

-- CreateIndex
CREATE INDEX "contratos_tipo_idx" ON "contratos"("tipo");

-- CreateIndex
CREATE INDEX "contratos_boletaId_idx" ON "contratos"("boletaId");

-- CreateIndex
CREATE INDEX "contratos_numeroErpMaxicon_idx" ON "contratos"("numeroErpMaxicon");

-- CreateIndex
CREATE UNIQUE INDEX "classificacoes_amarracao_amarracaoId_key" ON "classificacoes_amarracao"("amarracaoId");

-- CreateIndex
CREATE INDEX "classificacoes_amarracao_status_idx" ON "classificacoes_amarracao"("status");

-- CreateIndex
CREATE INDEX "classificacoes_pagamentos_classificacaoId_idx" ON "classificacoes_pagamentos"("classificacaoId");

-- CreateIndex
CREATE UNIQUE INDEX "classificacoes_contrato_contratoId_key" ON "classificacoes_contrato"("contratoId");

-- CreateIndex
CREATE INDEX "classificacoes_contrato_status_idx" ON "classificacoes_contrato"("status");

-- CreateIndex
CREATE INDEX "contrato_parcelas_contratoId_idx" ON "contrato_parcelas"("contratoId");

-- CreateIndex
CREATE INDEX "contrato_historico_contratoId_idx" ON "contrato_historico"("contratoId");

-- CreateIndex
CREATE INDEX "amarracoes_compraContratoId_idx" ON "amarracoes"("compraContratoId");

-- CreateIndex
CREATE INDEX "amarracoes_vendaContratoId_idx" ON "amarracoes"("vendaContratoId");

-- CreateIndex
CREATE INDEX "amarracoes_remessaContratoId_idx" ON "amarracoes"("remessaContratoId");

-- CreateIndex
CREATE UNIQUE INDEX "parametrizacoes_amarracaoId_key" ON "parametrizacoes"("amarracaoId");

-- CreateIndex
CREATE INDEX "parametrizacoes_status_idx" ON "parametrizacoes"("status");

-- CreateIndex
CREATE INDEX "fretes_amarracaoId_idx" ON "fretes"("amarracaoId");

-- CreateIndex
CREATE INDEX "fretes_status_idx" ON "fretes"("status");

-- CreateIndex
CREATE INDEX "embarques_amarracaoId_idx" ON "embarques"("amarracaoId");

-- CreateIndex
CREATE INDEX "embarques_status_idx" ON "embarques"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ctes_chave_key" ON "ctes"("chave");

-- CreateIndex
CREATE INDEX "ctes_status_idx" ON "ctes"("status");

-- CreateIndex
CREATE INDEX "ctes_retirado_idx" ON "ctes"("retirado");

-- CreateIndex
CREATE INDEX "fretes_previstos_rota_idx" ON "fretes_previstos"("rota");

-- CreateIndex
CREATE UNIQUE INDEX "dactes_cte_key" ON "dactes"("cte");

-- CreateIndex
CREATE INDEX "armazenagens_contratoId_idx" ON "armazenagens"("contratoId");

-- CreateIndex
CREATE INDEX "armazenagens_status_idx" ON "armazenagens"("status");

-- CreateIndex
CREATE UNIQUE INDEX "corretagem_contratos_contratoId_key" ON "corretagem_contratos"("contratoId");

-- CreateIndex
CREATE INDEX "corretagem_contratos_status_idx" ON "corretagem_contratos"("status");

-- CreateIndex
CREATE INDEX "lancamentos_financeiros_tipo_idx" ON "lancamentos_financeiros"("tipo");

-- CreateIndex
CREATE INDEX "lancamentos_financeiros_categoria_idx" ON "lancamentos_financeiros"("categoria");

-- CreateIndex
CREATE INDEX "lancamentos_financeiros_status_idx" ON "lancamentos_financeiros"("status");

-- CreateIndex
CREATE INDEX "lancamentos_financeiros_dataVencimento_idx" ON "lancamentos_financeiros"("dataVencimento");

-- CreateIndex
CREATE INDEX "cotacoes_frete_transportadora_idx" ON "cotacoes_frete"("transportadora");

-- CreateIndex
CREATE INDEX "cotacoes_frete_origem_destino_idx" ON "cotacoes_frete"("origem", "destino");

-- CreateIndex
CREATE INDEX "cotacoes_frete_dataCotacao_idx" ON "cotacoes_frete"("dataCotacao");

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_produtoFixoEquivalenteId_fkey" FOREIGN KEY ("produtoFixoEquivalenteId") REFERENCES "produtos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fazendas" ADD CONSTRAINT "fazendas_empresaGrupoId_fkey" FOREIGN KEY ("empresaGrupoId") REFERENCES "empresas_grupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletas" ADD CONSTRAINT "boletas_empresaGrupoId_fkey" FOREIGN KEY ("empresaGrupoId") REFERENCES "empresas_grupo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletas" ADD CONSTRAINT "boletas_safraId_fkey" FOREIGN KEY ("safraId") REFERENCES "safras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletas" ADD CONSTRAINT "boletas_contraparteId_fkey" FOREIGN KEY ("contraparteId") REFERENCES "pessoas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletas" ADD CONSTRAINT "boletas_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletas" ADD CONSTRAINT "boletas_modalidadeId_fkey" FOREIGN KEY ("modalidadeId") REFERENCES "modalidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletas" ADD CONSTRAINT "boletas_corretoraId_fkey" FOREIGN KEY ("corretoraId") REFERENCES "corretoras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletas" ADD CONSTRAINT "boletas_comercialResponsavelId_fkey" FOREIGN KEY ("comercialResponsavelId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boleta_classificadoras" ADD CONSTRAINT "boleta_classificadoras_boletaId_fkey" FOREIGN KEY ("boletaId") REFERENCES "boletas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boleta_documentos" ADD CONSTRAINT "boleta_documentos_boletaId_fkey" FOREIGN KEY ("boletaId") REFERENCES "boletas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boleta_historico" ADD CONSTRAINT "boleta_historico_boletaId_fkey" FOREIGN KEY ("boletaId") REFERENCES "boletas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_boletaId_fkey" FOREIGN KEY ("boletaId") REFERENCES "boletas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_contraparteId_fkey" FOREIGN KEY ("contraparteId") REFERENCES "pessoas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classificacoes_amarracao" ADD CONSTRAINT "classificacoes_amarracao_amarracaoId_fkey" FOREIGN KEY ("amarracaoId") REFERENCES "amarracoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classificacoes_pagamentos" ADD CONSTRAINT "classificacoes_pagamentos_classificacaoId_fkey" FOREIGN KEY ("classificacaoId") REFERENCES "classificacoes_amarracao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classificacoes_contrato" ADD CONSTRAINT "classificacoes_contrato_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato_parcelas" ADD CONSTRAINT "contrato_parcelas_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato_documentos" ADD CONSTRAINT "contrato_documentos_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato_historico" ADD CONSTRAINT "contrato_historico_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amarracoes" ADD CONSTRAINT "amarracoes_compraContratoId_fkey" FOREIGN KEY ("compraContratoId") REFERENCES "contratos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amarracoes" ADD CONSTRAINT "amarracoes_vendaContratoId_fkey" FOREIGN KEY ("vendaContratoId") REFERENCES "contratos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amarracoes" ADD CONSTRAINT "amarracoes_remessaContratoId_fkey" FOREIGN KEY ("remessaContratoId") REFERENCES "contratos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parametrizacoes" ADD CONSTRAINT "parametrizacoes_amarracaoId_fkey" FOREIGN KEY ("amarracaoId") REFERENCES "amarracoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fretes" ADD CONSTRAINT "fretes_amarracaoId_fkey" FOREIGN KEY ("amarracaoId") REFERENCES "amarracoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "embarques" ADD CONSTRAINT "embarques_amarracaoId_fkey" FOREIGN KEY ("amarracaoId") REFERENCES "amarracoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ctes" ADD CONSTRAINT "ctes_embarqueId_fkey" FOREIGN KEY ("embarqueId") REFERENCES "embarques"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ctes" ADD CONSTRAINT "ctes_transportadoraId_fkey" FOREIGN KEY ("transportadoraId") REFERENCES "pessoas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "armazenagens" ADD CONSTRAINT "armazenagens_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corretagem_contratos" ADD CONSTRAINT "corretagem_contratos_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

