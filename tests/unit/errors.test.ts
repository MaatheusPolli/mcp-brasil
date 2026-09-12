import { describe, expect, it } from 'vitest';
import { DocumentoInvalidoError, NotFoundError, ProviderError } from '../../src/domain/errors.js';

describe('erros de domínio', () => {
  it('DocumentoInvalidoError carrega mensagem e nome', () => {
    const error = new DocumentoInvalidoError('CPF inválido');
    expect(error.message).toBe('CPF inválido');
    expect(error.name).toBe('DocumentoInvalidoError');
    expect(error).toBeInstanceOf(Error);
  });

  it('ProviderError carrega provider e causa original', () => {
    const causa = new Error('timeout');
    const error = new ProviderError('falha ao consultar CEP', 'viacep', causa);
    expect(error.provider).toBe('viacep');
    expect(error.cause).toBe(causa);
    expect(error.name).toBe('ProviderError');
  });

  it('NotFoundError carrega mensagem e nome', () => {
    const error = new NotFoundError('CEP não encontrado');
    expect(error.message).toBe('CEP não encontrado');
    expect(error.name).toBe('NotFoundError');
  });
});
