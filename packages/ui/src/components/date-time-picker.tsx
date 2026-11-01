"use client"

import * as React from "react"
import { ar, enUS, type Locale } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

import { cn } from "../lib/utils"
import { Button } from "./button"
import { Calendar } from "./calendar"
import { Input } from "./input"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

const LOCALES: Record<string, Locale> = { ar, en: enUS }

/** Merges the picked day onto the previous time, or the picked time onto the previous day. */
function mergeDateAndTime(base: Date | undefined, patch: Partial<{ date: Date; time: string }>): Date {
  const next = base ? new Date(base) : new Date()
  if (!base) next.setSeconds(0, 0)
  if (patch.date) {
    next.setFullYear(patch.date.getFullYear(), patch.date.getMonth(), patch.date.getDate())
  }
  if (patch.time) {
    const [hours, minutes] = patch.time.split(":").map(Number)
    next.setHours(hours ?? 0, minutes ?? 0, 0, 0)
  }
  return next
}

function toTimeInput(value: Date | null | undefined): string {
  if (!value) return "00:00"
  return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`
}

export interface DateTimePickerProps {
  value: Date | null | undefined
  onChange: (value: Date | null) => void
  /** BCP-47 locale, e.g. from `useLocale()`. Falls back to English names. */
  locale?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
}

function DateTimePicker({
  value,
  onChange,
  locale = "en",
  placeholder = "Pick a date",
  disabled,
  className,
  id,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const dayPickerLocale = LOCALES[locale] ?? enUS
  const formatter = React.useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }),
    [locale]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-start gap-2 font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="size-4 shrink-0" />
          <span className="truncate">{value ? formatter.format(value) : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={dayPickerLocale}
          dir={locale === "ar" ? "rtl" : "ltr"}
          selected={value ?? undefined}
          defaultMonth={value ?? undefined}
          onSelect={(date) => {
            if (!date) return
            onChange(mergeDateAndTime(value ?? undefined, { date }))
          }}
        />
        <div className="border-t p-3">
          <Input
            type="time"
            dir="ltr"
            value={toTimeInput(value)}
            onChange={(event) => onChange(mergeDateAndTime(value ?? undefined, { time: event.target.value }))}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { DateTimePicker }
