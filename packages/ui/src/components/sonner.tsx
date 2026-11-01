"use client"

import React from "react"
import { CircleAlert, CircleCheck, CircleX, Info, LoaderCircle } from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

// Sonner injects its own stylesheet unlayered, which beats any Tailwind
// utility on the properties it sets. So the surface is themed through the
// variables Sonner reads, not through classes: the toast is an ordinary
// popover surface, and the status lives in the icon's colour. The old
// translucent green/red/amber washes were Tailwind's stock palette, off the
// brand's tokens, and failed contrast in dark mode.
const Toaster = ({ style, ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme()

  return (
    <Sonner
      theme={(resolvedTheme ?? "system") as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          // Sonner sets a system font stack on its list, which dropped the
          // brand face and the Arabic one with it.
          fontFamily: "var(--font-body), ui-sans-serif, system-ui, sans-serif",
          ...style,
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "!shadow-e3 !gap-3 !items-start",
          title: "!text-sm !font-semibold !leading-snug",
          description: "!text-muted-foreground !text-sm !leading-relaxed",
          icon: "!mt-0.5",
          actionButton:
            "!bg-primary !text-primary-foreground !rounded-md !px-3 !h-7 !text-xs !font-medium",
          cancelButton:
            "!bg-muted !text-muted-foreground !rounded-md !px-3 !h-7 !text-xs !font-medium",
          closeButton:
            "!bg-popover !text-muted-foreground !border-border hover:!text-foreground",
        },
        duration: 4000,
      }}
      closeButton
      icons={{
        success: <CircleCheck className="size-5 text-success" aria-hidden />,
        error: <CircleX className="size-5 text-danger" aria-hidden />,
        warning: <CircleAlert className="size-5 text-warning" aria-hidden />,
        info: <Info className="size-5 text-info" aria-hidden />,
        loading: <LoaderCircle className="size-5 animate-spin text-muted-foreground" aria-hidden />,
      }}
      expand={false}
      position="top-center"
      visibleToasts={3}
      gap={8}
      {...props}
    />
  )
}

export { Toaster }
