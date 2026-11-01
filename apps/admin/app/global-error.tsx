"use client";

import { useEffect } from "react";

/**
 * The root layout itself threw, so there is no <html>, theme, fonts or
 * translations to lean on: both languages, inline styles only.
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error && "digest" in error ? String((error as { digest?: unknown }).digest ?? "") : "";

  useEffect(() => {
    console.error("[admin-global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fff", color: "#111" }}>
        <main style={{ maxWidth: 480, margin: "0 auto", padding: "15vh 16px", textAlign: "center" }}>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Something went wrong</h1>
          <h1 dir="rtl" lang="ar" style={{ fontSize: 22, fontWeight: 500, margin: "8px 0 0" }}>
            حدث خطأ
          </h1>
          <div style={{ display: "flex", gap: 8, marginTop: 24, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => retry()}
              style={{ height: 36, padding: "0 16px", borderRadius: 6, border: 0, background: "#111", color: "#fff", fontWeight: 600, cursor: "pointer" }}
            >
              Try again · حاول مرة أخرى
            </button>
            {/* A plain <a>: a full reload rebuilds the root layout from scratch. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/dashboard" style={{ height: 36, display: "inline-flex", alignItems: "center", padding: "0 16px", borderRadius: 6, border: "1px solid #ccc", color: "inherit", textDecoration: "none" }}>
              Dashboard · لوحة التحكم
            </a>
          </div>
          {digest && <p style={{ marginTop: 24, fontSize: 12, color: "#666", fontFamily: "monospace" }}>Ref: {digest}</p>}
        </main>
      </body>
    </html>
  );
}
