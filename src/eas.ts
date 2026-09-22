import type { HedgeRequest } from "./types.js";

// Predeploy EAS resmi di X Layer — sudah live di chain, tidak perlu deploy sendiri.
// Lihat riset X Layer sebelumnya di memory: EAS predeploy fondasi gratis untuk
// verifikasi/provenance/RWA.
export const EAS_CONTRACT_ADDRESS = "0x4200000000000000000000000000000000000021";

/**
 * F15 (PRD) — bukti onchain yang TIDAK bergantung pada RWAperp atau mitra
 * pihak ketiga mana pun. Wajib dipanggil setiap hedge dibuka.
 *
 * BELUM DISAMBUNGKAN ke wallet asli — butuh Agentic Wallet aktif (Hari 1,
 * langkah manual: npx skills add okx/onchainos-skills + login).
 * TODO Hari 3: ganti stub ini dengan pemanggilan signer Agentic Wallet
 * yang sesungguhnya untuk submit attestation on-chain.
 */
export async function writeHedgeAttestation(
  hedge: HedgeRequest
): Promise<{ ok: boolean; attestationUid: string | null; error?: string }> {
  console.warn(
    "[eas] STUB — belum tersambung ke Agentic Wallet. " +
      "Attestation TIDAK benar-benar ditulis onchain sampai ini diganti."
  );

  return {
    ok: false,
    attestationUid: null,
    error: "eas.ts belum diimplementasikan — lihat TODO Hari 3",
  };
}
