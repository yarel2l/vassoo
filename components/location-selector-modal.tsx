"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { MapPin, Loader2, Navigation } from "lucide-react"
import { useGeolocation } from "@/hooks/use-geolocation"
import { useLocation } from "@/contexts/location-context"
import { AddressAutocomplete } from "@/components/address-autocomplete"

interface LocationSelectorModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function LocationSelectorModal({ isOpen, onClose }: LocationSelectorModalProps) {
  const [inputAddress, setInputAddress] = useState("")
  const { location: geoLocation, loading: isGeoLoading, requestLocation } = useGeolocation()
  const { address: savedAddress, setManualAddress } = useLocation()

  // Initialize with saved address
  useEffect(() => {
    if (isOpen && savedAddress) {
      setInputAddress(savedAddress)
    }
  }, [isOpen, savedAddress])

  // Update input when geolocation is detected
  useEffect(() => {
    if (geoLocation && !inputAddress) {
      const parts = [geoLocation.city, geoLocation.state, geoLocation.country].filter(Boolean)
      setInputAddress(parts.join(', '))
    }
  }, [geoLocation, inputAddress])

  const handleAddressChange = (newAddress: string, coordinates?: { lat: number; lng: number }) => {
    setInputAddress(newAddress)
  }

  const handleConfirm = () => {
    if (inputAddress.trim()) {
      // Get coordinates from geolocation if available, otherwise use defaults
      const coords = geoLocation 
        ? { latitude: geoLocation.latitude, longitude: geoLocation.longitude }
        : { latitude: 0, longitude: 0 }
      
      setManualAddress(inputAddress.trim(), coords)
      onClose()
    }
  }

  const handleDetectLocation = async () => {
    await requestLocation()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <MapPin className="h-5 w-5 text-blue-400" />
            Delivery Location
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Enter your address to see products available in your area with accurate prices and delivery options.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {geoLocation && (
            <Card className="bg-green-900/20 border-green-700/50">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2 text-green-400">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-medium">Location detected</span>
                </div>
                <p className="text-white text-sm mt-1">
                  {[geoLocation.city, geoLocation.state, geoLocation.country].filter(Boolean).join(', ')}
                </p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label htmlFor="address" className="text-gray-300">
              Delivery Address
            </Label>
            <AddressAutocomplete
              value={inputAddress}
              onChange={handleAddressChange}
              placeholder="Enter your full address"
            />
          </div>

          <Button
            onClick={handleDetectLocation}
            disabled={isGeoLoading}
            variant="outline"
            className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
          >
            {isGeoLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Detecting location...
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4 mr-2" />
                Use my current location
              </>
            )}
          </Button>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!inputAddress.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Confirm Location
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
