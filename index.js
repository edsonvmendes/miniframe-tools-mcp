#!/usr/bin/env node
// MCP server for MiniFrame Tools.
//
// Bridges any MCP client (Claude Desktop, Claude Code, Cursor…) to the paid HTTP
// API at tools.miniframe.com.br. Each tool call hits an x402-protected endpoint:
// the API answers 402, this process signs the USDC payment with the wallet in
// EVM_PRIVATE_KEY, and retries. The user's own wallet pays — the key never leaves
// their machine and is never sent to the API.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";
import { z } from "zod";

const BASE_URL = process.env.MINIFRAME_API_URL || "https://tools.miniframe.com.br";
const PRIVATE_KEY = process.env.EVM_PRIVATE_KEY;
const NETWORK = "eip155:8453"; // Base mainnet

if (!PRIVATE_KEY) {
  console.error(
    "EVM_PRIVATE_KEY is not set.\n\n" +
      "MiniFrame Tools charges a few cents per call in USDC on Base. Set the private key\n" +
      "of a funded wallet in your MCP client config:\n\n" +
      '  "env": { "EVM_PRIVATE_KEY": "0x..." }\n\n' +
      "Use a dedicated low-balance wallet — never your main one."
  );
  process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY);
const payingFetch = wrapFetchWithPaymentFromConfig(fetch, {
  schemes: [{ network: NETWORK, client: new ExactEvmScheme(account) }],
});

/**
 * Calls a paid endpoint, settling the x402 payment transparently.
 * Returns the MCP content payload for either the result or the error.
 */
async function callTool(path, body) {
  let res;
  try {
    res = await payingFetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    // Payment itself failed (insufficient USDC, RPC down, rejected signature…)
    return {
      isError: true,
      content: [{ type: "text", text: `Payment failed: ${err.message}` }],
    };
  }

  const text = await res.text();
  if (!res.ok) {
    return {
      isError: true,
      content: [{ type: "text", text: `HTTP ${res.status}: ${text.slice(0, 500)}` }],
    };
  }
  return { content: [{ type: "text", text }] };
}

const server = new McpServer({ name: "miniframe-tools", version: "1.0.0" });

// --- Brazilian data (the differentiator) ---

server.tool(
  "pix_brcode",
  "Generate a Brazilian Pix payment code (BR Code / 'Copia e Cola' EMV string) plus a QR code PNG. " +
    "Use when someone needs to receive a Pix payment. Costs $0.01 per call.",
  {
    key: z.string().describe("Pix key: CPF/CNPJ, email, phone (+5511...) or random UUID key"),
    merchant_name: z.string().describe("Receiver name as registered at the bank (max 25 chars)"),
    merchant_city: z.string().optional().describe("Receiver city, no accents (max 15 chars)"),
    amount: z.number().optional().describe("Amount in BRL. Omit for a free-amount code."),
    txid: z.string().optional().describe("Transaction identifier (max 25 chars). Defaults to ***"),
    description: z.string().optional().describe("Free-text description shown to the payer"),
  },
  async (args) => callTool("/pix/brcode", args)
);

server.tool(
  "cep_lookup",
  "Look up a Brazilian address from a CEP (postal code). Returns street, neighborhood, city and state. " +
    "Costs $0.005 per call.",
  { cep: z.string().describe("Brazilian postal code, 8 digits (with or without dash)") },
  async (args) => callTool("/cep", args)
);

server.tool(
  "cnpj_lookup",
  "Look up a Brazilian company by its CNPJ registration number. Returns legal name, trade name, status, " +
    "main activity and address from the public registry. Costs $0.01 per call.",
  { cnpj: z.string().describe("Brazilian company registration number, 14 digits") },
  async (args) => callTool("/cnpj", args)
);

// --- Web capture ---

server.tool(
  "url_to_markdown",
  "Fetch a web page (JavaScript rendered) and return clean Markdown, ready to feed to an LLM. " +
    "Use for pages that plain fetching cannot read. Costs $0.02 per call.",
  {
    url: z.string().describe("Absolute http(s) URL of the page to convert"),
    include_images: z.boolean().optional().describe("Keep image references in the Markdown"),
  },
  async (args) => callTool("/url-to-markdown", args)
);

server.tool(
  "screenshot_url",
  "Take a screenshot of a web page and return it as a base64 PNG or JPEG. Costs $0.03 per call.",
  {
    url: z.string().describe("Absolute http(s) URL of the page to capture"),
    full_page: z.boolean().optional().describe("Capture the entire scrollable page (default false)"),
    width: z.number().optional().describe("Viewport width in pixels"),
    height: z.number().optional().describe("Viewport height in pixels"),
    format: z.enum(["png", "jpeg"]).optional().describe("Image format (default png)"),
  },
  async (args) => callTool("/screenshot", args)
);

server.tool(
  "url_to_pdf",
  "Render a web page as a PDF and return it as base64. Costs $0.03 per call.",
  {
    url: z.string().describe("Absolute http(s) URL of the page to render"),
    format: z.string().optional().describe("Paper size, e.g. A4 or Letter (default A4)"),
    landscape: z.boolean().optional().describe("Landscape orientation (default false)"),
  },
  async (args) => callTool("/url-to-pdf", args)
);

// --- Documents ---

server.tool(
  "compress_pdf",
  "Compress a PDF file with Ghostscript. Send the file as base64; returns the compressed file as base64 " +
    "plus the size reduction. Costs $0.02 per call.",
  {
    pdf_base64: z.string().describe("The PDF file encoded in base64 (max 30 MB decoded)"),
    mode: z
      .enum(["light", "balanced", "max"])
      .optional()
      .describe("light = near lossless, balanced = default, max = smallest file"),
  },
  async ({ pdf_base64, mode }) =>
    callTool(`/compress-pdf${mode ? `?mode=${mode}` : ""}`, { pdf_base64 })
);

await server.connect(new StdioServerTransport());
console.error(`miniframe-tools MCP ready — paying from ${account.address} on Base`);
