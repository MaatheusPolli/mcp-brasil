# MCP Brasil — Planejamento do Projeto

> Servidor MCP (Model Context Protocol) em TypeScript que expõe dados públicos brasileiros — CEP, CNPJ, bancos, feriados, IBGE — como tools para Claude Desktop, Claude Code e qualquer cliente MCP.

## 1. Visão geral

### Problema
LLMs não sabem o endereço de um CEP nem a situação cadastral de um CNPJ. Para usar IA em fluxos de cadastro, cobrança ou integração no Brasil, é preciso dar ao modelo acesso confiável a esses dados. O MCP é o padrão aberto para isso, mas quase não há servidores para dados brasileiros.

### Solução
Um pacote npm `mcp-brasil`, executável com `npx mcp-brasil`, que registra tools bem documentadas sobre APIs públicas (BrasilAPI, ViaCEP, IBGE), com cache, rate limiting, validação de entrada e respostas formatadas para consumo por LLM. Transporte `stdio` (padrão) e `streamable HTTP` (para hospedar).

### Objetivos de portfólio
- Demonstrar domínio do protocolo MCP e do SDK oficial.
- TypeScript com validação de schema (Zod → JSON Schema das tools).
- Engenharia de integração: retry, cache, fallback entre provedores, observabilidade.
- Post no LinkedIn: GIF do Claude consultando um CNPJ e preenchendo um cadastro.

### Fora de escopo (v1)
- Dados que exigem autenticação/certificado (SEFAZ, Receita direta).
- Resources e Prompts MCP além do básico (candidatos a v2).

## 2. Requisitos

### Funcionais
| ID | Tool | Descrição |
|----|------|-----------|
| RF01 | `consultar_cep` | CEP → logradouro, bairro, cidade, UF, IBGE, coordenadas. Fallback ViaCEP → BrasilAPI. |
| RF02 | `consultar_cnpj` | CNPJ → razão social, fantasia, situação, CNAE, endereço, sócios, porte. |
| RF03 | `validar_documento` | Valida CPF/CNPJ (dígitos verificadores) e formata. Offline. |
| RF04 | `listar_bancos` / `consultar_banco` | Código COMPE → nome, ISPB. |
| RF05 | `feriados` | Feriados nacionais de um ano. |
| RF06 | `consultar_municipios` | UF → municípios com código IBGE. |
| RF07 | `buscar_ddd` | DDD → estado e cidades. |
| RF08 | Resource `brasil://uf/{sigla}` | Dados básicos da UF. |
| RF09 | Transporte stdio e HTTP; seleção por flag/env. |
| RF10 | Cache em memória com TTL por tool (CEP 24h, CNPJ 1h, bancos 7d). |

### Não funcionais
- Latência p95 < 800 ms sem cache; < 5 ms com cache.
- Nunca expor stack trace ao cliente; erros em formato MCP (`isError: true`, mensagem legível ao LLM).
- Respeitar rate limits das APIs (token bucket por provedor).
- Zero dependências pesadas; startup < 300 ms.
- Cobertura ≥ 90%.

## 3. Arquitetura

```
Cliente MCP (Claude Desktop / Code)
        │  JSON-RPC (stdio | HTTP)
┌───────▼──────────────────────────────┐
│ server/  McpServer (SDK oficial)     │
│   registra tools, resources          │
├──────────────────────────────────────┤
│ tools/   uma pasta por tool          │
│   schema (Zod) + handler + formatter │
├──────────────────────────────────────┤
│ providers/ clients HTTP tipados      │
│   brasilapi, viacep, ibge            │
│   + fallback chain                   │
├──────────────────────────────────────┤
│ infra/   cache, rate-limit, http,    │
│          logger, config              │
└──────────────────────────────────────┘
```

### Padrões
- **Tool = módulo autocontido**: `schema.ts` (Zod input), `handler.ts` (orquestra providers), `format.ts` (texto + JSON estruturado otimizado para LLM), `index.ts` (registro).
- **Provider pattern com fallback**: `CepProvider` é uma interface; `FallbackCepProvider` tenta ViaCEP e cai para BrasilAPI. Facilita mock nos testes.
- **Resposta dupla**: cada tool retorna `content` com um bloco de texto legível e um bloco JSON (`structuredContent`), para o modelo escolher.
- **Config por env**: `MCP_TRANSPORT`, `MCP_PORT`, `CACHE_TTL_*`, `LOG_LEVEL`.

### Exemplo de tool

```ts
export const consultarCepSchema = z.object({
  cep: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP deve ter 8 dígitos'),
});

export async function consultarCepHandler(
  { cep }: z.infer<typeof consultarCepSchema>,
  deps: { cepProvider: CepProvider; cache: Cache },
): Promise<ToolResult> { /* ... */ }
```

## 4. Estrutura de pastas

