export type Transport = 'stdio' | 'http';

function parseTransport(value: string | undefined): Transport {
  return value === 'http' ? 'http' : 'stdio';
}

export function loadConfig() {
  return {
    transport: parseTransport(process.env.MCP_TRANSPORT),
    port: Number(process.env.MCP_PORT ?? 3000),
    logLevel: process.env.LOG_LEVEL ?? 'info',
  };
}
