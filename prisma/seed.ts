/**
 * Seed de demonstração — espelha os dados de exemplo do frontend de
 * referência (AgroERP_Demo_16_79.html › `PARAM_DB`), para que os selects da
 * Boleta funcionem de ponta a ponta assim que a API sobe.
 *
 * Executar com: npm run prisma:seed
 */
import {
  ModalidadeTipoOperacao,
  PerfilAcesso,
  PessoaTipo,
  PrismaClient,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedEmpresasGrupo() {
  const empresas = [
    { codigo: '200', nome: 'MODO ARMAZENS GERAIS LTDA', tipo: 'Armazém', municipio: 'Juína', uf: 'MT' },
    { codigo: '201', nome: 'MODO ARMAZENS GERAIS LTDA', tipo: 'Armazém', municipio: 'Brasnorte', uf: 'MT' },
    { codigo: '202', nome: 'MODO ARMAZENS GERAIS LTDA', tipo: 'Armazém', municipio: 'Nova Monte Verde', uf: 'MT' },
    { codigo: '451', nome: 'MODO AGROLOGISTICA LTDA', tipo: 'Trading', municipio: 'Rolândia', uf: 'PR' },
    { codigo: '453', nome: 'MODO AGROLOGISTICA LTDA', tipo: 'Trading', municipio: 'Nova Monte Verde', uf: 'MT' },
    { codigo: '454', nome: 'MODO AGROLOGISTICA LTDA', tipo: 'Trading', municipio: 'Assis', uf: 'SP' },
    { codigo: '455', nome: 'MODO AGROLOGISTICA LTDA', tipo: 'Trading', municipio: 'Cambé', uf: 'PR' },
    { codigo: '601', nome: 'ROSLER DALLAMARIA E OUTROS', tipo: 'Produtora', municipio: 'Tamarana', uf: 'PR' },
    { codigo: '603', nome: 'ROSLER DALLAMARIA E OUTROS', tipo: 'Produtora', municipio: 'Fazenda Dallas', uf: 'PR' },
    { codigo: '604', nome: 'ROSLER DALLAMARIA E OUTROS', tipo: 'Produtora', municipio: 'Juína', uf: 'MT' },
    { codigo: '605', nome: 'ROSLER DALLAMARIA E OUTROS', tipo: 'Produtora', municipio: 'Fazenda Loyola', uf: 'PR' },
  ];
  for (const e of empresas) {
    await prisma.empresaGrupo.upsert({ where: { codigo: e.codigo }, create: e, update: e });
  }
}

async function seedSafras() {
  const safras = [
    { codigo: '2025', inicio: new Date('2025-01-01'), fim: new Date('2025-12-31'), ativa: false, descricao: 'Ano 2025' },
    { codigo: '2026', inicio: new Date('2026-01-01'), fim: new Date('2026-12-31'), ativa: true, descricao: 'Ano corrente' },
    { codigo: '2027', inicio: new Date('2027-01-01'), fim: new Date('2027-12-31'), ativa: false, descricao: 'Próximo ano' },
    { codigo: '2028', inicio: new Date('2028-01-01'), fim: new Date('2028-12-31'), ativa: false, descricao: 'Futuro' },
  ];
  for (const s of safras) {
    await prisma.safra.upsert({ where: { codigo: s.codigo }, create: s, update: s });
  }
}

async function seedProdutos() {
  const produtos = [
    { nome: 'AGREGADO MISTO', fatorKgPorSaca: 60, unidade: 'Saca 60kg', ncm: '2517.10.00' },
    { nome: 'ARROZ EM CASCA', fatorKgPorSaca: 50, unidade: 'Saca 50kg', ncm: '1006.10.10' },
    { nome: 'AVEIA EM GRÃOS FIXO', fatorKgPorSaca: 40, unidade: 'Saca 40kg', ncm: '1004.10.00' },
    { nome: 'CALCARIO DOLOMITICO GR', fatorKgPorSaca: 1000, unidade: 'Tonelada', ncm: '2521.00.00' },
    { nome: 'CASCA DE SOJA', fatorKgPorSaca: 60, unidade: 'Saca 60kg', ncm: '2302.50.00' },
    { nome: 'ESTERCO BOVINO', fatorKgPorSaca: 60, unidade: 'Saca 60kg', ncm: '3101.00.00' },
    { nome: 'FARELO DE SOJA', fatorKgPorSaca: 60, unidade: 'Saca 60kg', ncm: '2304.00.10' },
    // "MERCADO FUTURO" = produto com formação de preço (5 componentes) → deriva mercado FUTURO.
    { nome: 'MILHO EM GRÃOS - MERCADO FUTURO', fatorKgPorSaca: 60, unidade: 'Saca 60kg', ncm: '1005.90.10' },
    { nome: 'SOJA EM GRÃOS - MERCADO FUTURO', fatorKgPorSaca: 60, unidade: 'Saca 60kg', ncm: '1201.10.00' },
    // "A FIXAR" = boleta NORMAL (SPOT), preço fictício; contrato cai na aba "Contratos a fixar".
    { nome: 'MILHO EM GRÃOS - A FIXAR', fatorKgPorSaca: 60, unidade: 'Saca 60kg', ncm: '1005.90.10' },
    { nome: 'MILHO EM GRÃOS - FIXO', fatorKgPorSaca: 60, unidade: 'Saca 60kg', ncm: '1005.90.10' },
    { nome: 'OLEO DE SOJA DEGOMADO', fatorKgPorSaca: 900, unidade: 'Tambor 900kg', ncm: '1507.10.00' },
    { nome: 'SOJA EM GRÃO - FIXO', fatorKgPorSaca: 60, unidade: 'Saca 60kg', ncm: '1201.10.00' },
    { nome: 'SOJA EM GRÃOS - A FIXAR', fatorKgPorSaca: 60, unidade: 'Saca 60kg', ncm: '1201.10.00' },
    { nome: 'SOJA AVARIADA', fatorKgPorSaca: 60, unidade: 'Saca 60kg', ncm: '1201.10.00' },
    { nome: 'SORGO EM GRÃOS', fatorKgPorSaca: 60, unidade: 'Saca 60kg', ncm: '1007.10.00' },
    { nome: 'TRIGO - FIXO', fatorKgPorSaca: 60, unidade: 'Saca 60kg', ncm: '1001.99.00' },
    { nome: 'TRIGUILHO - FIXO', fatorKgPorSaca: 60, unidade: 'Saca 60kg', ncm: '1101.00.10' },
    { nome: 'VARREDURA', fatorKgPorSaca: 60, unidade: 'Saca 60kg', ncm: '2302.50.00' },
  ];
  for (const p of produtos) {
    await prisma.produto.upsert({ where: { nome: p.nome }, create: p, update: p });
  }

  // Vínculo "Mercado Futuro" → "FIXO" — usado ao encerrar a formação de preço.
  const pares: Array<[string, string]> = [
    ['SOJA EM GRÃOS - MERCADO FUTURO', 'SOJA EM GRÃO - FIXO'],
    ['MILHO EM GRÃOS - MERCADO FUTURO', 'MILHO EM GRÃOS - FIXO'],
  ];
  for (const [mercadoFuturo, fixo] of pares) {
    const [produtoMF, produtoFixo] = await Promise.all([
      prisma.produto.findUniqueOrThrow({ where: { nome: mercadoFuturo } }),
      prisma.produto.findUniqueOrThrow({ where: { nome: fixo } }),
    ]);
    await prisma.produto.update({
      where: { id: produtoMF.id },
      data: { produtoFixoEquivalenteId: produtoFixo.id },
    });
  }
}

async function seedModalidades() {
  const modalidades: Array<{ empresaLabel: string; nome: string; tipoOperacao: ModalidadeTipoOperacao; descricao: string }> = [
    { empresaLabel: 'MODO', nome: 'ARMAZÉM - DEPOSITO - RECEBIMENTO DE PRODUTO DE TERCEIROS', tipoOperacao: ModalidadeTipoOperacao.REMESSA, descricao: 'Recebimento de produto de terceiros para depósito em armazém' },
    { empresaLabel: 'MODO', nome: 'MODO - COMPRA A FIXAR - MERCADO INTERNO', tipoOperacao: ModalidadeTipoOperacao.COMPRA, descricao: 'Compra com preço a fixar, mercado interno' },
    { empresaLabel: 'MODO', nome: 'MODO - REMESSA INDUSTRIALIZAÇÃO', tipoOperacao: ModalidadeTipoOperacao.REMESSA, descricao: 'Remessa de produto para processo de industrialização' },
    { empresaLabel: 'MODO', nome: 'MODO 2022 - VENDA A ORDEM MERC INTERNO', tipoOperacao: ModalidadeTipoOperacao.VENDA, descricao: 'Venda a ordem no mercado interno' },
    { empresaLabel: 'MODO', nome: 'MODO 2022 - COMPRA A ORDEM', tipoOperacao: ModalidadeTipoOperacao.COMPRA, descricao: 'Compra a ordem' },
    { empresaLabel: 'MODO', nome: 'MODO 2022 - COMPRA FIXA COM ENTREGA FUTURA', tipoOperacao: ModalidadeTipoOperacao.COMPRA, descricao: 'Compra com preço fixo e entrega programada para o futuro' },
    { empresaLabel: 'MODO', nome: 'MODO 2022 - ENTRADA BONIFICAÇÃO', tipoOperacao: ModalidadeTipoOperacao.ENTRADA, descricao: 'Entrada de produto por bonificação' },
    { empresaLabel: 'MODO', nome: 'MODO 2022 - REMESSA PARA DEPOSITO', tipoOperacao: ModalidadeTipoOperacao.REMESSA, descricao: 'Remessa de produto para depósito' },
    { empresaLabel: 'MODO', nome: 'MODO 2022 - TRANSFERENCIA ENTRE FILIAIS (EXPEDIÇÃO)', tipoOperacao: ModalidadeTipoOperacao.TRANSFERENCIA, descricao: 'Transferência de produto entre filiais — expedição' },
    { empresaLabel: 'MODO', nome: 'MODO 2022 - TRANSFERENCIA RECEBIDA P/ COMERCIALIZAÇÃO', tipoOperacao: ModalidadeTipoOperacao.TRANSFERENCIA, descricao: 'Transferência recebida com destino à comercialização' },
    { empresaLabel: 'MODO', nome: 'MODO 2022 - VENDA SAÍDA DE DEPOSITO EM ARMAZEM', tipoOperacao: ModalidadeTipoOperacao.VENDA, descricao: 'Venda com saída de depósito em armazém' },
    { empresaLabel: 'MODO', nome: 'MODO 2022 - VENDA CONTA ORDEM INDUSTR', tipoOperacao: ModalidadeTipoOperacao.VENDA, descricao: 'Venda por conta e ordem para industrialização' },
    { empresaLabel: 'MODO', nome: 'MODO 2022 - VENDA DE VARREDURA', tipoOperacao: ModalidadeTipoOperacao.VENDA, descricao: 'Venda de produto de varredura' },
    { empresaLabel: 'MODO', nome: 'MODO 2022 - VENDA FIXA DE CEREAIS COM FINS DE EXPORTAÇÃO', tipoOperacao: ModalidadeTipoOperacao.VENDA, descricao: 'Venda com preço fixo destinada à exportação' },
    { empresaLabel: 'MODO', nome: 'MODO 2022 - VENDA FIXA MERC.INTERNO', tipoOperacao: ModalidadeTipoOperacao.VENDA, descricao: 'Venda com preço fixo no mercado interno' },
    { empresaLabel: 'MODO', nome: 'MODO 2022 - VENDA FUTURA', tipoOperacao: ModalidadeTipoOperacao.VENDA, descricao: 'Venda com entrega futura' },
    { empresaLabel: 'MODO', nome: 'MODO 2022 - VENDA PARA FINS DE INDUSTRIALIZAÇÃO', tipoOperacao: ModalidadeTipoOperacao.VENDA, descricao: 'Venda com destino à industrialização' },
    { empresaLabel: 'MODO', nome: 'MODO 2022 - VENDA PROD ACABADO MERCADO INTERNO', tipoOperacao: ModalidadeTipoOperacao.VENDA, descricao: 'Venda de produto acabado para o mercado interno' },
    { empresaLabel: 'MODO', nome: 'MODO G - COMPRA DE VARREDURA P/REVENDA', tipoOperacao: ModalidadeTipoOperacao.COMPRA, descricao: 'Compra de produto de varredura para revenda' },
    { empresaLabel: 'MODO', nome: 'MODO G - COMPRA FIXA- MERC. INTERNO', tipoOperacao: ModalidadeTipoOperacao.COMPRA, descricao: 'Compra com preço fixo no mercado interno' },
    { empresaLabel: 'MODO', nome: 'MODO G - REM P/ DEPOSITO - OUTRAS SAIDAS', tipoOperacao: ModalidadeTipoOperacao.REMESSA, descricao: 'Remessa para depósito — outras saídas' },
    { empresaLabel: 'ROSLER', nome: 'ROSLER - COMPRA FIXA - MERCADO INTERNO', tipoOperacao: ModalidadeTipoOperacao.COMPRA, descricao: 'Compra com preço fixo no mercado interno' },
    { empresaLabel: 'ROSLER', nome: 'ROSLER - REMESSA PARA DEPOSITO - EXPEDIÇÃO', tipoOperacao: ModalidadeTipoOperacao.REMESSA, descricao: 'Remessa para depósito com expedição' },
    { empresaLabel: 'ROSLER', nome: 'ROSLER - REMESSA PARA INDUSTRIALIZAÇÃO', tipoOperacao: ModalidadeTipoOperacao.REMESSA, descricao: 'Remessa de produto para industrialização' },
    { empresaLabel: 'ROSLER', nome: 'ROSLER - TRANSFERÊNCIA ENTRE UNIDADES (FILIAIS)', tipoOperacao: ModalidadeTipoOperacao.TRANSFERENCIA, descricao: 'Transferência de produto entre unidades/filiais' },
    { empresaLabel: 'ROSLER', nome: 'ROSLER - VENDA A FIXAR - MERCADO INTERNO', tipoOperacao: ModalidadeTipoOperacao.VENDA, descricao: 'Venda com preço a fixar no mercado interno' },
    { empresaLabel: 'ROSLER', nome: 'ROSLER - VENDA DE ESTERCO BOVINO', tipoOperacao: ModalidadeTipoOperacao.VENDA, descricao: 'Venda de esterco bovino' },
    { empresaLabel: 'ROSLER', nome: 'ROSLER - VENDA FIXA - C/FINS ESP.EXPORTAÇÃO', tipoOperacao: ModalidadeTipoOperacao.VENDA, descricao: 'Venda fixa com fins específicos de exportação' },
    { empresaLabel: 'ROSLER', nome: 'ROSLER - VENDA FIXA - MERCADO INTERNO', tipoOperacao: ModalidadeTipoOperacao.VENDA, descricao: 'Venda com preço fixo no mercado interno' },
    { empresaLabel: 'ROSLER', nome: 'ROSLER - VENDA PROD.EST.S/ TRANSITO P/ ESTE', tipoOperacao: ModalidadeTipoOperacao.VENDA, descricao: 'Venda de produto em estoque sem trânsito para este estado' },
    { empresaLabel: 'ROSLER', nome: 'ROSLER 2022 - REMESSA ATO COOPERATIVO', tipoOperacao: ModalidadeTipoOperacao.REMESSA, descricao: 'Remessa referente a ato cooperativo' },
  ];
  for (const m of modalidades) {
    await prisma.modalidade.upsert({ where: { nome: m.nome }, create: m, update: m });
  }
}

async function seedCorretoras() {
  const corretoras = [
    'ZAIRAM AGROCOMM', 'GRANOPAR', 'AGUIA CORRETORA', 'TRADINCOM CONSULTORIA', 'BASE CORRETORA',
    'CANTARUTE E RODRIGUES', 'RESULTAGRO MARKET', 'A MOREIRA ASSESSORIA', 'INTERTRADING AGRONEGOCIOS',
    'IDEAL CORRETORA DE CEREAIS', 'BASIS CONSULTORIA', 'PRIME CORRETORA', 'REAL CORRETORA', 'A. MOREIRA (ADENILSON)',
  ];
  for (const nome of corretoras) {
    const existente = await prisma.corretora.findFirst({ where: { nome } });
    if (!existente) {
      await prisma.corretora.create({ data: { nome, corretagemPctPadrao: 0.3 } });
    }
  }
}

async function seedPessoas() {
  const pessoas: Array<{ codigo: string; nome: string; tipo: PessoaTipo; documento: string; municipio?: string; uf?: string; telefone?: string }> = [
    { codigo: 'CLI-001', nome: 'Cargill Brasil Ltda', tipo: PessoaTipo.CLIENTE, documento: '60.498.706/0001-57', municipio: 'São Paulo', uf: 'SP', telefone: '(11) 3456-7890' },
    { codigo: 'CLI-002', nome: 'Bunge Alimentos SA', tipo: PessoaTipo.CLIENTE, documento: '84.046.101/0001-08', municipio: 'Santos', uf: 'SP', telefone: '(13) 3232-0000' },
    { codigo: 'CLI-003', nome: 'Cooperativa Central MT', tipo: PessoaTipo.CLIENTE, documento: '03.398.505/0001-40', municipio: 'Sorriso', uf: 'MT' },
    { codigo: 'PROD-001', nome: 'Fazenda Santa Fé', tipo: PessoaTipo.PRODUTOR_RURAL, documento: '023.456.789-01', municipio: 'Sorriso', uf: 'MT', telefone: '(66) 99811-0000' },
    { codigo: 'PROD-002', nome: 'Fazenda Boa Vista', tipo: PessoaTipo.PRODUTOR_RURAL, documento: '640.112.338-90', municipio: 'Sinop', uf: 'MT' },
    { codigo: 'TRANSP-001', nome: 'Transportes Pantanal', tipo: PessoaTipo.TRANSPORTADORA, documento: '23.456.789/0001-01', municipio: 'Cuiabá', uf: 'MT', telefone: '(65) 3333-0000' },
    { codigo: 'TRANSP-002', nome: 'Rodogrão Transportes', tipo: PessoaTipo.TRANSPORTADORA, documento: '22.222.222/0001-22', municipio: 'Rondonópolis', uf: 'MT' },
    { codigo: 'ARM-001', nome: 'MODO Armazéns Gerais — Nova Monte Verde', tipo: PessoaTipo.ARMAZEM, documento: '44.555.666/0001-77', municipio: 'Nova Monte Verde', uf: 'MT' },
    { codigo: 'CLA-001', nome: 'SGS do Brasil Ltda', tipo: PessoaTipo.CLASSIFICADORA, documento: '09.999.888/0001-12', municipio: 'Curitiba', uf: 'PR' },
    { codigo: 'BAN-001', nome: 'Itaú BBA', tipo: PessoaTipo.BANCO, documento: '17.298.092/0001-30', municipio: 'São Paulo', uf: 'SP' },
  ];
  for (const p of pessoas) {
    await prisma.pessoa.upsert({ where: { codigo: p.codigo }, create: p, update: p });
  }
}

async function seedFazendas() {
  const empresa453 = await prisma.empresaGrupo.findFirstOrThrow({ where: { codigo: '453' } });
  const empresa200 = await prisma.empresaGrupo.findFirstOrThrow({ where: { codigo: '200' } });
  const fazendas = [
    { nome: 'Fazenda Santa Fé', empresaGrupoId: empresa453.id, municipio: 'Sorriso', uf: 'MT', areaHectares: 1500 },
    { nome: 'Fazenda Boa Vista', empresaGrupoId: empresa453.id, municipio: 'Lucas do Rio Verde', uf: 'MT', areaHectares: 800 },
    { nome: 'Armazém Rondonópolis', empresaGrupoId: empresa200.id, municipio: 'Rondonópolis', uf: 'MT', areaHectares: 0 },
  ];
  for (const f of fazendas) {
    const existente = await prisma.fazenda.findFirst({ where: { nome: f.nome, deletedAt: null } });
    if (!existente) await prisma.fazenda.create({ data: f });
  }
}

async function seedParametroFinanceiro() {
  await prisma.parametroFinanceiro.upsert({
    where: { id: 'default' },
    create: { id: 'default', taxaJurosDescasamentoAmPct: 1.5, classificacaoPadraoRsSc: 1.9, custoQuebraPct: 0.25 },
    update: {},
  });
}

async function seedContratos() {
  const jaTem = await prisma.contrato.count();
  if (jaTem > 0) {
    // eslint-disable-next-line no-console
    console.log(`Contratos já existentes (${jaTem}) — pulando criação de exemplos.`);
    return;
  }
  const boletas = await prisma.boleta.findMany({ take: 2, orderBy: { createdAt: 'asc' } });
  let n = 0;
  for (const b of boletas) {
    n++;
    await prisma.contrato.create({
      data: {
        numeroSistema: `CS-2026-${String(n).padStart(4, '0')}`,
        numeroErpMaxicon: `55${60 + n}`,
        tipo: b.tipo === 'COMPRA' ? 'COMPRA' : 'VENDA',
        status: 'EMITIDO',
        boletaId: b.id,
        contraparteId: b.contraparteId,
        contraparteNome: b.contraparteNome,
        produtoId: b.produtoId,
        quantidadeContratadaSc: b.quantidadeSc,
        preco: b.preco,
        dataVencimento: b.dataFimEntrega,
        temArmazenagem: b.temArmazenagem,
        armPadronizacaoRate: b.armPadronizacaoRate,
        armArmazenagemRate: b.armArmazenagemRate,
        armQuebraTecnicaPct: b.armQuebraTecnicaPct,
        quebraTecnicaPct: b.quebraTecnicaTradingPct,
        custoFinanceiroPct: b.custoFinanceiroPct,
        historico: { create: { evento: 'CRIACAO', para: 'EMITIDO' } },
      },
    });
  }
  if (n > 0) {
    await prisma.contratoSequencia.upsert({
      where: { ano: 2026 },
      create: { ano: 2026, ultimoNumero: n },
      update: { ultimoNumero: n },
    });
  }
}

async function seedUsuarios() {
  // PRODUÇÃO: nenhum usuário de demonstração. O administrador inicial é criado
  // pelo AdminBootstrapService na subida da API (ADMIN_INICIAL_EMAIL/SENHA);
  // os demais usuários são cadastrados pela tela de Usuários.
  if (process.env.NODE_ENV === 'production') return;

  // Senhas de demonstração (DEV). Trocar em produção.
  const usuarios = [
    { nome: 'ADMINISTRADOR', email: 'admin@modorir.com.br', perfil: PerfilAcesso.ADMINISTRADOR, senha: 'admin123' },
    { nome: 'RUBER DALLAMARIA', email: 'ruber.dallamaria@modorir.com.br', perfil: PerfilAcesso.COMERCIAL, senha: 'modorir123' },
    { nome: 'RODRIGO CARDOSO', email: 'rodrigo.cardoso@modorir.com.br', perfil: PerfilAcesso.COMERCIAL, senha: 'modorir123' },
    { nome: 'ROSLER DALLAMARIA', email: 'rosler.dallamaria@modorir.com.br', perfil: PerfilAcesso.DIRETORIA, senha: 'modorir123' },
    { nome: 'ADENILSON MOREIRA', email: 'adenilson.moreira@modorir.com.br', perfil: PerfilAcesso.OPERACOES, senha: 'modorir123' },
  ];
  for (const u of usuarios) {
    const senhaHash = await bcrypt.hash(u.senha, 10);
    const dados = { nome: u.nome, email: u.email, perfil: u.perfil, senhaHash };
    // Não sobrescreve a senha em re-seeds (só define se ainda não houver hash)
    await prisma.usuario.upsert({
      where: { email: u.email },
      create: dados,
      update: { nome: u.nome, perfil: u.perfil, senhaHash: undefined },
    });
    const atual = await prisma.usuario.findUnique({ where: { email: u.email } });
    if (atual && !atual.senhaHash) {
      await prisma.usuario.update({ where: { email: u.email }, data: { senhaHash } });
    }
  }
}

/** Boletas de exemplo, cobrindo os principais pontos do ciclo de vida. */

async function main() {
  // ── Tabelas base / reference (o sistema precisa delas para funcionar) ──
  await seedEmpresasGrupo();
  await seedSafras();
  await seedProdutos();
  await seedModalidades();
  await seedCorretoras();
  await seedFazendas();
  await seedParametroFinanceiro();
  await seedUsuarios(); // login

  // ── Dados de EXEMPLO desativados (sistema inicia limpo) ──
  // Para repovoar exemplos de demonstração, reative as linhas abaixo.
  // await seedPessoas();   // clientes/produtores de amostra
  // await seedContratos(); // contratos de exemplo
  void seedPessoas; void seedContratos; // mantém as funções sem "unused"

  // eslint-disable-next-line no-console
  console.log('Seed concluído (base limpa — sem dados de exemplo).');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