```
mcp-brasil/
├── .github/workflows/ci.yml
├── package.json  tsconfig.json  tsup.config.ts  vitest.config.ts
├── README.md  CHANGELOG.md  LICENSE
├── bin/mcp-brasil.js                # entry `npx`
├── src/
│   ├── index.ts                     # bootstrap + escolha de transporte
│   ├── server/
│   │   ├── create-server.ts         # instancia McpServer e registra tudo
│   │   ├── transports/stdio.ts
│   │   └── transports/http.ts
│   ├── tools/
│   │   ├── registry.ts              # lista de tools
│   │   ├── consultar-cep/ {schema,handler,format,index}.ts
│   │   ├── consultar-cnpj/…
│   │   ├── validar-documento/…
│   │   ├── bancos/…
│   │   ├── feriados/…
│   │   ├── municipios/…
│   │   └── ddd/…
│   ├── resources/
│   │   └── uf.resource.ts
│   ├── providers/
│   │   ├── types.ts                 # interfaces CepProvider, CnpjProvider…
│   │   ├── brasilapi.client.ts
│   │   ├── viacep.client.ts
│   │   ├── ibge.client.ts
│   │   └── fallback.ts
│   ├── infra/
│   │   ├── http.ts                  # fetch com timeout + retry
│   │   ├── cache.ts                 # LRU + TTL
│   │   ├── rate-limit.ts
│   │   ├── logger.ts                # stderr (stdio não pode usar stdout)
│   │   └── config.ts
│   └── domain/
│       ├── documentos.ts            # algoritmos CPF/CNPJ
│       └── errors.ts
├── tests/
│   ├── unit/
│   │   ├── documentos.test.ts
│   │   ├── cache.test.ts
│   │   ├── rate-limit.test.ts
│   │   └── tools/*.test.ts          # handlers com providers mock
│   ├── integration/
│   │   ├── server.test.ts           # cliente MCP in-memory chama tools reais (providers mock via MSW)
│   │   └── fixtures/                # respostas gravadas das APIs
│   └── e2e/
│       └── stdio.test.ts            # spawn do binário e handshake MCP
└── examples/
    ├── claude_desktop_config.json
    └── claude-code.md               # `claude mcp add`
```

## 5. Stack

| Camada | Tecnologia | Motivo |
|--------|-----------|--------|
| Protocolo | `@modelcontextprotocol/sdk` | SDK oficial |
| Validação | Zod | schemas viram JSON Schema das tools |
| HTTP | `fetch` nativo (Node 20+) + `p-retry` | sem axios |
| Cache | `lru-cache` | TTL e limite de memória |
| Build | tsup (ESM, `#!/usr/bin/env node`) | binário npx |
| Testes | Vitest + MSW (mock HTTP) | determinismo |
| Lint | ESLint + Prettier | |
| Release | changesets + `npm publish` no CI em tag | versionamento |

## 6. Estratégia de testes

- **Unitários**: algoritmos de CPF/CNPJ com tabela de casos válidos/inválidos; cache expira; rate limit bloqueia e libera.
- **Handlers**: cada tool com provider mock — sucesso, não encontrado, timeout, entrada inválida (mensagem de erro amigável ao LLM).
- **Integração**: `InMemoryTransport` do SDK conecta um cliente MCP ao servidor; `tools/list` retorna schemas esperados; `tools/call` retorna `content` correto; providers HTTP mockados por MSW com fixtures gravadas.
- **E2E**: spawn `node bin/mcp-brasil.js`, handshake `initialize`, chamada de `validar_documento` (offline).
- **Contrato**: snapshot dos JSON Schemas das tools — mudanças exigem revisão.

## 7. Boas práticas adotadas

- Logs sempre em **stderr** (stdout é o canal JSON-RPC no stdio).
- Descrições de tools escritas para o modelo: quando usar, formato de entrada, exemplo.
- Timeout e retry com backoff em toda chamada externa; nunca propagar erro bruto.
- Nenhum dado pessoal em logs; CNPJ mascarado nos logs de info.
- Sem estado global mutável; dependências injetadas nos handlers.
- README com: instalação em 1 comando, tabela de tools, config do Claude Desktop, GIF.

## 8. Roadmap

| Etapa | Entregas | Estimativa |
|-------|----------|-----------|
| 1. Setup | scaffold, SDK, transporte stdio, `validar_documento`, CI | 2h |
| 2. Infra | http com retry, cache, rate limit, logger, config | 2h |
| 3. Providers + tools | CEP (fallback), CNPJ, bancos, feriados, municípios, DDD | 4h |
| 4. Resource + HTTP | resource UF, transporte HTTP | 1h |
| 5. Testes | unit, integração MSW, e2e stdio | 3h |
| 6. Publicação | README, exemplos de config, npm publish, GIF, post | 2h |

**Total: ~14h (2 dias)**

## 9. Definition of Done

- [ ] `npx mcp-brasil` funciona no Claude Desktop e Claude Code.
- [ ] Todas as tools listadas com schema e testadas; cobertura ≥ 90%.
- [ ] Pacote publicado no npm.
- [ ] README com config pronta para copiar.
- [ ] Post no LinkedIn com GIF de consulta de CNPJ.
