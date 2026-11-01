import { cn } from "@repo/ui/lib/utils";
import type { ReactNode } from "react";

/**
 * Standard page opening: title, optional one-line description, actions on the
 * inline-end side. Every dashboard page uses this so headers line up.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0 space-y-1">
        <h1 className="font-display text-[length:var(--text-xl)] font-medium tracking-tight text-balance">{title}</h1>
        {description && <p className="text-sm text-muted-foreground text-pretty">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Page body: consistent width, padding and vertical rhythm. */
export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1600px] space-y-5 p-4 md:p-6 lg:px-8 lg:py-7", className)}>{children}</div>;
}
