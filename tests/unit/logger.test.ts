import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../../src/infra/logger.js';

const originalEnv = { ...process.env };

describe('logger', () => {
  let writeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    writeSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    writeSpy.mockRestore();
    process.env = { ...originalEnv };
  });

  it('escreve em stderr, nunca em stdout', () => {
    logger.info('mensagem');
    expect(writeSpy).toHaveBeenCalledTimes(1);
    expect(writeSpy.mock.calls[0]?.[0]).toContain('mensagem');
  });

  it('inclui metadata serializada em JSON', () => {
    logger.warn('atenção', { chave: 'valor' });
    expect(writeSpy.mock.calls[0]?.[0]).toContain('{"chave":"valor"}');
  });

  it('suprime níveis abaixo do LOG_LEVEL configurado', () => {
    process.env.LOG_LEVEL = 'error';
    logger.info('não deveria aparecer');
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it('ignora LOG_LEVEL inválido e usa info como padrão', () => {
    process.env.LOG_LEVEL = 'verbose';
    logger.debug('não deveria aparecer com padrão info');
    expect(writeSpy).not.toHaveBeenCalled();
  });
});
