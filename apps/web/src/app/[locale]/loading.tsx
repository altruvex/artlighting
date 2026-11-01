import { useTranslations } from "next-intl";

/**
 * The wait between pages: a single line of light drawn across the top,
 * the way a room comes on — not a pulsing, pinging gold orb in the middle
 * of an empty screen.
 */
export default function Loading() {
  const t = useTranslations("loading");

  return (
    <div role="status" aria-live="polite" className="min-h-[60dvh]">
      <div className="fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden bg-transparent">
        <div className="h-full w-1/3 animate-[loading-sweep_1.1s_var(--ease-in-out)_infinite] bg-primary" />
      </div>
      <span className="sr-only">{t("title")}</span>
    </div>
  );
}
