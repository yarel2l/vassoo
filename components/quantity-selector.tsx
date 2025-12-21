"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Minus, Plus } from "lucide-react"

interface QuantitySelectorProps {
  min?: number
  max: number
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}

export default function QuantitySelector({ min = 1, max, value, onChange, disabled }: QuantitySelectorProps) {
  const [inputValue, setInputValue] = useState(value.toString())

  const handleIncrement = () => {
    if (value < max) {
      const newValue = value + 1
      onChange(newValue)
      setInputValue(newValue.toString())
    }
  }

  const handleDecrement = () => {
    if (value > min) {
      const newValue = value - 1
      onChange(newValue)
      setInputValue(newValue.toString())
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value
    setInputValue(inputVal)

    const numValue = Number.parseInt(inputVal)
    if (!isNaN(numValue) && numValue >= min && numValue <= max) {
      onChange(numValue)
    }
  }

  const handleInputBlur = () => {
    const numValue = Number.parseInt(inputValue)
    if (isNaN(numValue) || numValue < min || numValue > max) {
      setInputValue(value.toString())
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="icon"
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        className="h-8 w-8 bg-transparent"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        disabled={disabled}
        className="w-16 text-center h-8"
      />
      <Button
        variant="outline"
        size="icon"
        onClick={handleIncrement}
        disabled={disabled || value >= max}
        className="h-8 w-8"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  )
}
