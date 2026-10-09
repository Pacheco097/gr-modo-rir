import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { ParametroFinanceiroResponseDto } from './dto/parametro-financeiro-response.dto';
import { UpdateParametroFinanceiroDto } from './dto/update-parametro-financeiro.dto';

/** Id fixo do registro singleton de parâmetros financeiros. */
const SINGLETON_ID = 'default';

@Injectable()
export class ParametrosFinanceirosService {
  constructor(private readonly prisma: PrismaService) {}

  /** Retorna o registro único, criando-o com os defaults na primeira chamada. */
  async obter(): Promise<ParametroFinanceiroResponseDto> {
    const entity = await this.prisma.parametroFinanceiro.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID },
      update: {},
    });
    return ParametroFinanceiroResponseDto.fromEntity(entity);
  }

  async atualizar(dto: UpdateParametroFinanceiroDto, usuario: string): Promise<ParametroFinanceiroResponseDto> {
    // custoQuebraPct é, por regra de negócio, editável apenas por administrador
    // (docx §12.2 / HTML). Enquanto o RBAC não existe (etapa 3), o campo é
    // aceito mas deve ser gated no futuro por um Guard de perfil ADMINISTRADOR.
    const entity = await this.prisma.parametroFinanceiro.upsert({
      where: { id: SINGLETON_ID },
      create: {
        id: SINGLETON_ID,
        taxaJurosDescasamentoAmPct: dto.taxaJurosDescasamentoAmPct,
        classificacaoPadraoRsSc: dto.classificacaoPadraoRsSc,
        custoQuebraPct: dto.custoQuebraPct,
        updatedBy: usuario,
      },
      update: {
        taxaJurosDescasamentoAmPct: dto.taxaJurosDescasamentoAmPct,
        classificacaoPadraoRsSc: dto.classificacaoPadraoRsSc,
        custoQuebraPct: dto.custoQuebraPct,
        updatedBy: usuario,
      },
    });
    return ParametroFinanceiroResponseDto.fromEntity(entity);
  }
}
