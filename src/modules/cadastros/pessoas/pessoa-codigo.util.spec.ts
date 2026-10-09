import { PessoaTipo } from '@prisma/client';
import { montarCodigoPessoa, PREFIXO_POR_TIPO, somenteDigitos } from './pessoa-codigo.util';

describe('pessoa-codigo.util', () => {
  describe('PREFIXO_POR_TIPO', () => {
    it('define um prefixo para cada um dos 6 tipos canônicos (docx §12.1)', () => {
      expect(PREFIXO_POR_TIPO).toEqual({
        CLIENTE: 'CLI',
        PRODUTOR_RURAL: 'PROD',
        TRANSPORTADORA: 'TRANSP',
        ARMAZEM: 'ARM',
        CLASSIFICADORA: 'CLA',
        BANCO: 'BAN',
      });
    });
  });

  describe('montarCodigoPessoa', () => {
    it('monta o código com prefixo do tipo e sequencial de 3 dígitos', () => {
      expect(montarCodigoPessoa(PessoaTipo.CLIENTE, 1)).toBe('CLI-001');
      expect(montarCodigoPessoa(PessoaTipo.PRODUTOR_RURAL, 42)).toBe('PROD-042');
      expect(montarCodigoPessoa(PessoaTipo.BANCO, 123)).toBe('BAN-123');
    });

    it('não trunca sequenciais acima de 999', () => {
      expect(montarCodigoPessoa(PessoaTipo.CLIENTE, 1000)).toBe('CLI-1000');
    });
  });

  describe('somenteDigitos', () => {
    it('remove máscara de CPF/CNPJ para deduplicação', () => {
      expect(somenteDigitos('60.498.706/0001-57')).toBe('60498706000157');
      expect(somenteDigitos('023.456.789-01')).toBe('02345678901');
      expect(somenteDigitos('')).toBe('');
    });
  });
});
