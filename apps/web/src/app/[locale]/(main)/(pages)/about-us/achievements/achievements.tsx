"use client";


import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SquareArrowOutUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const data = [
  { year: "2010", sales: 12 },
  { year: "2011", sales: 22 },
  { year: "2012", sales: 20 },
  { year: "2013", sales: 31 },
  { year: "2014", sales: 35 },
  { year: "2015", sales: 45 },
  { year: "2016", sales: 50 },
  { year: "2017", sales: 63 },
  { year: "2018", sales: 68 },
  { year: "2019", sales: 77 },
  { year: "2020", sales: 85 },
  { year: "2021", sales: 87 },
  { year: "2022", sales: 90 },
  { year: "2023", sales: 92 },
  { year: "2024", sales: 88 },
];

export default function Achievements() {
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const numbers = document.querySelectorAll(".number");

    const handleScroll = () => {
      if (window.scrollY >= 1690.4176025390625) {
        if (!started) {
          numbers.forEach((num) => startCount(num));
        }
        setStarted(true);
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [started]);

  const startCount = (el: Element) => {
    const goal = parseInt(el.getAttribute("data-goal") || "0", 10);
    let current = 0;

    const countInterval = setInterval(() => {
      current += 1;
      el.textContent = current.toString();
      if (current === goal) {
        clearInterval(countInterval);
      }
    }, 3000 / goal);
  };
  const t = useTranslations("achievements");
  return (
    <div className={`py-16 stats`}>
      <h2 className="text-center text-4xl md:text-5xl font-medium tracking-wide text-foreground  mb-8">
        {t('title')}
      </h2>
      <Container>
        <div className="flex justify-center items-center flex-wrap gap-8 mb-12">
          <div className="text-center">
            <div className={`flex justify-center items-center my-4 mx-4 rtl:flex-row-reverse `}>
              <div
                className="number text-4xl bg-clip-text text-transparent bg-linear-to-r from-primary via-primary to-primary/60 transition-all duration-300 ease-in-out"
                data-goal="87"
              >
                0
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 384 512"
                width="30"
                height="30"
                className="rtl:ml-2 mr-2"
              >
                <path
                  d="M374.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-320 320c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l320-320zM128 128A64 64 0 1 0 0 128a64 64 0 1 0 128 0zM384 384a64 64 0 1 0 -128 0 64 64 0 1 0 128 0z"
                  fill="url(#gradient)"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%">
                    <stop offset="40%" stopColor="#afbbff" />
                    <stop offset="80%" stopColor="#d9a755" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <p className="text-xl text-muted-foreground uppercase -mt-2">
              {t('happy-customers')}
            </p>
          </div>
          <div className="text-center">
            <div className="flex justify-center items-center my-4 mx-4 rtl:flex-row-reverse">
              <div
                className="number text-4xl bg-clip-text text-transparent bg-linear-to-r from-primary via-primary to-primary/60 transition-all duration-300 ease-in-out"
                data-goal="95"
              >
                0
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 384 512"
                width="30"
                height="30"
                className="rtl:ml-2 mr-2"
              >
                <path
                  d="M374.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-320 320c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l320-320zM128 128A64 64 0 1 0 0 128a64 64 0 1 0 128 0zM384 384a64 64 0 1 0 -128 0 64 64 0 1 0 128 0z"
                  fill="url(#gradient)"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%">
                    <stop offset="40%" stopColor="#afbbff" />
                    <stop offset="80%" stopColor="#d9a755" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <p className="text-xl text-muted-foreground uppercase -mt-2">
              {t('projects-completed')}
            </p>
          </div>
        </div>
        <SalesChart t={t} />
        <div className="my-10 md:my-12 lg:my-16">
          <div className="space-y-16">
            <div>
              <h3 className="md:text-3xl text-2xl font-semibold text-primary mb-6 text-left rtl:text-right">
                {t('approvals')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg overflow-hidden">
                  <Image
                    src="/approvals/approval-1.jpg"
                    alt="Approval"
                    className="w-full h-auto object-cover"
                    width={500}
                    height={500}
                  />
                </div>
              </div>
            </div>
            <div>
              <h3 className="md:text-3xl text-2xl font-semibold text-primary mb-6 text-left rtl:text-right">
                {t('quality-certifications')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg overflow-hidden">
                  <Image
                    src="/approvals/approval-2.jpg"
                    alt="Approval"
                    className="w-full h-auto object-cover"
                    width={500}
                    height={500}
                  />
                </div>
                <div className="shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg overflow-hidden">
                  <Image
                    src="/approvals/approval-3.jpg"
                    alt="Approval"
                    className="w-full h-auto object-cover"
                    width={500}
                    height={500}
                  />
                </div>
                <div className="shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg overflow-hidden">
                  <Image
                    src="/approvals/approval-4.jpg"
                    alt="Approval"
                    className="w-full h-auto object-cover"
                    width={500}
                    height={500}
                  />
                </div>
              </div>
            </div>
            <div>
              <h3 className="md:text-3xl text-2xl font-semibold text-primary mb-6 text-left rtl:text-right">
                {t('exclusive-agent')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <div className="shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg overflow-hidden">
                  <Image
                    src="/approvals/approval-5.png"
                    alt="Approval"
                    className="w-full h-auto object-cover"
                    width={500}
                    height={500}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-center items-center">
              <Button size={"lg"} variant={"default"} className="text-lg">
                <div className="flex items-center gap-4  rtl:flex-row-reverse">
                  <Link
                    href="/portfolio/portfolio-artlighting.pdf"
                    download="portfolio-artlighting.pdf"
                  >
                    {t('download-portfolio')}
                  </Link>
                  <SquareArrowOutUpRight className="w-5 h-5" />
                </div>
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

function SalesChart({ t }: { t: (key: string) => string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('selling-overview')}</CardTitle>
        <CardDescription>{t('sales-percentage')}</CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis
                dataKey="year"
                stroke="#888888"
                fontSize={13}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={13}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="#ff8800"
                strokeWidth={3}
                dot={{ fill: "#d9a755", r: 6 }}
                activeDot={{ r: 8, fill: "#ff8800" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}