"use client";
import { Container } from "@/components/container";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

gsap.registerPlugin(ScrollTrigger);

export default function About() {
  const sectionRef = useRef(null);
  const t = useTranslations("about");

  useEffect(() => {
    const elements = sectionRef.current.querySelectorAll(".animate-element");
    const timelineElements =
      sectionRef.current.querySelectorAll(".animate-timeline");

    elements.forEach((element) => {
      gsap.fromTo(
        element,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          scrollTrigger: {
            trigger: element,
            start: "top 80%",
            end: "top 60%",
            scrub: true,
            once: true
          }
        }
      );
    });

    timelineElements.forEach((element) => {
      gsap.fromTo(
        element,
        { opacity: 0, x: -50 },
        {
          opacity: 1,
          x: 0,
          duration: 1,
          scrollTrigger: {
            trigger: element,
            start: "top 90%",
            end: "top 70%",
            scrub: true,
            once: true
          }
        }
      );
    });
  }, []);

  return (
    <section ref={sectionRef} className="w-full py-12 md:py-24 lg:py-32">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[1fr_500px]">
          <div className="grid gap-4">
            <div className="space-y-4 animate-element">
              <h2 className="font-bold tracking-tighter text-3xl sm:text-4xl md:text-5xl">
                {t("title")}
              </h2>
              <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                {t("description")}
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-6 animate-element">
                <h3 className="text-lg font-semibold text-primary">
                  {t("mission-title")}
                </h3>
                <p className="text-muted-foreground mt-2">
                  {t("mission-text")}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-6 animate-element">
                <h3 className="text-lg font-semibold text-primary">
                  {t("values-title")}
                </h3>
                <p className="text-muted-foreground mt-2">
                  {t("values-text")}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-6 animate-element">
                <h3 className="text-lg font-semibold text-primary">
                  {t("team-title")}
                </h3>
                <p className="text-muted-foreground mt-2">
                  {t("team-text")}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-6 animate-element">
                <h3 className="text-lg font-semibold text-primary">
                  {t("commitment-title")}
                </h3>
                <p className="text-muted-foreground mt-2">
                  {t("commitment-text")}
                </p>
              </div>
            </div>
          </div>
          <div className="relative animate-element">
            <div className="after:absolute after:inset-y-0 after:w-px after:bg-border relative pl-6 after:left-0 grid gap-10">
              {t.raw("timeline").map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[auto_1fr] gap-1 text-sm relative animate-timeline"
                >
                  <div className="mt-[3px] aspect-square w-3 bg-primary rounded-full z-10" />
                  <div className="font-medium -mt-px">{item}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}