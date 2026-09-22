import type { HedgeRequest } from "./types.js";

// In-memory — cukup buat MVP hackathon (SRS §3: SQLite/in-memory cukup,
// tidak perlu database terdistribusi). Hilang tiap restart, itu sudah cukup.
const store = new Map<string, HedgeRequest>();

export function saveHedge(hedge: HedgeRequest): void {
  store.set(hedge.id, hedge);
}

export function getHedge(id: string): HedgeRequest | undefined {
  return store.get(id);
}

export function listHedges(): HedgeRequest[] {
  return Array.from(store.values());
}
