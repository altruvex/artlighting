import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

/**
 * "Onward", in the reading direction: points right in English and left in
 * Arabic, so a link never points back at where the reader came from.
 */
export function Onward({ className }: { className?: string }) {
  return <ArrowRight aria-hidden className={cn("size-4 shrink-0 rtl:-scale-x-100", className)} />;
}
