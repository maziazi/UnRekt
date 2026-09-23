import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Interface, ZeroHash } from "ethers";
import type { HedgeRequest } from "./types.js";
import { PAY_TO_ADDRESS } from "./x402.js";

const execFileAsync = promisify(execFile);

// Predeploy addresses — standard across every OP Stack chain (Optimism, Base,
// X Layer since its migration to OP Stack), confirmed via the OP Stack
// predeploys registry, not chain-specific guesses.
export const EAS_CONTRACT_ADDRESS = "0x4200000000000000000000000000000000000021";

// Registered once via src/scripts/registerSchema.ts, tx:
// 0x768ed12fb5d21507678497340ef01cc47d333a7ea4f72f3a03b7e82d0e8dfe8d
// Schema: "string asset,uint256 exposureValue,uint256 hedgeSize,string venue,uint256 timestamp"
export const HEDGE_SCHEMA_UID = "0xf3bb1a26106e55ff1f3104fea1607ceba85fa4d502c64ba87e410244caae99e1";

const easIface = new Interface([
  "function attest((bytes32 schema,(address recipient,uint64 expirationTime,bool revocable,bytes32 refUID,bytes data,uint256 value) data)) external payable returns (bytes32)",
]);

/**
 * F15 (PRD) — proof-of-hedge that does not depend on RWAperp or any
 * third-party integration: writes directly to X Layer's live EAS predeploy.
 *
 * Note: `attest()` returns the attestation UID as a function return value,
 * which a plain broadcast (via onchainos wallet contract-call) doesn't
 * decode. We surface the transaction hash instead — independently
 * verifiable on the X Layer explorer, same pattern as x402's paymentTxRef.
 */
export async function writeHedgeAttestation(
  hedge: HedgeRequest
): Promise<{ ok: boolean; attestationUid: string | null; error?: string }> {
  try {
    // ABI-encode the schema's data fields (asset, exposureValue, hedgeSize, venue, timestamp)
    const dataPayload = new Interface([
      "function _(string asset,uint256 exposureValue,uint256 hedgeSize,string venue,uint256 timestamp)",
    ]).encodeFunctionData("_", [
      hedge.asset,
      BigInt(Math.round(hedge.exposureValue)),
      BigInt(Math.round(hedge.hedgeSize)),
      hedge.venue,
      BigInt(Math.floor(new Date(hedge.createdAt).getTime() / 1000)),
    ]);
    // Strip the 4-byte function selector — EAS wants raw ABI-encoded params.
    const encodedData = "0x" + dataPayload.slice(10);

    const calldata = easIface.encodeFunctionData("attest", [
      [
        HEDGE_SCHEMA_UID,
        [
          PAY_TO_ADDRESS, // recipient: our own wallet (self-attestation for this MVP)
          0, // expirationTime: never
          true, // revocable
          ZeroHash, // refUID: none
          encodedData,
          0, // value
        ],
      ],
    ]);

    const { stdout } = await execFileAsync("onchainos", [
      "wallet",
      "contract-call",
      "--to",
      EAS_CONTRACT_ADDRESS,
      "--chain",
      "xlayer",
      "--input-data",
      calldata,
    ]);

    const parsed = JSON.parse(stdout) as { ok: boolean; data?: { txHash?: string }; error?: string };
    if (!parsed.ok || !parsed.data?.txHash) {
      return { ok: false, attestationUid: null, error: parsed.error ?? "attest tx tidak mengembalikan txHash" };
    }

    return { ok: true, attestationUid: parsed.data.txHash };
  } catch (err) {
    return { ok: false, attestationUid: null, error: err instanceof Error ? err.message : String(err) };
  }
}
