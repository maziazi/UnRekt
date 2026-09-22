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
| x402 payment | ❌ **Stub** (`src/x402.ts`) — no real payment has occurred yet. Highest priority to implement |
| EAS attestation | ❌ **Stub** (`src/eas.ts`) — contract address is correct (X Layer predeploy), but not yet wired to a real Agentic Wallet signer |
| Agentic Wallet | ✅ Logged in (Google, X Layer EVM address active) — signer wiring into `eas.ts` / `x402.ts` still pending |
| Risk extraction from text (F3) | ⚠️ Simple regex heuristic (`src/riskExtractor.ts`), **not** a real LLM call yet — placeholder until wired to an API key |
| Morningstar, MoonPay, Liminal, Centrifuge, xStocks data | ❌ Not integrated — mentioned only in the product-vision narrative |

## Running it

```bash
npm install
npm run dev
```

Server runs at `http://localhost:3000`.

```bash
# Example with high-enough confidence (known asset + amount present)
curl -X POST localhost:3000/hedge \
  -H "Content-Type: application/json" \
  -d '{"text": "I have $5000 in tokenized AAPL, worried it drops next week"}'
```

Right now this stops at `402 Payment Required` (honestly — `src/x402.ts` is still a stub) until real x402 payment is wired in.

## Disclaimer

This is an educational/demo simulation for a hackathon, not financial advice. Hedge size is computed automatically using a simple 1:1 assumption.

## Roadmap

See `04 - Rencana Eksekusi.md` in the vault — daily checklist through the submission deadline, 25 September 2026, 23:59 UTC.
