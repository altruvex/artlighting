import * as React from "react"
import { cn } from "../lib/utils"

// Alignment is logical (text-start), so a table follows the document's
// direction with no prop. The old per-direction rules set text-left/right on
// every th and td from the table, which out-ranked a cell's own `text-end` —
// the price columns never right-aligned — and drew cell borders in Arabic
// only. `dir` still passes through for a table set against its page.
function Table({ className, dir, ...props }: React.ComponentProps<"table"> & { dir?: "rtl" | "ltr" }) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
      dir={dir}
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm tabular-nums", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
        className
      )}
      {...props}
    />
  )
}

function TableHead({
  className,
  ...props
}: React.ComponentProps<"th"> & { dir?: "rtl" | "ltr" }) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        // Quieter than the data under it: the header labels, the rows speak.
        "text-muted-foreground h-10 px-3 text-start align-middle text-xs font-medium whitespace-nowrap [&:has([role=checkbox])]:pe-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCell({
  className,
  ...props
}: React.ComponentProps<"td"> & { dir?: "rtl" | "ltr" }) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-3 py-2 text-start align-middle whitespace-nowrap [&:has([role=checkbox])]:pe-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}