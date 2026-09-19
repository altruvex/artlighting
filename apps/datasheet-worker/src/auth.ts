import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const HEADER = "x-datasheet-worker-secret";

/**
 * Fails closed: if DATASHEET_WORKER_SECRET isn't set on this service, every
 * request is rejected rather than silently allowed through unauthenticated.
 */
export function checkSecret(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.DATASHEET_WORKER_SECRET;
  if (!expected) {
    res.status(500).json({ error: "worker misconfigured: DATASHEET_WORKER_SECRET not set" });
    return;
  }

  const provided = req.header(HEADER) ?? "";
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);

  const ok =
    expectedBuf.length === providedBuf.length && timingSafeEqual(expectedBuf, providedBuf);

  if (!ok) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  next();
}
