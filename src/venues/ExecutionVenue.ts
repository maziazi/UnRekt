import type { HedgeRequest } from "../types.js";

export interface OpenPositionResult {
  ok: boolean;
  venueRef: string; // id posisi di venue (dummy untuk simulasi, tx hash asli untuk RWAperp)
  error?: string;
}

export interface ClosePositionResult {
  ok: boolean;
  error?: string;
}

/**
 * Satu dependensi eksternal yang belum terverifikasi (RWAperp) tidak boleh
 * menentukan hidup-matinya produk. Lihat PRD §4 dan SRS §1.
 */
export interface ExecutionVenue {
  readonly name: "simulated" | "rwaperp";
  openPosition(hedge: HedgeRequest): Promise<OpenPositionResult>;
  closePosition(hedge: HedgeRequest): Promise<ClosePositionResult>;
}
