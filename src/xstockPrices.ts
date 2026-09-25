import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Real xStock token addresses on X Layer mainnet (chain 196) — found via
 * `onchainos token search`, confirmed live and trading (25 Sep 2026).
 * Product completeness fix: the simulated venue tracks REAL market price
 * movement instead of fabricated numbers, even though no derivative is
 * actually executed (RWAperp cut — see PRD §4).
 */
const XSTOCK_ADDRESS: Record<string, string> = {
  AAPL: "0x9d275685dc284c8eb1c79f6aba7a63dc75ec890a",
  TSLA: "0x8ad3c73f833d3f9a523ab01476625f269aeb7cf0",
  MSFT: "0x5621737f42dae558b81269fcb9e9e70c19aa6b35",
  GOOGL: "0xe92f673ca36c5e2efd2de7628f815f84807e803f",
  AMZN: "0x3557ba345b01efa20a1bddc61f573bfd87195081",
  NVDA: "0xc845b2894dbddd03858fd2d643b4ef725fe0849d",
};

export const KNOWN_TICKERS = Object.keys(XSTOCK_ADDRESS);

interface OnchainosPriceInfoResponse {
  ok: boolean;
  data?: Array<{ price: string }>;
}

export async function getXStockPrice(ticker: string): Promise<number | null> {
  const address = XSTOCK_ADDRESS[ticker.toUpperCase()];
  if (!address) return null;

  try {
    const { stdout } = await execFileAsync("onchainos", [
      "token",
      "price-info",
      "--address",
      address,
      "--chain",
      "xlayer",
    ]);
    const parsed = JSON.parse(stdout) as OnchainosPriceInfoResponse;
    const price = parsed.data?.[0]?.price;
    return price ? Number(price) : null;
  } catch {
    return null;
  }
}
