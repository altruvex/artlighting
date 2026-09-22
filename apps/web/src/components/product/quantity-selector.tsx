"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Minus, Plus } from "lucide-react"

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
    rtlSupport = false,
    minQuantity = 1,
}: QuantitySelectProps) {
    const sizeClasses = {
        sm: {
            container: "border rounded-md",
            button: "h-8 w-8",
            icon: "h-3 w-3",
            text: "px-3 py-1 text-sm font-medium min-w-[2rem]",
        },
        md: {
            container: "border rounded-lg",
            button: "h-10 w-10",
            icon: "h-4 w-4",
            text: "px-4 py-2 min-w-[2.5rem] text-base font-medium",
        },
        lg: {
            container: "border rounded-lg",
            button: "h-12 w-12",
            icon: "h-4 w-4",
            text: "px-4 py-2 min-w-[3rem] font-medium",
        },
    }

    const currentSize = sizeClasses[size]

    return (
        <div className={cn("flex items-center", currentSize.container, rtlSupport && "rtl:rotate-180", className)}>
            <Button
                size="icon"
                variant="ghost"
                onClick={onDecrease}
                className={currentSize.button}
                disabled={disabled || quantity <= minQuantity}
                aria-label="Decrease quantity"
            >
                <Minus className={currentSize.icon} />
            </Button>
            <span className={cn("text-center", currentSize.text, rtlSupport && "rtl:-rotate-180")}>{quantity}</span>
            <Button
                size="icon"
                variant="ghost"
                onClick={onIncrease}
                className={currentSize.button}
                disabled={disabled}
                aria-label="Increase quantity"
            >
                <Plus className={currentSize.icon} />
            </Button>
        </div>
    )
}
