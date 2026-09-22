import { randomUUID } from "node:crypto";
import type { ExecutionVenue, OpenPositionResult, ClosePositionResult } from "./ExecutionVenue.js";
import type { HedgeRequest } from "../types.js";

/**
 * Fallback wajib — selalu jalan, deterministik, tanpa dependensi eksternal.
 * Dipakai kalau RWAperpAdapter belum diverifikasi bisa diakses (F9 di PRD).
 */
export class SimulatedVenueAdapter implements ExecutionVenue {
  readonly name = "simulated" as const;

  async openPosition(hedge: HedgeRequest): Promise<OpenPositionResult> {
    return {
      ok: true,
      venueRef: `sim-${randomUUID()}`,
    };
  }

  async closePosition(hedge: HedgeRequest): Promise<ClosePositionResult> {
    return { ok: true };
  }
}
