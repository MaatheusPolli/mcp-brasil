type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function currentLevel(): LogLevel {
  const level = process.env.LOG_LEVEL?.toLowerCase();
  return level === 'debug' || level === 'info' || level === 'warn' || level === 'error'
    ? level
    : 'info';
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (LEVELS[level] < LEVELS[currentLevel()]) return;
  const line = meta ? `${message} ${JSON.stringify(meta)}` : message;
  // stdout é o canal JSON-RPC do transporte stdio; logs sempre vão para stderr.
  process.stderr.write(`[mcp-brasil] [${level}] ${line}\n`);
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => log('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => log('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log('error', message, meta),
};
