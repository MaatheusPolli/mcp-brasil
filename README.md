# MCP Brasil

Servidor [MCP](https://modelcontextprotocol.io) (Model Context Protocol) escrito em TypeScript que expÃµe dados pÃºblicos brasileiros â€” CEP, CNPJ, CPF, bancos, feriados nacionais, municÃ­pios e DDD â€” como _tools_ e _resources_ para qualquer cliente MCP (Claude Desktop, Claude Code, ou uma integraÃ§Ã£o prÃ³pria).

> âš ï¸ **LicenÃ§a proprietÃ¡ria.** Este cÃ³digo Ã© disponibilizado publicamente apenas para consulta/avaliaÃ§Ã£o (ex.: portfÃ³lio). CÃ³pia, uso, execuÃ§Ã£o, modificaÃ§Ã£o ou distribuiÃ§Ã£o nÃ£o sÃ£o permitidos sem autorizaÃ§Ã£o prÃ©via e por escrito do autor. Veja [`LICENSE`](./LICENSE).

---

## Ãndice

- [VisÃ£o geral](#visÃ£o-geral)
- [Por que este projeto existe](#por-que-este-projeto-existe)
- [Tools disponÃ­veis](#tools-disponÃ­veis)
- [Resources disponÃ­veis](#resources-disponÃ­veis)
- [Transportes](#transportes)
- [Arquitetura](#arquitetura)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Stack tÃ©cnica](#stack-tÃ©cnica)
- [SeguranÃ§a e robustez](#seguranÃ§a-e-robustez)
- [EstratÃ©gia de testes](#estratÃ©gia-de-testes)
- [Executando localmente](#executando-localmente)
- [ConfiguraÃ§Ã£o (variÃ¡veis de ambiente)](#configuraÃ§Ã£o-variÃ¡veis-de-ambiente)
- [LicenÃ§a](#licenÃ§a)

---

## VisÃ£o geral

LLMs nÃ£o tÃªm, nativamente, acesso a dados cadastrais e de referÃªncia do Brasil: nÃ£o sabem o endereÃ§o de um CEP, se um CNPJ estÃ¡ ativo, quais sÃ£o os feriados nacionais de um ano, ou qual estado corresponde a um DDD. Para que um agente de IA seja Ãºtil em fluxos de cadastro, cobranÃ§a, atendimento ou integraÃ§Ã£o no contexto brasileiro, ele precisa de acesso confiÃ¡vel a esses dados â€” com validaÃ§Ã£o de entrada, cache, tratamento de falhas e mensagens de erro que o prÃ³prio modelo consiga interpretar.

O **MCP Brasil** resolve isso implementando o protocolo MCP (o padrÃ£o aberto usado pelo Claude e por um nÃºmero crescente de outros clientes de IA para conectar modelos a ferramentas e dados externos) sobre um conjunto de APIs pÃºblicas brasileiras: [BrasilAPI](https://brasilapi.com.br), [ViaCEP](https://viacep.com.br) e o [IBGE](https://servicodados.ibge.gov.br). O resultado Ã© um binÃ¡rio que roda com `npx mcp-brasil` e se conecta a qualquer cliente MCP.

## Por que este projeto existe

Este projeto nasceu como peÃ§a de portfÃ³lio tÃ©cnico, para demonstrar:

- DomÃ­nio do protocolo MCP e do SDK oficial (`@modelcontextprotocol/sdk`), incluindo _tools_, _resources_ e os dois transportes padrÃ£o (`stdio` e `streamable HTTP`).
- Engenharia de integraÃ§Ã£o de verdade: mÃºltiplos providers HTTP com _fallback_, cache com TTL, _rate limiting_ por provedor, retry com backoff, timeout, e tratamento cuidadoso de erros de API (inclusive comportamentos inconsistentes entre elas â€” ver [SeguranÃ§a e robustez](#seguranÃ§a-e-robustez)).
- TypeScript rigoroso, com validaÃ§Ã£o de schema via Zod convertida automaticamente em JSON Schema para as _tools_.
- Uma suÃ­te de testes em trÃªs camadas (unitÃ¡ria, integraÃ§Ã£o com APIs mockadas de forma realista, e _end-to-end_ com o binÃ¡rio real), com cobertura de 100% nas partes testÃ¡veis.

## Tools disponÃ­veis

| Tool                   | Entrada             | DescriÃ§Ã£o                                                                                                                                                                                       | Cache   |
| ---------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `validar_documento`    | `documento: string` | Valida CPF ou CNPJ (dÃ­gito verificador) e retorna o documento formatado. Detecta o tipo automaticamente pelo nÃºmero de dÃ­gitos. **100% offline**, nÃ£o faz nenhuma chamada de rede.              | â€”       |
| `consultar_cep`        | `cep: string`       | CEP â†’ logradouro, bairro, cidade, UF (e coordenadas, quando disponÃ­veis). Tenta o ViaCEP primeiro; se falhar por motivo de infraestrutura, cai para a BrasilAPI automaticamente.                | 24h     |
| `consultar_cnpj`       | `cnpj: string`      | CNPJ â†’ razÃ£o social, nome fantasia, situaÃ§Ã£o cadastral, atividade (CNAE), porte, endereÃ§o e sÃ³cios. Valida o dÃ­gito verificador _antes_ de consultar a API, evitando uma chamada desnecessÃ¡ria. | 1h      |
| `listar_bancos`        | â€”                   | Lista todos os bancos brasileiros registrados no Banco Central (cÃ³digo COMPE, nome, ISPB).                                                                                                      | 7 dias  |
| `consultar_banco`      | `codigo: string`    | Um banco especÃ­fico pelo cÃ³digo COMPE (ex.: `"341"` para ItaÃº).                                                                                                                                 | 7 dias  |
| `feriados`             | `ano: number`       | Feriados nacionais de um ano (data, nome, tipo).                                                                                                                                                | 30 dias |
| `consultar_municipios` | `uf: string`        | MunicÃ­pios de uma UF, com o respectivo cÃ³digo IBGE.                                                                                                                                             | 30 dias |
| `buscar_ddd`           | `ddd: string`       | Estado e lista de cidades atendidas por um DDD.                                                                                                                                                 | 30 dias |

Cada _tool_ retorna, ao mesmo tempo, um bloco de texto legÃ­vel (para o modelo ler diretamente) e um bloco `structuredContent` em JSON (para o modelo â€” ou o cÃ³digo que orquestra o agente â€” consumir de forma programÃ¡tica).

## Resources disponÃ­veis

| URI                   | DescriÃ§Ã£o                                                                                                                                 |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `brasil://uf/{sigla}` | Sigla, nome e regiÃ£o de uma unidade federativa, via IBGE. Ex.: `brasil://uf/SP` â†’ `{"sigla":"SP","nome":"SÃ£o Paulo","regiao":"Sudeste"}`. |

## Transportes

O servidor suporta os dois transportes definidos pela especificaÃ§Ã£o MCP:

- **`stdio`** (padrÃ£o): usado por Claude Desktop e Claude Code, que gerenciam o processo filho e conversam com ele via stdin/stdout. Todo log vai para **stderr** â€” stdout Ã© reservado exclusivamente para o canal JSON-RPC.
- **`HTTP` (streamable)**: para hospedar o servidor vocÃª mesmo. Ative com `MCP_TRANSPORT=http`; o servidor expÃµe `POST /mcp`. Roda em modo _stateless_ (cada requisiÃ§Ã£o HTTP recebe sua prÃ³pria instÃ¢ncia de servidor/transporte MCP; os caches e o rate limiter, por serem mÃ³dulos singleton, continuam compartilhados entre requisiÃ§Ãµes).

## Arquitetura

```
Cliente MCP (Claude Desktop / Code / outro)
        â”‚  JSON-RPC (stdio | HTTP)
â”Œâ”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ server/   McpServer (SDK oficial)      â”‚
â”‚   registra tools e resources           â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ tools/    uma pasta por tool           â”‚
â”‚   schema (Zod) + handler + format      â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ providers/ clients HTTP tipados        â”‚
â”‚   BrasilAPI, ViaCEP, IBGE + fallback   â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ infra/    cache, rate-limit, http,     â”‚
â”‚           logger, config               â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

PadrÃµes usados:

- **InjeÃ§Ã£o de dependÃªncia via factory**: cada handler Ã© criado por uma funÃ§Ã£o `createXHandler(deps)` que recebe o provider e o cache como dependÃªncias. Isso permite testar a lÃ³gica de cada _tool_ com providers falsos, sem tocar a rede, e ainda assim conectar instÃ¢ncias reais no `index.ts` de cada _tool_.
- **Provider com fallback**: `FallbackCepProvider` tenta o ViaCEP e, sÃ³ em caso de falha de infraestrutura (nÃ£o de "CEP nÃ£o existe"), cai para a BrasilAPI. Um CEP genuinamente inexistente nunca Ã© mascarado tentando o prÃ³ximo provider.
- **Cache com deduplicaÃ§Ã£o de chamadas concorrentes**: `Cache.getOrLoad` guarda a _promise_ em andamento por chave, entÃ£o duas chamadas simultÃ¢neas para o mesmo CEP disparam **uma** requisiÃ§Ã£o de rede, nÃ£o duas.
- **Rate limiting por provedor**: um _token bucket_ por nome de provider (`viacep`, `brasilapi`, `ibge`), aplicado de forma transparente em toda chamada HTTP, para nÃ£o abusar das APIs pÃºblicas gratuitas usadas pelo servidor.

## Estrutura de pastas

```
mcp-brasil/
â”œâ”€â”€ bin/mcp-brasil.js            # entry point do npx
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ index.ts                 # bootstrap + escolha de transporte
â”‚   â”œâ”€â”€ server/
â”‚   â”‚   â”œâ”€â”€ create-server.ts     # instancia o McpServer e registra tools/resources
â”‚   â”‚   â””â”€â”€ transports/{stdio,http}.ts
â”‚   â”œâ”€â”€ tools/                   # uma pasta por tool: schema.ts, handler.ts, format.ts, index.ts
â”‚   â”œâ”€â”€ providers/                # clients HTTP tipados + fallback
â”‚   â”œâ”€â”€ resources/                 # resources MCP (uf.resource.ts)
â”‚   â”œâ”€â”€ infra/                    # cache, rate-limit, http (retry/timeout), logger, config
â”‚   â””â”€â”€ domain/                   # algoritmos de CPF/CNPJ, erros de domÃ­nio
â”œâ”€â”€ tests/
â”‚   â”œâ”€â”€ unit/                    # algoritmos, cache, rate limiter, handlers com providers fake
â”‚   â”œâ”€â”€ integration/              # providers reais contra APIs mockadas (MSW), servidor via InMemoryTransport
â”‚   â””â”€â”€ e2e/                      # binÃ¡rio real via stdio e via HTTP
â””â”€â”€ examples/                     # configs de exemplo para Claude Desktop e Claude Code
```

## Stack tÃ©cnica

| Camada            | Tecnologia                            | Motivo                                                |
| ----------------- | ------------------------------------- | ----------------------------------------------------- |
| Protocolo         | `@modelcontextprotocol/sdk`           | SDK oficial do MCP                                    |
| ValidaÃ§Ã£o         | Zod                                   | Schemas viram JSON Schema das _tools_ automaticamente |
| HTTP              | `fetch` nativo (Node 20+) + `p-retry` | Sem dependÃªncias pesadas tipo axios                   |
| Cache             | `lru-cache`                           | TTL e limite de memÃ³ria configurÃ¡veis                 |
| Build             | `tsup`                                | Gera um Ãºnico bundle ESM executÃ¡vel via `npx`         |
| Testes            | Vitest + MSW                          | Determinismo â€” nenhum teste depende de rede real      |
| Lint / FormataÃ§Ã£o | ESLint + Prettier                     |                                                       |

## SeguranÃ§a e robustez

Pontos que foram verificados e endurecidos deliberadamente, nÃ£o sÃ³ assumidos:

- **Rate limiting real**: cada chamada HTTP passa por um _token bucket_ por provedor antes de sair. NÃ£o Ã© apenas uma classe isolada com testes â€” estÃ¡ de fato no caminho de toda requisiÃ§Ã£o (`infra/http.ts`).
- **ValidaÃ§Ã£o de entrada em todas as _tools_**: schemas Zod com limites de tamanho (`.max()`) em todo campo de texto, evitando payloads arbitrariamente grandes. O _resource_ `brasil://uf/{sigla}` â€” que nÃ£o passa pela validaÃ§Ã£o automÃ¡tica do SDK, diferente das _tools_ â€” tem validaÃ§Ã£o de formato prÃ³pria antes de montar a URL de saÃ­da.
- **Limite de tamanho de corpo no transporte HTTP**: requisiÃ§Ãµes acima de 1 MiB sÃ£o rejeitadas com `413`, evitando um vetor de exaustÃ£o de memÃ³ria.
- **Tratamento de erro 4xx sem retry inÃºtil**: qualquer erro 4xx (nÃ£o sÃ³ 404) Ã© tratado como "nÃ£o encontrado", sem consumir tentativas de retry â€” importante porque as APIs pÃºblicas usadas aqui sÃ£o inconsistentes entre si (a BrasilAPI responde `400` para um DDD malformado e `404` para um banco inexistente; o IBGE responde `200` com corpo vazio para uma UF inexistente). Cada uma dessas variaÃ§Ãµes foi observada contra a API real e coberta por teste.
- **Nunca expÃµe stack trace ao cliente**: toda falha de provider vira uma mensagem de erro legÃ­vel (`isError: true` no formato MCP), nunca um erro bruto do runtime.
- **Logs sempre em stderr**: nunca poluem o canal JSON-RPC do transporte `stdio`.
- **Sem segredos**: todas as APIs usadas sÃ£o pÃºblicas e nÃ£o exigem chave de API, token ou credencial de nenhum tipo.
- **`npm audit` limpo em produÃ§Ã£o**: `npm audit --omit=dev` nÃ£o acusa nenhuma vulnerabilidade nas dependÃªncias que de fato vÃ£o para o pacote publicado (as Ãºnicas vulnerabilidades reportadas pelo `npm audit` padrÃ£o sÃ£o em ferramentas de desenvolvimento â€” `vitest`/`vite`/`esbuild` â€” e nÃ£o afetam o cÃ³digo em execuÃ§Ã£o).

## EstratÃ©gia de testes

TrÃªs camadas, sem sobreposiÃ§Ã£o de responsabilidade:

- **UnitÃ¡rios** (`tests/unit`): algoritmos de CPF/CNPJ contra casos vÃ¡lidos/invÃ¡lidos conhecidos; cache (incluindo expiraÃ§Ã£o por TTL e deduplicaÃ§Ã£o de chamadas concorrentes); rate limiter (incluindo bloqueio, liberaÃ§Ã£o por refill e reset entre testes); handler de cada _tool_, isoladamente, com um provider _fake_ injetado â€” sem tocar em rede.
- **IntegraÃ§Ã£o** (`tests/integration`): os providers HTTP _reais_ (`ViaCepProvider`, `BrasilApiClient`, `IbgeClient`) testados contra respostas mockadas com [MSW](https://mswjs.io/), com _fixtures_ fiÃ©is ao formato exato das respostas reais dessas APIs (verificadas manualmente contra produÃ§Ã£o durante o desenvolvimento); o servidor MCP completo testado via `InMemoryTransport` do SDK oficial, cobrindo o fluxo real de `tools/list` e `tools/call`.
- **E2E** (`tests/e2e`): o binÃ¡rio publicado (`bin/mcp-brasil.js`) executado como processo real, com handshake MCP genuÃ­no tanto via `stdio` quanto via HTTP (incluindo o limite de tamanho de corpo).

## Executando localmente

PrÃ©-requisito: Node.js 20+.

```bash
npm install
npm run dev              # roda via stdio, com hot-reload via tsx
npm test                 # build + suÃ­te completa (unit + integraÃ§Ã£o + e2e)
npm run test:coverage    # com relatÃ³rio de cobertura
npm run lint
npm run typecheck
npm run format:check     # verifica formataÃ§Ã£o (Prettier)
npm run build            # gera dist/ (ESM + tipos)
```

Para testar manualmente contra um cliente MCP local, aponte-o para `node bin/mcp-brasil.js` (transporte `stdio`) â€” exemplos prontos de configuraÃ§Ã£o em [`examples/claude_desktop_config.json`](./examples/claude_desktop_config.json) e [`examples/claude-code.md`](./examples/claude-code.md).

## ConfiguraÃ§Ã£o (variÃ¡veis de ambiente)

| VariÃ¡vel        | PadrÃ£o  | DescriÃ§Ã£o                                                  |
| --------------- | ------- | ---------------------------------------------------------- |
| `MCP_TRANSPORT` | `stdio` | `stdio` ou `http`.                                         |
| `MCP_PORT`      | `3000`  | Porta usada quando `MCP_TRANSPORT=http`.                   |
| `LOG_LEVEL`     | `info`  | `debug`, `info`, `warn` ou `error`. Logs sempre em stderr. |

## LicenÃ§a

Este projeto **nÃ£o Ã© open source**. Todos os direitos sÃ£o reservados ao autor â€” cÃ³pia, uso, execuÃ§Ã£o, modificaÃ§Ã£o e distribuiÃ§Ã£o sÃ£o proibidos sem autorizaÃ§Ã£o prÃ©via e por escrito. O texto completo estÃ¡ em [`LICENSE`](./LICENSE).


## Licença

### Uso Pessoal
Este projeto é licenciado sob a **Licença MIT** para uso pessoal, educacional e não comercial.

### Uso Comercial
Se você deseja usar este projeto comercialmente, deve obter uma licença comercial do autor.

**Uso comercial inclui:**
- Incorporar em um produto comercial
- Oferecer como serviço
- Usar em atividades com fins lucrativos
- Implantação empresarial

**Para obter uma licença comercial:**
Email: ma.polli@hotmail.com
