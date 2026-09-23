import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Simplified, HONEST payment gate — not full x402 signature-based settlement.
 * See README "Honest status" table for why: no documented OKX merchant/
 * facilitator side, and the EIP-712 domain of USD₮0 on X Layer is unverified,
 * so a hand-rolled `exact`+EIP-3009 challenge could produce signatures that
 * look valid but fail on real settlement.
 *
 * Instead: we ask for a real onchain USD₮0 transfer to our own wallet, and
 * verify the exact transaction hash via the onchainos CLI (status, recipient,
 * amount) — unfakeable, no trust in client-supplied proof beyond the hash
 * itself. Each tx hash can only be consumed once (see consumedTxHashes).
 */

export const CHAIN = "xlayer";
export const PAYMENT_ASSET_ADDRESS = "0x779ded0c9e1022225f8e0630b35a9b54be713736"; // USD₮0 on X Layer
export const PAY_TO_ADDRESS = "0x68886159be96a1c7ece23071da3a4279e00ef91b";
export const HEDGE_OPEN_FEE = 0.01; // USD₮0, per hedge opened

const USD_T0_DECIMALS = 6;

// Prevents the same payment tx from being reused to open multiple hedges.
const consumedTxHashes = new Set<string>();

interface OnchainosHistoryResponse {
  ok: boolean;
  data?: Array<{
    to: string;
    coinAmount: string;
    coinSymbol: string;
    txStatus: string;
  }>;
}

/**
 * Verifies a specific transaction, not a balance snapshot — this is correct
 * even for self-pay (payTo == our own address), where net balance never
 * changes but the onchain transfer itself is still real and checkable.
 */
export async function verifyPaymentTx(txHash: string): Promise<{
  paid: boolean;
  reason?: string;
}> {
  if (consumedTxHashes.has(txHash.toLowerCase())) {
    return { paid: false, reason: "tx hash ini sudah dipakai untuk hedge lain" };
  }

  let stdout: string;
  try {
    ({ stdout } = await execFileAsync("onchainos", [
      "wallet",
      "history",
      "--chain",
      CHAIN,
      "--tx-hash",
      txHash,
    ]));
  } catch (err) {
    return { paid: false, reason: "gagal query transaksi" };
  }

  const parsed = JSON.parse(stdout) as OnchainosHistoryResponse;
  const tx = parsed.data?.[0];
  if (!parsed.ok || !tx) return { paid: false, reason: "transaksi tidak ditemukan" };

  if (tx.txStatus !== "SUCCESS") return { paid: false, reason: `status transaksi: ${tx.txStatus}` };
  if (tx.to.toLowerCase() !== PAY_TO_ADDRESS.toLowerCase()) {
    return { paid: false, reason: "transaksi tidak dikirim ke alamat yang benar" };
  }

  const requiredMinimalUnits = Math.round(HEDGE_OPEN_FEE * 10 ** USD_T0_DECIMALS);
  const paidMinimalUnits = Number(tx.coinAmount);
  if (paidMinimalUnits < requiredMinimalUnits) {
    return { paid: false, reason: `jumlah kurang: ${tx.coinAmount} < ${requiredMinimalUnits}` };
  }

  consumedTxHashes.add(txHash.toLowerCase());
  return { paid: true };
}

export function buildPaymentChallenge() {
  return {
    error: "Payment required",
    pay: {
      chain: "X Layer",
      chainId: 196,
      asset: "USD₮0",
      assetAddress: PAYMENT_ASSET_ADDRESS,
      payTo: PAY_TO_ADDRESS,
      amount: HEDGE_OPEN_FEE.toString(),
    },
    hint: "After sending payment, retry POST /hedge with the same body plus { draftId, paymentTxHash } from this response.",
  };
}
