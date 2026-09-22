import express from "express";
import { randomUUID } from "node:crypto";
import "dotenv/config";

import type { HedgeRequest } from "./types.js";
import { extractExposure } from "./riskExtractor.js";
import { SimulatedVenueAdapter } from "./venues/SimulatedVenueAdapter.js";
import type { ExecutionVenue } from "./venues/ExecutionVenue.js";
import { writeHedgeAttestation } from "./eas.js";
import { requirePayment } from "./x402.js";
import { saveHedge, getHedge } from "./hedgeStore.js";

const app = express();
app.use(express.json());

// Hari 2 malam: kalau RWAperpAdapter sudah terverifikasi, ganti baris ini.
// Sampai saat itu, HANYA SimulatedVenueAdapter yang boleh dipakai (PRD §4/§9).
const venue: ExecutionVenue = new SimulatedVenueAdapter();

app.get("/health", (_req, res) => {
  res.json({ ok: true, venue: venue.name });
});

// F2 + F3 + F4 — terima teks bebas, ekstrak eksposur, hitung hedge 1:1
app.post("/hedge", async (req, res) => {
  const rawText: string | undefined = req.body?.text;
  if (!rawText || typeof rawText !== "string") {
    return res.status(400).json({ error: "field 'text' wajib diisi" });
  }

  const extracted = extractExposure(rawText);

  // SRS risiko #1: jangan auto-eksekusi dari tebakan rendah confidence
  if (extracted.confidence < 0.5) {
    return res.status(422).json({
      error: "Tidak yakin dengan ekstraksi aset/nilai eksposur dari teks ini.",
      extracted,
      hint: "Sebutkan aset (mis. AAPL) dan nilai eksposur (mis. $5000) secara eksplisit.",
    });
  }

  // F5 / FR-4 — pembayaran x402 (masih stub, lihat src/x402.ts)
  const payment = await requirePayment();
  if (!payment.paid) {
    return res.status(402).json({
      error: "Payment required (x402) — belum diimplementasikan, lihat src/x402.ts",
    });
  }

  const hedge: HedgeRequest = {
    id: randomUUID(),
    rawText,
    asset: extracted.asset,
    exposureValue: extracted.exposureValue,
    hedgeRatio: 1,
    hedgeSize: extracted.exposureValue,
    venue: venue.name,
    status: "pending_payment",
    paymentTxRef: payment.paymentTxRef,
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
});

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
