import * as React from "react"
import { cn } from "../lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
    return (
        <textarea
            data-slot="textarea"
            className={cn(
                "border-input placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground hover:border-foreground/35 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base leading-relaxed shadow-xs transition-[color,background-color,border-color,box-shadow] duration-(--dur-hover) ease-(--ease-out) outline-none focus-visible:ring-[3px] read-only:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                className
            )}
            {...props}
        />
    )
}

export { Textarea }
