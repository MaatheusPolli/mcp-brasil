import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import path from 'node:path';

const BIN_PATH = path.resolve(__dirname, '../../bin/mcp-brasil.js');

describe('e2e stdio', () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    transport = new StdioClientTransport({ command: 'node', args: [BIN_PATH] });
    client = new Client({ name: 'test-client', version: '1.0.0' });
    await client.connect(transport);
  });

  afterAll(async () => {
    await client.close();
  });

  it('faz o handshake e lista as tools', async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toContain('validar_documento');
  });

  it('chama validar_documento via protocolo MCP', async () => {
    const result = await client.callTool({
      name: 'validar_documento',
      arguments: { documento: '111.444.777-35' },
    });
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual({
      tipo: 'CPF',
      documento: '111.444.777-35',
      valido: true,
    });
  });
});
