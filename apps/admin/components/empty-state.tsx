import { cn } from "@repo/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Shown instead of an empty table or list: what's missing and what to do. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-12 text-center", className)}>
      {Icon && (
        <span aria-hidden className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-5" />
        </span>
      )}
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="mx-auto max-w-sm text-sm text-muted-foreground text-pretty">{description}</p>}
      </div>
      {action}
    </div>
  );
}
