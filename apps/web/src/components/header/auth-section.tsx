"use client"

import { Button } from "@repo/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu"
import { SignedIn, SignedOut, SignInButton, SignUpButton, useUser } from "@/lib/auth-hooks"
import { UserButton } from "@/components/user-button"
import { LogIn, UserPlus } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"

/**
 * The account control in the header bar, and the pair of buttons in the
 * mobile menu.
 *
 * The bar holds one control at every width — an avatar when signed in, one
 * account button when not — so the row does not reflow between breakpoints.
 * The full sign-in/sign-up pair belongs in the sheet, where there is room
 * for it.
 */
export default function AuthSection({ variant = "bar" }: { variant?: "bar" | "sheet" }) {
  const { isLoaded } = useUser()
  const t = useTranslations("auth-section")
  const tHeader = useTranslations("header")
  // The server reads the session and renders the signed-in tree; the
  // browser's first render starts with the hook unloaded and renders the
  // skeleton — two different trees, which is the hydration error every page
  // logged. Both render the skeleton until this has mounted, so they agree,
  // and the real state replaces it a frame later. suppressHydrationWarning
  // did not help: it silences a mismatched attribute, not a different tree.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted || !isLoaded) {
    return variant === "sheet" ? (
      <div className="flex items-center gap-2">
        <div className="h-9 flex-1 animate-pulse rounded-md bg-muted" />
        <div className="h-9 flex-1 animate-pulse rounded-md bg-muted" />
      </div>
    ) : (
      <div className="size-10 lg:size-9 animate-pulse rounded-md bg-muted" />
    )
  }

  if (variant === "sheet") {
    return (
      <>
        <SignedOut>
          <SheetAuthButtons t={t} />
        </SignedOut>
        <SignedIn>
          <UserButton className="size-10 lg:size-9" />
        </SignedIn>
      </>
    )
  }

  return (
    <>
      <SignedOut>
        <AccountMenu t={t} label={tHeader("account")} />
      </SignedOut>
      <SignedIn>
        <UserButton className="size-10 lg:size-9" />
      </SignedIn>
    </>
  )
}

interface AuthProps {
  t: ReturnType<typeof useTranslations>
}

/** One button in the bar; the choice between signing in and up is inside it. */
function AccountMenu({ t, label }: AuthProps & { label: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="size-10 bg-transparent lg:size-9"
          aria-label={label}
        >
          <LogIn className="size-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48" sideOffset={8}>
        <SignInButton>
          <DropdownMenuItem className="cursor-pointer gap-2">
            <LogIn className="size-4" />
            <span>{t("signIn", { defaultMessage: "Sign In" })}</span>
          </DropdownMenuItem>
        </SignInButton>

        <DropdownMenuSeparator />

        <SignUpButton>
          <DropdownMenuItem className="cursor-pointer gap-2">
            <UserPlus className="size-4" />
            <span>{t("signUp", { defaultMessage: "Sign Up" })}</span>
          </DropdownMenuItem>
        </SignUpButton>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SheetAuthButtons({ t }: AuthProps) {
  return (
    <div className="flex items-center gap-2">
      <SignInButton>
        <Button variant="outline" size="sm" className="flex-1 bg-transparent font-medium">
          <LogIn className="size-4" />
          <span>{t("signIn", { defaultMessage: "Sign In" })}</span>
        </Button>
      </SignInButton>

      <SignUpButton>
        <Button size="sm" className="flex-1 font-medium">
          <UserPlus className="size-4" />
          <span>{t("signUp", { defaultMessage: "Sign Up" })}</span>
        </Button>
      </SignUpButton>
    </div>
  )
}
