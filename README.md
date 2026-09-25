# UNREKT

**Hedge before you're rekt.**

An autonomous agent for volatility protection on tokenized real-world assets, submitted to **OKX Dev Day 2026**.

- **Primary track:** Build a Company (Agent services, agent marketplaces, and automated workflows published through OKX AI)
- **Participation route:** Remote Build
- **Live deployment:** `https://unrekt-hedge.onrender.com`
- **Repository:** `https://github.com/maziazi/UnRekt`

---

## 1. Abstract

Tokenized real-world assets have solved the liquidity problem: equity, credit, and commodity exposure can now be held and traded 24/7 as onchain tokens. They have not solved the protection problem. An individual who already holds a volatile, tokenized position has no accessible mechanism to hedge that exposure without first acquiring derivatives literacy — an understanding of leverage, margin, and settlement risk that the underlying purchase never required.

UNREKT addresses this gap with a single interaction primitive: a natural-language description of risk (*"I have $5,000 in tokenized AAPL, worried it drops before earnings"*) is parsed by a large language model, priced against a live market feed, and gated behind a cryptographically settled, onchain payment before a hedge is opened. Every action the agent takes — payment and proof-of-hedge alike — is independently verifiable on X Layer, without requiring trust in the agent's own claims.

The system is built entirely on OKX's Onchain OS stack: an Agentic Wallet for autonomous custody, the official Onchain OS Payment SDK for x402-based settlement, the OKX.AI marketplace for agent discovery and distribution (A2MCP), and X Layer's EAS predeploy for tamper-evident attestation.

## 2. Problem and Market Context

Two facts motivate this project:

1. **The target population is large and already exposed.** An estimated 11.8–14 million individuals in the United States alone hold equity compensation — RSUs, options, or ESPP allocations — representing concentrated, often illiquid-feeling exposure to a single volatile asset (NCEO, 2026; Aspen Institute, 2026).
2. **The underlying asset class is growing quickly, from a small base.** The tokenized real-world asset market (excluding stablecoins) grew 256.7% across fifteen months, from $5.42B to $19.32B (January 2025–March 2026); tokenized equities specifically represent roughly $1.3B of that figure (CoinGecko RWA Report, 2026). This is not yet a large market — it is a fast-growing one with a clearly identifiable, non-crypto-native beachhead user (equity-compensated employees), which is a more defensible starting thesis than targeting the general crypto-trading population.

Existing tokenized-equity infrastructure (e.g. xStocks) addresses acquisition and liquidity. It does not address protection. UNREKT is deliberately scoped to that specific, underserved layer.

## 3. System Architecture

```
Natural-language input
        │
        ▼
 LLM extraction (Groq, openai/gpt-oss-20b)  ──fallback──▶  regex heuristic
        │  { ticker, exposureValue, confidence }
        ▼
 Confidence gate (< 0.5 → clarification requested, never auto-executed)
        │
        ▼
 POST /hedge  ── gated by OKX Onchain OS Payment SDK (x402, "exact" scheme) ──▶  OKX Facilitator
        │  (verification + settlement handled by the Facilitator, not by application code)
        ▼
 ExecutionVenue interface
        │
        ├── SimulatedVenueAdapter  (active — deterministic, price-aware)
        └── RWAperpAdapter          (present, intentionally unwired — see §5)
        │
        ▼
 Real xStock price lookup (AAPL/TSLA/MSFT/GOOGL/AMZN/NVDA on X Layer)
        │
        ▼
 EAS attestation written to X Layer predeploy (0x4200…0021)
        │
        ▼
 Hedge record returned: payment receipt + attestation tx + live P&L
```

The agent is also registered as an **A2MCP Agent Service Provider** on the OKX.AI marketplace (Agent ID `13900`, status: under review at time of writing), making it independently discoverable and callable by other agents — not only by the bundled demo page.

## 4. Alignment with the Official Judging Criteria

The Hackathon Terms state that submissions are assessed holistically on *innovation, product completeness, user value, technical execution, meaningful integration with X Layer and/or OKX AI, growth potential, and contribution to the OKX ecosystem.* We address each directly, including where the project falls short, rather than asserting blanket compliance.

**Meaningful integration with OKX AI.** This is the project's strongest dimension. UNREKT does not merely reference OKX AI in its narrative — it is built as a registered A2MCP service, custodies funds through an Agentic Wallet, settles payment through the official Payment SDK against the OKX Facilitator (not a self-verified substitute), and writes proof to X Layer's native EAS predeploy. Every one of these integrations was exercised end-to-end with real transactions on both X Layer Testnet and Mainnet, not mocked.

