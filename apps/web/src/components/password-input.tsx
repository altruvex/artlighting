"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

/**
 * A password field you can read back.
 *
 * Typing a password blind, on a phone keyboard, in a form that rejects it
 * with "invalid email or password" and no way to tell which, is the most
 * common reason a sign-in fails twice. The eye is the field's own control:
 * it never submits (`type="button"` — inside a form a bare button submits
 * it), it says which state it is in rather than only showing an icon, and
 * it sits at the end of the field, which is the left in Arabic and the
 * right in English.
 *
 * The text stays out of the DOM as a value attribute; only the input's
 * type changes, so a password manager still treats the field as one.
 */
export function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type">) {
  const t = useTranslations("a11y");
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  const label = visible ? t("hidePassword") : t("showPassword");

  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("h-11 rounded-xl ps-10 pe-11", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((shown) => !shown)}
        aria-label={label}
        aria-pressed={visible}
        title={label}
        className="absolute end-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors duration-[var(--dur-hover)] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
      >
        <Icon className="size-4" aria-hidden />
      </button>
    </div>
  );
}
