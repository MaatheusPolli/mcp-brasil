# MCP Brasil

Servidor [MCP](https://modelcontextprotocol.io) (Model Context Protocol) escrito em TypeScript que expõe dados públicos brasileiros — CEP, CNPJ, CPF, bancos, feriados nacionais, municípios e DDD — como _tools_ e _resources_ para qualquer cliente MCP (Claude Desktop, Claude Code, ou uma integração própria).

> ⚠️ **Licença proprietária.** Este código é disponibilizado publicamente apenas para consulta/avaliação (ex.: portfólio). Cópia, uso, execução, modificação ou distribuição não são permitidos sem autorização prévia e por escrito do autor. Veja [`LICENSE`](./LICENSE).

---

## Índice

- [Visão geral](#visão-geral)
- [Por que este projeto existe](#por-que-este-projeto-existe)
- [Tools disponíveis](#tools-disponíveis)
- [Resources disponíveis](#resources-disponíveis)
- [Transportes](#transportes)
- [Arquitetura](#arquitetura)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Stack técnica](#stack-técnica)
- [Segurança e robustez](#segurança-e-robustez)
- [Estratégia de testes](#estratégia-de-testes)
- [Executando localmente](#executando-localmente)
- [Configuração (variáveis de ambiente)](#configuração-variáveis-de-ambiente)
- [Licença](#licença)

---

## Visão geral

LLMs não têm, nativamente, acesso a dados cadastrais e de referência do Brasil: não sabem o endereço de um CEP, se um CNPJ está ativo, quais são os feriados nacionais de um ano, ou qual estado corresponde a um DDD. Para que um agente de IA seja útil em fluxos de cadastro, cobrança, atendimento ou integração no contexto brasileiro, ele precisa de acesso confiável a esses dados — com validação de entrada, cache, tratamento de falhas e mensagens de erro que o próprio modelo consiga interpretar.

O **MCP Brasil** resolve isso implementando o protocolo MCP (o padrão aberto usado pelo Claude e por um número crescente de outros clientes de IA para conectar modelos a ferramentas e dados externos) sobre um conjunto de APIs públicas brasileiras: [BrasilAPI](https://brasilapi.com.br), [ViaCEP](https://viacep.com.br) e o [IBGE](https://servicodados.ibge.gov.br). O resultado é um binário que roda com `npx mcp-brasil` e se conecta a qualquer cliente MCP.

## Por que este projeto existe

Este projeto nasceu como peça de portfólio técnico, para demonstrar:

- Domínio do protocolo MCP e do SDK oficial (`@modelcontextprotocol/sdk`), incluindo _tools_, _resources_ e os dois transportes padrão (`stdio` e `streamable HTTP`).
- Engenharia de integração de verdade: múltiplos providers HTTP com _fallback_, cache com TTL, _rate limiting_ por provedor, retry com backoff, timeout, e tratamento cuidadoso de erros de API (inclusive comportamentos inconsistentes entre elas — ver [Segurança e robustez](#segurança-e-robustez)).
- TypeScript rigoroso, com validação de schema via Zod convertida automaticamente em JSON Schema para as _tools_.
- Uma suíte de testes em três camadas (unitária, integração com APIs mockadas de forma realista, e _end-to-end_ com o binário real), com cobertura de 100% nas partes testáveis.

## Tools disponíveis

| Tool                   | Entrada             | Descrição                                                                                                                                                                                       | Cache   |
| ---------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `validar_documento`    | `documento: string` | Valida CPF ou CNPJ (dígito verificador) e retorna o documento formatado. Detecta o tipo automaticamente pelo número de dígitos. **100% offline**, não faz nenhuma chamada de rede.              | —       |
| `consultar_cep`        | `cep: string`       | CEP → logradouro, bairro, cidade, UF (e coordenadas, quando disponíveis). Tenta o ViaCEP primeiro; se falhar por motivo de infraestrutura, cai para a BrasilAPI automaticamente.                | 24h     |
| `consultar_cnpj`       | `cnpj: string`      | CNPJ → razão social, nome fantasia, situação cadastral, atividade (CNAE), porte, endereço e sócios. Valida o dígito verificador _antes_ de consultar a API, evitando uma chamada desnecessária. | 1h      |
| `listar_bancos`        | —                   | Lista todos os bancos brasileiros registrados no Banco Central (código COMPE, nome, ISPB).                                                                                                      | 7 dias  |
| `consultar_banco`      | `codigo: string`    | Um banco específico pelo código COMPE (ex.: `"341"` para Itaú).                                                                                                                                 | 7 dias  |
| `feriados`             | `ano: number`       | Feriados nacionais de um ano (data, nome, tipo).                                                                                                                                                | 30 dias |
| `consultar_municipios` | `uf: string`        | Municípios de uma UF, com o respectivo código IBGE.                                                                                                                                             | 30 dias |
| `buscar_ddd`           | `ddd: string`       | Estado e lista de cidades atendidas por um DDD.                                                                                                                                                 | 30 dias |

Cada _tool_ retorna, ao mesmo tempo, um bloco de texto legível (para o modelo ler diretamente) e um bloco `structuredContent` em JSON (para o modelo — ou o código que orquestra o agente — consumir de forma programática).

## Resources disponíveis

| URI                   | Descrição                                                                                                                                 |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `brasil://uf/{sigla}` | Sigla, nome e região de uma unidade federativa, via IBGE. Ex.: `brasil://uf/SP` → `{"sigla":"SP","nome":"São Paulo","regiao":"Sudeste"}`. |

## Transportes

O servidor suporta os dois transportes definidos pela especificação MCP:

- **`stdio`** (padrão): usado por Claude Desktop e Claude Code, que gerenciam o processo filho e conversam com ele via stdin/stdout. Todo log vai para **stderr** — stdout é reservado exclusivamente para o canal JSON-RPC.
- **`HTTP` (streamable)**: para hospedar o servidor você mesmo. Ative com `MCP_TRANSPORT=http`; o servidor expõe `POST /mcp`. Roda em modo _stateless_ (cada requisição HTTP recebe sua própria instância de servidor/transporte MCP; os caches e o rate limiter, por serem módulos singleton, continuam compartilhados entre requisições).

## Arquitetura

```
Cliente MCP (Claude Desktop / Code / outro)
        │  JSON-RPC (stdio | HTTP)
┌───────▼────────────────────────────────┐
│ server/   McpServer (SDK oficial)      │
│   registra tools e resources           │
├─────────────────────────────────────────┤
│ tools/    uma pasta por tool           │
│   schema (Zod) + handler + format      │
├─────────────────────────────────────────┤
│ providers/ clients HTTP tipados        │
│   BrasilAPI, ViaCEP, IBGE + fallback   │
├─────────────────────────────────────────┤
│ infra/    cache, rate-limit, http,     │
│           logger, config               │
└─────────────────────────────────────────┘
```

Padrões usados:

- **Injeção de dependência via factory**: cada handler é criado por uma função `createXHandler(deps)` que recebe o provider e o cache como dependências. Isso permite testar a lógica de cada _tool_ com providers falsos, sem tocar a rede, e ainda assim conectar instâncias reais no `index.ts` de cada _tool_.
- **Provider com fallback**: `FallbackCepProvider` tenta o ViaCEP e, só em caso de falha de infraestrutura (não de "CEP não existe"), cai para a BrasilAPI. Um CEP genuinamente inexistente nunca é mascarado tentando o próximo provider.
- **Cache com deduplicação de chamadas concorrentes**: `Cache.getOrLoad` guarda a _promise_ em andamento por chave, então duas chamadas simultâneas para o mesmo CEP disparam **uma** requisição de rede, não duas.
- **Rate limiting por provedor**: um _token bucket_ por nome de provider (`viacep`, `brasilapi`, `ibge`), aplicado de forma transparente em toda chamada HTTP, para não abusar das APIs públicas gratuitas usadas pelo servidor.

## Estrutura de pastas

```
mcp-brasil/
├── bin/mcp-brasil.js            # entry point do npx
├── src/
│   ├── index.ts                 # bootstrap + escolha de transporte
│   ├── server/
│   │   ├── create-server.ts     # instancia o McpServer e registra tools/resources
│   │   └── transports/{stdio,http}.ts
│   ├── tools/                   # uma pasta por tool: schema.ts, handler.ts, format.ts, index.ts
│   ├── providers/                # clients HTTP tipados + fallback
│   ├── resources/                 # resources MCP (uf.resource.ts)
│   ├── infra/                    # cache, rate-limit, http (retry/timeout), logger, config
│   └── domain/                   # algoritmos de CPF/CNPJ, erros de domínio
├── tests/
│   ├── unit/                    # algoritmos, cache, rate limiter, handlers com providers fake
│   ├── integration/              # providers reais contra APIs mockadas (MSW), servidor via InMemoryTransport
│   └── e2e/                      # binário real via stdio e via HTTP
└── examples/                     # configs de exemplo para Claude Desktop e Claude Code
```

## Stack técnica

| Camada            | Tecnologia                            | Motivo                                                |
| ----------------- | ------------------------------------- | ----------------------------------------------------- |
| Protocolo         | `@modelcontextprotocol/sdk`           | SDK oficial do MCP                                    |
| Validação         | Zod                                   | Schemas viram JSON Schema das _tools_ automaticamente |
| HTTP              | `fetch` nativo (Node 20+) + `p-retry` | Sem dependências pesadas tipo axios                   |
| Cache             | `lru-cache`                           | TTL e limite de memória configuráveis                 |
| Build             | `tsup`                                | Gera um único bundle ESM executável via `npx`         |
| Testes            | Vitest + MSW                          | Determinismo — nenhum teste depende de rede real      |
| Lint / Formatação | ESLint + Prettier                     |                                                       |

## Segurança e robustez

Pontos que foram verificados e endurecidos deliberadamente, não só assumidos:

- **Rate limiting real**: cada chamada HTTP passa por um _token bucket_ por provedor antes de sair. Não é apenas uma classe isolada com testes — está de fato no caminho de toda requisição (`infra/http.ts`).
- **Validação de entrada em todas as _tools_**: schemas Zod com limites de tamanho (`.max()`) em todo campo de texto, evitando payloads arbitrariamente grandes. O _resource_ `brasil://uf/{sigla}` — que não passa pela validação automática do SDK, diferente das _tools_ — tem validação de formato própria antes de montar a URL de saída.
- **Limite de tamanho de corpo no transporte HTTP**: requisições acima de 1 MiB são rejeitadas com `413`, evitando um vetor de exaustão de memória.
- **Tratamento de erro 4xx sem retry inútil**: qualquer erro 4xx (não só 404) é tratado como "não encontrado", sem consumir tentativas de retry — importante porque as APIs públicas usadas aqui são inconsistentes entre si (a BrasilAPI responde `400` para um DDD malformado e `404` para um banco inexistente; o IBGE responde `200` com corpo vazio para uma UF inexistente). Cada uma dessas variações foi observada contra a API real e coberta por teste.
- **Nunca expõe stack trace ao cliente**: toda falha de provider vira uma mensagem de erro legível (`isError: true` no formato MCP), nunca um erro bruto do runtime.
- **Logs sempre em stderr**: nunca poluem o canal JSON-RPC do transporte `stdio`.
- **Sem segredos**: todas as APIs usadas são públicas e não exigem chave de API, token ou credencial de nenhum tipo.
- **`npm audit` limpo em produção**: `npm audit --omit=dev` não acusa nenhuma vulnerabilidade nas dependências que de fato vão para o pacote publicado (as únicas vulnerabilidades reportadas pelo `npm audit` padrão são em ferramentas de desenvolvimento — `vitest`/`vite`/`esbuild` — e não afetam o código em execução).

## Estratégia de testes

Três camadas, sem sobreposição de responsabilidade:

- **Unitários** (`tests/unit`): algoritmos de CPF/CNPJ contra casos válidos/inválidos conhecidos; cache (incluindo expiração por TTL e deduplicação de chamadas concorrentes); rate limiter (incluindo bloqueio, liberação por refill e reset entre testes); handler de cada _tool_, isoladamente, com um provider _fake_ injetado — sem tocar em rede.
- **Integração** (`tests/integration`): os providers HTTP _reais_ (`ViaCepProvider`, `BrasilApiClient`, `IbgeClient`) testados contra respostas mockadas com [MSW](https://mswjs.io/), com _fixtures_ fiéis ao formato exato das respostas reais dessas APIs (verificadas manualmente contra produção durante o desenvolvimento); o servidor MCP completo testado via `InMemoryTransport` do SDK oficial, cobrindo o fluxo real de `tools/list` e `tools/call`.
- **E2E** (`tests/e2e`): o binário publicado (`bin/mcp-brasil.js`) executado como processo real, com handshake MCP genuíno tanto via `stdio` quanto via HTTP (incluindo o limite de tamanho de corpo).

## Executando localmente

Pré-requisito: Node.js 20+.

```bash
npm install
npm run dev              # roda via stdio, com hot-reload via tsx
npm test                 # build + suíte completa (unit + integração + e2e)
npm run test:coverage    # com relatório de cobertura
npm run lint
npm run typecheck
npm run format:check     # verifica formatação (Prettier)
npm run build            # gera dist/ (ESM + tipos)
```

Para testar manualmente contra um cliente MCP local, aponte-o para `node bin/mcp-brasil.js` (transporte `stdio`) — exemplos prontos de configuração em [`examples/claude_desktop_config.json`](./examples/claude_desktop_config.json) e [`examples/claude-code.md`](./examples/claude-code.md).

## Configuração (variáveis de ambiente)

| Variável        | Padrão  | Descrição                                                  |
| --------------- | ------- | ---------------------------------------------------------- |
| `MCP_TRANSPORT` | `stdio` | `stdio` ou `http`.                                         |
| `MCP_PORT`      | `3000`  | Porta usada quando `MCP_TRANSPORT=http`.                   |
| `LOG_LEVEL`     | `info`  | `debug`, `info`, `warn` ou `error`. Logs sempre em stderr. |

## Licença

Este projeto **não é open source**. Todos os direitos são reservados ao autor — cópia, uso, execução, modificação e distribuição são proibidos sem autorização prévia e por escrito. O texto completo está em [`LICENSE`](./LICENSE).