**Technical execution.** The system degrades gracefully rather than failing silently: LLM extraction falls back to a heuristic if the provider is unavailable; low-confidence extraction blocks execution rather than guessing; and the execution venue is an explicit interface (`ExecutionVenue`) rather than a hardcoded call, so a real derivatives venue can be substituted without touching the payment, identity, or attestation layers.

**Innovation.** The contribution is not a new payment primitive — x402 and EAS are OKX's own infrastructure, used as intended. The contribution is the framing: an agent built for *loss aversion* rather than *speculation*, targeting a population (equity-compensated employees) that existing onchain agent products in this ecosystem largely do not address.

**Product completeness — the project's principal limitation, stated directly.** UNREKT's central promise is exposure protection. As submitted, the execution venue is simulated: real market prices are tracked and real P&L is computed against them, but no derivative position is actually opened against a live market. This is a deliberate sequencing decision, not an oversight — the components that determine whether an agent-driven financial product can be trusted at all (verifiable payment, tamper-evident proof, resilient language understanding) were prioritized over the component that is comparatively mechanical to add once a counterparty exists (`RWAperpAdapter` is present in the codebase, implementing the same `ExecutionVenue` interface as the active simulated adapter, and is unwired only because the intended venue, RWAperp, could not be verified as a reachable service during the build window — see §5). We report this as a limitation rather than obscuring it, consistent with the project's broader evidentiary standard.

**User value.** Directly, today: a verifiable, auditable payment-to-action pattern that any agent handling third-party funds can be built on. As a hedging product specifically: not yet delivered end-to-end, per the above.

**Growth potential.** The market sizing in §2 is a thesis, not evidence of traction — no external users have used this system. What is reduced is *execution* risk for that thesis: the swap-in venue architecture and an existing marketplace listing mean the path from proof-of-concept to a live product is a bounded integration task, not a rebuild.

**Contribution to the OKX ecosystem.** One additional, functioning A2MCP listing on the OKX.AI marketplace; one additional real-world reference implementation of the Payment SDK and EAS predeploy used together, which may be of independent use to other builders on the platform.

## 5. Implementation Status

| Component | Status | Evidence |
|---|---|---|
| Natural-language extraction | **Real** — Groq LLM (`openai/gpt-oss-20b`), regex fallback | `src/llmExtractor.ts` |
| Payment (x402) | **Real** — official Onchain OS Payment SDK, OKX Facilitator-settled | `src/x402Sdk.ts`; verified on Testnet (`0x70c196e4…`) and Mainnet (`0x26fbe4f1…`, confirmed `SUCCESS` on-chain) |
| Attestation | **Real** — EAS predeploy `0x4200…0021`, schema registered onchain | `src/eas.ts`, `src/scripts/registerSchema.ts` |
| Market pricing | **Real** — live xStock token prices on X Layer | `src/xstockPrices.ts` |
| Marketplace listing | **Real, pending review** — A2MCP, Agent ID `13900` | OKX.AI marketplace |
| Execution venue | **Simulated** — price-aware, not a live derivatives position | `src/venues/SimulatedVenueAdapter.ts`; `RWAperpAdapter.ts` present, unwired |
| Morningstar / MoonPay / Liminal / Centrifuge | **Not integrated** — narrative only | — |

## 6. Running the Project

```bash
npm install
npm run dev
```

Requires `OKX_API_KEY`, `OKX_SECRET_KEY`, `OKX_PASSPHRASE` (OKX Developer Portal) and `GROQ_API_KEY` (free tier) as environment variables. Set `X402_NETWORK=eip155:1952` to exercise X Layer Testnet before `eip155:196` (Mainnet, default).

`POST /hedge` is a standard x402-gated endpoint, callable by any x402-aware client — including the `onchainos` CLI itself:

```bash
onchainos payment quote http://localhost:3000/hedge --method POST \
  --param text="I have $5000 in tokenized AAPL, worried it drops next week"

onchainos payment pay --payment-id <id-from-quote> --selected-index 0 \
  --param text="I have $5000 in tokenized AAPL, worried it drops next week" --yes
```

## 7. Limitations and Future Work

1. Replace `SimulatedVenueAdapter` with a live derivatives integration once a reachable, documented venue exists on X Layer (`RWAperpAdapter` already implements the required interface).
2. Formalize the Morningstar data relationship currently simulated for risk context.
3. Extend the OKX.AI Task Marketplace integration to allow UNREKT to hire specialist analysis agents for cross-asset exposure.
4. Validate the market thesis in §2 against real usage once the marketplace listing is approved.

## 8. Disclaimer

This is an educational, hackathon-stage system, not financial advice. Hedge sizing uses a simple 1:1 assumption. Do not use with funds you cannot afford to lose testing experimental software.

## Working Documents

Full PRD, SRS, Design System, and daily execution log: `HackathonSync/01 - Active/Hackathon - OKX Dev Day 2026/` (Obsidian vault, private).
