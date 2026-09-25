# UNREKT

**Hedge before you're rekt.**

OKX Dev Day 2026 — track **OKX AI**. UNREKT is an AI agent that protects your real-world-asset exposure from volatility through natural-language hedging — no leverage jargon, no liquidations, just protection on autopilot.

Full working documents (PRD, SRS, Design System, daily execution plan) live in the Obsidian vault: `HackathonSync/01 - Active/Hackathon - OKX Dev Day 2026/`.

## Honest status: what's real vs. simulated

The most important section in this README — read before trusting any claim made in the demo.

| Component | Status |
|---|---|
| `/hedge`, `/hedge/:id` endpoints, text extraction, 1:1 sizing | ✅ Working, real code |
| Execution venue | ⚠️ **`SimulatedVenueAdapter`** — deterministic, not real trading. `RWAperpAdapter` exists in the codebase but is **intentionally not wired up** until its API is verified reachable (see `src/venues/RWAperpAdapter.ts`) |
| x402 payment | ✅ **Real, spec-compliant x402, verified on-chain** (`src/x402Sdk.ts`) — uses OKX's official Onchain OS Payment SDK (`@okxweb3/x402-express`, `@okxweb3/x402-core`, `@okxweb3/x402-evm`), the exact resource linked in the OKX Dev Day 2026 Builder Kit. `POST /hedge` is gated by `paymentMiddleware`; the OKX Facilitator handles verification and settlement. Tested end-to-end on both X Layer Testnet and Mainnet with real settlement tx hashes |
| EAS attestation | ✅ **Real, verified on-chain** (`src/eas.ts`) — every opened hedge writes a real attestation to X Layer's EAS predeploy (`0x4200...0021`) using a schema registered once via `src/scripts/registerSchema.ts`. Independent of RWAperp or any third party |
| Agentic Wallet | ✅ Logged in (Google, X Layer EVM address active), funded with real USD₮0 (bridged from BNB Chain) |
| Risk extraction from text (F3) | ✅ **Real LLM call** (`src/llmExtractor.ts`) — Groq (`openai/gpt-oss-20b`, free tier), handles natural/non-English/paraphrased input a regex never could. Falls back to a regex heuristic (`src/riskExtractor.ts`) if `GROQ_API_KEY` is unset or the call fails |
| Real market prices (product completeness) | ✅ **Real xStock prices** (`src/xstockPrices.ts`) — AAPL/TSLA/MSFT/GOOGL/AMZN/NVDA all resolved to their live xStock token addresses on X Layer; hedge P&L tracks actual price movement, not fabricated numbers |
| Morningstar, MoonPay, Liminal, Centrifuge data | ❌ Not integrated — mentioned only in the product-vision narrative |

**Earlier iteration note:** an initial version of this payment gate used manual tx-hash verification instead of the official SDK, because the merchant/seller side of x402 wasn't found in time. The OKX Dev Day Builder Kit later linked the official Payment SDK docs directly — this repo now uses that SDK instead.

## Running it

```bash
npm install
npm run dev
```

Requires `OKX_API_KEY`, `OKX_SECRET_KEY`, `OKX_PASSPHRASE` (from the OKX Developer Portal) as environment variables. Set `X402_NETWORK=eip155:1952` to test on X Layer Testnet before switching to `eip155:196` (Mainnet, the default).

Server runs at `http://localhost:3000`. `POST /hedge` is a standard x402-gated endpoint — any x402-aware client works, e.g. the `onchainos` CLI itself:

```bash
onchainos payment quote http://localhost:3000/hedge --method POST \
  --param text="I have $5000 in tokenized AAPL, worried it drops next week"

onchainos payment pay --payment-id <id-from-quote> --selected-index 0 \
  --param text="I have $5000 in tokenized AAPL, worried it drops next week" --yes
```

## Disclaimer

This is an educational/demo simulation for a hackathon, not financial advice. Hedge size is computed automatically using a simple 1:1 assumption.

## Roadmap

See `04 - Rencana Eksekusi.md` in the vault — daily checklist through the submission deadline, 25 September 2026, 23:59 UTC.
