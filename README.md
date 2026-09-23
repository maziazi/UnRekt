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
| x402 payment | ✅ **Real, verified on-chain** (`src/x402.ts`) — simplified payment gate: `/hedge` returns 402 + a `draftId`, caller pays real USD₮0 on X Layer, replays with `{ draftId, paymentTxHash }`. The server verifies the exact transaction (status, recipient, amount) via the `onchainos` CLI and rejects tx-hash reuse. **Not** full signature-based x402 (see note below) |
| EAS attestation | ❌ **Stub** (`src/eas.ts`) — contract address is correct (X Layer predeploy), but not yet wired to a real Agentic Wallet signer |
| Agentic Wallet | ✅ Logged in (Google, X Layer EVM address active), funded with real USD₮0 (bridged from BNB Chain) — signer wiring into `eas.ts` still pending |
| Risk extraction from text (F3) | ⚠️ Simple regex heuristic (`src/riskExtractor.ts`), **not** a real LLM call yet — placeholder until wired to an API key |
| Morningstar, MoonPay, Liminal, Centrifuge, xStocks data | ❌ Not integrated — mentioned only in the product-vision narrative |

**Why the x402 gate is simplified, not spec-pure:** a full `exact`-scheme x402 challenge needs a correct EIP-712 domain for the payment asset and either a facilitator or a relay step to actually settle a signed authorization on-chain. No OKX documentation for the merchant/seller side of that was available, and guessing the domain risks producing signatures that look valid but fail real settlement. This implementation asks for a real transfer and verifies the exact transaction on-chain instead of trusting a signature payload — less protocol-pure, but every payment is real and checkable on the X Layer explorer.

## Running it

```bash
npm install
npm run dev
```

Server runs at `http://localhost:3000`.

```bash
# 1. First call returns 402 + a draftId
curl -X POST localhost:3000/hedge \
  -H "Content-Type: application/json" \
  -d '{"text": "I have $5000 in tokenized AAPL, worried it drops next week"}'

# 2. Pay the quoted amount of USD₮0 on X Layer to the given payTo address,
#    then replay with the draftId and the resulting transaction hash:
curl -X POST localhost:3000/hedge \
  -H "Content-Type: application/json" \
  -d '{"text": "I have $5000 in tokenized AAPL, worried it drops next week", "draftId": "<from step 1>", "paymentTxHash": "<your payment tx hash>"}'
```

## Disclaimer

This is an educational/demo simulation for a hackathon, not financial advice. Hedge size is computed automatically using a simple 1:1 assumption.

## Roadmap

See `04 - Rencana Eksekusi.md` in the vault — daily checklist through the submission deadline, 25 September 2026, 23:59 UTC.
