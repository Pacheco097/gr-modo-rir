import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PessoaTipo, Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../../database/prisma.service';
import { PaginatedResultDto } from '../../../common/dto/paginated-result.dto';
import { PessoaResponseDto } from './dto/pessoa-response.dto';
import { QueryPessoaDto } from './dto/query-pessoa.dto';
import { CreatePessoaDto } from './dto/create-pessoa.dto';
import { UpdatePessoaDto } from './dto/update-pessoa.dto';
import { ImportResultadoDto } from './dto/import-resultado.dto';
import { montarCodigoPessoa, PREFIXO_POR_TIPO, somenteDigitos } from './pessoa-codigo.util';

/** Mapeia rótulos livres (import) para o enum PessoaTipo. */
const TIPO_ALIASES: Record<string, PessoaTipo> = {
  cliente: PessoaTipo.CLIENTE,
  'produtor rural': PessoaTipo.PRODUTOR_RURAL,
  produtor: PessoaTipo.PRODUTOR_RURAL,
  transportadora: PessoaTipo.TRANSPORTADORA,
  armazem: PessoaTipo.ARMAZEM,
  'armazém': PessoaTipo.ARMAZEM,
  classificadora: PessoaTipo.CLASSIFICADORA,
  banco: PessoaTipo.BANCO,
};

@Injectable()
export class PessoasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryPessoaDto): Promise<PaginatedResultDto<PessoaResponseDto>> {
    const where: Prisma.PessoaWhereInput = {
      deletedAt: null,
      ...(query.tipo ? { tipo: query.tipo } : {}),
      ...(query.uf ? { uf: query.uf } : {}),
      ...(query.busca
        ? {
            OR: [
              { nome: { contains: query.busca, mode: 'insensitive' as const } },
              { documento: { contains: query.busca, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.pessoa.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { [query.ordenarPor ?? 'nome']: query.ordenarDirecao },
      }),
      this.prisma.pessoa.count({ where }),
    ]);

    return new PaginatedResultDto(
      rows.map((r) => PessoaResponseDto.fromEntity(r)),
      query.page,
      query.limit,
      total,
    );
  }

  /**
   * Autocomplete do campo "Nome da Empresa" da Boleta (replica
   * `onContraparteNomeChange`: até 8 resultados por nome ou documento).
   */
  async sugestoes(q: string): Promise<PessoaResponseDto[]> {
    if (!q || q.trim().length < 2) return [];
    const rows = await this.prisma.pessoa.findMany({
      where: {
        deletedAt: null,
        ativo: true,
        OR: [
          { nome: { contains: q, mode: 'insensitive' } },
          { documento: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 8,
      orderBy: { nome: 'asc' },
    });
    return rows.map((r) => PessoaResponseDto.fromEntity(r));
  }

  async findOne(id: string): Promise<PessoaResponseDto> {
    const entity = await this.buscarOuFalhar(id);
    return PessoaResponseDto.fromEntity(entity);
  }

  async criar(dto: CreatePessoaDto, usuario: string): Promise<PessoaResponseDto> {
    await this.garantirDocumentoUnico(dto.documento);
    const codigo = await this.proximoCodigo(dto.tipo);
    const entity = await this.prisma.pessoa.create({
      data: { ...dto, codigo, createdBy: usuario, updatedBy: usuario },
    });
    return PessoaResponseDto.fromEntity(entity);
  }

  async atualizar(id: string, dto: UpdatePessoaDto, usuario: string): Promise<PessoaResponseDto> {
    await this.buscarOuFalhar(id);
    if (dto.documento) await this.garantirDocumentoUnico(dto.documento, id);
    // O código não muda automaticamente ao trocar o tipo — mantém rastreabilidade histórica.
    const entity = await this.prisma.pessoa.update({
      where: { id },
      data: { ...dto, updatedBy: usuario },
    });
    return PessoaResponseDto.fromEntity(entity);
  }

  async remover(id: string, usuario: string): Promise<void> {
    await this.buscarOuFalhar(id);
    const emUso = await this.prisma.boleta.count({ where: { contraparteId: id, deletedAt: null } });
    if (emUso > 0) {
      throw new BadRequestException(`Pessoa vinculada a ${emUso} boleta(s) como contraparte — não pode ser removida`);
    }
    await this.prisma.pessoa.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: usuario } });
  }

  // ─────────────────────────────────────────────────────────────────────
  // Importação / Exportação (docx §12.1)
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Importa em massa a partir de um buffer .xlsx/.xls/.csv. Colunas aceitas
   * (case-insensitive, ordem livre): nome, tipo, cpf_cnpj (ou documento),
   * ie, uf, municipio, telefone, email, status. Deduplica pelo documento —
   * réplica de `importarExcel` do HTML de referência.
   */
  async importar(buffer: Buffer, usuario: string): Promise<ImportResultadoDto> {
    let linhas: Record<string, unknown>[];
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const primeiraAba = workbook.SheetNames[0];
      linhas = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[primeiraAba], { defval: '' });
    } catch {
      throw new BadRequestException('Não foi possível ler o arquivo. Use .xlsx, .xls ou .csv.');
    }

    const resultado: ImportResultadoDto = { total: linhas.length, importados: 0, duplicados: 0, erros: 0, detalhesErros: [] };

