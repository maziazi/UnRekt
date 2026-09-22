// Skema data — lihat HackathonSync vault: 02 - SRS.md §3

export type VenueName = "simulated" | "rwaperp";

export type HedgeStatus = "pending_payment" | "open" | "closed" | "failed";

export interface ExtractedExposure {
  asset: string;
  exposureValue: number;
  confidence: number; // 0-1, dipakai untuk minta konfirmasi user kalau rendah (SRS risiko #1)
}

export interface HedgeRequest {
  id: string;
  rawText: string;
  asset: string;
  exposureValue: number;
  hedgeRatio: 1;
  hedgeSize: number;
  venue: VenueName;
  status: HedgeStatus;
  paymentTxRef: string | null; // bukti x402 — kosong sampai FR-4 terpasang
  attestationUid: string | null; // bukti EAS — F15
  createdAt: string;
  closedAt: string | null;
}
