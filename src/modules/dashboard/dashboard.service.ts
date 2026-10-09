import { Injectable } from '@nestjs/common';
import { LancamentoTipo } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ArmazenagemResponseDto } from '../armazenagem/dto/armazenagem.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** Contadores gerais do sistema (visão de topo). */
  async kpis() {
    const [boletas, contratos, amarracoes, embarques, ctesAPagar, lancAbertos] = await Promise.all([
      this.prisma.boleta.count({ where: { deletedAt: null } }),
      this.prisma.contrato.count({ where: { deletedAt: null } }),
      this.prisma.amarracao.count({ where: { deletedAt: null } }),
      this.prisma.embarque.count({ where: { deletedAt: null } }),
      this.prisma.cte.count({ where: { deletedAt: null, status: 'A_PAGAR', retirado: false } }),
      this.prisma.lancamentoFinanceiro.count({ where: { deletedAt: null, status: 'ABERTO' } }),
    ]);
    return { boletas, contratos, amarracoes, embarques, ctesAPagar, lancamentosAbertos: lancAbertos };
  }

  /**
   * Resultado por amarração (docx §5 / mapa mental do usuário):
   * receita (venda) − custo (compra) por contrato amarrado.
   */
  async resultadoAmarracoes() {
    // Busca TODAS as amarrações (comerciais + remessa). As de REMESSA (sem venda) não geram
    // linha de resultado; seus custos são HERDADOS pela compra × venda do mesmo contrato de compra.
    const contratoSel = { id: true, numeroErpMaxicon: true, preco: true, icmsPct: true, custoFinanceiroPct: true, temArmazenagem: true, armPadronizacaoRate: true, quantidadeContratadaSc: true, dataVencimento: true };
    const amarracoesAll = await this.prisma.amarracao.findMany({
      where: { deletedAt: null },
      include: {
        compraContrato: { select: contratoSel },
        vendaContrato: { select: contratoSel },
        remessaContrato: { select: contratoSel },
      },
    });
    const remessaAmarr = amarracoesAll.filter((a) => !a.vendaContratoId && a.remessaContratoId);
    const amarracoes = amarracoesAll.filter((a) => a.vendaContratoId);

    // Classificação por amarração → custo de classificação auto = REALIZADO (soma das parcelas pagas).
    // Inclui contratos e ids das amarrações de REMESSA (p/ herdar armazenagem/classificação).
    const contratoIds = amarracoesAll.flatMap((a) => [a.compraContratoId, a.vendaContratoId, a.remessaContratoId]).filter((x): x is string => !!x);
    const amarracaoIds = amarracoesAll.map((a) => a.id);
    const classifsAm = amarracaoIds.length
      ? await this.prisma.classificacaoAmarracao.findMany({
          where: { amarracaoId: { in: amarracaoIds } },
          select: { amarracaoId: true, pagamentos: { select: { valor: true } } },
        })
      : [];
    const classifPorAmarracao = new Map<string, number>();
    classifsAm.forEach((c) =>
      classifPorAmarracao.set(c.amarracaoId, c.pagamentos.reduce((s, p) => s + Number(p.valor), 0)),
    );

    // Armazenagens (subsetor Armazenagem) dos contratos → base do "custo de armazenagem" auto.
    // Custo por registro = realizado (se houver) OU previsto (padronização + armazenagem×quinzenas
    // cobradas após carência + quebra composta valorada pelo preço), contado da data de recebimento.
    const armazens = contratoIds.length
      ? await this.prisma.armazenagem.findMany({
          where: { contratoId: { in: contratoIds }, deletedAt: null },
          select: {
            contratoId: true, quantidadeSc: true, padronizacaoRate: true, armazenagemRate: true, quebraPct: true,
            carenciaQuinzenas: true, precoScRs: true, custoRealizadoRs: true, dataInicio: true, dataEncerramento: true,
          },
        })
      : [];
    const armazPorContrato = new Map<string, number>();
    armazens.forEach((r) => {
      const previsto = ArmazenagemResponseDto.calcular({
        quantidadeSc: Number(r.quantidadeSc), padronizacaoRate: Number(r.padronizacaoRate), armazenagemRate: Number(r.armazenagemRate),
        quebraPct: Number(r.quebraPct), carenciaQuinzenas: r.carenciaQuinzenas ?? 0, precoScRs: r.precoScRs == null ? 0 : Number(r.precoScRs),
        dataInicio: r.dataInicio, dataEncerramento: r.dataEncerramento,
      }).custoPrevistoRs;
      const custo = r.custoRealizadoRs === null || r.custoRealizadoRs === undefined ? previsto : Number(r.custoRealizadoRs);
      armazPorContrato.set(r.contratoId, (armazPorContrato.get(r.contratoId) ?? 0) + custo);
    });

    // Corretagem LANÇADA por contrato → custo do resultado (rateado pela fatia amarrada).
    const corretagens = contratoIds.length
      ? await this.prisma.corretagemContrato.findMany({ where: { contratoId: { in: contratoIds }, status: 'LANCADO' }, select: { contratoId: true, valorTotal: true } })
      : [];
    const corretagemPorContrato = new Map<string, number>();
    corretagens.forEach((r) => corretagemPorContrato.set(r.contratoId, Number(r.valorTotal)));

    // Antecipação: custo (juro/deságio) lançado no Financeiro como LancamentoFinanceiro
    // (categoria ANTECIPACAO, tipo PAGAR) vinculado ao contrato → entra no resultado.
    const antecipacoes = contratoIds.length
      ? await this.prisma.lancamentoFinanceiro.findMany({
          where: { contratoId: { in: contratoIds }, categoria: 'ANTECIPACAO', tipo: 'PAGAR', deletedAt: null },
          select: { contratoId: true, valor: true },
        })
      : [];
    const antecipacaoPorContrato = new Map<string, number>();
    antecipacoes.forEach((r) => {
      if (!r.contratoId) return;
      antecipacaoPorContrato.set(r.contratoId, (antecipacaoPorContrato.get(r.contratoId) ?? 0) + Number(r.valor));
    });

    // O contrato agora guarda o preço COM ICMS (bruto). O resultado usa o preço
    // SEM ICMS (líquido = bruto × (1 - icms/100)); o valor do ICMS é (bruto −
    // líquido) e entra como ajuste ao lado: compra subtrai, venda soma.
    const netDe = (precoComIcms: number, icmsPct: number): number =>
      icmsPct > 0 && precoComIcms > 0 ? precoComIcms * (1 - icmsPct / 100) : precoComIcms;
    const icmsPorSc = (precoComIcms: number, icmsPct: number): number =>
      icmsPct > 0 && precoComIcms > 0 ? precoComIcms - netDe(precoComIcms, icmsPct) : 0;

    // Parcelas de pagamento/recebimento (Fase 2) dos contratos envolvidos → juros por saldo financiado.
    const parcelasRows = contratoIds.length
      ? await this.prisma.contratoParcela.findMany({ where: { contratoId: { in: contratoIds } }, select: { contratoId: true, valor: true, data: true } })
      : [];
    const parcelasPorContrato = new Map<string, { valor: number; data: string }[]>();
    parcelasRows.forEach((p) => {
      const arr = parcelasPorContrato.get(p.contratoId) ?? [];
      arr.push({ valor: Number(p.valor), data: p.data });
      parcelasPorContrato.set(p.contratoId, arr);
    });
    // Parcelas efetivas: as persistidas OU a parcela PADRÃO (valor cheio na data de vencimento).
    const parcelasEfet = (c: { id?: string; dataVencimento?: Date | null; quantidadeContratadaSc?: unknown; preco?: unknown } | null | undefined): { valor: number; data: string }[] => {
      if (!c?.id) return [];
      const persist = parcelasPorContrato.get(c.id);
      if (persist && persist.length) return persist.slice().sort((x, y) => (x.data < y.data ? -1 : 1));
      const data = c.dataVencimento ? new Date(c.dataVencimento).toISOString().slice(0, 10) : '';
      if (!data) return [];
      return [{ valor: Number((Number(c.quantidadeContratadaSc ?? 0) * Number(c.preco ?? 0)).toFixed(2)), data }];
    };
    const temParcelas = (c: { id?: string } | null | undefined): boolean => !!c?.id && (parcelasPorContrato.get(c.id)?.length ?? 0) > 0;

    // Frete (CT-e) por amarração: soma dos CT-es NÃO retirados casando o par (ctrCompra, ctrVenda).
    const parKey = (c: string | null | undefined, v: string | null | undefined) =>
      `${String(c ?? '').trim().toLowerCase()}|${String(v ?? '').trim().toLowerCase()}`;
    const ctesFrete = await this.prisma.cte.findMany({
      where: { deletedAt: null, retirado: false },
      select: { ctrCompra: true, ctrVenda: true, valorTotal: true },
    });
    const freteCtePorPar = new Map<string, { soma: number; qtd: number }>();
    ctesFrete.forEach((c) => {
      if (!c.ctrCompra && !c.ctrVenda) return;
      const k = parKey(c.ctrCompra, c.ctrVenda);
      const cur = freteCtePorPar.get(k) ?? { soma: 0, qtd: 0 };
      cur.soma += Number(c.valorTotal ?? 0);
      cur.qtd += 1;
      freteCtePorPar.set(k, cur);
    });

    // Efetivo = override manual (se não-nulo) OU o auto.
    const ov = (v: unknown, auto: number) => (v === null || v === undefined ? auto : Number(v));
    // Armazenagem de um contrato, rateada pela fatia amarrada (qtd/qtdContratada).
    const armazDe = (c: { id?: string; quantidadeContratadaSc?: unknown } | null | undefined, qtd: number): number => {
      if (!c?.id) return 0;
      const total = armazPorContrato.get(c.id) ?? 0;
      const qc = Number(c.quantidadeContratadaSc ?? 0);
      return qc > 0 ? total * (qtd / qc) : total;
    };
    // Corretagem LANÇADA de um contrato, rateada pela fatia amarrada (qtd/qtdContratada).
    const corretagemDe = (c: { id?: string; quantidadeContratadaSc?: unknown } | null | undefined, qtd: number): number => {
      if (!c?.id) return 0;
      const total = corretagemPorContrato.get(c.id) ?? 0;
      const qc = Number(c.quantidadeContratadaSc ?? 0);
      return qc > 0 ? total * (qtd / qc) : total;
    };
    // Antecipação (juro/deságio) de um contrato, rateada pela fatia amarrada (qtd/qtdContratada).
    const antecipacaoDe = (c: { id?: string; quantidadeContratadaSc?: unknown } | null | undefined, qtd: number): number => {
      if (!c?.id) return 0;
      const total = antecipacaoPorContrato.get(c.id) ?? 0;
      const qc = Number(c.quantidadeContratadaSc ?? 0);
      return qc > 0 ? total * (qtd / qc) : total;
    };
    // Frete (CT-e) auto de uma amarração pelo par (compra × destino: venda OU remessa).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const autoFreteDe = (a: any): number => {
      const destNum = a.vendaContrato?.numeroErpMaxicon ?? a.remessaContrato?.numeroErpMaxicon;
      return Number(((freteCtePorPar.get(parKey(a.compraContrato?.numeroErpMaxicon, destNum)) ?? { soma: 0 }).soma).toFixed(2));
    };
    /**
     * Custos da perna compra × REMESSA, POR COMPONENTE — a remessa é só um local onde se paga
     * FRETE e ARMAZENAGEM (e eventualmente classificação/impostos). Cada custo é herdado na sua
     * CLASSE respectiva pela compra × venda do mesmo contrato de compra (não como linha única).
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const componentesRemessaDe = (a: any) => {
      const qtd = Number(a.quantidadeSc);
      return {
        // Armazenagem incorrida na remessa = a do contrato de REMESSA (a do contrato de compra
        // já entra na linha compra × venda — não duplicar).
        armaz: ov(a.custoArmazenagem, Number(armazDe(a.remessaContrato, qtd).toFixed(2))),
        classif: ov(a.custoClassificacao, Number((classifPorAmarracao.get(a.id) ?? 0).toFixed(2))),
        frete: ov(a.custoFrete, autoFreteDe(a)),
        fretePis: a.fretePisCofins == null ? 0 : Number(a.fretePisCofins),
        freteIcms: a.freteIcms == null ? 0 : Number(a.freteIcms),
        classifPis: a.classifPisCofins == null ? 0 : Number(a.classifPisCofins),
      };
    };

    // Herança POR COMPONENTE das amarrações de REMESSA, por contrato de compra.
    type RemComp = { armaz: number; classif: number; frete: number; fretePis: number; freteIcms: number; classifPis: number; qtd: number };
    const remessaCompPorCompra = new Map<string, RemComp>();
    remessaAmarr.forEach((a) => {
      if (!a.compraContratoId) return;
      const c = componentesRemessaDe(a);
      const cur = remessaCompPorCompra.get(a.compraContratoId) ?? { armaz: 0, classif: 0, frete: 0, fretePis: 0, freteIcms: 0, classifPis: 0, qtd: 0 };
      cur.armaz += c.armaz; cur.classif += c.classif; cur.frete += c.frete;
      cur.fretePis += c.fretePis; cur.freteIcms += c.freteIcms; cur.classifPis += c.classifPis;
      cur.qtd += Number(a.quantidadeSc);
      remessaCompPorCompra.set(a.compraContratoId, cur);
    });

    const linhas = amarracoes.map((a) => {
      const qtd = Number(a.quantidadeSc);
      const icmsCompraPct = Number(a.compraContrato?.icmsPct ?? 0);
      const icmsVendaPct = Number(a.vendaContrato?.icmsPct ?? 0);
      const brutoCompra = Number(a.compraContrato?.preco ?? 0);
      const brutoVenda = Number(a.vendaContrato?.preco ?? 0);
      // valores SEM ICMS (líquidos) usados no custo/receita
      const precoCompra = Number(netDe(brutoCompra, icmsCompraPct).toFixed(4));
      const precoVenda = Number(netDe(brutoVenda, icmsVendaPct).toFixed(4));
      const custo = Number((qtd * precoCompra).toFixed(2));
      const receita = Number((qtd * precoVenda).toFixed(2));

      // Ajuste de ICMS após a amarração: compra subtrai, venda soma (docx / regra do usuário).
      const icmsCompra = Number((qtd * icmsPorSc(brutoCompra, icmsCompraPct)).toFixed(2));
      const icmsVenda = Number((qtd * icmsPorSc(brutoVenda, icmsVendaPct)).toFixed(2));
      const ajusteIcms = Number((icmsVenda - icmsCompra).toFixed(2));

      // ── Componentes AUTO (pré-preenchidos do que o sistema tem; editáveis) ──
      // Juros por SALDO FINANCIADO (Fase 2): sobre as PARCELAS de pagamento (compra) e recebimento
      // (venda), prorrateadas pela fatia amarrada. Cada pagamento aumenta o saldo financiado, cada
      // recebimento reduz; juros = taxa mensal ÷ 30 × Σ(saldo × dias) entre eventos consecutivos.
      // Saldo positivo (pagou e ainda não recebeu) → CUSTO; negativo (recebeu antes) → RECEITA.
      const taxaFinMensal = Number(a.compraContrato?.custoFinanceiroPct ?? 0) / 100;
      const qtdContrC = Number(a.compraContrato?.quantidadeContratadaSc ?? 0);
      const qtdContrV = Number(a.vendaContrato?.quantidadeContratadaSc ?? 0);
      const fatorC = qtdContrC > 0 ? qtd / qtdContrC : 1;
      const fatorV = qtdContrV > 0 ? qtd / qtdContrV : 1;
      const eventos: { data: string; delta: number; tipo: 'PAG' | 'REC' }[] = [];
      parcelasEfet(a.compraContrato).forEach((p) => eventos.push({ data: p.data, delta: p.valor * fatorC, tipo: 'PAG' }));
      parcelasEfet(a.vendaContrato).forEach((p) => eventos.push({ data: p.data, delta: -(p.valor * fatorV), tipo: 'REC' }));
      eventos.sort((x, y) => (x.data < y.data ? -1 : 1));
      let saldo = 0;
      let jurosAcc = 0;
      for (let k = 0; k < eventos.length; k++) {
        saldo += eventos[k].delta;
        if (k < eventos.length - 1) {
          const dias = Math.round((new Date(eventos[k + 1].data).getTime() - new Date(eventos[k].data).getTime()) / 86400000);
          jurosAcc += saldo * (taxaFinMensal / 30) * dias;
        }
      }
      const autoJuros = Number(jurosAcc.toFixed(2));
      const pags = eventos.filter((e) => e.tipo === 'PAG');
      const recs = eventos.filter((e) => e.tipo === 'REC');
      const dtPagamento = pags.length ? pags[0].data : null; // 1º pagamento
      const dtRecebimento = recs.length ? recs[0].data : null; // 1º recebimento
      const jurosDias = dtPagamento && dtRecebimento ? Math.round((new Date(dtRecebimento).getTime() - new Date(dtPagamento).getTime()) / 86400000) : 0;
      const jurosPorParcelas = temParcelas(a.compraContrato) || temParcelas(a.vendaContrato);
      const jurosNumEventos = eventos.length;
      // Classificação: realizado da classificação PROGRAMADA da amarração (já é por amarração).
      const autoClassif = Number((classifPorAmarracao.get(a.id) ?? 0).toFixed(2));
      // Armazenagem: vem do subsetor Armazenagem (compra e/ou venda), rateada pela fatia amarrada.
      const autoArmaz = Number((armazDe(a.compraContrato, qtd) + armazDe(a.vendaContrato, qtd)).toFixed(2));
      const autoPisCofins = 0;
      // Frete (CT-e): soma dos CT-es do par (ctrCompra, ctrVenda) desta amarração.
      const freteInfo = freteCtePorPar.get(parKey(a.compraContrato?.numeroErpMaxicon, a.vendaContrato?.numeroErpMaxicon)) ?? { soma: 0, qtd: 0 };
      const autoFrete = Number(freteInfo.soma.toFixed(2));
      const freteCteQtd = freteInfo.qtd;

      // HERANÇA da compra × remessa POR COMPONENTE (rateada pela fatia desta venda): a remessa é
      // só um local onde se paga frete e armazenagem — cada custo entra na SUA classe da compra × venda.
      const remC = a.compraContratoId ? remessaCompPorCompra.get(a.compraContratoId) : undefined;
      const remFator = remC && remC.qtd > 0 ? qtd / remC.qtd : 0;
      const remArmaz = remC ? Number((remC.armaz * remFator).toFixed(2)) : 0;
      const remClassif = remC ? Number((remC.classif * remFator).toFixed(2)) : 0;
      const remFrete = remC ? Number((remC.frete * remFator).toFixed(2)) : 0;
      const remFretePis = remC ? Number((remC.fretePis * remFator).toFixed(2)) : 0;
      const remFreteIcms = remC ? Number((remC.freteIcms * remFator).toFixed(2)) : 0;
      const remClassifPis = remC ? Number((remC.classifPis * remFator).toFixed(2)) : 0;

      // Corretagem LANÇADA (compra + venda), rateada pela fatia amarrada — custo automático.
      const custoCorretagem = Number((corretagemDe(a.compraContrato, qtd) + corretagemDe(a.vendaContrato, qtd)).toFixed(2));
      // Antecipação (juro/deságio) lançada no Financeiro (compra + venda), rateada pela fatia amarrada.
      const custoAntecipacao = Number((antecipacaoDe(a.compraContrato, qtd) + antecipacaoDe(a.vendaContrato, qtd)).toFixed(2));
      // Componentes = próprios da compra × venda + herdados da remessa (na mesma classe).
      const custoArmazenagem = Number((ov(a.custoArmazenagem, autoArmaz) + remArmaz).toFixed(2));
      const custoClassificacao = Number((ov(a.custoClassificacao, autoClassif) + remClassif).toFixed(2));
      const custoJuros = ov(a.custoJuros, autoJuros);
      const custoFrete = Number((ov(a.custoFrete, autoFrete) + remFrete).toFixed(2));
      const receitaPisCofins = ov(a.receitaPisCofins, autoPisCofins);
      // Conciliação de frete (manual, com sinal: + receita / − despesa; null = não possui) + herdados.
      const fretePisCofins = Number(((a.fretePisCofins == null ? 0 : Number(a.fretePisCofins)) + remFretePis).toFixed(2));
      const freteIcms = Number(((a.freteIcms == null ? 0 : Number(a.freteIcms)) + remFreteIcms).toFixed(2));
      const classifPisCofins = Number(((a.classifPisCofins == null ? 0 : Number(a.classifPisCofins)) + remClassifPis).toFixed(2));
      const corretagemPisCofins = a.corretagemPisCofins == null ? 0 : Number(a.corretagemPisCofins);
      // ICMS do contrato: override manual (conciliação) OU o ajuste automático (venda − compra).
      const ajusteIcmsEf = a.icmsManual == null ? ajusteIcms : Number(a.icmsManual);

      // Conciliação de VOLUME:
      //  - COMPLEMENTO (sobra): receita extra.
      //  - DESCONTO (quebra): reduz receita (venda) e custo de compra.
      const volComplemento = a.volConcStatus === 'COMPLEMENTO' && a.volConcValor != null ? Number(a.volConcValor) : 0;
      const volDescReceita = a.volConcStatus === 'DESCONTO' && a.volConcDescReceita != null ? Number(a.volConcDescReceita) : 0;
      const volDescCusto = a.volConcStatus === 'DESCONTO' && a.volConcDescCusto != null ? Number(a.volConcDescCusto) : 0;

      const resultado = Number(
        (receita + volComplemento - volDescReceita - (custo - volDescCusto) + ajusteIcmsEf - custoArmazenagem - custoClassificacao - custoJuros - custoFrete - custoCorretagem - custoAntecipacao + receitaPisCofins + fretePisCofins + freteIcms + classifPisCofins + corretagemPisCofins).toFixed(2),
      );
      return {
        amarracaoId: a.id,
        compraContratoId: a.compraContratoId ?? null,
        vendaContratoId: a.vendaContratoId ?? null,
        compraNumero: a.compraContrato?.numeroErpMaxicon ?? null,
        vendaNumero: a.vendaContrato?.numeroErpMaxicon ?? null,
        quantidadeSc: qtd,
        precoCompra,
        precoVenda,
        custo,
        receita,
        icmsCompra,
        icmsVenda,
        ajusteIcms: ajusteIcmsEf,
        ajusteIcmsAuto: ajusteIcms,
        icmsManualSet: a.icmsManual !== null && a.icmsManual !== undefined,
        // componentes (valor efetivo + flag se veio do AUTO ou foi digitado)
        custoArmazenagem,
        custoArmazenagemAuto: a.custoArmazenagem === null || a.custoArmazenagem === undefined,
        custoClassificacao,
        custoClassificacaoAuto: a.custoClassificacao === null || a.custoClassificacao === undefined,
        custoJuros,
        custoJurosAuto: a.custoJuros === null || a.custoJuros === undefined,
        custoFrete,
        custoFreteAuto: a.custoFrete === null || a.custoFrete === undefined,
        freteCteQtd,
        fretePisCofins,
        fretePisCofinsSet: a.fretePisCofins !== null && a.fretePisCofins !== undefined,
        freteIcms,
        freteIcmsSet: a.freteIcms !== null && a.freteIcms !== undefined,
        classifPisCofins,
        classifPisCofinsSet: a.classifPisCofins !== null && a.classifPisCofins !== undefined,
        corretagemPisCofins,
        corretagemPisCofinsSet: a.corretagemPisCofins !== null && a.corretagemPisCofins !== undefined,
        // Transparência do juros por saldo financiado (Fase 2)
        jurosDias,
        jurosDataPagamento: dtPagamento,
        jurosDataRecebimento: dtRecebimento,
        jurosTaxaMensalPct: Number(a.compraContrato?.custoFinanceiroPct ?? 0),
        jurosPorParcelas,
        jurosNumEventos,
        receitaPisCofins,
        receitaPisCofinsAuto: a.receitaPisCofins === null || a.receitaPisCofins === undefined,
        volComplemento,
        volDescReceita,
        volDescCusto,
        volConcStatus: a.volConcStatus ?? null,
        volConcSobraSc: a.volConcSobraSc == null ? null : Number(a.volConcSobraSc),
        volConcPrecoRsSc: a.volConcPrecoRsSc == null ? null : Number(a.volConcPrecoRsSc),
        volConcDataRecebimento: a.volConcDataRecebimento ?? null,
        remFrete, // frete herdado da remessa (já incluído em custoFrete) — p/ o front preservar no ajuste de frete realizado
        remArmaz,
        custoCorretagem,
        custoAntecipacao,
        custoAntecipacaoSet: custoAntecipacao > 0,
        resultado,
      };
    });

    const totais = linhas.reduce(
      (acc, l) => ({
        custo: Number((acc.custo + l.custo - l.volDescCusto).toFixed(2)),
        receita: Number((acc.receita + l.receita + l.volComplemento - l.volDescReceita).toFixed(2)),
        volComplemento: Number((acc.volComplemento + l.volComplemento).toFixed(2)),
        volDescReceita: Number((acc.volDescReceita + l.volDescReceita).toFixed(2)),
        volDescCusto: Number((acc.volDescCusto + l.volDescCusto).toFixed(2)),
        remFrete: Number((acc.remFrete + l.remFrete).toFixed(2)),
        custoCorretagem: Number((acc.custoCorretagem + l.custoCorretagem).toFixed(2)),
        custoAntecipacao: Number((acc.custoAntecipacao + l.custoAntecipacao).toFixed(2)),
        icmsCompra: Number((acc.icmsCompra + l.icmsCompra).toFixed(2)),
        icmsVenda: Number((acc.icmsVenda + l.icmsVenda).toFixed(2)),
        ajusteIcms: Number((acc.ajusteIcms + l.ajusteIcms).toFixed(2)),
        custoArmazenagem: Number((acc.custoArmazenagem + l.custoArmazenagem).toFixed(2)),
        custoClassificacao: Number((acc.custoClassificacao + l.custoClassificacao).toFixed(2)),
        custoJuros: Number((acc.custoJuros + l.custoJuros).toFixed(2)),
        custoFrete: Number((acc.custoFrete + l.custoFrete).toFixed(2)),
        fretePisCofins: Number((acc.fretePisCofins + l.fretePisCofins).toFixed(2)),
        freteIcms: Number((acc.freteIcms + l.freteIcms).toFixed(2)),
        classifPisCofins: Number((acc.classifPisCofins + l.classifPisCofins).toFixed(2)),
        corretagemPisCofins: Number((acc.corretagemPisCofins + l.corretagemPisCofins).toFixed(2)),
        receitaPisCofins: Number((acc.receitaPisCofins + l.receitaPisCofins).toFixed(2)),
        resultado: Number((acc.resultado + l.resultado).toFixed(2)),
      }),
      { custo: 0, receita: 0, volComplemento: 0, volDescReceita: 0, volDescCusto: 0, remFrete: 0, custoCorretagem: 0, custoAntecipacao: 0, icmsCompra: 0, icmsVenda: 0, ajusteIcms: 0, custoArmazenagem: 0, custoClassificacao: 0, custoJuros: 0, custoFrete: 0, fretePisCofins: 0, freteIcms: 0, classifPisCofins: 0, corretagemPisCofins: 0, receitaPisCofins: 0, resultado: 0 },
    );

    return { linhas, totais };
  }

  /**
   * Análise de crédito (Resumo Gerencial): compras e vendas por nível de
   * crédito (A/B/C/D) da contraparte — histórico por ano e concentração dos
   * contratos em vigência. Contratos sem contraparte avaliada caem em "SEM".
   */
  async analiseCredito(ano?: number) {
    const contratos = await this.prisma.contrato.findMany({
      where: { deletedAt: null },
      include: { contraparte: { select: { classificacaoCredito: true } } },
    });

    const anoDe = (c: (typeof contratos)[number]) =>
      (c.dataVencimento ?? c.createdAt).getFullYear();
    const anosDisponiveis = [...new Set(contratos.map(anoDe))].sort((a, b) => b - a);

    const vazio = () => ({ A: nivel(), B: nivel(), C: nivel(), D: nivel(), SEM: nivel() });
    function nivel() {
      return { compra: 0, venda: 0, qtdContratos: 0 };
    }
    const historico = vazio();
    const vigencia = vazio();

    for (const c of contratos) {
      const nv = c.contraparte?.classificacaoCredito ?? 'SEM';
      const valor = Number(c.quantidadeContratadaSc) * Number(c.preco ?? 0);
      const lado = c.tipo === 'COMPRA' ? 'compra' : 'venda';

      // Histórico (filtra por ano se informado)
      if (!ano || anoDe(c) === ano) {
        historico[nv][lado] += valor;
        historico[nv].qtdContratos += 1;
      }
      // Vigência (contratos ainda ativos)
      if (c.status === 'EMITIDO' || c.status === 'EM_ANDAMENTO') {
        vigencia[nv][lado] += valor;
        vigencia[nv].qtdContratos += 1;
      }
    }

    const arred = (obj: Record<string, { compra: number; venda: number; qtdContratos: number }>) => {
      for (const k of Object.keys(obj)) {
        obj[k].compra = Number(obj[k].compra.toFixed(2));
        obj[k].venda = Number(obj[k].venda.toFixed(2));
      }
      return obj;
    };

    return {
      anosDisponiveis,
      ano: ano ?? null,
      historico: arred(historico),
      vigencia: arred(vigencia),
    };
  }

  /** Resumo do fluxo de caixa (aberto a receber × a pagar). */
  async resumoFinanceiro() {
    const abertos = await this.prisma.lancamentoFinanceiro.findMany({
      where: { deletedAt: null, status: 'ABERTO' },
      select: { tipo: true, valor: true },
    });
    let aReceber = 0;
    let aPagar = 0;
    for (const l of abertos) {
      if (l.tipo === LancamentoTipo.RECEBER) aReceber += Number(l.valor);
      else aPagar += Number(l.valor);
    }
    return {
      aReceber: Number(aReceber.toFixed(2)),
      aPagar: Number(aPagar.toFixed(2)),
      saldoProjetado: Number((aReceber - aPagar).toFixed(2)),
    };
  }
}
