"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { DayPicker, getDefaultClassNames } from "react-day-picker"

import { cn } from "../lib/utils"
import { buttonVariants } from "./button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  dir,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      dir={dir}
      className={cn(
        "bg-popover group/calendar p-3 [--cell-size:2rem]",
        className
      )}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("flex gap-4 flex-col md:flex-row relative", defaultClassNames.months),
        month: cn("flex flex-col w-full gap-4", defaultClassNames.month),
        nav: cn(
          "flex items-center justify-between absolute inset-x-0 top-0 w-full",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "size-(--cell-size) p-0 select-none rtl:rotate-180",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "size-(--cell-size) p-0 select-none rtl:rotate-180",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex items-center justify-center h-(--cell-size) w-full px-(--cell-size)",
          defaultClassNames.month_caption
        ),
        caption_label: cn("text-sm font-medium", defaultClassNames.caption_label),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "text-muted-foreground flex-1 font-normal text-xs select-none",
          defaultClassNames.weekday
        ),
        week: cn("flex w-full mt-2", defaultClassNames.week),
        day: cn(
          "relative w-full h-full p-0 text-center group/day aspect-square select-none",
          defaultClassNames.day
        ),
        range_start: cn("rounded-s-md bg-accent", defaultClassNames.range_start),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn("rounded-e-md bg-accent", defaultClassNames.range_end),
        today: cn(
          "bg-accent text-accent-foreground rounded-md data-[selected=true]:rounded-none",
          defaultClassNames.today
        ),
        outside: cn(
          "text-muted-foreground/50 aria-selected:text-muted-foreground/50",
          defaultClassNames.outside
        ),
        disabled: cn("text-muted-foreground/50 opacity-50", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClassName, ...chevronProps }) => {
          const Icon = orientation === "left" ? ChevronLeftIcon : ChevronRightIcon
          return <Icon className={cn("size-4", chevronClassName)} {...chevronProps} />
        },
        DayButton: ({ className: dayClassName, day, modifiers, ...dayProps }) => (
          <button
            type="button"
            data-day={day.date.toLocaleDateString()}
            data-selected-single={
              modifiers.selected &&
              !modifiers.range_start &&
              !modifiers.range_end &&
              !modifiers.range_middle
            }
            data-range-start={modifiers.range_start}
            data-range-end={modifiers.range_end}
            data-range-middle={modifiers.range_middle}
            className={cn(
              "flex aspect-square size-auto w-full min-w-(--cell-size) flex-col items-center justify-center gap-1 rounded-md text-sm leading-none font-normal transition-[color,background-color] duration-(--dur-hover) ease-(--ease-out) hover:bg-accent hover:text-accent-foreground",
              "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground",
              "data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground",
              "data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground",
              "data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground",
              "outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
              dayClassName
            )}
            {...dayProps}
          />
        ),
      }}
      {...props}
    />
  )
}

export { Calendar }
