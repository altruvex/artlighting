"use client";

import { ErrorView } from "@/components/shell/error-view";

// Inside the dashboard shell: the sidebar and top bar stay usable.
export default function DashboardError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorView error={error} retry={retry} />;
}
