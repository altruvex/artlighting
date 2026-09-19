"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

function Table({ className, dir, ...props }: React.ComponentProps<"table"> & { dir?: "rtl" | "ltr" }) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
      dir={dir}
    >
      <table
        data-slot="table"
        className={cn(
          "w-full caption-bottom text-sm",
          // RTL styles
          dir === "rtl" && [
            "[&_th]:text-right [&_td]:text-right",
            "[&_th]:border-e [&_th]:border-s-0 [&_th:first-child]:border-s [&_th:first-child]:border-e-0",
            "[&_td]:border-e [&_td]:border-s-0 [&_td:first-child]:border-s [&_td:first-child]:border-e-0",
          ],
          // LTR styles (default)
          dir !== "rtl" && [
            "[&_th]:text-left [&_td]:text-left",
          ],
          className
        )}
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
  dir,
  ...props
}: React.ComponentProps<"th"> & { dir?: "rtl" | "ltr" }) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "text-foreground h-10 px-2 align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pe-0 [&>[role=checkbox]]:translate-y-[2px]",
        // RTL/LTR text alignment
        dir === "rtl" ? "text-right" : "text-left",
        className
      )}
      {...props}
    />
  )
}

function TableCell({
  className,
  dir,
  ...props
}: React.ComponentProps<"td"> & { dir?: "rtl" | "ltr" }) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pe-0 [&>[role=checkbox]]:translate-y-[2px]",
        // RTL/LTR text alignment
        dir === "rtl" ? "text-right" : "text-left",
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