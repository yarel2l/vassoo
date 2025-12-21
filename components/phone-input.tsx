"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  error?: string
}

export function PhoneInput({ value, onChange, label, placeholder, required, error }: PhoneInputProps) {
  const [displayValue, setDisplayValue] = useState("")

  // Format phone number as user types
  const formatPhoneNumber = (input: string) => {
    // Remove all non-digits
    const digits = input.replace(/\D/g, "")

    // Limit to 10 digits
    const limitedDigits = digits.slice(0, 10)

    // Format as (XXX) XXX-XXXX
    if (limitedDigits.length >= 6) {
      return `+1 (${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`
    } else if (limitedDigits.length >= 3) {
      return `+1 (${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`
    } else if (limitedDigits.length > 0) {
      return `+1 (${limitedDigits}`
    }
    return ""
  }

  // Update display value when prop value changes
  useEffect(() => {
    if (value) {
      setDisplayValue(formatPhoneNumber(value))
    } else {
      setDisplayValue("")
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    const digits = input.replace(/\D/g, "")

    // Update display
    const formatted = formatPhoneNumber(input)
    setDisplayValue(formatted)

    // Pass clean digits to parent
    onChange(digits)
  }

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor="phone-input">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Input
        id="phone-input"
        type="tel"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder || "+1 (555) 123-4567"}
        className={`font-mono ${error ? "border-red-500" : ""}`}
        maxLength={18} // +1 (XXX) XXX-XXXX
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <p className="text-xs text-muted-foreground">Format: +1 (555) 123-4567</p>
    </div>
  )
}
