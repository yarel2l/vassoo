"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { MapPin, Loader2, AlertTriangle, Calendar, Shield } from "lucide-react"
import { useGeolocation } from "@/hooks/use-geolocation"
import { AddressAutocomplete } from "@/components/address-autocomplete"
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'

interface OnboardingModalProps {
  isOpen: boolean
  onComplete: (data: { isOfAge: boolean; address?: string }) => void
}

interface PlatformSettings {
  ageVerificationRequired: boolean
  minAgeForAlcohol: number
  platformName: string
}

export default function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState<"age" | "address" | "restricted">("age")
  const [isOfAge, setIsOfAge] = useState<boolean | null>(null)
  const [address, setAddress] = useState("")
  const [settings, setSettings] = useState<PlatformSettings>({
    ageVerificationRequired: true,
    minAgeForAlcohol: 21,
    platformName: 'Vassoo'
  })
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)
  const { location, error: locationError, loading: isLocationLoading, requestLocation } = useGeolocation()

  // Fetch platform settings on mount
  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch('/api/platform/settings/public')
        if (response.ok) {
          const data = await response.json()
          setSettings(data)
        }
      } catch (error) {
        console.error('Error fetching platform settings:', error)
      } finally {
        setIsLoadingSettings(false)
      }
    }
    fetchSettings()
  }, [])

  // Auto-detect location when reaching address step
  useEffect(() => {
    if (step === "address" && !location && !locationError && !isLocationLoading) {
      requestLocation()
    }
  }, [step, location, locationError, isLocationLoading, requestLocation])

  // Set address when location is detected
  useEffect(() => {
    if (location) {
      const parts = [location.city, location.state, location.country].filter(Boolean)
      setAddress(parts.join(', '))
    }
  }, [location])

  const handleAgeConfirmation = (ofAge: boolean) => {
    setIsOfAge(ofAge)
    if (ofAge) {
      setStep("address")
    } else {
      setStep("restricted")
    }
  }

  const handleAddressConfirmation = () => {
    if (address.trim()) {
      onComplete({ isOfAge: true, address: address.trim() })
    }
  }

  const handleAddressChange = (newAddress: string) => {
    setAddress(newAddress)
  }

  const minAge = settings.minAgeForAlcohol

  return (
    <Dialog open={isOpen} onOpenChange={() => { }}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 text-white" hideCloseButton>
        <VisuallyHidden.Root>
          <DialogTitle>User Verification</DialogTitle>
          <DialogDescription>Age verification and delivery address</DialogDescription>
        </VisuallyHidden.Root>
        {step === "age" && (
          <div className="space-y-6 p-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-amber-900/20 rounded-full flex items-center justify-center mx-auto">
                <Calendar className="w-8 h-8 text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Age Verification</h2>
              <p className="text-gray-300">
                By law, you must be at least {minAge} years old to access this alcoholic beverages website.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-amber-300">Legal Notice</h4>
                    <p className="text-sm text-amber-200 mt-1">
                      This website contains information about alcoholic beverages. By continuing, you confirm that you
                      are of legal drinking age in your country.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => handleAgeConfirmation(true)}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  size="lg"
                  disabled={isLoadingSettings}
                >
                  {isLoadingSettings ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    `Yes, I am ${minAge} or older`
                  )}
                </Button>
                <Button
                  onClick={() => handleAgeConfirmation(false)}
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
                  size="lg"
                  disabled={isLoadingSettings}
                >
                  {isLoadingSettings ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    `No, I am under ${minAge}`
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "address" && (
          <div className="space-y-6 p-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-900/20 rounded-full flex items-center justify-center mx-auto">
                <MapPin className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Delivery Address</h2>
              <p className="text-gray-300">
                We need your address to show you products available in your area with accurate prices and shipping
                costs.
              </p>
            </div>

            <div className="space-y-4">
              {location && (
                <Card className="bg-green-900/20 border-green-700/50">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 text-green-400">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm font-medium">Location detected:</span>
                    </div>
                    <p className="text-white mt-1">{address}</p>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                <Label htmlFor="address" className="text-gray-300">
                  Delivery Address
                </Label>
                <AddressAutocomplete
                  value={address}
                  onChange={handleAddressChange}
                  placeholder="Enter your full address"
                />
              </div>

              {!location && !locationError && (
                <Button
                  onClick={requestLocation}
                  disabled={isLocationLoading}
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
                >
                  {isLocationLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Detecting location...
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4 mr-2" />
                      Detect my location
                    </>
                  )}
                </Button>
              )}

              <Button
                onClick={handleAddressConfirmation}
                disabled={!address.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Confirm Address
              </Button>
            </div>
          </div>
        )}

        {step === "restricted" && (
          <div className="space-y-6 p-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Access Restricted</h2>
              <p className="text-gray-300">
                Sorry, but you must be at least {minAge} years old to access this website.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-red-300">Age Restriction</h4>
                    <p className="text-sm text-red-200 mt-1">
                      This website is intended only for adults of legal drinking age. Please come back when you
                      are {minAge} years old.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-gray-400 text-sm">
                  If you believe this is an error, you can reload the page and try again.
                </p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
