import Breadcrumb from "@/components/breadcrumb/custom-breadcrumb";
import { useTranslations } from "next-intl";
import Image from "next/image";

export default function JetraArriving() {
  const t = useTranslations("jetra");

  return (
    <>
      <Breadcrumb />
      <section className="w-full py-8 md:py-12 lg:py-16">
        <div className="container px-4 md:px-6 mx-auto max-w-6xl">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-light tracking-tight sm:text-4xl md:text-5xl text-primary">
                {t("title")}
              </h2>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                {t("subtitle")}
              </p>
            </div>
            <div className="w-full max-w-sm">
              <div className="rounded-lg border border-border bg-card p-8 shadow-sm">
                <div className="flex justify-center">
                  <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center">
                    <Image
                      width={500}
                      height={500}
                      src="/brand/jetra.png"
                      alt={t("brandAlt")}
                    />
                  </div>
                </div>
                <h3 className="mt-6 text-xl font-medium text-destructive">
                  {t("comingSoon")}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("description")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
