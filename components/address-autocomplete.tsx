"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapPin } from "lucide-react"

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onAddressSelect?: (address: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }) => void
  label?: string
  required?: boolean
  error?: string
  placeholder?: string
}

// Mock address suggestions - in a real app, this would come from Google Places API or similar
const mockAddresses = [
  {
    street: "123 Main Street",
    city: "New York",
    state: "NY",
    zipCode: "10001",
    country: "United States",
    fullAddress: "123 Main Street, New York, NY 10001",
  },
  {
    street: "456 Broadway",
    city: "New York",
    state: "NY",
    zipCode: "10013",
    country: "United States",
    fullAddress: "456 Broadway, New York, NY 10013",
  },
  {
    street: "789 Fifth Avenue",
    city: "New York",
    state: "NY",
    zipCode: "10022",
    country: "United States",
    fullAddress: "789 Fifth Avenue, New York, NY 10022",
  },
  {
    street: "321 Park Avenue",
    city: "New York",
    state: "NY",
    zipCode: "10010",
    country: "United States",
    fullAddress: "321 Park Avenue, New York, NY 10010",
  },
  {
    street: "654 Wall Street",
    city: "New York",
    state: "NY",
    zipCode: "10005",
    country: "United States",
    fullAddress: "654 Wall Street, New York, NY 10005",
  },
]

export function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  label,
  required = false,
  error,
  placeholder = "Start typing your address...",
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<typeof mockAddresses>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue)

    if (inputValue.length > 2) {
      // Filter mock addresses based on input
      const filtered = mockAddresses.filter((address) =>
        address.fullAddress.toLowerCase().includes(inputValue.toLowerCase()),
      )
      setSuggestions(filtered)
      setShowSuggestions(true)
      setSelectedIndex(-1)
    } else {
      setShowSuggestions(false)
      setSuggestions([])
    }
  }

  const handleSuggestionClick = (address: (typeof mockAddresses)[0]) => {
    onChange(address.street)
    setShowSuggestions(false)

    if (onAddressSelect) {
      onAddressSelect({
        street: address.street,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        country: address.country,
      })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev))
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev))
        break
      case "Enter":
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex])
        }
        break
      case "Escape":
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }

  return (
    <div className="space-y-2 relative">
      {label && (
        <Label>
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={error ? "border-red-500" : ""}
        />
        <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((address, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSuggestionClick(address)}
              className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-3 ${
                index === selectedIndex ? "bg-gray-50" : ""
              }`}
            >
              <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm">{address.fullAddress}</span>
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
