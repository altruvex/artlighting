import { isRevalidatableTag } from "@/lib/cache.server";
import { revalidateTag } from "next/cache";
import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

/**
 * Lets the admin drop the storefront's cached catalogue after it writes.
 *
 * The admin is a separate Next app: its own revalidateTag cannot reach this
 * app's cache, so it calls here (apps/admin/lib/storefront.ts) with the
 * shared STOREFRONT_REVALIDATE_SECRET. Without the secret configured the
 * route refuses everything, and the cache still refreshes on its own
 * within the "catalogue" cacheLife (5 minutes).
 */
const Body = z.object({ tags: z.array(z.string().max(256)).min(1).max(20) });

function authorized(request: NextRequest): boolean {
  const secret = process.env.STOREFRONT_REVALIDATE_SECRET;
  if (!secret || secret.length < 32) return false;
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !parsed.data.tags.every(isRevalidatableTag)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  // Expired outright, not served stale while refreshing: after an admin
  // edits a price, the very next visitor should see the new one.
  for (const tag of parsed.data.tags) revalidateTag(tag, { expire: 0 });
  return NextResponse.json({ revalidated: parsed.data.tags });
}
