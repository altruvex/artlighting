"use client"

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@repo/ui/components/form"
import { Input } from "@repo/ui/components/input"
import { cn } from "@/lib/utils"
import { Eye, EyeOff, Lock, Mail, MapPin, Phone, User } from "lucide-react"
import type React from "react"
import { useCallback, useState } from "react"
import type { Control, FieldPath, FieldValues } from "react-hook-form"

interface CustomInputProps<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  label: string
  placeholder: string
  type: string
  disabled?: boolean
  required?: boolean
  className?: string
}

const getInputIcon = (name: string, type: string) => {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    fullName: User,
    phoneNumber: Phone,
    address: MapPin,
    city: MapPin,
    state: MapPin,
    country: MapPin,
    zipCode: MapPin,
    email: Mail,
    password: Lock,
  }
  return iconMap[name] || iconMap[type]
}

const CustomInput = <T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  type,
  disabled = false,
  required = false,
  className,
}: CustomInputProps<T>) => {
  const [showPassword, setShowPassword] = useState(false)

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev)
  }, [])

  const IconComponent = getInputIcon(name, type)
  const isPasswordType = type === "password"
  const actualType = isPasswordType && showPassword ? "text" : type

  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        // FormItem, not a bare div: it is what gives each field its own id.
        // Without it every label in the form pointed at "undefined-form-item".
        <FormItem className={className}>
          <FormLabel className="text-[length:var(--text-sm)] font-medium">
            {label}
            {/* Muted, not red: a required mark is information, and a column
                of red asterisks read as a form already in error. */}
            {required && <span className="ms-1 text-muted-foreground" aria-hidden>*</span>}
          </FormLabel>
          {/* FormControl on the input itself: it wrapped a div, so the
              label's htmlFor, aria-invalid and aria-describedby all landed
              on the div and the field had no accessible name. */}
          <div className="relative">
            {IconComponent && (
              <IconComponent className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            )}
            <FormControl>
              <Input
                {...field}
                type={actualType}
                placeholder={placeholder}
                disabled={disabled}
                className={cn(
                  "h-11",
                  // Logical sides: in Arabic the icon sits on the right,
                  // and the text must start clear of it there.
                  IconComponent && "ps-10",
                  isPasswordType && "pe-10",
                )}
              />
            </FormControl>
            {isPasswordType && (
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute end-3 top-1/2 -translate-y-1/2"
                disabled={disabled}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="size-4 text-muted-foreground" />
                ) : (
                  <Eye className="size-4 text-muted-foreground" />
                )}
              </button>
            )}
          </div>
          {fieldState.error && <FormMessage className="text-danger">{fieldState.error.message}</FormMessage>}
        </FormItem>
      )}
    />
  )
}

export default CustomInput
