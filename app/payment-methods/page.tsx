"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Plus, Edit, Trash2, Shield, Star, Calendar, User, Lock } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"

interface PaymentMethod {
  id: string
  type: "credit" | "debit" | "paypal"
  last4: string
  brand: string
  expiryMonth: number
  expiryYear: number
  isDefault: boolean
  holderName: string
}

export default function PaymentMethodsPage() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: "1",
      type: "credit",
      last4: "4242",
      brand: "Visa",
      expiryMonth: 12,
      expiryYear: 2025,
      isDefault: true,
      holderName: "John Doe",
    },
    {
      id: "2",
      type: "credit",
      last4: "8888",
      brand: "Mastercard",
      expiryMonth: 8,
      expiryYear: 2026,
      isDefault: false,
      holderName: "John Doe",
    },
  ])

  const [newCard, setNewCard] = useState({
    cardNumber: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: "",
    holderName: "",
    billingAddress: "",
    city: "",
    state: "",
    zipCode: "",
  })

  const handleAddCard = () => {
    // Here you would typically process the card with your payment provider
    const newPaymentMethod: PaymentMethod = {
      id: Date.now().toString(),
      type: "credit",
      last4: newCard.cardNumber.slice(-4),
      brand: "Visa", // This would be determined by the card number
      expiryMonth: Number.parseInt(newCard.expiryMonth),
      expiryYear: Number.parseInt(newCard.expiryYear),
      isDefault: paymentMethods.length === 0,
      holderName: newCard.holderName,
    }

    setPaymentMethods([...paymentMethods, newPaymentMethod])
    setNewCard({
      cardNumber: "",
      expiryMonth: "",
      expiryYear: "",
      cvv: "",
      holderName: "",
      billingAddress: "",
      city: "",
      state: "",
      zipCode: "",
    })
    setShowAddForm(false)
  }

  const handleSetDefault = (id: string) => {
    setPaymentMethods((methods) =>
      methods.map((method) => ({
        ...method,
        isDefault: method.id === id,
      })),
    )
  }

  const handleDeleteCard = (id: string) => {
    setPaymentMethods((methods) => methods.filter((method) => method.id !== id))
  }

  const getBrandIcon = (brand: string) => {
    // In a real app, you'd have actual brand icons
    return <CreditCard className="h-6 w-6" />
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Payment Methods</h1>
          <p className="text-gray-400">Manage your payment methods and billing information</p>
        </div>

        <div className="space-y-6">
          {/* Add New Payment Method */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Add Payment Method</CardTitle>
                  <CardDescription className="text-gray-400">
                    Add a new credit or debit card to your account
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Card
                </Button>
              </div>
            </CardHeader>
            {showAddForm && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="cardNumber" className="text-gray-300">
                      Card Number
                    </Label>
                    <Input
                      id="cardNumber"
                      placeholder="1234 5678 9012 3456"
                      value={newCard.cardNumber}
                      onChange={(e) => setNewCard({ ...newCard, cardNumber: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiryMonth" className="text-gray-300">
                      Expiry Month
                    </Label>
                    <Select
                      value={newCard.expiryMonth}
                      onValueChange={(value) => setNewCard({ ...newCard, expiryMonth: value })}
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString().padStart(2, "0")}>
                            {(i + 1).toString().padStart(2, "0")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiryYear" className="text-gray-300">
                      Expiry Year
                    </Label>
                    <Select
                      value={newCard.expiryYear}
                      onValueChange={(value) => setNewCard({ ...newCard, expiryYear: value })}
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        {Array.from({ length: 10 }, (_, i) => (
                          <SelectItem key={2024 + i} value={(2024 + i).toString()}>
                            {2024 + i}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvv" className="text-gray-300">
                      CVV
                    </Label>
                    <Input
                      id="cvv"
                      placeholder="123"
                      value={newCard.cvv}
                      onChange={(e) => setNewCard({ ...newCard, cvv: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="holderName" className="text-gray-300">
                      Cardholder Name
                    </Label>
                    <Input
                      id="holderName"
                      placeholder="John Doe"
                      value={newCard.holderName}
                      onChange={(e) => setNewCard({ ...newCard, holderName: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="billingAddress" className="text-gray-300">
                      Billing Address
                    </Label>
                    <Input
                      id="billingAddress"
                      placeholder="123 Main Street"
                      value={newCard.billingAddress}
                      onChange={(e) => setNewCard({ ...newCard, billingAddress: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-gray-300">
                      City
                    </Label>
                    <Input
                      id="city"
                      placeholder="New York"
                      value={newCard.city}
                      onChange={(e) => setNewCard({ ...newCard, city: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-gray-300">
                      State
                    </Label>
                    <Input
                      id="state"
                      placeholder="NY"
                      value={newCard.state}
                      onChange={(e) => setNewCard({ ...newCard, state: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipCode" className="text-gray-300">
                      ZIP Code
                    </Label>
                    <Input
                      id="zipCode"
                      placeholder="10001"
                      value={newCard.zipCode}
                      onChange={(e) => setNewCard({ ...newCard, zipCode: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>
                <div className="flex space-x-2 pt-4">
                  <Button onClick={handleAddCard} className="bg-green-600 hover:bg-green-700">
                    Add Card
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Saved Payment Methods */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Saved Payment Methods</CardTitle>
              <CardDescription className="text-gray-400">Manage your saved cards and payment options</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentMethods.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No payment methods added yet</p>
                  <p className="text-sm text-gray-500">Add a payment method to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className="flex items-center justify-between p-4 border border-gray-700 rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="text-gray-300">{getBrandIcon(method.brand)}</div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-white font-medium">
                              {method.brand} •••• {method.last4}
                            </span>
                            {method.isDefault && (
                              <Badge className="bg-amber-600 text-white">
                                <Star className="h-3 w-3 mr-1" />
                                Default
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-400">
                            <span className="flex items-center">
                              <User className="h-3 w-3 mr-1" />
                              {method.holderName}
                            </span>
                            <span className="flex items-center mt-1">
                              <Calendar className="h-3 w-3 mr-1" />
                              Expires {method.expiryMonth.toString().padStart(2, "0")}/{method.expiryYear}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!method.isDefault && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetDefault(method.id)}
                            className="border-gray-600 text-gray-300 hover:bg-gray-700"
                          >
                            Set Default
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteCard(method.id)}
                          className="border-red-600 text-red-400 hover:bg-red-950"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security Information */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Security & Privacy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="border-green-600 bg-green-950/20">
                <Lock className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-300">
                  Your payment information is encrypted and secure. We use industry-standard SSL encryption to protect
                  your data.
                </AlertDescription>
              </Alert>
              <div className="mt-4 space-y-2 text-sm text-gray-400">
                <p>• We never store your full credit card number or CVV</p>
                <p>• All transactions are processed through secure payment gateways</p>
                <p>• Your billing information is encrypted and stored securely</p>
                <p>• We comply with PCI DSS standards for payment security</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  )
}
