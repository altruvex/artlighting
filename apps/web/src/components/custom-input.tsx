"use client"

import { FormControl, FormField, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
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
        <div className={cn("space-y-2", className)}>
          <FormLabel className="text-sm font-medium">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <div className="relative">
            <FormControl>
              <div className="relative">
                {IconComponent && (
                  <IconComponent className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                )}
                <Input
                  {...field}
                  type={actualType}
                  placeholder={placeholder}
                  disabled={disabled}
                  className={cn(
                    "h-10",
                    IconComponent && "pl-10",
                    isPasswordType && "pr-10",
                    fieldState.error && "border-destructive",
                  )}
                />
                {isPasswordType && (
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    disabled={disabled}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                )}
              </div>
            </FormControl>
          </div>
          {fieldState.error && <FormMessage className="text-destructive text-sm">{fieldState.error.message}</FormMessage>}
        </div>
      )}
    />
  )
}

export default CustomInput