    for (let i = 0; i < linhas.length; i++) {
      const linhaNum = i + 2; // +1 (0-index) +1 (cabeçalho)
      const linha = this.normalizarChaves(linhas[i]);
      const nome = String(linha['nome'] ?? '').trim();
      const documento = String(linha['cpf_cnpj'] ?? linha['documento'] ?? '').trim();
      const tipoRaw = String(linha['tipo'] ?? '').trim();
      const uf = String(linha['uf'] ?? '').trim();

      const tipo = this.resolverTipo(tipoRaw);
      if (!nome || !documento || !tipo) {
        resultado.erros++;
        resultado.detalhesErros.push({
          linha: linhaNum,
          motivo: `Campos obrigatórios ausentes/ inválidos (nome, cpf_cnpj, tipo). tipo recebido: "${tipoRaw}"`,
        });
        continue;
      }

      const jaExiste = await this.documentoExiste(documento);
      if (jaExiste) {
        resultado.duplicados++;
        continue;
      }

      const codigo = await this.proximoCodigo(tipo);
      await this.prisma.pessoa.create({
        data: {
          codigo,
          nome,
          tipo,
          documento,
          inscricaoEstadual: String(linha['ie'] ?? linha['inscricao_estadual'] ?? '').trim() || null,
          municipio: String(linha['municipio'] ?? '').trim() || null,
          uf: uf || null,
          telefone: String(linha['telefone'] ?? '').trim() || null,
          email: String(linha['email'] ?? '').trim() || null,
          ativo: !/inativ/i.test(String(linha['status'] ?? 'ativo')),
          createdBy: usuario,
          updatedBy: usuario,
        },
      });
      resultado.importados++;
    }

    return resultado;
  }

  /** Modelo .xlsx para download (cabeçalho + uma linha de exemplo). */
  gerarModeloXlsx(): Buffer {
    const cabecalho = ['nome', 'tipo', 'cpf_cnpj', 'ie', 'uf', 'municipio', 'telefone', 'email', 'status'];
    const exemplo = {
      nome: 'Cargill Brasil Ltda',
      tipo: 'Cliente',
      cpf_cnpj: '60.498.706/0001-57',
      ie: '',
      uf: 'MT',
      municipio: 'Sorriso',
      telefone: '(66) 3000-0000',
      email: 'contato@empresa.com',
      status: 'Ativo',
    };
    const ws = XLSX.utils.json_to_sheet([exemplo], { header: cabecalho });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  /** Exporta os cadastros filtrados em CSV (mesmas colunas do modelo). */
  async exportarCsv(query: QueryPessoaDto): Promise<string> {
    const where: Prisma.PessoaWhereInput = {
      deletedAt: null,
      ...(query.tipo ? { tipo: query.tipo } : {}),
      ...(query.uf ? { uf: query.uf } : {}),
      ...(query.busca
        ? {
            OR: [
              { nome: { contains: query.busca, mode: 'insensitive' as const } },
              { documento: { contains: query.busca, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const rows = await this.prisma.pessoa.findMany({ where, orderBy: { nome: 'asc' } });

    const cabecalho = ['codigo', 'nome', 'tipo', 'cpf_cnpj', 'ie', 'uf', 'municipio', 'telefone', 'email', 'status'];
    const escapar = (v: unknown): string => {
      const s = String(v ?? '');
      return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const linhas = rows.map((r) =>
      [
        r.codigo,
        r.nome,
        r.tipo,
        r.documento,
        r.inscricaoEstadual ?? '',
        r.uf ?? '',
        r.municipio ?? '',
        r.telefone ?? '',
        r.email ?? '',
        r.ativo ? 'Ativo' : 'Inativo',
      ]
        .map(escapar)
        .join(';'),
    );
    return [cabecalho.join(';'), ...linhas].join('\n');
  }

  // ─────────────────────────────────────────────────────────────────────
  // Auxiliares privados
  // ─────────────────────────────────────────────────────────────────────

  private async buscarOuFalhar(id: string) {
    const entity = await this.prisma.pessoa.findFirst({ where: { id, deletedAt: null } });
    if (!entity) throw new NotFoundException(`Pessoa ${id} não encontrada`);
    return entity;
  }

  /** Próximo código sequencial do prefixo, robusto contra gaps e soft-deletes. */
  private async proximoCodigo(tipo: PessoaTipo): Promise<string> {
    const prefixo = PREFIXO_POR_TIPO[tipo];
    const existentes = await this.prisma.pessoa.findMany({
      where: { codigo: { startsWith: `${prefixo}-` } },
      select: { codigo: true },
    });
    const maiorSeq = existentes.reduce((max, { codigo }) => {
      const n = parseInt(codigo.slice(prefixo.length + 1), 10);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);
    return montarCodigoPessoa(tipo, maiorSeq + 1);
  }

  private async garantirDocumentoUnico(documento: string, ignorarId?: string): Promise<void> {
    if (await this.documentoExiste(documento, ignorarId)) {
      throw new BadRequestException(`CPF/CNPJ ${documento} já cadastrado`);
    }
  }

  /** Deduplica por documento comparando apenas dígitos (ignora máscara). */
  private async documentoExiste(documento: string, ignorarId?: string): Promise<boolean> {
    const alvo = somenteDigitos(documento);
    if (!alvo) return false;
    const candidatos = await this.prisma.pessoa.findMany({
      where: { deletedAt: null },
      select: { id: true, documento: true },
    });
    return candidatos.some((c) => somenteDigitos(c.documento) === alvo && c.id !== ignorarId);
  }

  private resolverTipo(raw: string): PessoaTipo | null {
    const chave = raw.trim().toLowerCase();
    if (!chave) return null;
    if (chave in TIPO_ALIASES) return TIPO_ALIASES[chave];
    // aceita também o valor bruto do enum (ex.: "PRODUTOR_RURAL")
    const upper = raw.trim().toUpperCase();
    if ((Object.values(PessoaTipo) as string[]).includes(upper)) return upper as PessoaTipo;
    return null;
  }

  private normalizarChaves(linha: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(linha)) {
      out[k.trim().toLowerCase().replace(/\s+/g, '_')] = v;
    }
    return out;
  }
}
