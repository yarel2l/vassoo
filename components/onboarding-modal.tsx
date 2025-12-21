"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { MapPin, Loader2, AlertTriangle, Calendar, Shield } from "lucide-react"
import { useGeolocation } from "@/hooks/use-geolocation"
import { AddressAutocomplete } from "@/components/address-autocomplete"

interface OnboardingModalProps {
  isOpen: boolean
  onComplete: (data: { isOver18: boolean; address?: string }) => void
}

export default function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState<"age" | "address" | "restricted">("age")
  const [isOver18, setIsOver18] = useState<boolean | null>(null)
  const [address, setAddress] = useState("")
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const { location, error: locationError, getCurrentLocation } = useGeolocation()

  // Auto-detect location when reaching address step
  useEffect(() => {
    if (step === "address" && !location && !locationError) {
      handleGetCurrentLocation()
    }
  }, [step, location, locationError])

  // Set address when location is detected
  useEffect(() => {
    if (location) {
      setAddress(`${location.city}, ${location.region}, ${location.country}`)
    }
  }, [location])

  const handleAgeConfirmation = (over18: boolean) => {
    setIsOver18(over18)
    if (over18) {
      setStep("address")
    } else {
      setStep("restricted")
    }
  }

  const handleGetCurrentLocation = async () => {
    setIsLoadingLocation(true)
    try {
      await getCurrentLocation()
    } catch (error) {
      console.error("Error getting location:", error)
    } finally {
      setIsLoadingLocation(false)
    }
  }

  const handleAddressConfirmation = () => {
    if (address.trim()) {
      onComplete({ isOver18: true, address: address.trim() })
    }
  }

  const handleAddressChange = (newAddress: string) => {
    setAddress(newAddress)
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 text-white [&>button]:hidden" hideCloseButton>
        {step === "age" && (
          <div className="space-y-6 p-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-amber-900/20 rounded-full flex items-center justify-center mx-auto">
                <Calendar className="w-8 h-8 text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Verificación de Edad</h2>
              <p className="text-gray-300">
                Por ley, debes ser mayor de 18 años para acceder a este sitio web de bebidas alcohólicas.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-amber-300">Aviso Legal</h4>
                    <p className="text-sm text-amber-200 mt-1">
                      Este sitio web contiene información sobre bebidas alcohólicas. Al continuar, confirmas que tienes
                      la edad legal para consumir alcohol en tu país.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => handleAgeConfirmation(true)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  Sí, soy mayor de 18 años
                </Button>
                <Button
                  onClick={() => handleAgeConfirmation(false)}
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
                  size="lg"
                >
                  No, soy menor de 18 años
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
              <h2 className="text-2xl font-bold text-white">Dirección de Envío</h2>
              <p className="text-gray-300">
                Necesitamos tu dirección para mostrarte los productos disponibles en tu área con precios y costos de
                envío precisos.
              </p>
            </div>

            <div className="space-y-4">
              {location && (
                <Card className="bg-green-900/20 border-green-700/50">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 text-green-400">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm font-medium">Ubicación detectada:</span>
                    </div>
                    <p className="text-white mt-1">{address}</p>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                <Label htmlFor="address" className="text-gray-300">
                  Dirección de Envío
                </Label>
                <AddressAutocomplete
                  value={address}
                  onChange={handleAddressChange}
                  placeholder="Ingresa tu dirección completa"
                  className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                />
              </div>

              {!location && !locationError && (
                <Button
                  onClick={handleGetCurrentLocation}
                  disabled={isLoadingLocation}
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
                >
                  {isLoadingLocation ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Detectando ubicación...
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4 mr-2" />
                      Detectar mi ubicación
                    </>
                  )}
                </Button>
              )}

              <Button
                onClick={handleAddressConfirmation}
                disabled={!address.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Confirmar Dirección
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
              <h2 className="text-2xl font-bold text-white">Acceso Restringido</h2>
              <p className="text-gray-300">
                Lo sentimos, pero debes ser mayor de 18 años para acceder a este sitio web.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-red-300">Restricción de Edad</h4>
                    <p className="text-sm text-red-200 mt-1">
                      Este sitio web está destinado únicamente a personas mayores de edad. Por favor, regresa cuando
                      cumplas 18 años.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-gray-400 text-sm">
                  Si crees que esto es un error, puedes recargar la página e intentar nuevamente.
                </p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
