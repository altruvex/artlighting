"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import { buttonVariants } from "@repo/ui/components/button";
import { SignInButton, SignUpButton } from "@/lib/auth-hooks";
import { Lock, LogIn, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Dispatch, SetStateAction } from "react";

const LoginModal = ({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  const t = useTranslations("login");
  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  return (
    <AlertDialog onOpenChange={setIsOpen} open={isOpen}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <button
          type="button"
          onClick={closeModal}
          aria-label={t("close")}
          className="absolute end-3 top-3 grid size-9 place-items-center rounded-md text-muted-foreground transition-colors duration-[var(--dur-hover)] hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 pe-8">
            <Lock className="size-5 shrink-0 text-primary" aria-hidden />
            <AlertDialogTitle className="text-[length:var(--text-lg)]">{t("loginRequired")}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-pretty text-start">
            {t("loginDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <p className="text-pretty text-[length:var(--text-sm)] text-muted-foreground">{t("loginNote")}</p>
        <AlertDialogFooter className="sm:justify-start">
          <SignInButton>
            <button
              className={`${buttonVariants({ variant: "outline" })} w-full sm:w-auto`}
            >
              <LogIn className="size-4" aria-hidden />
              {t("proceedToLogin")}
            </button>
          </SignInButton>
          <SignUpButton>
            <button
              className={`${buttonVariants({ variant: "default" })} w-full sm:w-auto`}
            >
              {t("signUp")}
            </button>
          </SignUpButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default LoginModal;
