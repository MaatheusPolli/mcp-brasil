import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { tools } from '../tools/registry.js';

const VERSION = '0.1.0';

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'mcp-brasil',
    version: VERSION,
  });

  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
      // O SDK tipa o callback pelo shape do Zod inferido em cada tool;
      // o cast aqui evita repetir a união de schemas no registry.
      tool.handler as Parameters<typeof server.registerTool>[2],
    );
  }

  return server;
}
