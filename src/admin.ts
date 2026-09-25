import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Request, Response, NextFunction } from "express";

const execFileAsync = promisify(execFile);

/**
 * Temporary bootstrap route, guarded by ADMIN_SECRET — lets us run
 * `onchainos wallet login` INSIDE a freshly deployed container (Render/Fly)
 * without SSH access, which turned out to be plan-restricted. Same Google
 * account -> same wallet, no re-funding needed. Remove/disable after the
 * container has an active session (see README).
 */
export function requireAdminSecret(req: Request, res: Response, next: NextFunction) {
  const provided = req.header("x-admin-secret");
  const expected = process.env.ADMIN_SECRET;
  if (!expected) {
    return res.status(503).json({ error: "ADMIN_SECRET tidak diset di environment" });
  }
  if (provided !== expected) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

export async function walletLoginInit(_req: Request, res: Response) {
  try {
    const { stdout } = await execFileAsync("onchainos", ["wallet", "login", "--phase", "init"]);
    res.json(JSON.parse(stdout));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}

export async function walletLoginPoll(req: Request, res: Response) {
  const sessionId = req.query.sessionId as string | undefined;
  if (!sessionId) return res.status(400).json({ error: "query param 'sessionId' wajib diisi" });

  try {
    const { stdout } = await execFileAsync("onchainos", [
      "wallet",
      "login",
      "--phase",
      "poll",
      "--session-id",
      sessionId,
    ]);
    res.json(JSON.parse(stdout));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}

export async function walletStatus(_req: Request, res: Response) {
  try {
    const { stdout } = await execFileAsync("onchainos", ["wallet", "status"]);
    res.json(JSON.parse(stdout));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
