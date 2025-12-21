"use client"

import React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useCart } from "@/contexts/cart-context"
import { useOrders } from "@/contexts/orders-context"
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
import { CreditCard, Truck, MapPin, ArrowLeft, ArrowRight, CheckCircle, Loader2, Shield, Wallet } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"

// Payment method icons
const PaymentIcons = {
  card: CreditCard,
  paypal: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.26-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.9.9 0 0 0-.633.74l-.755 4.78-.24 1.519c-.06.381.213.72.6.72h4.19c.524 0 .968-.382 1.05-.9l.755-4.78h2.19c4.632 0 7.708-2.423 8.638-7.201.465-2.388-.013-4.040-1.819-5.798z" />
    </svg>
  ),
  googlepay: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.007 2C6.486 2 2.007 6.479 2.007 12s4.479 10 10 10 10-4.479 10-10-4.479-10-10-10zm4.318 8.5h-3.982v3.982h-1.336V10.5H7.025V9.164h3.982V5.182h1.336v3.982h3.982V8.5z" />
    </svg>
  ),
  applepay: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  ),
  venmo: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.554 4.046c.851 1.264 1.446 2.978 1.446 5.044 0 6.163-5.684 12.91-9.293 12.91H8.874L6 4.046h3.479l1.729 11.127c1.983-2.681 4.123-7.134 4.123-10.213 0-1.264-.298-2.23-.681-2.914h5.104z" />
    </svg>
  ),
  cashapp: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.59 3.475c-.905.85-2.123 1.353-3.465 1.353-2.731 0-4.945-2.215-4.945-4.945C15.18-.905 15.683-2.123 16.533-3.465 17.438-4.315 18.656-4.818 20-4.818c2.731 0 4.945 2.215 4.945 4.945 0 1.342-.503 2.56-1.355 3.413zM7.478 11.305c-.905-.85-1.353-2.068-1.353-3.41C6.125 5.164 8.34 2.95 11.07 2.95c1.343 0 2.561.503 3.411 1.355.85.905 1.353 2.123 1.353 3.465 0 2.731-2.215 4.945-4.945 4.945-1.342 0-2.56-.503-3.41-1.41z" />
    </svg>
  ),
  amazonpay: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.138-.06.234-.1.293-.13.226-.088.39-.046.525.13.12.174.09.336-.12.48-.256.19-.6.41-1.006.654-1.244.743-2.64 1.316-4.185 1.726-1.548.41-3.156.615-4.83.615-2.424 0-4.73-.315-6.914-.946-2.185-.63-4.124-1.568-5.818-2.814-.12-.09-.18-.18-.18-.27 0-.09.06-.18.18-.27l.045-.045zm23.725-4.338c-.195-.255-.765-.273-1.095-.273-.33 0-.705.018-.705.018s-.87.06-1.095.273c-.225.213-.165.48.045.705.21.225.48.165.705-.045.225-.21.165-.48-.045-.705-.21-.225-.48-.165.705.045-.225.21-.165.48-.045-.705.21.225.48.165.705-.045.225-.21.165-.48-.045-.705z" />
    </svg>
  ),
}

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

interface PaymentForm {
  type: string
  cardNumber: string
  expiryDate: string
  cvv: string
  nameOnCard: string
  billingAddress: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  sameAsShipping: boolean
}

