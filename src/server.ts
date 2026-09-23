import express from "express";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import "dotenv/config";

import type { HedgeRequest } from "./types.js";
import { extractExposure } from "./riskExtractor.js";
import { SimulatedVenueAdapter } from "./venues/SimulatedVenueAdapter.js";
import type { ExecutionVenue } from "./venues/ExecutionVenue.js";
import { writeHedgeAttestation } from "./eas.js";
import { buildPaymentChallenge, verifyPaymentTx } from "./x402.js";
import { saveHedge, getHedge } from "./hedgeStore.js";
import { saveDraft, getDraft, deleteDraft } from "./paymentDrafts.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, "..", "public")));

// RWAperp dicoret resmi (23 Sep 2026) — domainnya parked, bukan produk aktif.
// SimulatedVenueAdapter adalah venue final, bukan fallback sementara.
const venue: ExecutionVenue = new SimulatedVenueAdapter();

app.get("/health", (_req, res) => {
  res.json({ ok: true, venue: venue.name });
});

// F2 + F3 + F4 + F5 (FR-4) — terima teks bebas, ekstrak eksposur, hitung
// hedge 1:1, gerbang pembayaran nyata via saldo USD₮0 X Layer.
// Alur: panggilan pertama (tanpa draftId) -> 402 + draftId. Bayar ke alamat
// yang diberikan. Panggilan ulang (dengan draftId) -> verifikasi saldo
// bertambah -> buka hedge.
app.post("/hedge", async (req, res) => {
  const rawText: string | undefined = req.body?.text;
  const draftId: string | undefined = req.body?.draftId;
  const paymentTxHash: string | undefined = req.body?.paymentTxHash;

  if (!rawText || typeof rawText !== "string") {
    return res.status(400).json({ error: "field 'text' wajib diisi" });
  }

  // Panggilan ulang setelah bayar
  if (draftId) {
    const draft = getDraft(draftId);
    if (!draft) {
      return res.status(404).json({
        error: "draftId tidak ditemukan atau sudah kedaluwarsa (15 menit). Mulai ulang tanpa draftId.",
      });
    }

    if (!paymentTxHash || typeof paymentTxHash !== "string") {
      return res.status(402).json({
        ...buildPaymentChallenge(),
        draftId,
        hint: "Sertakan 'paymentTxHash' dari transaksi pembayaran USD₮0 kamu.",
      });
    }

    const { paid, reason } = await verifyPaymentTx(paymentTxHash);
    if (!paid) {
      return res.status(402).json({
        ...buildPaymentChallenge(),
        draftId,
        reason,
        hint: "Verifikasi pembayaran gagal. Tunggu beberapa detik kalau transaksi baru saja dikirim, lalu coba lagi.",
      });
    }

    deleteDraft(draftId);
    return openHedgeAndRespond(res, draft.rawText, draft.extracted, paymentTxHash);
  }

  // Panggilan pertama
  const extracted = extractExposure(rawText);

  // SRS risiko #1: jangan auto-eksekusi dari tebakan rendah confidence
  if (extracted.confidence < 0.5) {
    return res.status(422).json({
      error: "Tidak yakin dengan ekstraksi aset/nilai eksposur dari teks ini.",
      extracted,
      hint: "Sebutkan aset (mis. AAPL) dan nilai eksposur (mis. $5000) secara eksplisit.",
    });
  }

  const newDraftId = randomUUID();
  saveDraft({ id: newDraftId, rawText, extracted, createdAt: Date.now() });

  return res.status(402).json({
    ...buildPaymentChallenge(),
    draftId: newDraftId,
  });
});

async function openHedgeAndRespond(
  res: import("express").Response,
  rawText: string,
  extracted: ReturnType<typeof extractExposure>,
  paymentTxHash: string
) {
  const hedge: HedgeRequest = {
    id: randomUUID(),
    rawText,
    asset: extracted.asset,
    exposureValue: extracted.exposureValue,
    hedgeRatio: 1,
    hedgeSize: extracted.exposureValue,
    venue: venue.name,
    status: "pending_payment",
    paymentTxRef: paymentTxHash,
    attestationUid: null,
    createdAt: new Date().toISOString(),
    closedAt: null,
  };

  const opened = await venue.openPosition(hedge);
  if (!opened.ok) {
    hedge.status = "failed";
    saveHedge(hedge);
    return res.status(502).json({ error: opened.error ?? "gagal membuka posisi", hedge });
  }

  hedge.status = "open";

  // F15 — attestation EAS (masih stub, lihat src/eas.ts)
  const attestation = await writeHedgeAttestation(hedge);
  hedge.attestationUid = attestation.attestationUid;

  saveHedge(hedge);
  res.status(201).json({ hedge, venueRef: opened.venueRef, attestation });
}

// F7 — status posisi
app.get("/hedge/:id", (req, res) => {
  const hedge = getHedge(req.params.id);
  if (!hedge) return res.status(404).json({ error: "hedge tidak ditemukan" });
  res.json({ hedge });
});

// F6 (tutup manual) — auto-close berbasis waktu (F11) dicoret di aturan potong
app.post("/hedge/:id/close", async (req, res) => {
  const hedge = getHedge(req.params.id);
  if (!hedge) return res.status(404).json({ error: "hedge tidak ditemukan" });
  if (hedge.status !== "open") {
    return res.status(409).json({ error: `hedge berstatus '${hedge.status}', tidak bisa ditutup` });
  }

  const closed = await venue.closePosition(hedge);
  if (!closed.ok) {
    return res.status(502).json({ error: closed.error ?? "gagal menutup posisi" });
  }

  hedge.status = "closed";
  hedge.closedAt = new Date().toISOString();
  saveHedge(hedge);
  res.json({ hedge });
});

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, () => {
  console.log(`UNREKT jalan di http://localhost:${port}`);
  console.log(`Venue eksekusi aktif: ${venue.name.toUpperCase()} (bukan RWAperp asli — lihat PRD §4)`);
});
