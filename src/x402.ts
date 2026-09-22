/**
 * F5 (PRD, prioritas tertinggi — FR-4 di SRS) — pembayaran x402 nyata.
 * BELUM diimplementasikan. Rencana (SRS §4): endpoint /hedge harus salah satu
 * dari dua bentuk resmi OKX.AI ASP:
 *   1. gratis — balas hasil langsung
 *   2. x402   — balas 402 Payment Required dulu, ulang request setelah bayar
 *
 * TODO Hari 1 (setelah Agentic Wallet login): uji pembayaran x402 PALING
 * SEDERHANA secara terpisah dari alur /hedge, sebelum dipasang di sini.
 * Jangan pasang ke alur utama sebelum mekanismenya terbukti jalan sendiri.
 */
export async function requirePayment(): Promise<{
  paid: boolean;
  paymentTxRef: string | null;
}> {
  console.warn("[x402] STUB — belum ada pembayaran nyata yang terjadi.");
  return { paid: false, paymentTxRef: null };
}
