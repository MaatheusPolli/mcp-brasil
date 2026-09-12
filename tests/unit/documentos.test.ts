import { describe, expect, it } from 'vitest';
import {
  detectarTipoDocumento,
  formatarCnpj,
  formatarCpf,
  validarCnpj,
  validarCpf,
} from '../../src/domain/documentos.js';

describe('validarCpf', () => {
  it('aceita CPFs válidos, com ou sem máscara', () => {
    expect(validarCpf('111.444.777-35')).toBe(true);
    expect(validarCpf('11144477735')).toBe(true);
  });

  it('rejeita CPFs com dígito verificador incorreto', () => {
    expect(validarCpf('111.444.777-36')).toBe(false);
  });

  it('rejeita CPFs com todos os dígitos iguais', () => {
    expect(validarCpf('111.111.111-11')).toBe(false);
  });

  it('rejeita CPFs com tamanho incorreto', () => {
    expect(validarCpf('123')).toBe(false);
  });
});

describe('validarCnpj', () => {
  it('aceita CNPJs válidos, com ou sem máscara', () => {
    expect(validarCnpj('11.222.333/0001-81')).toBe(true);
    expect(validarCnpj('11222333000181')).toBe(true);
  });

  it('rejeita CNPJs com dígito verificador incorreto', () => {
    expect(validarCnpj('11.222.333/0001-82')).toBe(false);
  });

  it('rejeita CNPJs com todos os dígitos iguais', () => {
    expect(validarCnpj('11.111.111/1111-11')).toBe(false);
  });

  it('rejeita CNPJs com tamanho incorreto', () => {
    expect(validarCnpj('123')).toBe(false);
  });
});

describe('formatarCpf / formatarCnpj', () => {
  it('formata CPF sem máscara', () => {
    expect(formatarCpf('11144477735')).toBe('111.444.777-35');
  });

  it('formata CNPJ sem máscara', () => {
    expect(formatarCnpj('11222333000181')).toBe('11.222.333/0001-81');
  });
});

describe('detectarTipoDocumento', () => {
  it('detecta CPF por 11 dígitos', () => {
    expect(detectarTipoDocumento('111.444.777-35')).toBe('CPF');
  });

  it('detecta CNPJ por 14 dígitos', () => {
    expect(detectarTipoDocumento('11.222.333/0001-81')).toBe('CNPJ');
  });

  it('retorna null para tamanho inválido', () => {
    expect(detectarTipoDocumento('123')).toBeNull();
  });
});