export default function CheckoutPage() {
  const router = useRouter()
  const { items, total, clearCart } = useCart()
  const { createOrder } = useOrders()
  const [currentStep, setCurrentStep] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [agreeToTerms, setAgreeToTerms] = useState(false)

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

  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    type: "card",
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    nameOnCard: "",
    billingAddress: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "United States",
    },
    sameAsShipping: true,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

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

  const validatePaymentForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (paymentForm.type === "card") {
      if (!paymentForm.cardNumber.trim()) newErrors.cardNumber = "Card number is required"
      if (!paymentForm.expiryDate.trim()) newErrors.expiryDate = "Expiry date is required"
      if (!paymentForm.cvv.trim()) newErrors.cvv = "CVV is required"
      if (!paymentForm.nameOnCard.trim()) newErrors.nameOnCard = "Name on card is required"

      const cardNumber = paymentForm.cardNumber.replace(/\s/g, "")
      if (cardNumber && (cardNumber.length < 13 || cardNumber.length > 19)) {
        newErrors.cardNumber = "Please enter a valid card number"
      }

      if (paymentForm.cvv && (paymentForm.cvv.length < 3 || paymentForm.cvv.length > 4)) {
        newErrors.cvv = "CVV must be 3 or 4 digits"
      }

      if (!paymentForm.sameAsShipping) {
        if (!paymentForm.billingAddress.street.trim()) newErrors.billingStreet = "Billing street is required"
        if (!paymentForm.billingAddress.city.trim()) newErrors.billingCity = "Billing city is required"
        if (!paymentForm.billingAddress.state.trim()) newErrors.billingState = "Billing state is required"
        if (!paymentForm.billingAddress.zipCode.trim()) newErrors.billingZipCode = "Billing ZIP code is required"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAddressSelect = (address: any) => {
    setShippingForm((prev) => ({
      ...prev,
      street: address.street,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      country: address.country,
    }))
  }

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ""
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    if (parts.length) {
      return parts.join(" ")
    } else {
      return v
    }
  }

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    if (v.length >= 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`
    }
    return v
  }

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (validateShippingForm()) {
        setCurrentStep(2)
      }
    } else if (currentStep === 2) {
      if (validatePaymentForm()) {
        setCurrentStep(3)
      }
    }
  }

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handlePlaceOrder = async () => {
    if (!agreeToTerms) {
      toast({
        title: "Terms required",
        description: "Please agree to the terms and conditions",
        variant: "destructive",
      })
      return
    }

    if (!validatePaymentForm()) return

    setIsProcessing(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const order = await createOrder(
        items,
        {
          ...shippingForm,
          deliveryNotes: shippingForm.deliveryNotes,
        },
        {
          type: paymentForm.type === "card" ? "Credit Card" : paymentForm.type,
          last4: paymentForm.type === "card" ? paymentForm.cardNumber.slice(-4) : undefined,
        },
      )

      clearCart()

      toast({
        title: "Order placed successfully!",
        description: `Order #${order.orderNumber} has been created`,
      })

      router.push(`/order-summary/${order.id}`)
    } catch (error) {
      toast({
        title: "Error placing order",
        description: "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

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

  const paymentOptions = [
    { id: "card", name: "Credit/Debit Card", icon: PaymentIcons.card },
    { id: "paypal", name: "PayPal", icon: PaymentIcons.paypal },
    { id: "googlepay", name: "Google Pay", icon: PaymentIcons.googlepay },
    { id: "applepay", name: "Apple Pay", icon: PaymentIcons.applepay },
    { id: "venmo", name: "Venmo", icon: PaymentIcons.venmo },
    { id: "cashapp", name: "Cash App", icon: PaymentIcons.cashapp },
    { id: "amazonpay", name: "Amazon Pay", icon: PaymentIcons.amazonpay },
  ]

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
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= currentStep ? "bg-primary text-primary-foreground" : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {step < currentStep ? <CheckCircle className="h-4 w-4" /> : step}
                </div>
                <span className="ml-2 text-sm font-medium hidden sm:block">
                  {step === 1 ? "Shipping" : step === 2 ? "Payment" : "Review"}
                </span>
                {step < 3 && <ArrowRight className="h-4 w-4 mx-4 text-gray-400" />}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Step 1: Shipping Information */}
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Shipping Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
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
                </CardContent>
              </Card>
            )}

            {/* Step 2: Payment Information */}
            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Payment Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Payment Method Selection */}
                  <div>
                    <Label className="text-base font-medium">Select Payment Method</Label>
                    <RadioGroup
                      value={paymentForm.type}
                      onValueChange={(value) => {
                        setPaymentForm({ ...paymentForm, type: value })
                        setErrors({})
                      }}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3"
                    >
                      {paymentOptions.map((option) => {
                        const IconComponent = option.icon
                        return (
                          <div key={option.id} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.id} id={option.id} />
                            <Label
                              htmlFor={option.id}
                              className="flex items-center gap-2 cursor-pointer flex-1 p-3 border rounded-lg hover:bg-accent"
                            >
                              <IconComponent />
                              <span>{option.name}</span>
                            </Label>
                          </div>
                        )
                      })}
                    </RadioGroup>
                  </div>

                  {/* Card Payment Form */}
                  {paymentForm.type === "card" && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                      <div className="space-y-2">
                        <Label htmlFor="nameOnCard">
                          Name on Card <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="nameOnCard"
                          value={paymentForm.nameOnCard}
                          onChange={(e) => setPaymentForm({ ...paymentForm, nameOnCard: e.target.value })}
                          placeholder="John Doe"
                          className={errors.nameOnCard ? "border-red-500" : ""}
                        />
                        {errors.nameOnCard && <p className="text-sm text-red-500">{errors.nameOnCard}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cardNumber">
                          Card Number <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="cardNumber"
                          value={paymentForm.cardNumber}
                          onChange={(e) =>
                            setPaymentForm({ ...paymentForm, cardNumber: formatCardNumber(e.target.value) })
                          }
                          placeholder="1234 5678 9012 3456"
                          className={`font-mono ${errors.cardNumber ? "border-red-500" : ""}`}
                          maxLength={19}
                        />
                        {errors.cardNumber && <p className="text-sm text-red-500">{errors.cardNumber}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="expiryDate">
                            Expiry Date <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="expiryDate"
                            value={paymentForm.expiryDate}
                            onChange={(e) =>
                              setPaymentForm({ ...paymentForm, expiryDate: formatExpiryDate(e.target.value) })
                            }
                            placeholder="MM/YY"
                            className={`font-mono ${errors.expiryDate ? "border-red-500" : ""}`}
                            maxLength={5}
                          />
                          {errors.expiryDate && <p className="text-sm text-red-500">{errors.expiryDate}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvv">
                            CVV <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="cvv"
                            value={paymentForm.cvv}
                            onChange={(e) => setPaymentForm({ ...paymentForm, cvv: e.target.value.replace(/\D/g, "") })}
                            placeholder="123"
                            className={`font-mono ${errors.cvv ? "border-red-500" : ""}`}
                            maxLength={4}
                          />
                          {errors.cvv && <p className="text-sm text-red-500">{errors.cvv}</p>}
                        </div>
                      </div>

                      {/* Billing Address */}
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="sameAsShipping"
                            checked={paymentForm.sameAsShipping}
                            onCheckedChange={(checked) =>
                              setPaymentForm({ ...paymentForm, sameAsShipping: checked as boolean })
                            }
                          />
                          <Label htmlFor="sameAsShipping">Billing address same as shipping</Label>
                        </div>

                        {!paymentForm.sameAsShipping && (
                          <div className="space-y-4 p-4 border rounded-lg">
                            <h4 className="font-medium">Billing Address</h4>
                            <div className="space-y-2">
                              <Label htmlFor="billingStreet">
                                Street Address <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id="billingStreet"
                                value={paymentForm.billingAddress.street}
                                onChange={(e) =>
                                  setPaymentForm((prev) => ({
                                    ...prev,
                                    billingAddress: { ...prev.billingAddress, street: e.target.value },
                                  }))
                                }
                                placeholder="123 Main Street"
                                className={errors.billingStreet ? "border-red-500" : ""}
                              />
                              {errors.billingStreet && <p className="text-sm text-red-500">{errors.billingStreet}</p>}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="billingCity">
                                  City <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  id="billingCity"
                                  value={paymentForm.billingAddress.city}
                                  onChange={(e) =>
                                    setPaymentForm((prev) => ({
                                      ...prev,
                                      billingAddress: { ...prev.billingAddress, city: e.target.value },
                                    }))
                                  }
                                  placeholder="New York"
                                  className={errors.billingCity ? "border-red-500" : ""}
                                />
                                {errors.billingCity && <p className="text-sm text-red-500">{errors.billingCity}</p>}
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="billingState">
                                  State <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  id="billingState"
                                  value={paymentForm.billingAddress.state}
                                  onChange={(e) =>
                                    setPaymentForm((prev) => ({
                                      ...prev,
                                      billingAddress: { ...prev.billingAddress, state: e.target.value },
                                    }))
                                  }
                                  placeholder="NY"
                                  className={errors.billingState ? "border-red-500" : ""}
                                />
                                {errors.billingState && <p className="text-sm text-red-500">{errors.billingState}</p>}
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="billingZipCode">
                                  ZIP Code <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  id="billingZipCode"
                                  value={paymentForm.billingAddress.zipCode}
                                  onChange={(e) =>
                                    setPaymentForm((prev) => ({
                                      ...prev,
                                      billingAddress: { ...prev.billingAddress, zipCode: e.target.value },
                                    }))
                                  }
                                  placeholder="10001"
                                  className={errors.billingZipCode ? "border-red-500" : ""}
                                />
                                {errors.billingZipCode && (
                                  <p className="text-sm text-red-500">{errors.billingZipCode}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Other Payment Methods */}
                  {paymentForm.type !== "card" && (
                    <div className="p-4 border rounded-lg bg-muted/30 text-center">
                      <p className="text-muted-foreground">
                        You will be redirected to {paymentOptions.find((p) => p.id === paymentForm.type)?.name} to
                        complete your payment.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 3: Review Order */}
            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Review Your Order
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Shipping Information Review */}
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Delivery Address
                    </h4>
                    <div className="bg-muted/30 p-4 rounded-lg">
                      <p className="font-medium">{shippingForm.name}</p>
                      <p>{shippingForm.street}</p>
                      <p>
                        {shippingForm.city}, {shippingForm.state} {shippingForm.zipCode}
                      </p>
                      <p className="text-sm text-muted-foreground">{shippingForm.phone}</p>
                      {shippingForm.deliveryNotes && (
                        <div className="mt-2 p-2 bg-blue-50 rounded border-l-4 border-blue-400">
                          <p className="text-sm font-medium text-blue-800">Delivery Instructions:</p>
                          <p className="text-sm text-blue-700">{shippingForm.deliveryNotes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment Method Review */}
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Payment Method
                    </h4>
                    <div className="bg-muted/30 p-4 rounded-lg">
                      <div className="flex items-center gap-2">
                        {React.createElement(paymentOptions.find((p) => p.id === paymentForm.type)?.icon || CreditCard)}
                        <span>{paymentOptions.find((p) => p.id === paymentForm.type)?.name}</span>
                        {paymentForm.type === "card" && paymentForm.cardNumber && (
                          <span className="text-muted-foreground">ending in {paymentForm.cardNumber.slice(-4)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Order Items Review */}
                  <div>
                    <h4 className="font-medium mb-2">Order Items</h4>
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
                  </div>

                  {/* Terms and Conditions */}
                  <div className="flex items-center space-x-2">
                    <Checkbox id="terms" checked={agreeToTerms} onCheckedChange={setAgreeToTerms} />
                    <Label htmlFor="terms" className="text-sm">
                      I agree to the{" "}
                      <Link href="/terms" className="text-primary hover:underline">
                        Terms and Conditions
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" className="text-primary hover:underline">
                        Privacy Policy
                      </Link>
                    </Label>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={handlePreviousStep} disabled={currentStep === 1}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              {currentStep < 3 ? (
                <Button onClick={handleNextStep}>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <div></div>
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
                    <span>Taxes</span>
                    <span>${taxes.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Delivery</span>
                    <span>${shipping.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span>${totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Place Order Button */}
                {currentStep === 3 && (
                  <Button
                    onClick={handlePlaceOrder}
                    disabled={!agreeToTerms || isProcessing}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3"
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Place Order - $${totalAmount.toFixed(2)}`
                    )}
                  </Button>
                )}

                {currentStep < 3 && (
                  <Button
                    disabled
                    className="w-full bg-gray-300 text-gray-500 font-medium py-3 cursor-not-allowed"
                    size="lg"
                  >
                    Complete checkout steps to place order
                  </Button>
                )}

                {/* Security Features */}
                <div className="pt-4 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span>SSL Encrypted Checkout</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span>Same-day delivery</span>
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
