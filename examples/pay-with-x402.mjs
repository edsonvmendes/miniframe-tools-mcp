// Calling MiniFrame Tools directly over HTTP, paying with x402.
//
//   npm install @x402/fetch @x402/evm viem
//   EVM_PRIVATE_KEY=0x... node pay-with-x402.mjs
//
// Use a dedicated wallet on Base with a small USDC balance.
import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount(process.env.EVM_PRIVATE_KEY);

// Wrap fetch so any 402 response is paid and retried automatically.
const pay = wrapFetchWithPaymentFromConfig(fetch, {
  schemes: [{ network: "eip155:8453", client: new ExactEvmScheme(account) }],
});

async function call(path, body) {
  const res = await pay(`https://tools.miniframe.com.br${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

// $0.005 — resolve a Brazilian postal code
const address = await call("/cep", { cep: "01310100" });
console.log(`${address.street}, ${address.neighborhood} — ${address.city}/${address.state}`);

// $0.01 — generate a Pix payment code for R$ 25
const pix = await call("/pix/brcode", {
  key: "abc@example.com",
  merchant_name: "Maria Silva",
  merchant_city: "RECIFE",
  amount: 25.0,
});
console.log(`Pix copia e cola: ${pix.brcode}`);
