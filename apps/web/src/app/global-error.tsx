"use client";

import { useEffect } from "react";

/**
 * Last line of defence: the root [locale] layout itself threw, so there is
 * no <html>, no fonts, no theme and no translations to lean on. The page
 * says the same thing in both languages with inline styles only.
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error && "digest" in error ? String((error as { digest?: unknown }).digest ?? "") : "";

  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fff", color: "#111" }}>
        <main style={{ maxWidth: 640, margin: "0 auto", padding: "15vh 16px" }}>
          <h1 style={{ fontSize: 28, fontWeight: 500, margin: 0 }}>Something went wrong on our side.</h1>
          <h1 dir="rtl" lang="ar" style={{ fontSize: 28, fontWeight: 500, margin: "12px 0 0" }}>
            حدث خطأ من جهتنا.
          </h1>
          <div style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => retry()}
              style={{ height: 44, padding: "0 20px", borderRadius: 6, border: 0, background: "#111", color: "#fff", fontWeight: 600, cursor: "pointer" }}
            >
              Try again · حاول مرة أخرى
            </button>
            {/* A plain <a>: a full reload rebuilds the root layout from scratch. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ height: 44, display: "inline-flex", alignItems: "center", padding: "0 20px", borderRadius: 6, border: "1px solid #ccc", color: "inherit", textDecoration: "none" }}>
              Home · الرئيسية
            </a>
          </div>
          {digest && <p style={{ marginTop: 32, fontSize: 13, color: "#666", fontFamily: "monospace" }}>Ref: {digest}</p>}
        </main>
      </body>
    </html>
  );
}
