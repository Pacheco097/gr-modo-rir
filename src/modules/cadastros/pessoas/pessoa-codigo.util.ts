import { PessoaTipo } from '@prisma/client';

/**
 * Prefixo do código gerado por tipo de pessoa (docx §12.1: "código com
 * prefixo por tipo"). Espelha os prefixos dos dados de demonstração do HTML
 * de referência.
 */
export const PREFIXO_POR_TIPO: Record<PessoaTipo, string> = {
  CLIENTE: 'CLI',
  PRODUTOR_RURAL: 'PROD',
  TRANSPORTADORA: 'TRANSP',
  ARMAZEM: 'ARM',
  CLASSIFICADORA: 'CLA',
  BANCO: 'BAN',
};

/** Monta o código sequencial: `<PREFIXO>-000`. */
export function montarCodigoPessoa(tipo: PessoaTipo, sequencial: number): string {
  return `${PREFIXO_POR_TIPO[tipo]}-${String(sequencial).padStart(3, '0')}`;
}

/** Só dígitos — usado para deduplicar CPF/CNPJ ignorando máscara. */
export function somenteDigitos(documento: string): string {
  return (documento ?? '').replace(/\D/g, '');
}
