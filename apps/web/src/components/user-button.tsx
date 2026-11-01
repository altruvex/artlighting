"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { useUser } from "@/lib/auth-hooks";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

/** Signed-in user's avatar with a sign-out dropdown. */
export function UserButton({ className }: { className?: string }) {
  const { user } = useUser();
  const router = useRouter();
  const t = useTranslations("auth");
  const tSection = useTranslations("auth-section");

  if (!user) return null;

  const initial = (user.name || user.email || "?").charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={tSection("userMenu")}
          className={cn(
            "flex items-center justify-center rounded-full bg-primary font-medium text-primary-foreground transition-opacity duration-[var(--dur-hover)] ease-[var(--ease-out)] hover:opacity-85",
            className ?? "size-10",
          )}
        >
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" className="size-full rounded-full object-cover" />
          ) : (
            initial
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={async () => {
            await signOut();
            router.push("/");
            router.refresh();
          }}
        >
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
