import { describe, expect, it } from 'vitest';
import { validarDocumentoHandler } from '../../../src/tools/validar-documento/handler.js';

describe('validarDocumentoHandler', () => {
  it('retorna válido para CPF correto', () => {
    const result = validarDocumentoHandler({ documento: '111.444.777-35' });
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual({
      tipo: 'CPF',
      documento: '111.444.777-35',
      valido: true,
    });
    expect(result.content[0]?.text).toContain('válido');
  });

  it('retorna inválido para CNPJ com dígito verificador errado', () => {
    const result = validarDocumentoHandler({ documento: '11.222.333/0001-82' });
    expect(result.structuredContent?.valido).toBe(false);
    expect(result.content[0]?.text).toContain('inválido');
  });

  it('retorna erro amigável para tamanho não reconhecido', () => {
    const result = validarDocumentoHandler({ documento: '123' });
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain('não tem tamanho válido');
  });
});
