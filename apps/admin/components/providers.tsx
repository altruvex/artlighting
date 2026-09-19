"use client"

import { DirectionProvider } from "@radix-ui/react-direction"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { type ReactNode, useState } from "react"

export function Provider({ children, dir }: { children: ReactNode; dir: "ltr" | "rtl" }) {
  const [queryClient] = useState(() => new QueryClient())

  // Radix reads direction from context, not from <html dir>: without this,
  // menus, selects and sub-menus open on the wrong side in Arabic.
  return (
    <DirectionProvider dir={dir}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </DirectionProvider>
  )
}
