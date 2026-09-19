import { ThemedSignUp } from "@/components/themed-sign-up";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Suspense } from "react";

const SignUpPage = () => {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-16">
      <div
        className="glow-orb glow-orb-animate -top-32 start-[-6rem] h-[28rem] w-[28rem] bg-primary/30 dark:bg-primary/20"
        aria-hidden
      />
      <div
        className="glow-orb glow-orb-animate top-1/2 end-[-8rem] h-[24rem] w-[24rem] bg-primary/20 dark:bg-primary/15"
        style={{ animationDelay: "-7s" }}
        aria-hidden
      />

      <Link
        href="/"
        className="absolute start-4 top-4 z-10 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground rtl:flex-row-reverse sm:start-6 sm:top-6"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        Back to Home
      </Link>

      <div className="relative z-10 flex w-full max-w-5xl overflow-hidden rounded-3xl shadow-2xl shadow-black/10">
        <div className="relative hidden flex-1 lg:block">
          <Image
            src="/new-collection/new-collection-1.jpg"
            alt="Art Lighting Showcase"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-10 text-white">
            <h2 className="mb-2 text-3xl font-bold">Join Art Lighting</h2>
            <p className="text-sm text-white/80">
              Create your account and start illuminating your space
            </p>
          </div>
        </div>
        <div className="glass-surface flex flex-1 flex-col items-center justify-center p-8 sm:p-12">
          <Suspense fallback={<div>Loading...</div>}>
            <ThemedSignUp />
          </Suspense>
        </div>
      </div>
    </main>
  );
};

export default SignUpPage;
