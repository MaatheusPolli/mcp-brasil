import { loadConfig } from './infra/config.js';
import { logger } from './infra/logger.js';
import { createServer } from './server/create-server.js';
import { startStdioTransport } from './server/transports/stdio.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const server = createServer();

  if (config.transport === 'stdio') {
    await startStdioTransport(server);
    return;
  }

  throw new Error(`Transporte "${config.transport}" ainda não implementado.`);
}

main().catch((error: unknown) => {
  logger.error('Falha ao iniciar o servidor', { error: String(error) });
  process.exit(1);
});
