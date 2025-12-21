"use client"

import { useState } from "react"
import Navbar from "@/components/navbar"
import MobileBottomNav from "@/components/mobile-bottom-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Trash2, ShoppingBag, ArrowLeft, Truck, Minus, Plus } from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import { useLanguage } from "@/components/language-provider"
import Image from "next/image"
import Link from "next/link"

export default function CartPage() {
  const { items, totalItems, totalPrice, removeFromCart, updateQuantity, clearCart } = useCart()
  const { t } = useLanguage()
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  const formatDeliveryTime = (delivery: { min: number; max: number; unit: "hours" | "days" }) => {
    if (delivery.min === delivery.max) {
      return `${delivery.min} ${delivery.unit}`
    }
    return `${delivery.min}-${delivery.max} ${delivery.unit}`
  }

  const groupedItems = items.reduce(
    (groups, item) => {
      const key = item.storeId
      if (!groups[key]) {
        groups[key] = {
          storeName: item.storeName,
          items: [],
          subtotal: 0,
          taxes: 0,
          shipping: 0,
          total: 0,
        }
      }
      groups[key].items.push(item)
      groups[key].subtotal += item.price * item.quantity
      groups[key].taxes += item.taxes * item.quantity
      groups[key].shipping += item.shippingCost * item.quantity
      groups[key].total += (item.price + item.taxes + item.shippingCost) * item.quantity
      return groups
    },
    {} as Record<string, any>,
  )

  const handleCheckout = () => {
    setIsCheckingOut(true)
    // Redirect to checkout page
    setTimeout(() => {
      window.location.href = "/checkout"
    }, 1000)
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <ShoppingBag className="h-24 w-24 mx-auto text-muted-foreground mb-6" />
            <h1 className="text-3xl font-bold mb-4">Your cart is empty</h1>
            <p className="text-muted-foreground mb-8">Add some products to get started</p>
            <Link href="/">
              <Button size="lg">
                <ArrowLeft className="mr-2 h-5 w-5" />
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Shopping Cart</h1>
            <p className="text-muted-foreground">{totalItems} items in your cart</p>
          </div>
          <Button
            variant="outline"
            onClick={clearCart}
            className="text-red-600 hover:text-red-700 bg-transparent self-start sm:self-auto"
            size="sm"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Cart
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {Object.entries(groupedItems).map(([storeId, group]) => (
              <Card key={storeId}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Truck className="h-5 w-5" />
                    {group.storeName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {group.items.map((item) => (
                    <div key={item.id} className="space-y-4">
                      {/* Mobile Layout */}
                      <div className="block sm:hidden">
                        <div className="flex gap-3">
                          <Image
                            src={item.productImage || "/placeholder.svg"}
                            alt={item.productName}
                            width={80}
                            height={80}
                            className="rounded-lg object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm leading-tight mb-1">{item.productName}</h3>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                {item.storeName}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mb-2">
                              Delivery: {formatDeliveryTime(item.estimatedDelivery)}
                            </div>
                            <div className="text-lg font-bold text-primary mb-1">
                              ${(item.price + item.taxes + item.shippingCost).toFixed(2)} each
                            </div>
                            <div className="text-xs text-muted-foreground mb-3">
                              ${item.price} + ${item.taxes.toFixed(2)} tax + ${item.shippingCost.toFixed(2)} shipping
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 bg-transparent"
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  disabled={item.quantity <= 1}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 bg-transparent"
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  disabled={item.quantity >= item.maxStock}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeFromCart(item.id)}
                                className="text-red-600 hover:text-red-700 h-8 w-8"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden sm:flex items-center gap-4 p-4 border rounded-lg">
                        <Image
                          src={item.productImage || "/placeholder.svg"}
                          alt={item.productName}
                          width={80}
                          height={80}
                          className="rounded-lg object-cover"
                        />
                        <div className="flex-1 space-y-2">
                          <h3 className="font-semibold">{item.productName}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline">{item.storeName}</Badge>
                            <span>•</span>
                            <span>Delivery: {formatDeliveryTime(item.estimatedDelivery)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="font-semibold text-primary">
                                ${(item.price + item.taxes + item.shippingCost).toFixed(2)} each
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ${item.price} + ${item.taxes.toFixed(2)} tax + ${item.shippingCost.toFixed(2)} shipping
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 bg-transparent"
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  disabled={item.quantity <= 1}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-8 text-center font-medium">{item.quantity}</span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 bg-transparent"
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  disabled={item.quantity >= item.maxStock}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeFromCart(item.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Store Subtotal */}
                  <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>${group.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Taxes:</span>
                      <span>${group.taxes.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Shipping:</span>
                      <span>${group.shipping.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Store Total:</span>
                      <span className="text-primary">${group.total.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Items ({totalItems}):</span>
                    <span>${items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxes:</span>
                    <span>${items.reduce((sum, item) => sum + item.taxes * item.quantity, 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping:</span>
                    <span>${items.reduce((sum, item) => sum + item.shippingCost * item.quantity, 0).toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-primary">${totalPrice.toFixed(2)}</span>
                  </div>
                </div>

                <Button className="w-full" size="lg" onClick={handleCheckout} disabled={isCheckingOut}>
                  {isCheckingOut ? "Processing..." : "Proceed to Checkout"}
                </Button>

                <Link href="/">
                  <Button variant="outline" className="w-full bg-transparent">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Continue Shopping
                  </Button>
                </Link>

                {/* Trust Indicators */}
                <div className="pt-4 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Secure checkout</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Free returns within 30 days</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Customer support 24/7</span>
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
