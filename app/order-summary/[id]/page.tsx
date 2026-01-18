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
import type { Order } from "@/contexts/orders-context"

export default function OrderSummaryPage() {
  const params = useParams()
  const router = useRouter()
  const { getOrder, getOrderById } = useOrders()
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchOrder = async () => {
      if (params.id) {
        setIsLoading(true)
        const foundOrder = await getOrderById(params.id as string)
        setOrder(foundOrder)
        setIsLoading(false)
      }
    }
    fetchOrder()
  }, [params.id, getOrderById])

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
      text: `I just placed an order for $${order.total.toFixed(2)} on Vassoo!`,
      url: window.location.href,
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
        toast({
          title: "Shared successfully",
          description: "Order details have been shared",
        })
      } else {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`)
        toast({
          title: "Link copied",
          description: "Order link copied to clipboard",
        })
      }
    } catch (error: any) {
      // User cancelled the share dialog - this is not an error
      if (error?.name === 'AbortError') {
        return
      }
      // For other errors, fall back to clipboard
      try {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`)
        toast({
          title: "Link copied",
          description: "Order link copied to clipboard",
        })
      } catch {
        toast({
          title: "Unable to share",
          description: "Please copy the URL manually from the address bar",
          variant: "destructive",
        })
      }
    }
  }

  const generateInvoiceText = (order: any) => {
    return `
VASSOO INVOICE
================

Order Number: #${order.orderNumber}
Order Date: ${order.createdAt.toLocaleDateString()}
Status: ${order.status.toUpperCase()}

DELIVERY INFORMATION
-------------------
DELIVERY INFORMATION
-------------------
${order.deliveryAddress?.name}
${order.deliveryAddress?.street}
${order.deliveryAddress?.city}, ${order.deliveryAddress?.state} ${order.deliveryAddress?.zipCode}
Phone: ${order.deliveryAddress?.phone}
Email: ${order.customerEmail}

${order.deliveryAddress?.notes ? `Delivery Notes: ${order.deliveryAddress.notes}` : ""}

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
Taxes: $${order.taxAmount.toFixed(2)}
Delivery: $${order.deliveryFee.toFixed(2)}
TOTAL: $${order.total.toFixed(2)}

PAYMENT METHOD
--------------
${order.paymentMethod}

DELIVERY INFORMATION
-------------------
${order.delivery ? `Delivery Status: ${order.delivery.status}` : ""}
${order.delivery?.driver ? `Driver: ${order.delivery.driver.name} (${order.delivery.driver.phone})` : ""}

Thank you for your order!
Visit us again at Vassoo
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

  const deliveryTime = order.estimatedDelivery
    ? Math.ceil((new Date(order.estimatedDelivery).getTime() - new Date().getTime()) / (1000 * 60))
    : 30

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
              {order.delivery?.status === 'in_transit' ? 'Driver is on their way!' :
                order.delivery?.status === 'picked_up' ? 'Driver picked up your order' :
                  order.delivery?.status === 'assigned' ? 'Driver assigned' :
                    'Preparing your order'}
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

          {/* Tracking Section */}
          <Card className="overflow-hidden border-orange-500/20 bg-gray-950/40">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-orange-500" />
                  Delivery Tracking
                </span>
                {order.delivery && (
                  <Badge variant="outline" className="text-orange-500 border-orange-500/30">
                    {order.delivery.status.toUpperCase()}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row min-h-[400px]">
                {/* Visual Map / Status */}
                <div className="flex-1 bg-gray-900/50 p-6 flex flex-col items-center justify-center relative overflow-hidden">
                  {/* Animated Pulse background */}
                  <div className="absolute inset-0 z-0 flex items-center justify-center opacity-20">
                    <div className="w-64 h-64 bg-orange-500/20 rounded-full animate-ping"></div>
                  </div>

                  <div className="z-10 text-center space-y-6 max-w-sm">
                    <div className="relative inline-block">
                      <div className="w-24 h-24 bg-orange-500/10 rounded-full flex items-center justify-center border-2 border-orange-500/30 shadow-[0_0_50px_rgba(249,115,22,0.15)]">
                        {order.status === 'delivered' ? (
                          <CheckCircle className="h-12 w-12 text-green-500" />
                        ) : (
                          <Truck className="h-12 w-12 text-orange-500 animate-bounce" />
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">
                        {order.delivery?.status === 'in_transit' ? 'Order is in transit' :
                          order.delivery?.status === 'picked_up' ? 'Order picked up' :
                            order.delivery?.status === 'assigned' ? 'Driver assigned' :
                              order.status === 'delivered' ? 'Order delivered!' :
                                'Preparing your order'}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {order.delivery?.status === 'in_transit' ? 'The driver is heading to your location.' :
                          order.delivery?.status === 'picked_up' ? 'Your items have been picked up from the store.' :
                            'Your order is being processed and will be assigned to a driver soon.'}
                      </p>
                    </div>

                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full transition-all duration-1000"
                        style={{
                          width:
                            order.status === 'delivered' ? '100%' :
                              order.delivery?.status === 'in_transit' ? '75%' :
                                order.delivery?.status === 'picked_up' ? '50%' :
                                  order.delivery?.status === 'assigned' ? '25%' : '10%'
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-gray-800 p-6 space-y-8">
                  <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Status History</h4>
                  <div className="space-y-6 relative">
                    {/* Vertical line connecting steps */}
                    <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-800"></div>

                    {[
                      { id: 'delivered', label: 'Delivered', time: order.status === 'delivered' ? 'Now' : null },
                      { id: 'in_transit', label: 'In Transit', time: order.delivery?.status === 'in_transit' ? 'Active' : null },
                      { id: 'picked_up', label: 'Picked Up', time: (order.delivery?.status === 'picked_up' || order.delivery?.status === 'in_transit') ? 'Completed' : null },
                      { id: 'assigned', label: 'Driver Assigned', time: order.delivery ? 'Done' : null },
                      { id: 'confirmed', label: 'Order Confirmed', time: 'Completed', isFirst: true }
                    ].map((step, idx) => {
                      const isActive = order.delivery?.status === step.id || (step.id === 'delivered' && order.status === 'delivered')
                      const isPast = (order.status === 'delivered') ||
                        (step.id === 'in_transit' && order.delivery?.status === 'delivered') ||
                        (step.id === 'picked_up' && ['in_transit', 'delivered'].includes(order.delivery?.status || '')) ||
                        (step.id === 'assigned' && !!order.delivery) ||
                        (step.id === 'confirmed')

                      return (
                        <div key={step.id} className="flex gap-4 relative z-10">
                          <div className={`mt-1 h-6 w-6 rounded-full border-2 flex items-center justify-center ${isActive ? 'bg-orange-500 border-orange-500' :
                            isPast ? 'bg-orange-500/20 border-orange-500 text-orange-500' :
                              'bg-gray-900 border-gray-800 text-gray-600'
                            }`}>
                            {isPast ? <CheckCircle className="h-3 w-3" /> : <div className="h-1.5 w-1.5 rounded-full bg-current" />}
                          </div>
                          <div>
                            <p className={`font-medium text-sm ${isActive ? 'text-white' : isPast ? 'text-gray-300' : 'text-gray-600'}`}>
                              {step.label}
                            </p>
                            {step.time && <p className="text-xs text-gray-500 mt-0.5">{step.time}</p>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Information */}
          {order.delivery && order.delivery.driver && (
            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-400">
                  <Truck className="h-5 w-5" />
                  Your Delivery Driver
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Image
                      src={order.delivery.driver.photo || "/placeholder.svg"}
                      alt={order.delivery.driver.name}
                      width={60}
                      height={60}
                      className="rounded-full object-cover border-2 border-blue-500/20"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white"></div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{order.delivery.driver.name}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {order.delivery.driver.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <Truck className="h-4 w-4" />
                        {order.delivery.driver.vehicleType || 'Vehicle'} • {order.delivery.driver.vehiclePlate || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                    {order.delivery.status.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Delivery Address */}
          {order.deliveryAddress && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Delivery Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-semibold">{order.deliveryAddress.name}</p>
                  <p>{order.deliveryAddress.street}</p>
                  <p>
                    {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.zipCode}
                  </p>
                  <p className="text-muted-foreground">{order.deliveryAddress.country}</p>
                  {order.deliveryAddress.notes && (
                    <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-blue-800">Delivery Instructions:</p>
                          <p className="text-sm text-blue-700">{order.deliveryAddress.notes}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

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
                        ${(item.total).toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">${item.unitPrice.toFixed(2)} each</p>
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
                  <span>${order.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery:</span>
                  <span>${order.deliveryFee.toFixed(2)}</span>
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
                <span className="capitalize">{order.paymentMethod}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <MobileBottomNav />
    </div>
  )
}
