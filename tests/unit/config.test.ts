import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/infra/config.js';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('loadConfig', () => {
  it('usa stdio como transporte padrão', () => {
    delete process.env.MCP_TRANSPORT;
    expect(loadConfig().transport).toBe('stdio');
  });

  it('aceita transporte http explícito', () => {
    process.env.MCP_TRANSPORT = 'http';
    expect(loadConfig().transport).toBe('http');
  });

  it('cai para stdio em valor desconhecido', () => {
    process.env.MCP_TRANSPORT = 'websocket';
    expect(loadConfig().transport).toBe('stdio');
  });

  it('lê porta e log level do ambiente', () => {
    process.env.MCP_PORT = '8080';
    process.env.LOG_LEVEL = 'debug';
    const config = loadConfig();
    expect(config.port).toBe(8080);
    expect(config.logLevel).toBe('debug');
  });

  it('usa porta padrão 3000 quando não definida', () => {
    delete process.env.MCP_PORT;
    expect(loadConfig().port).toBe(3000);
  });
});
