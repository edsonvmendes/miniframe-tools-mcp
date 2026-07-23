# MiniFrame Tools

**Brazilian data and document tools for AI agents.** Pix BR Codes, CEP address
lookup, CNPJ company lookup — plus web capture (Markdown, screenshot, PDF) and PDF
compression.

Pay-per-call in USDC on Base via [x402](https://x402.org). **No signup, no API key,
no subscription.** Your agent pays a few cents per call from its own wallet, and
nothing at all when it is idle.

- **API:** https://tools.miniframe.com.br
- **Try a tool in one click:** [storefront](https://tryponcho.com/m/tools.miniframe.com.br)
- **Machine-readable spec:** [openapi.json](https://tools.miniframe.com.br/openapi.json) · [llms.txt](https://tools.miniframe.com.br/llms.txt)

## Tools

| Tool (MCP) | Endpoint | Price | What it does |
|---|---|---|---|
| `pix_brcode` | `POST /pix/brcode` | $0.01 | Generate a Brazilian Pix payment code (BR Code / "Copia e Cola") + QR PNG |
| `cep_lookup` | `POST /cep` | $0.005 | Resolve a Brazilian postal code to a full address |
| `cnpj_lookup` | `POST /cnpj` | $0.01 | Look up a Brazilian company by CNPJ (public registry) |
| `url_to_markdown` | `POST /url-to-markdown` | $0.02 | Fetch a JS-rendered page and return clean Markdown for an LLM |
| `screenshot_url` | `POST /screenshot` | $0.03 | Screenshot a web page (PNG/JPEG) |
| `url_to_pdf` | `POST /url-to-pdf` | $0.03 | Render a web page as a PDF |
| `compress_pdf` | `POST /compress-pdf` | $0.02 | Compress a PDF with Ghostscript |

### Why these tools

An agent with a Python sandbox can already parse a CSV or read a spreadsheet — it
does not need to pay for that. These are the things it **cannot** do on its own:
render JavaScript pages, run Ghostscript, or reach Brazilian public registries with
sane fallbacks and normalized output.

## Use it as an MCP server

Works with Claude Desktop, Claude Code, Cursor, Windsurf, Cline and any MCP client.

You need a wallet on **Base** funded with a small amount of USDC. Use a dedicated
low-balance wallet — never your main one.

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
> "Turn https://example.com into Markdown so I can summarise it"

### How the money works

1. Your agent calls a tool.
2. This server requests the endpoint, which answers **HTTP 402** with the price.
3. This server signs a USDC payment with `EVM_PRIVATE_KEY` and retries.
4. The result comes back to your agent.

The private key stays on your machine and is **never sent to the API** — it only
signs payments locally.

| Variable | Required | Default |
|---|---|---|
| `EVM_PRIVATE_KEY` | yes | — |
| `MINIFRAME_API_URL` | no | `https://tools.miniframe.com.br` |

## Use it as a plain HTTP API

No MCP needed — every tool is a normal endpoint. Call it without payment to see the
402 challenge (price, network, pay-to address and input schema):

```bash
curl -i -X POST https://tools.miniframe.com.br/cep \
  -H "Content-Type: application/json" \
  -d '{"cep":"01310100"}'
```

To pay automatically, wrap your HTTP client with an x402 library — see
[`examples/`](examples/) for a runnable Node script.

## Notes

- **CEP and CNPJ** return public postal and corporate registry data. Personal fields
  are omitted from CNPJ responses by design.
- **Pix codes** are generated locally following the Central Bank's EMV spec — the
  key you send is used to build the code and is not stored.
- **Web capture** endpoints refuse private and internal addresses (SSRF guard).

## License

MIT
