"use client"

import { Suspense } from "react"

export function AuthSectionWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex items-center gap-2">
        <div className="size-9 animate-pulse rounded-md bg-muted" />
      </div>
    }>
      {children}
    </Suspense>
  )
}