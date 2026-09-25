import type { ExtractedExposure } from "./types.js";
import { KNOWN_TICKERS } from "./xstockPrices.js";

/**
 * PLACEHOLDER heuristik — bukan implementasi final F3.
 * Rencana asli (SRS §4, PRD F3): panggil Claude buat ekstraksi bahasa natural.
 * Ini cukup buat server jalan & bisa didemokan hari ini; ganti dengan
 * pemanggilan LLM sungguhan begitu API key tersedia (Hari 2).
 *
 * SENGAJA confidence rendah kalau polanya tidak jelas — SRS risiko #1:
 * jangan auto-eksekusi dari tebakan, minta konfirmasi user dulu.
 */
export function extractExposure(rawText: string): ExtractedExposure {
  const amountMatch = rawText.match(/\$?\s?([\d,]+(?:\.\d+)?)\s?(?:usd|dollar)?/i);
  const exposureValue = amountMatch ? Number(amountMatch[1].replace(/,/g, "")) : 0;

  const found = KNOWN_TICKERS.find((a) => new RegExp(a, "i").test(rawText));
  const asset = found ? `${found}-tokenized` : "UNKNOWN";

  const confidence = exposureValue > 0 && asset !== "UNKNOWN" ? 0.8 : 0.2;

  return { asset, ticker: found ?? null, exposureValue, confidence };
}
