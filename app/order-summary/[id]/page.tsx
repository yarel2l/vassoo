"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useOrders } from "@/contexts/orders-context"
import Navbar from "@/components/navbar"
import MobileBottomNav from "@/components/mobile-bottom-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, Truck, MapPin, Phone, Download, Package, Share2, Home, MessageSquare } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"

export default function OrderSummaryPage() {
  const params = useParams()
  const router = useRouter()
  const { getOrder } = useOrders()
  const [order, setOrder] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      const foundOrder = getOrder(params.id as string)
      setOrder(foundOrder)
      setIsLoading(false)
    }
  }, [params.id, getOrder])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "confirmed":
        return "bg-blue-100 text-blue-800"
      case "preparing":
        return "bg-orange-100 text-orange-800"
      case "out_for_delivery":
        return "bg-purple-100 text-purple-800"
      case "delivered":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />
      case "confirmed":
        return <CheckCircle className="h-4 w-4" />
      case "preparing":
        return <Package className="h-4 w-4" />
      case "out_for_delivery":
        return <Truck className="h-4 w-4" />
      case "delivered":
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const handleDownloadInvoice = () => {
    if (!order) return

    const invoiceText = generateInvoiceText(order)
    const element = document.createElement("a")
    const file = new Blob([invoiceText], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = `invoice-${order.orderNumber}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)

    toast({
      title: "Invoice downloaded",
      description: "Your invoice has been downloaded successfully",
    })
  }

  const handleShareOrder = async () => {
    if (!order) return

    const shareData = {
      title: `Order #${order.orderNumber}`,
      text: `I just placed an order for $${order.total.toFixed(2)} on LiquorHub!`,
      url: window.location.href,
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`)
        toast({
          title: "Link copied",
          description: "Order link copied to clipboard",
        })
      }
    } catch (error) {
      console.error("Error sharing:", error)
    }
  }

  const generateInvoiceText = (order: any) => {
    return `
LIQUORHUB INVOICE
================

Order Number: #${order.orderNumber}
Order Date: ${order.createdAt.toLocaleDateString()}
Status: ${order.status.toUpperCase()}

DELIVERY INFORMATION
-------------------
${order.shippingAddress.name}
${order.shippingAddress.street}
${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}
Phone: ${order.shippingAddress.phone}
Email: ${order.shippingAddress.email}

${order.shippingAddress.deliveryNotes ? `Delivery Notes: ${order.shippingAddress.deliveryNotes}` : ""}

ITEMS ORDERED
-------------
${order.items
  .map(
    (item: any) =>
      `${item.productName}
  Store: ${item.storeName}
  Quantity: ${item.quantity}
  Price: $${item.price.toFixed(2)} each
  Total: $${(item.price * item.quantity).toFixed(2)}`,
  )
  .join("\n\n")}

ORDER SUMMARY
-------------
Subtotal: $${order.subtotal.toFixed(2)}
Taxes: $${order.taxes.toFixed(2)}
Delivery: $${order.shipping.toFixed(2)}
TOTAL: $${order.total.toFixed(2)}

PAYMENT METHOD
--------------
${order.paymentMethod.type}${order.paymentMethod.last4 ? ` ending in ${order.paymentMethod.last4}` : ""}

DELIVERY INFORMATION
-------------------
Estimated Delivery: ${order.estimatedDelivery.toLocaleString()}
${order.deliveryPerson ? `Delivery Person: ${order.deliveryPerson.name} (${order.deliveryPerson.phone})` : ""}

Thank you for your order!
Visit us again at LiquorHub
    `
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
        <MobileBottomNav />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <Package className="h-24 w-24 mx-auto text-muted-foreground mb-6" />
            <h1 className="text-3xl font-bold mb-4">Order Not Found</h1>
            <p className="text-muted-foreground mb-8">
              The order you're looking for doesn't exist or has been removed.
            </p>
            <div className="space-x-4">
              <Link href="/purchases">
                <Button variant="outline">View All Orders</Button>
              </Link>
              <Link href="/">
                <Button>Continue Shopping</Button>
              </Link>
            </div>
          </div>
        </div>
        <MobileBottomNav />
      </div>
    )
  }

  const deliveryTime = Math.ceil((new Date(order.estimatedDelivery).getTime() - new Date().getTime()) / (1000 * 60))

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold mb-2">Order Confirmed!</h1>
          <p className="text-xl text-muted-foreground mb-4">
            Thank you for your purchase. Your order #{order.orderNumber} has been placed successfully.
          </p>
          <div className="flex items-center justify-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            <span className="font-semibold text-primary">
              Estimated delivery: {deliveryTime > 0 ? `${deliveryTime} minutes` : "Very soon!"}
            </span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Order Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={handleDownloadInvoice} variant="outline" className="bg-background">
              <Download className="mr-2 h-4 w-4" />
              Download Invoice
            </Button>
            <Button onClick={handleShareOrder} variant="outline" className="bg-background">
              <Share2 className="mr-2 h-4 w-4" />
              Share Order
            </Button>
            <Link href="/">
              <Button className="w-full sm:w-auto">
                <Home className="mr-2 h-4 w-4" />
                Continue Shopping
              </Button>
            </Link>
            <Link href="/purchases">
              <Button variant="outline" className="w-full sm:w-auto bg-background">
                <Package className="mr-2 h-4 w-4" />
                View All Orders
              </Button>
            </Link>
          </div>

          {/* Delivery Information */}
          {order.deliveryPerson && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Your Delivery Person
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Image
                    src={order.deliveryPerson.photo || "/placeholder.svg"}
                    alt={order.deliveryPerson.name}
                    width={60}
                    height={60}
                    className="rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{order.deliveryPerson.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {order.deliveryPerson.phone}
                      </span>
                      <span>⭐ {order.deliveryPerson.rating}</span>
                      <span>
                        {order.deliveryPerson.vehicle} • {order.deliveryPerson.licensePlate}
                      </span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {order.status.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Delivery Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Delivery Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-semibold">{order.shippingAddress.name}</p>
                <p>{order.shippingAddress.street}</p>
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                </p>
                <p className="text-muted-foreground">{order.shippingAddress.country}</p>
                {order.shippingAddress.deliveryNotes && (
                  <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">Delivery Instructions:</p>
                        <p className="text-sm text-blue-700">{order.shippingAddress.deliveryNotes}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <Image
                      src={item.productImage || "/placeholder.svg"}
                      alt={item.productName}
                      width={80}
                      height={80}
                      className="rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold">{item.productName}</h3>
                      <p className="text-sm text-muted-foreground">{item.storeName}</p>
                      <p className="text-sm">Quantity: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        ${((item.price + item.taxes + item.shippingCost) * item.quantity).toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">${item.price.toFixed(2)} each</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${order.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes:</span>
                  <span>${order.taxes.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery:</span>
                  <span>${order.shipping.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-primary">${order.total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="capitalize">{order.paymentMethod.type}</span>
                {order.paymentMethod.last4 && (
                  <span className="text-muted-foreground">ending in {order.paymentMethod.last4}</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <MobileBottomNav />
    </div>
  )
}
