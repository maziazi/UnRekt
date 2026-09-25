import type { ExtractedExposure } from "./types.js";
import { KNOWN_TICKERS } from "./xstockPrices.js";
import { extractExposure as heuristicExtract } from "./riskExtractor.js";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-20b";

interface GroqResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

/**
 * F3 real implementation — replaces the regex heuristic with an actual LLM
 * call (Groq, free tier) so paraphrased/natural input ("lima ribu dolar di
 * saham Apple") is understood, not just exact ticker+$ substring matches.
 * Falls back to the heuristic if GROQ_API_KEY is unset or the call fails —
 * never breaks local dev, never blocks the endpoint on a third-party outage.
 */
export async function extractExposureLLM(rawText: string): Promise<ExtractedExposure> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return heuristicExtract(rawText);

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              `Extract the stock ticker and USD exposure amount the user is worried about losing value on. ` +
              `Ticker MUST be one of: ${KNOWN_TICKERS.join(", ")} (case-insensitive input, but respond with these exact uppercase symbols) — if the asset isn't one of these, or isn't mentioned, return null for ticker. ` +
              `If no USD amount is mentioned or unclear, return null for exposureValue. ` +
              `Respond ONLY with JSON: {"ticker": "AAPL" | null, "exposureValue": number | null}`,
          },
          { role: "user", content: rawText },
        ],
        temperature: 0,
      }),
    });

    if (!res.ok) return heuristicExtract(rawText);

    const data = (await res.json()) as GroqResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) return heuristicExtract(rawText);

    const parsed = JSON.parse(content) as { ticker: string | null; exposureValue: number | null };
    const ticker = parsed.ticker && KNOWN_TICKERS.includes(parsed.ticker.toUpperCase())
      ? parsed.ticker.toUpperCase()
      : null;
    const exposureValue = typeof parsed.exposureValue === "number" ? parsed.exposureValue : 0;
    const asset = ticker ? `${ticker}-tokenized` : "UNKNOWN";
    const confidence = ticker && exposureValue > 0 ? 0.9 : 0.2;

    return { asset, ticker, exposureValue, confidence };
  } catch {
    return heuristicExtract(rawText);
  }
}
