"use client"

import { useState, useEffect } from "react"
import { useOrders } from "@/contexts/orders-context"
import Navbar from "@/components/navbar"
import MobileBottomNav from "@/components/mobile-bottom-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Package,
  Clock,
  CheckCircle,
  Truck,
  Download,
  ShoppingBag,
  User,
  Phone,
  Star,
  MapPin,
  Calendar,
  CreditCard,
  ArrowRight,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"

export default function PurchasesPage() {
  const { orders, isLoading } = useOrders()
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)

  // Safely filter orders with null checks
  const safeOrders = orders || []
  const pendingOrders =
    safeOrders.filter(
      (order) =>
        order && ["pending", "confirmed", "processing", "ready_for_pickup", "out_for_delivery"].includes(order.status),
    ) || []
  const completedOrders = safeOrders.filter((order) => order && ["delivered", "completed", "cancelled", "refunded"].includes(order.status)) || []

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
      case "confirmed":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "processing":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "ready_for_pickup":
      case "picked_up":
      case "on_the_way":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      case "delivered":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
      case "confirmed":
        return <Clock className="h-4 w-4 text-yellow-600" />
      case "preparing":
        return <Package className="h-4 w-4 text-blue-600" />
      case "ready":
      case "picked_up":
      case "on_the_way":
        return <Truck className="h-4 w-4 text-purple-600" />
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "cancelled":
        return <CheckCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const handleDownloadInvoice = (order: any) => {
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

  const generateInvoiceText = (order: any) => {
    return `
VASSOO INVOICE
================

Order Number: #${order.orderNumber}
Order Date: ${order.createdAt.toLocaleDateString()}
Status: ${order.status.toUpperCase()}

BILLING INFORMATION
------------------
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
            `${item.productName} (${item.storeName})
  Quantity: ${item.quantity}
  Price: $${item.price.toFixed(2)} each
  Total: $${((item.price + item.taxes + item.shippingCost) * item.quantity).toFixed(2)}`,
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
    `
  }

  const OrderCard = ({ order, showTracking = false }: { order: any; showTracking?: boolean }) => (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {getStatusIcon(order.status)}
              <div>
                <CardTitle className="text-lg">Order #{order.orderNumber}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {order.createdAt.toLocaleDateString()} • {order.items?.length || 0} items
                </p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <Badge className={getStatusColor(order.status)}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace("_", " ")}
            </Badge>
            <p className="text-lg font-bold text-primary mt-1">${order.total.toFixed(2)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Order Items Preview */}
        <div className="space-y-2">
          {order.items?.slice(0, 2).map((item: any) => (
            <div key={item.id} className="flex items-center gap-3">
              <Image
                src={item.productImage || "/placeholder.svg"}
                alt={item.productName}
                width={40}
                height={40}
                className="rounded object-cover"
              />
              <div className="flex-1">
                <p className="font-medium text-sm">{item.productName}</p>
                <p className="text-xs text-muted-foreground">
                  {item.storeName} • Qty: {item.quantity}
                </p>
              </div>
            </div>
          ))}
          {(order.items?.length || 0) > 2 && (
            <p className="text-sm text-muted-foreground">+{(order.items?.length || 0) - 2} more items</p>
          )}
        </div>

        {/* Delivery Person Info for Pending Orders */}
        {showTracking && order.deliveryPerson && (
          <div className="space-y-3">
            <Separator />
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <User className="h-4 w-4" />
                Your Delivery Person
              </h4>
              <div className="bg-muted/30 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <Image
                    src={order.deliveryPerson.photo || "/placeholder.svg"}
                    alt={order.deliveryPerson.name}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{order.deliveryPerson.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{order.deliveryPerson.phone}</span>
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span>{order.deliveryPerson.rating}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {order.deliveryPerson.vehicle} • {order.deliveryPerson.licensePlate}
                    </p>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium">
                    Estimated arrival: {order.estimatedDelivery.toLocaleTimeString()}
                  </p>
                  {order.trackingUpdates?.map((update: any, index: number) => (
                    <div key={index} className="flex items-start gap-3">
                      <div
                        className={`w-2 h-2 rounded-full mt-2 ${index === 0 ? "bg-primary" : "bg-muted-foreground"}`}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{update.status}</p>
                        <p className="text-xs text-muted-foreground">{update.message}</p>
                        <p className="text-xs text-muted-foreground">{update.timestamp.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Order Summary for Completed Orders */}
        {!showTracking && order.status === "delivered" && (
          <div className="space-y-3">
            <Separator />
            <div>
              <h4 className="font-semibold mb-2">Order Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>${(order.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taxes:</span>
                    <span>${(order.taxAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery:</span>
                    <span>${(order.deliveryFee || 0).toFixed(2)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    <span className="text-xs text-muted-foreground">
                      Delivered: {order.createdAt?.toLocaleDateString() || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-3 w-3" />
                    <span className="text-xs text-muted-foreground">
                      {order.paymentMethod || 'Card'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    <span className="text-xs text-muted-foreground">
                      {order.deliveryAddress?.city || 'N/A'}, {order.deliveryAddress?.state || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {showTracking ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedOrder(selectedOrder === order.id ? null : order.id)}
                className="flex-1"
              >
                {selectedOrder === order.id ? "Hide Details" : "View Details"}
                <ArrowRight className="ml-2 h-3 w-3" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDownloadInvoice(order)}>
                <Download className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <>
              <Link href={`/order-summary/${order.id}`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full bg-transparent">
                  View Summary
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => handleDownloadInvoice(order)}>
                <Download className="h-3 w-3" />
              </Button>
              {order.status === "delivered" && (
                <Button variant="outline" size="sm" className="bg-transparent">
                  Reorder
                </Button>
              )}
            </>
          )}
        </div>

        {/* Expanded Details for Pending Orders */}
        {showTracking && selectedOrder === order.id && (
          <div className="space-y-4 pt-4 border-t">
            <div>
              <h4 className="font-semibold mb-2">Delivery Address</h4>
              <div className="text-sm text-muted-foreground">
                <p>{order.shippingAddress.name}</p>
                <p>{order.shippingAddress.street}</p>
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                </p>
                {order.shippingAddress.deliveryNotes && (
                  <div className="mt-2 p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
                    <p className="text-sm font-medium text-yellow-800">Delivery Instructions:</p>
                    <p className="text-sm text-yellow-700">{order.shippingAddress.deliveryNotes}</p>
                  </div>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Estimated Delivery</h4>
              <p className="text-sm text-muted-foreground">{order.estimatedDelivery.toLocaleString()}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading your orders...</p>
          </div>
        </div>
        <MobileBottomNav />
      </div>
    )
  }

  if (!safeOrders || safeOrders.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <ShoppingBag className="h-24 w-24 mx-auto text-muted-foreground mb-6" />
            <h1 className="text-3xl font-bold mb-4">No purchases yet</h1>
            <p className="text-muted-foreground mb-8">Your order history will appear here once you make a purchase</p>
            <Link href="/">
              <Button size="lg">Start Shopping</Button>
            </Link>
          </div>
        </div>
        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">My Purchases</h1>
          <p className="text-muted-foreground">{safeOrders.length} total orders</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Active ({pendingOrders.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Completed ({completedOrders.length})
            </TabsTrigger>
          </TabsList>

          {/* Pending Orders */}
          <TabsContent value="pending" className="space-y-4">
            {pendingOrders.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No active orders</h3>
                <p className="text-muted-foreground">All your orders have been completed</p>
              </div>
            ) : (
              pendingOrders.map((order) => <OrderCard key={order.id} order={order} showTracking={true} />)
            )}
          </TabsContent>

          {/* Completed Orders */}
          <TabsContent value="completed" className="space-y-4">
            {completedOrders.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No completed orders</h3>
                <p className="text-muted-foreground">Your completed orders will appear here</p>
              </div>
            ) : (
              completedOrders.map((order) => <OrderCard key={order.id} order={order} showTracking={false} />)
            )}
          </TabsContent>
        </Tabs>
      </div>
      <MobileBottomNav />
    </div>
  )
}
