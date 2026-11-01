"use client";

import { Onward } from "@/components/editorial/arrow";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useState } from "react";

export type ApplicationItem = {
  slug: string;
  index: string;
  name: string;
  summary: string;
  image: string;
  imagePosition?: string;
};

/**
 * The applications as an index you look through, not a table you read.
 *
 * On wide screens the list is names only, set large and quiet, and the
 * space itself fills the frame beside it: pointing at (or tabbing to) a
 * name brings that room up, with its one-line description on the picture.
 * The old version was two photographs and then a seven-row table repeating
 * them in text, with each name a long read away from its description.
 *
 * On phones there is nothing to hover, so each row carries its own small
 * photograph and its description, and the large frame is not drawn at all
 * (its images are lazy and never requested).
 */
export function ApplicationsExplorer({ items }: { items: ApplicationItem[] }) {
  const [active, setActive] = useState(0);
  const current = items[active];

  return (
    <div className="mt-12 grid gap-10 lg:mt-16 lg:grid-cols-12 lg:gap-12">
      <div aria-hidden className="hidden lg:col-span-5 lg:block">
        <div className="sticky top-28 aspect-[4/5] overflow-hidden rounded-sm bg-muted">
          {items.map((item, index) => (
            <Image
              key={item.slug}
              src={item.image}
              alt=""
              fill
              sizes="(min-width: 1024px) 40vw, 1px"
              style={{ objectPosition: item.imagePosition }}
              className={cn(
                "object-cover transition-[opacity,transform] duration-(--dur-sheet) ease-(--ease-out)",
                index === active ? "scale-100 opacity-100" : "scale-[1.03] opacity-0",
              )}
            />
          ))}
          <div className="absolute inset-0 bg-linear-to-t from-[oklch(0.16_0.006_60/0.72)] via-transparent to-transparent" />
          <p key={current.slug} className="absolute inset-x-0 bottom-0 p-6 text-[length:var(--text-sm)] leading-relaxed text-pretty text-[oklch(0.975_0.002_80)] animate-in fade-in-0 duration-(--dur-sheet)">
            <span className="me-3 font-display font-medium tabular-nums text-[oklch(0.86_0.09_82)]">{current.index}</span>
            {current.summary}
          </p>
        </div>
      </div>

      <ol className="border-t border-border lg:col-span-7">
        {items.map((item, index) => {
          const isActive = index === active;
          return (
            <li key={item.slug} className="border-b border-border">
              <Link
                href={`/applications/${item.slug}`}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 py-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:gap-x-6 lg:py-6"
              >
                <span className="relative size-16 shrink-0 overflow-hidden rounded-sm bg-muted lg:hidden">
                  <Image
                    src={item.image}
                    alt=""
                    fill
                    sizes="64px"
                    style={{ objectPosition: item.imagePosition }}
                    className="object-cover"
                  />
                </span>
                <span className="index-numeral hidden w-8 lg:block">{item.index}</span>

                <span className="min-w-0">
                  <span
                    className={cn(
                      "block font-display text-[length:var(--text-lg)] font-medium leading-snug text-balance transition-colors duration-(--dur-hover) lg:text-[length:var(--text-2xl)]",
                      isActive ? "text-foreground" : "lg:text-muted-foreground lg:group-hover:text-foreground",
                    )}
                  >
                    {item.name}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-[length:var(--text-sm)] text-pretty text-muted-foreground lg:hidden">
                    {item.summary}
                  </span>
                </span>

                <Onward
                  className={cn(
                    "transition-[transform,color,opacity] duration-(--dur-hover) ease-(--ease-out)",
                    isActive
                      ? "text-primary lg:translate-x-1 lg:rtl:-translate-x-1"
                      : "text-muted-foreground lg:opacity-0",
                  )}
                />
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
