# MiniFrame Tools

**The Brazilian toolkit for AI agents** — plus the web and document work agents
can't do inside a sandbox.

Ask your agent to generate a Pix payment code, resolve a CEP to a full address, or
pull a company's record from the CNPJ registry. Point it at a JavaScript-heavy page
and get clean Markdown, a screenshot or a PDF back.

A CNPJ lookup costs **$0.01** — billed per call, with no monthly plan, no contract
and no minimum, which is unusual for Brazilian data APIs.

- **API:** https://tools.miniframe.com.br
- **Try a tool in one click:** [storefront](https://tryponcho.com/m/tools.miniframe.com.br)
- **Machine-readable spec:** [openapi.json](https://tools.miniframe.com.br/openapi.json) · [llms.txt](https://tools.miniframe.com.br/llms.txt)

## Tools

- **pix_brcode** — Generate a Brazilian Pix payment code (BR Code / "Copia e Cola" string) plus a QR PNG. $0.01 per call.
- **cep_lookup** — Resolve a Brazilian postal code (CEP) to a full street address. $0.005 per call.
- **cnpj_lookup** — Look up a Brazilian company by its CNPJ number in the public registry. $0.01 per call.
- **empresa_profile** — Consolidated Brazilian company profile to qualify a lead: registry + address completed via CEP + derived flags (active, headquarters, age, MEI/Simples, size, risk). $0.02 per call.
- **url_to_markdown** — Fetch a JavaScript-rendered web page and return clean Markdown for an LLM. $0.02 per call.
- **screenshot_url** — Take a screenshot of a web page and return it as PNG or JPEG. $0.03 per call.
- **url_to_pdf** — Render a web page as a PDF. $0.03 per call.
- **extract** — Extract the structured data a page exposes (JSON-LD, Open Graph, meta, tables, links) plus any fields you pass as CSS selectors. $0.02 per call.
- **compress_pdf** — Compress a PDF file with Ghostscript. $0.02 per call.

Each tool maps to an HTTP endpoint of the same service:

| Tool | Endpoint |
|---|---|
| `pix_brcode` | `POST /pix/brcode` |
| `cep_lookup` | `POST /cep` |
| `cnpj_lookup` | `POST /cnpj` |
| `empresa_profile` | `POST /empresa` |
| `url_to_markdown` | `POST /url-to-markdown` |
| `screenshot_url` | `POST /screenshot` |
| `url_to_pdf` | `POST /url-to-pdf` |
| `extract` | `POST /extract` |
| `compress_pdf` | `POST /compress-pdf` |

## What makes these worth paying for

**Brazilian sources, handled properly.** CEP lookups hit BrasilAPI first and fall
back to ViaCEP automatically, so a single upstream outage doesn't break your agent.
Both sources come back through one normalized, English-keyed shape — your prompt
never has to know which one answered.

**Pix codes built to spec, locally.** The BR Code follows the Central Bank's EMV
layout, CRC16 and all, generated on our side with no third-party payment provider in
the path. The key you send is used to build the code and is not stored.

**Privacy taken seriously.** CNPJ responses carry the company record — legal name,
trade name, status, main activity, address — with personal fields left out by design.

**Rendering that doesn't become an attack surface.** The web tools run real Chromium,
so JavaScript pages resolve, and they refuse private and internal addresses (SSRF
guard) before a page is ever loaded.

**Nothing to install for the hard parts.** Ghostscript and a headless browser are the
kind of dependency an agent sandbox doesn't have and can't install. That is exactly
what this is for — anything an agent already does well on its own (parsing a CSV,
reading a spreadsheet) is not sold here.

## Use it as an MCP server

Works with Claude Desktop, Claude Code, Cursor, Windsurf, Cline and any MCP client.

```json
{
  "mcpServers": {
    "miniframe-tools": {
      "command": "npx",
      "args": ["-y", "miniframe-tools-mcp"],
      "env": {
        "EVM_PRIVATE_KEY": "0xyour_private_key"
      }
    }
  }
}
```

Restart the client and the seven tools appear. Then just ask:

> "Generate a Pix code for R$ 50 to key `abc@example.com`, name Maria Silva, city Recife"
>
> "What's the address for CEP 01310-100?"
>
> "Look up CNPJ 00.000.000/0001-91 and tell me if the company is active"
>
> "Turn https://example.com into Markdown so I can summarise it"

## Use it as a plain HTTP API

No MCP needed — every tool is a normal endpoint:

```bash
curl -i -X POST https://tools.miniframe.com.br/cep \
  -H "Content-Type: application/json" \
  -d '{"cep":"01310100"}'
```

## Paying

Calls are billed per request in USDC on Base, using the
[x402](https://x402.org) protocol: the endpoint answers `402` with the price, your
client signs the payment and repeats the request. Most agent runtimes handle this
for you.

For MCP, set `EVM_PRIVATE_KEY` to a wallet funded with a few dollars of USDC — use a
dedicated low-balance wallet, never your main one. The key stays on your machine and
signs locally; it is never sent to the API.

| Variable | Required | Default |
|---|---|---|
| `EVM_PRIVATE_KEY` | yes | — |
| `MINIFRAME_API_URL` | no | `https://tools.miniframe.com.br` |

Over plain HTTP, wrap your client with any x402 library — see
[`examples/`](examples/) for a runnable Node script.

## License

MIT
