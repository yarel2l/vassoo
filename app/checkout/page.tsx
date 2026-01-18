"use client"

import React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useCart } from "@/contexts/cart-context"
import { useAuth } from "@/contexts/auth-context"
import Navbar from "@/components/navbar"
import MobileBottomNav from "@/components/mobile-bottom-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { InternationalPhoneInput } from "@/components/international-phone-input"
import { AddressAutocomplete } from "@/components/address-autocomplete"
import { StripeCheckoutForm } from "@/components/stripe-checkout-form"
import { Truck, MapPin, ArrowLeft, ArrowRight, CheckCircle, Loader2, Shield, CreditCard, Plus, Home, Building2, Star } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

interface ShippingForm {
  name: string
  email: string
  phone: string
  street: string
  city: string
  state: string
  zipCode: string
  country: string
  deliveryNotes: string
}

interface SavedAddress {
  id: string
  label: string
  name: string
  street: string
  city: string
  state: string
  zip_code: string
  country: string
  phone: string
  is_default: boolean
}

export default function CheckoutPage() {
  const router = useRouter()
  const { items, clearCart } = useCart()
  const { user, profile } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  
  // Saved addresses state
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [useNewAddress, setUseNewAddress] = useState(false)
  const [saveNewAddress, setSaveNewAddress] = useState(false)
  const [loadingAddresses, setLoadingAddresses] = useState(false)

  const [shippingForm, setShippingForm] = useState<ShippingForm>({
    name: "",
    email: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "United States",
    deliveryNotes: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load saved addresses for logged-in users
  useEffect(() => {
    const loadSavedAddresses = async () => {
      if (!user) return
      
      setLoadingAddresses(true)
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('user_addresses')
          .select('*')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error loading addresses:', error)
          return
        }

        setSavedAddresses(data || [])
        
        // Auto-select default address
        const defaultAddress = data?.find((a: SavedAddress) => a.is_default)
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id)
          applyAddressToForm(defaultAddress)
        } else if (data && data.length > 0) {
          setSelectedAddressId(data[0].id)
          applyAddressToForm(data[0])
        } else {
          setUseNewAddress(true)
        }
      } catch (err) {
        console.error('Error loading addresses:', err)
      } finally {
        setLoadingAddresses(false)
      }
    }

    loadSavedAddresses()
  }, [user])

  // Apply selected address to form
  const applyAddressToForm = (address: SavedAddress) => {
    setShippingForm(prev => ({
      ...prev,
      name: address.name || prev.name,
      phone: address.phone || prev.phone,
      street: address.street,
      city: address.city,
      state: address.state,
      zipCode: address.zip_code,
      country: address.country || "United States",
    }))
  }

  // Handle address selection
  const handleAddressSelection = (addressId: string) => {
    setSelectedAddressId(addressId)
    setUseNewAddress(false)
    const address = savedAddresses.find(a => a.id === addressId)
    if (address) {
      applyAddressToForm(address)
    }
  }

  // Pre-fill user data
  useEffect(() => {
    if (user?.email && !shippingForm.email) {
      setShippingForm(prev => ({ ...prev, email: user.email! }))
    }
    if (profile?.full_name && !shippingForm.name && savedAddresses.length === 0) {
      setShippingForm(prev => ({ ...prev, name: profile.full_name || "" }))
    }
    if (profile?.phone && !shippingForm.phone && savedAddresses.length === 0) {
      setShippingForm(prev => ({ ...prev, phone: profile.phone || "" }))
    }
  }, [user, profile, shippingForm.email, shippingForm.name, shippingForm.phone, savedAddresses.length])

  // Check cart and load page
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!items || items.length === 0) {
        toast({
          title: "Cart is empty",
          description: "Please add items to your cart before checkout",
          variant: "destructive",
        })
        router.push("/cart")
      } else {
        setIsLoading(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [items, router])

  // Calculate totals safely
  const subtotal = items?.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0
  const taxes = items?.reduce((sum, item) => sum + item.taxes * item.quantity, 0) || 0
  const shipping = items?.reduce((sum, item) => sum + item.shippingCost * item.quantity, 0) || 0
  const totalAmount = subtotal + taxes + shipping

  const validateShippingForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!shippingForm.name.trim()) newErrors.name = "Name is required"
    if (!shippingForm.email.trim()) newErrors.email = "Email is required"
    if (!shippingForm.phone.trim()) newErrors.phone = "Phone number is required"
    if (!shippingForm.street.trim()) newErrors.street = "Street address is required"
    if (!shippingForm.city.trim()) newErrors.city = "City is required"
    if (!shippingForm.state.trim()) newErrors.state = "State is required"
    if (!shippingForm.zipCode.trim()) newErrors.zipCode = "ZIP code is required"

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (shippingForm.email && !emailRegex.test(shippingForm.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Check if form is complete (for button enabling)
  const isFormComplete = (): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    // Basic required fields check
    const hasRequiredFields = 
      shippingForm.name.trim() !== '' &&
      shippingForm.email.trim() !== '' &&
      emailRegex.test(shippingForm.email) &&
      shippingForm.phone.trim() !== '' &&
      shippingForm.street.trim() !== '' &&
      shippingForm.city.trim() !== '' &&
      shippingForm.state.trim() !== '' &&
      shippingForm.zipCode.trim() !== ''
    
    return hasRequiredFields && agreeToTerms
  }

  const handleAddressSelect = (address: { street: string; city: string; state: string; zipCode: string; country: string }) => {
    setShippingForm((prev) => ({
      ...prev,
      street: address.street,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      country: address.country,
    }))
  }

  const handleNextStep = async () => {
    if (currentStep === 1) {
      if (validateShippingForm()) {
        if (!agreeToTerms) {
          toast({
            title: "Terms required",
            description: "Please agree to the terms and conditions to continue",
            variant: "destructive",
          })
          return
        }
        
        // Save new address if user is logged in and opted to save
        if (user && (useNewAddress || savedAddresses.length === 0) && saveNewAddress) {
          try {
            const supabase = createClient()
            const { error } = await supabase
              .from('user_addresses')
              .insert({
                user_id: user.id,
                label: 'Home',
                name: shippingForm.name,
                street: shippingForm.street,
                city: shippingForm.city,
                state: shippingForm.state,
                zip_code: shippingForm.zipCode,
                country: shippingForm.country,
                phone: shippingForm.phone,
                is_default: savedAddresses.length === 0 // Make default if first address
              })
            
            if (error) {
              console.error('Error saving address:', error)
            } else {
              toast({
                title: "Address saved",
                description: "Your address has been saved for future orders",
              })
            }
          } catch (err) {
            console.error('Error saving address:', err)
          }
        }
        
        setCurrentStep(2)
      }
    }
  }

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handlePaymentSuccess = (orders: Array<{ id: string; orderNumber: string }>) => {
    clearCart()

    // Redirect to the first order (or could show a multi-order confirmation)
    if (orders.length > 0) {
      router.push(`/order-confirmation/${orders[0].id}`)
    } else {
      router.push('/purchases')
    }
  }

  const handlePaymentError = (error: string) => {
    toast({
      title: "Payment failed",
      description: error,
      variant: "destructive",
    })
  }

  // Transform cart items for Stripe checkout
  const stripeItems = items.map(item => ({
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    storeId: item.storeId,
    storeName: item.storeName,
    price: item.price,
    taxes: item.taxes,
    shippingCost: item.shippingCost,
    quantity: item.quantity,
  }))

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading checkout...</p>
            </div>
          </div>
        </div>
        <MobileBottomNav />
      </div>
    )
  }

  if (!items || items.length === 0) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <Link href="/cart" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Cart
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold">Checkout</h1>
          <p className="text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "items"} • ${totalAmount.toFixed(2)}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= currentStep ? "bg-primary text-primary-foreground" : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {step < currentStep ? <CheckCircle className="h-4 w-4" /> : step}
                </div>
                <span className="ml-2 text-sm font-medium hidden sm:block">
                  {step === 1 ? "Shipping & Review" : "Payment"}
                </span>
                {step < 2 && <ArrowRight className="h-4 w-4 mx-4 text-gray-400" />}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Step 1: Shipping Information & Review */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      Shipping Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Saved Addresses Section */}
                    {user && savedAddresses.length > 0 && (
                      <div className="space-y-4">
                        <Label className="text-base font-medium">Select a saved address</Label>
                        <RadioGroup
                          value={useNewAddress ? "new" : selectedAddressId || ""}
                          onValueChange={(value) => {
                            if (value === "new") {
                              setUseNewAddress(true)
                              setSelectedAddressId(null)
                              // Clear form for new address
                              setShippingForm(prev => ({
                                ...prev,
                                street: "",
                                city: "",
                                state: "",
                                zipCode: "",
                              }))
                            } else {
                              handleAddressSelection(value)
                            }
                          }}
                          className="grid gap-3"
                        >
                          {savedAddresses.map((address) => (
                            <div key={address.id} className="relative">
                              <RadioGroupItem
                                value={address.id}
                                id={address.id}
                                className="peer sr-only"
                              />
                              <Label
                                htmlFor={address.id}
                                className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-colors"
                              >
                                <div className="flex-shrink-0 mt-0.5">
                                  {address.label?.toLowerCase() === 'home' ? (
                                    <Home className="h-5 w-5 text-muted-foreground" />
                                  ) : address.label?.toLowerCase() === 'work' ? (
                                    <Building2 className="h-5 w-5 text-muted-foreground" />
                                  ) : (
                                    <MapPin className="h-5 w-5 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{address.label || 'Address'}</span>
                                    {address.is_default && (
                                      <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                        <Star className="h-3 w-3" />
                                        Default
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">{address.name}</p>
                                  <p className="text-sm text-muted-foreground">{address.street}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {address.city}, {address.state} {address.zip_code}
                                  </p>
                                </div>
                              </Label>
                            </div>
                          ))}
                          
                          {/* Use new address option */}
                          <div className="relative">
                            <RadioGroupItem
                              value="new"
                              id="new-address"
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor="new-address"
                              className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-colors"
                            >
                              <Plus className="h-5 w-5 text-muted-foreground" />
                              <span className="font-medium">Use a different address</span>
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    )}
                    
                    {/* Show form fields if no saved addresses or using new address */}
                    {(!user || savedAddresses.length === 0 || useNewAddress) && (
                    <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">
                          Full Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="name"
                          value={shippingForm.name}
                          onChange={(e) => setShippingForm((prev) => ({ ...prev, name: e.target.value }))}
                          placeholder="John Doe"
                          className={errors.name ? "border-red-500" : ""}
                        />
                        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">
                          Email Address <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={shippingForm.email}
                          onChange={(e) => setShippingForm((prev) => ({ ...prev, email: e.target.value }))}
                          placeholder="john@example.com"
                          className={errors.email ? "border-red-500" : ""}
                        />
                        {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                      </div>
                    </div>

                    <InternationalPhoneInput
                      value={shippingForm.phone}
                      onChange={(value) => setShippingForm((prev) => ({ ...prev, phone: value }))}
                      label="Phone Number"
                      required
                      error={errors.phone}
                    />

                    <AddressAutocomplete
                      value={shippingForm.street}
                      onChange={(value) => setShippingForm((prev) => ({ ...prev, street: value }))}
                      onAddressSelect={handleAddressSelect}
                      label="Street Address"
                      required
                      error={errors.street}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">
                          City <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="city"
                          value={shippingForm.city}
                          onChange={(e) => setShippingForm((prev) => ({ ...prev, city: e.target.value }))}
                          placeholder="New York"
                          className={errors.city ? "border-red-500" : ""}
                        />
                        {errors.city && <p className="text-sm text-red-500">{errors.city}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">
                          State <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="state"
                          value={shippingForm.state}
                          onChange={(e) => setShippingForm((prev) => ({ ...prev, state: e.target.value }))}
                          placeholder="NY"
                          className={errors.state ? "border-red-500" : ""}
                        />
                        {errors.state && <p className="text-sm text-red-500">{errors.state}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zipCode">
                          ZIP Code <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="zipCode"
                          value={shippingForm.zipCode}
                          onChange={(e) => setShippingForm((prev) => ({ ...prev, zipCode: e.target.value }))}
                          placeholder="10001"
                          className={errors.zipCode ? "border-red-500" : ""}
                        />
                        {errors.zipCode && <p className="text-sm text-red-500">{errors.zipCode}</p>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="deliveryNotes">Delivery Instructions (Optional)</Label>
                      <Textarea
                        id="deliveryNotes"
                        value={shippingForm.deliveryNotes}
                        onChange={(e) => setShippingForm((prev) => ({ ...prev, deliveryNotes: e.target.value }))}
                        placeholder="e.g., Call the doorman when you arrive, Leave at front door, Ring apartment 3B..."
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        Help your delivery person find you with specific instructions
                      </p>
                    </div>
                    
                    {/* Save address checkbox - only for logged in users */}
                    {user && (
                      <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded-lg">
                        <Checkbox
                          id="saveAddress"
                          checked={saveNewAddress}
                          onCheckedChange={(checked) => setSaveNewAddress(checked === true)}
                        />
                        <Label htmlFor="saveAddress" className="text-sm">
                          Save this address for future orders
                        </Label>
                      </div>
                    )}
                    </>
                    )}
                    
                    {/* Delivery Notes - Always visible */}
                    {user && savedAddresses.length > 0 && !useNewAddress && (
                      <div className="space-y-2">
                        <Label htmlFor="deliveryNotes">Delivery Instructions (Optional)</Label>
                        <Textarea
                          id="deliveryNotes"
                          value={shippingForm.deliveryNotes}
                          onChange={(e) => setShippingForm((prev) => ({ ...prev, deliveryNotes: e.target.value }))}
                          placeholder="e.g., Call the doorman when you arrive, Leave at front door, Ring apartment 3B..."
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground">
                          Help your delivery person find you with specific instructions
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Order Items Review */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Review Your Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                          <Image
                            src={item.productImage || "/placeholder.svg"}
                            alt={item.productName}
                            width={50}
                            height={50}
                            className="rounded object-cover"
                          />
                          <div className="flex-1">
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-sm text-muted-foreground">{item.storeName}</p>
                            <p className="text-sm">Qty: {item.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Terms and Conditions */}
                    <div className="flex items-center space-x-2 mt-6 pt-4 border-t">
                      <Checkbox
                        id="terms"
                        checked={agreeToTerms}
                        onCheckedChange={(checked) => setAgreeToTerms(checked === true)}
                      />
                      <Label htmlFor="terms" className="text-sm">
                        I agree to the{" "}
                        <Link href="/terms" className="text-primary hover:underline">
                          Terms and Conditions
                        </Link>{" "}
                        and{" "}
                        <Link href="/privacy" className="text-primary hover:underline">
                          Privacy Policy
                        </Link>
                        . I confirm I am 21 years or older.
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 2: Payment with Stripe */}
            {currentStep === 2 && (
              <div className="space-y-6">
                {/* Shipping Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Delivery Address
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)}>
                        Edit
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/30 p-4 rounded-lg">
                      <p className="font-medium">{shippingForm.name}</p>
                      <p>{shippingForm.street}</p>
                      <p>
                        {shippingForm.city}, {shippingForm.state} {shippingForm.zipCode}
                      </p>
                      <p className="text-sm text-muted-foreground">{shippingForm.phone}</p>
                      <p className="text-sm text-muted-foreground">{shippingForm.email}</p>
                      {shippingForm.deliveryNotes && (
                        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950 rounded border-l-4 border-blue-400">
                          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Delivery Instructions:</p>
                          <p className="text-sm text-blue-700 dark:text-blue-300">{shippingForm.deliveryNotes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Stripe Payment Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Payment Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <StripeCheckoutForm
                      items={stripeItems}
                      shippingAddress={{
                        name: shippingForm.name,
                        email: shippingForm.email,
                        phone: shippingForm.phone,
                        street: shippingForm.street,
                        city: shippingForm.city,
                        state: shippingForm.state,
                        zipCode: shippingForm.zipCode,
                        country: shippingForm.country,
                        deliveryNotes: shippingForm.deliveryNotes,
                      }}
                      customerId={user?.id}
                      onSuccess={handlePaymentSuccess}
                      onError={handlePaymentError}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={handlePreviousStep} disabled={currentStep === 1}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              {currentStep === 1 && (
                <Button 
                  onClick={handleNextStep}
                  disabled={!isFormComplete()}
                >
                  Continue to Payment
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items */}
                <div className="space-y-3">
                  {items.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <Image
                        src={item.productImage || "/placeholder.svg"}
                        alt={item.productName}
                        width={40}
                        height={40}
                        className="rounded object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                  {items.length > 3 && <p className="text-sm text-muted-foreground">+{items.length - 3} more items</p>}
                </div>

                <Separator />

                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1">
                      Taxes
                      <span className="text-xs text-muted-foreground">(est.)</span>
                    </span>
                    <span>${taxes.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Delivery</span>
                    <span>${shipping.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium text-lg">
                    <span>Total</span>
                    <span>${totalAmount.toFixed(2)}</span>
                  </div>
                  {currentStep === 1 && (
                    <p className="text-xs text-muted-foreground italic">
                      Final taxes will be calculated based on your delivery address
                    </p>
                  )}
                </div>

                {/* Security Features */}
                <div className="pt-4 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span>SSL Encrypted Checkout</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span>Secure payment via Stripe</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span>24/7 Customer Support</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <MobileBottomNav />
    </div>
  )
}
