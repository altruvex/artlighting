"use client";

import { ErrorView } from "@/components/shell/error-view";

// Pages outside the dashboard shell (sign-in, unauthorized), and the
// dashboard layout itself if its session check throws.
export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorView error={error} retry={retry} fullPage />;
}
