# MCP Brasil

Servidor [MCP](https://modelcontextprotocol.io) em TypeScript que expõe dados públicos brasileiros — CEP, CNPJ, CPF, bancos, feriados, municípios e DDD — como tools para Claude Desktop, Claude Code e qualquer cliente MCP.

> Status: em desenvolvimento. Veja o [planejamento completo](./planejamento.md) e o roadmap abaixo.

## Instalação

```bash
npx mcp-brasil
```

### Claude Desktop

Adicione em `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mcp-brasil": {
      "command": "npx",
      "args": ["mcp-brasil"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add mcp-brasil -- npx mcp-brasil
```

## Tools

| Tool | Descrição | Status |
|------|-----------|--------|
| `validar_documento` | Valida CPF/CNPJ (dígitos verificadores) e formata. Offline. | ✅ |
| `consultar_cep` | CEP → endereço completo (fallback ViaCEP → BrasilAPI). | 🔜 |
| `consultar_cnpj` | CNPJ → razão social, situação, CNAE, sócios. | 🔜 |
| `listar_bancos` / `consultar_banco` | Código COMPE → nome, ISPB. | 🔜 |
| `feriados` | Feriados nacionais de um ano. | 🔜 |
| `consultar_municipios` | UF → municípios com código IBGE. | 🔜 |
| `buscar_ddd` | DDD → estado e cidades. | 🔜 |

## Desenvolvimento

```bash
npm install
npm run dev        # roda via stdio com tsx
npm test           # testes unitários + e2e
npm run test:coverage
npm run lint
npm run typecheck
npm run build
```

## Licença

MIT
