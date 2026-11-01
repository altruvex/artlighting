import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

/**
 * Any path no route claims. Without this, an unknown URL fell through to
 * Next's bare default 404 instead of the site's own not-found page.
 *
 * Its path is unknowable at build time, so it renders per request
 * (`connection()`) — inside a Suspense boundary, which is where Cache
 * Components wants request-time work: outside one, every visit logged
 * "uncached data accessed outside of <Suspense>". The boundary costs the
 * status nothing: the proxy has already answered 404 for any path that
 * reaches here (see isKnownPath in lib/known-routes).
 */
export default function CatchAll() {
  return (
    <Suspense>
      <Missing />
    </Suspense>
  );
}

async function Missing(): Promise<never> {
  await connection();
  notFound();
}
