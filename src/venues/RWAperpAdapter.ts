import type { ExecutionVenue, OpenPositionResult, ClosePositionResult } from "./ExecutionVenue.js";
import type { HedgeRequest } from "../types.js";

/**
 * BELUM DIVERIFIKASI — jangan dipasang ke server.ts sampai akses API RWAperp
 * dikonfirmasi nyata (PRD §10, keputusan Hari 2 malam). Sampai saat itu,
 * server hanya boleh memakai SimulatedVenueAdapter.
 *
 * TODO Hari 2: konfirmasi endpoint asli + auth RWAperp Agent mode,
 * lalu isi implementasi di bawah. Kalau sampai malam Hari 2 belum bisa
 * diverifikasi, hapus pemanggilan file ini sama sekali (bukan dibiarkan
 * setengah jadi) sesuai Aturan Potong PRD §9.
 */
export class RWAperpAdapter implements ExecutionVenue {
  readonly name = "rwaperp" as const;

  async openPosition(hedge: HedgeRequest): Promise<OpenPositionResult> {
    throw new Error("RWAperpAdapter belum diverifikasi — lihat TODO di file ini.");
  }

  async closePosition(hedge: HedgeRequest): Promise<ClosePositionResult> {
    throw new Error("RWAperpAdapter belum diverifikasi — lihat TODO di file ini.");
  }
}
