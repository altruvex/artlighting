"use client"

import { Button } from "@repo/ui/components/button"
import { cn } from "@/lib/utils"
import { formatNumber } from "@/lib/numbers"
import { Minus, Plus } from "lucide-react"
import { useLocale } from "next-intl"

interface QuantitySelectProps {
    quantity: number
    onIncrease: () => void
    onDecrease: () => void
    disabled?: boolean
    size?: "sm" | "md" | "lg"
    className?: string
    rtlSupport?: boolean
    minQuantity?: number
}

export function QuantitySelector({
    quantity,
    onIncrease,
    onDecrease,
    disabled = false,
    size = "md",
    className,
    minQuantity = 1,
}: QuantitySelectProps) {
    const sizeClasses = {
        sm: {
            container: "border border-input rounded-md",
            button: "h-8 w-8",
            icon: "h-3 w-3",
            text: "px-3 py-1 text-sm font-medium min-w-[2rem]",
        },
        md: {
            container: "border border-input rounded-md",
            button: "h-10 w-10",
            icon: "h-4 w-4",
            text: "px-4 py-2 min-w-[2.5rem] text-base font-medium",
        },
        lg: {
            container: "border border-input rounded-md",
            button: "h-12 w-12",
            icon: "h-4 w-4",
            text: "px-4 py-2 min-w-[3rem] font-medium",
        },
    }

    const currentSize = sizeClasses[size]

    const locale = useLocale()

    return (
        <div
            className={cn(
                "flex items-center",
                currentSize.container,
                className,
            )}
        >
            <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={onDecrease}
                className={currentSize.button}
                disabled={disabled || quantity <= minQuantity}
                aria-label={
                    locale === "ar" ? "تقليل الكمية" : "Decrease quantity"
                }
            >
                <Minus className={currentSize.icon} />
            </Button>
            <span
                className={cn("text-center tabular-nums", currentSize.text)}
                aria-live="polite"
            >
                {formatNumber(quantity, locale === "ar" ? "ar" : "en")}
            </span>
            <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={onIncrease}
                className={currentSize.button}
                disabled={disabled}
                aria-label={
                    locale === "ar" ? "زيادة الكمية" : "Increase quantity"
                }
            >
                <Plus className={currentSize.icon} />
            </Button>
        </div>
    )
}
