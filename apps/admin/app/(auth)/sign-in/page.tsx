import { ThemedSignIn } from "@/components/theme-sign-in";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const SignInPage = () => {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-16">
      {/* Ambient glow field — the same warm light the product line sells,
          used as the interface's own atmosphere. */}
      <div
        className="glow-orb glow-orb-animate -top-32 -left-24 h-[28rem] w-[28rem] bg-primary/30 dark:bg-primary/20"
        aria-hidden
      />
      <div
        className="glow-orb glow-orb-animate top-1/2 -right-32 h-[24rem] w-[24rem] bg-primary/20 dark:bg-primary/15"
        style={{ animationDelay: "-7s" }}
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_0%,var(--background)_70%)]"
        aria-hidden
      />

      <Link
        href="/"
        className="absolute left-4 top-4 z-10 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:left-6 sm:top-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>

      <div className="relative z-10 w-full max-w-md">
        <ThemedSignIn />
      </div>
    </main>
  );
};

export default SignInPage;
