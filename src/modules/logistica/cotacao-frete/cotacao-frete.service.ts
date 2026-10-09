import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { CotacaoFrete, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { interpretarCotacoes, ResultadoInterpretacao, testarChaveIa } from './cotacao-frete-parser';
import {
  CotacaoFreteResponseDto,
  ConfigIaDto,
  CotacaoVigenteDto,
  InterpretarCotacoesDto,
  SalvarCotacoesLoteDto,
} from './dto/cotacao-frete.dto';

type Row = CotacaoFrete;

const norm = (s: string | null | undefined) => (s ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
const titulo = (s: string) =>
  s
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/(^|\s)(\p{L})/gu, (_m, a, b) => a + b.toUpperCase());

@Injectable()
export class CotacaoFreteService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lê o texto colado e devolve SUGESTÕES (não grava). */
  async interpretar(dto: InterpretarCotacoesDto): Promise<ResultadoInterpretacao & { iaConfigurada: boolean }> {
    const texto = dto.texto?.trim() ?? '';
    const imagens = dto.imagens ?? [];
    if (!texto && !imagens.length) throw new BadRequestException('Cole o texto ou anexe imagens das cotações');
    try {
      const chave = await this.obterChaveIa();
      const r = await interpretarCotacoes(texto, imagens, chave, dto.grupo?.trim() || undefined, dto.dataPadrao, dto.transportadoraPadrao?.trim() || undefined);
      return { ...r, iaConfigurada: !!chave };
    } catch (e) {
      if ((e as Error).message === 'SEM_IA_IMAGEM') {
        throw new ServiceUnavailableException(
          'Ler imagens exige IA (serviço pago da Anthropic). Sem IA, copie o texto do cartaz/print e cole no campo de texto.',
        );
      }
      throw e;
    }
  }

  // ── Chave da IA: ambiente (ANTHROPIC_API_KEY) tem prioridade; senão a salva no sistema ──
  private async obterChaveIa(): Promise<string | null> {
    if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
    const c = await this.prisma.configSistema.findUnique({ where: { chave: 'ANTHROPIC_API_KEY' } });
    return c?.valor || null;
  }

  async statusIa(): Promise<{ configurada: boolean; fonte: 'ambiente' | 'sistema' | null; final: string | null }> {
    const amb = process.env.ANTHROPIC_API_KEY;
    const k = amb || (await this.obterChaveIa());
    return { configurada: !!k, fonte: amb ? 'ambiente' : k ? 'sistema' : null, final: k ? '…' + k.slice(-4) : null };
  }

  async definirChaveIa(dto: ConfigIaDto, usuario: string) {
    const chave = (dto.chave ?? '').trim();
    if (!chave) {
      await this.prisma.configSistema.deleteMany({ where: { chave: 'ANTHROPIC_API_KEY' } });
      return this.statusIa();
    }
    if (!/^sk-ant-[A-Za-z0-9_\-]{20,}$/.test(chave)) throw new BadRequestException('Chave em formato inesperado. Ela começa com "sk-ant-".');
    const erro = await testarChaveIa(chave);
    if (erro) throw new BadRequestException(erro);
    await this.prisma.configSistema.upsert({
      where: { chave: 'ANTHROPIC_API_KEY' },
      create: { chave: 'ANTHROPIC_API_KEY', valor: chave, updatedBy: usuario },
      update: { valor: chave, updatedBy: usuario },
    });
    return this.statusIa();
  }

  /** Grava as cotações confirmadas (ignora duplicadas idênticas). */
  async salvarLote(dto: SalvarCotacoesLoteDto, usuario: string): Promise<{ criadas: number; duplicadas: number }> {
    const itens = (dto.itens ?? []).filter((i) => i && Number(i.valor) > 0 && i.origem?.trim() && i.destino?.trim() && i.transportadora?.trim());
    if (!itens.length) throw new BadRequestException('Nenhuma cotação válida para salvar');
    const existentes = await this.prisma.cotacaoFrete.findMany({
      where: { dataCotacao: { in: Array.from(new Set(itens.map((i) => i.dataCotacao))) } },
    });
    const chave = (t: string, o: string, d: string, v: number, u: string, dt: string, ve?: string | null) => [norm(t), norm(o), norm(d), norm(ve), v.toFixed(2), u, dt].join('|');
    const vistos = new Set(existentes.map((e) => chave(e.transportadora, e.origem, e.destino, Number(e.valor), e.unidade, e.dataCotacao, e.veiculo)));
    const novas: Prisma.CotacaoFreteCreateManyInput[] = [];
    let duplicadas = 0;
    for (const i of itens) {
      const unidade = /sc/i.test(i.unidade ?? '') ? 'R$/sc' : 'R$/t';
      const k = chave(i.transportadora, i.origem, i.destino, Number(i.valor), unidade, i.dataCotacao, i.veiculo);
      if (vistos.has(k)) {
        duplicadas++;
        continue;
      }
      vistos.add(k);
      novas.push({
        grupo: i.grupo?.trim() || null,
        transportadora: titulo(i.transportadora),
        origem: titulo(i.origem),
        destino: titulo(i.destino),
        produto: i.produto?.trim() || null,
        veiculo: i.veiculo?.trim() ? titulo(i.veiculo) : null,
        valor: i.valor,
        unidade,
        dataCotacao: i.dataCotacao,
        observacao: i.observacao?.trim() || null,
        textoOrigem: i.textoOrigem?.slice(0, 2000) || null,
        createdBy: usuario,
      });
    }
    if (novas.length) await this.prisma.cotacaoFrete.createMany({ data: novas });
    return { criadas: novas.length, duplicadas };
  }

  /** Histórico (mais recentes primeiro) com filtros. */
  async listar(f: { transportadora?: string; origem?: string; destino?: string; de?: string; ate?: string; grupo?: string }): Promise<CotacaoFreteResponseDto[]> {
    const where: Prisma.CotacaoFreteWhereInput = {
      ...(f.transportadora ? { transportadora: { contains: f.transportadora, mode: 'insensitive' } } : {}),
      ...(f.origem ? { origem: { contains: f.origem, mode: 'insensitive' } } : {}),
      ...(f.destino ? { destino: { contains: f.destino, mode: 'insensitive' } } : {}),
      ...(f.grupo ? { grupo: { contains: f.grupo, mode: 'insensitive' } } : {}),
      ...(f.de || f.ate ? { dataCotacao: { ...(f.de ? { gte: f.de } : {}), ...(f.ate ? { lte: f.ate } : {}) } } : {}),
    };
    const rows = await this.prisma.cotacaoFrete.findMany({
      where,
      orderBy: [{ dataCotacao: 'desc' }, { createdAt: 'desc' }],
      take: 3000,
    });
    return rows.map((r) => this.toDto(r));
  }

  /** Frete VIGENTE: a cotação mais recente de cada transportadora em cada rota, com variação vs a anterior. */
  async vigentes(): Promise<CotacaoVigenteDto[]> {
    const rows = await this.prisma.cotacaoFrete.findMany({ orderBy: [{ dataCotacao: 'desc' }, { createdAt: 'desc' }] });
    const porChave = new Map<string, Row[]>();
    for (const r of rows) {
      const k = [norm(r.transportadora), norm(r.origem), norm(r.destino), norm(r.produto), norm(r.veiculo), r.unidade].join('|');
      (porChave.get(k) ?? porChave.set(k, []).get(k)!).push(r);
    }
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const out: CotacaoVigenteDto[] = [];
    for (const lista of porChave.values()) {
      const atual = lista[0];
      const ant = lista.length > 1 ? lista[1] : null;
      const v = Number(atual.valor);
      const va = ant ? Number(ant.valor) : null;
      const dias = Math.max(0, Math.round((hoje.getTime() - new Date(atual.dataCotacao + 'T00:00:00').getTime()) / 86400000));
      out.push({
        ...this.toDto(atual),
        valorAnterior: va,
        variacaoPct: va ? Number((((v - va) / va) * 100).toFixed(2)) : null,
        diasDesde: dias,
      });
    }
    return out.sort((a, b) => a.origem.localeCompare(b.origem) || a.destino.localeCompare(b.destino) || a.valor - b.valor);
  }

  async remover(id: string): Promise<void> {
    const r = await this.prisma.cotacaoFrete.findUnique({ where: { id } });
    if (!r) throw new NotFoundException(`Cotação ${id} não encontrada`);
    await this.prisma.cotacaoFrete.delete({ where: { id } });
  }

  private toDto(r: Row): CotacaoFreteResponseDto {
    return {
      id: r.id,
      grupo: r.grupo,
      transportadora: r.transportadora,
      origem: r.origem,
      destino: r.destino,
      produto: r.produto,
      veiculo: r.veiculo,
      valor: Number(r.valor),
      unidade: r.unidade,
      dataCotacao: r.dataCotacao,
      observacao: r.observacao,
    };
  }
}
