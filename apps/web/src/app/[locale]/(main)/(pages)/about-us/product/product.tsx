import { Container } from "@/components/container";
import Button from "@/components/custom-button";
import Image from "next/image";
import { useTranslations } from "next-intl";

function Product() {
  const t = useTranslations("categories-in-about");

  return (
    <div className="pt-16 pb-16">
      <h2 className="text-center text-4xl md:text-5xl font-medium tracking-wide text-foreground  mb-16">
        {t("title")}
      </h2>
      <Container>
        <div className="flex flex-col lg:flex-row items-start mt-24 pb-16 border-b border-border border-opacity-35">
          <div className="lg:w-1/4">
            <Image
              src="/indoor/products500/jy-535-5w/JY-535-5W (1).png"
              alt={t("indoor.title")}
              width={500}
              height={500}
            />
          </div>
          <div className="lg:w-2/3 lg:ml-12 rtl:lg:mr-12 mt-2 lg:mt-0">
            <h3 className="sm:text-2xl md:text-3xl text-xl font-medium mb-2 text-primary">
              {t("indoor.title")}
            </h3>
            <p className="sm:text-lg md:text-xl text-base font-medium text-muted-foreground mb-4 leading-relaxed">
              {t("indoor.description")}
            </p>
            <Button destination="/products?brand=balcom&family=indoor" />
          </div>
        </div>
        <div className="flex flex-col lg:flex-row items-start mt-24 pb-16 border-b border-border border-opacity-35">
          <div className="lg:w-1/4">
            <Image
              src="/outdoor/Bollard/JY-BO-001-650MM-8W/JY-BO-001-650MM-8W (1).png"
              alt={t("outdoor.title")}
              width={500}
              height={500}
            />
          </div>
          <div className="lg:w-2/3 lg:ml-12 rtl:lg:mr-12 mt-2  lg:mt-0">
            <h3 className="sm:text-2xl md:text-3xl text-xl font-medium mb-2 text-primary">
              {t("outdoor.title")}
            </h3>
            <p className="sm:text-lg md:text-xl text-base font-medium text-muted-foreground mb-4 leading-relaxed">
              {t("outdoor.description")}
            </p>
            <Button destination="/products?brand=balcom&family=outdoor" />
          </div>
        </div>
        <div className="flex flex-col lg:flex-row items-start mt-24">
          <div className="lg:w-1/4">
            <Image
              src="/chandelier/MC6091/MC6091-H3.png"
              alt={t("chandelier.title")}
              width={500}
              height={500}
            />
          </div>
          <div className="lg:w-2/3 lg:ml-12 rtl:lg:mr-12 mt-2 lg:mt-0">
            <h3 className="sm:text-2xl md:text-3xl text-xl font-medium mb-2 text-primary">
              {t("chandelier.title")}
            </h3>
            <p className="sm:text-lg md:text-xl text-base font-medium text-muted-foreground mb-4 leading-relaxed">
              {t("chandelier.description")}
            </p>
            <Button destination="/products?brand=mister-led&family=chandelier" />
          </div>
        </div>
      </Container>
    </div>
  );
}

export default Product;
