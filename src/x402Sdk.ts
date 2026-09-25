import { paymentMiddleware, x402ResourceServer } from "@okxweb3/x402-express";
import { ExactEvmScheme } from "@okxweb3/x402-evm/exact/server";
import { OKXFacilitatorClient } from "@okxweb3/x402-core";

// Official Onchain OS Payment SDK — replaces the manual tx-hash verification
// gate. Network is env-driven so testnet can be verified first, per the SDK
// docs' own recommendation, before switching to mainnet.
export const NETWORK = (process.env.X402_NETWORK || "eip155:1952") as `eip155:${number}`;
export const PAY_TO_ADDRESS = process.env.PAY_TO_ADDRESS || "0x68886159be96a1c7ece23071da3a4279e00ef91b";

const facilitatorClient = new OKXFacilitatorClient({
  apiKey: process.env.OKX_API_KEY!,
  secretKey: process.env.OKX_SECRET_KEY!,
  passphrase: process.env.OKX_PASSPHRASE!,
});

export const resourceServer = new x402ResourceServer(facilitatorClient);
resourceServer.register(NETWORK, new ExactEvmScheme());

export const hedgePaymentMiddleware = paymentMiddleware(
  {
    "POST /hedge": {
      accepts: [
        {
          scheme: "exact",
          network: NETWORK,
          payTo: PAY_TO_ADDRESS,
          price: "$0.01",
        },
      ],
      description: "Open a 1:1 hedge position against real-world-asset exposure",
      mimeType: "application/json",
    },
  },
  resourceServer
);
