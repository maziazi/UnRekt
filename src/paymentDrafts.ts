import type { ExtractedExposure } from "./types.js";

interface PaymentDraft {
  id: string;
  rawText: string;
  extracted: ExtractedExposure;
  createdAt: number;
}

// In-memory, single-process — matches hedgeStore.ts. Fine for hackathon MVP.
const drafts = new Map<string, PaymentDraft>();

const DRAFT_TTL_MS = 15 * 60 * 1000; // 15 minutes

export function saveDraft(draft: PaymentDraft): void {
  drafts.set(draft.id, draft);
}

export function getDraft(id: string): PaymentDraft | undefined {
  const draft = drafts.get(id);
  if (!draft) return undefined;
  if (Date.now() - draft.createdAt > DRAFT_TTL_MS) {
    drafts.delete(id);
    return undefined;
  }
  return draft;
}

export function deleteDraft(id: string): void {
  drafts.delete(id);
}
