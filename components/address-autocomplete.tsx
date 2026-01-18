"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapPin, Loader2 } from "lucide-react"
import { useGoogleApi } from "@/hooks/use-google-api"

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onAddressSelect?: (address: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
    placeId?: string
    coordinates?: {
      lat: number
      lng: number
    }
  }) => void
  label?: string
  required?: boolean
  error?: string
  placeholder?: string
}

interface PlacePrediction {
  description: string
  place_id: string
  structured_formatting: {
    main_text: string
    secondary_text: string
  }
}

export function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  label,
  required = false,
  error,
  placeholder = "Start typing your address...",
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isSearching, setIsSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const { isLoading: isLoadingConfig, isConfigured } = useGoogleApi()

  // Click outside handler
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

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  // Fetch suggestions from server-side proxy (avoids CORS issues)
  const fetchSuggestions = useCallback(async (inputValue: string) => {
    if (!isConfigured) {
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(
        `/api/places/autocomplete?input=${encodeURIComponent(inputValue)}&types=address`
      )
      const data = await response.json()

      if (data.status === 'OK' && data.predictions) {
        setSuggestions(data.predictions)
        setShowSuggestions(true)
      } else {
        setSuggestions([])
      }
    } catch (err) {
      console.error('Error fetching address suggestions:', err)
      setSuggestions([])
    } finally {
      setIsSearching(false)
    }
  }, [isConfigured])

  // Get place details from server-side proxy
  const getPlaceDetails = useCallback(async (placeId: string): Promise<{
    street: string
    city: string
    state: string
    zipCode: string
    country: string
    coordinates?: { lat: number; lng: number }
  } | null> => {
    if (!isConfigured) {
      return null
    }

    try {
      const response = await fetch(
        `/api/places/details?place_id=${encodeURIComponent(placeId)}`
      )
      const data = await response.json()

      if (data.status !== 'OK' || !data.result) {
        return null
      }

      return {
        street: data.result.street || '',
        city: data.result.city || '',
        state: data.result.state || '',
        zipCode: data.result.zipCode || '',
        country: data.result.country || '',
        coordinates: data.result.coordinates || undefined
      }
    } catch (err) {
      console.error('Error fetching place details:', err)
      return null
    }
  }, [isConfigured])

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue)
    setSelectedIndex(-1)

    // Debounce the API call
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (inputValue.length > 2 && isConfigured) {
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(inputValue)
      }, 300)
    } else {
      setShowSuggestions(false)
      setSuggestions([])
    }
  }

  const handleSuggestionClick = async (prediction: PlacePrediction) => {
    onChange(prediction.description)
    setShowSuggestions(false)
    setSuggestions([])

    if (onAddressSelect) {
      const details = await getPlaceDetails(prediction.place_id)
      if (details) {
        onAddressSelect({
          ...details,
          placeId: prediction.place_id
        })
      }
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
          disabled={isLoadingConfig}
        />
        {isSearching ? (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
        ) : (
          <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 z-50 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1"
        >
          {suggestions.map((prediction, index) => (
            <button
              key={prediction.place_id}
              type="button"
              onClick={() => handleSuggestionClick(prediction)}
              className={`w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-neutral-800 flex items-center gap-3 ${
                index === selectedIndex ? "bg-gray-50 dark:bg-neutral-800" : ""
              }`}
            >
              <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="text-sm text-gray-900 dark:text-white">
                  {prediction.structured_formatting.main_text}
                </span>
                <span className="text-xs text-gray-500 dark:text-neutral-400">
                  {prediction.structured_formatting.secondary_text}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {!isConfigured && !isLoadingConfig && (
        <p className="text-xs text-amber-500">
          Address autocomplete is not configured. Contact administrator.
        </p>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
