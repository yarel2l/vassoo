"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

export interface Order {
  id: string
  orderNumber: string
  status: "pending" | "confirmed" | "preparing" | "out_for_delivery" | "delivered" | "cancelled"
  items: Array<{
    id: string
    productName: string
    productImage: string
    storeName: string
    quantity: number
    price: number
    taxes: number
    shippingCost: number
  }>
  subtotal: number
  taxes: number
  shipping: number
  total: number
  shippingAddress: {
    name: string
    email: string
    phone: string
    street: string
    city: string
    state: string
    zipCode: string
    country: string
    deliveryNotes?: string
  }
  paymentMethod: {
    type: string
    last4?: string
  }
  createdAt: Date
  updatedAt: Date
  estimatedDelivery: Date
  deliveryPerson?: {
    id: string
    name: string
    photo: string
    phone: string
    rating: number
    vehicle: string
    licensePlate: string
  }
  trackingUpdates: Array<{
    status: string
    message: string
    timestamp: Date
  }>
}

interface OrdersContextType {
  orders: Order[]
  createOrder: (items: any[], shippingAddress: any, paymentMethod: any) => Promise<Order>
  getOrder: (id: string) => Order | undefined
  updateOrderStatus: (id: string, status: Order["status"]) => void
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined)

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([])

  // Load orders from localStorage on mount
  useEffect(() => {
    const savedOrders = localStorage.getItem("liquorhub-orders")
    if (savedOrders) {
      try {
        const parsedOrders = JSON.parse(savedOrders).map((order: any) => ({
          ...order,
          createdAt: new Date(order.createdAt),
          updatedAt: new Date(order.updatedAt),
          estimatedDelivery: new Date(order.estimatedDelivery),
          trackingUpdates: order.trackingUpdates.map((update: any) => ({
            ...update,
            timestamp: new Date(update.timestamp),
          })),
        }))
        setOrders(parsedOrders)
      } catch (error) {
        console.error("Error loading orders:", error)
      }
    }
  }, [])

  // Save orders to localStorage whenever orders change
  useEffect(() => {
    localStorage.setItem("liquorhub-orders", JSON.stringify(orders))
  }, [orders])

  const createOrder = async (items: any[], shippingAddress: any, paymentMethod: any): Promise<Order> => {
    const orderNumber = `LH${Date.now().toString().slice(-6)}`
    const now = new Date()
    const estimatedDelivery = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour from now

    // Mock delivery person assignment
    const deliveryPersons = [
      {
        id: "dp1",
        name: "Carlos Rodriguez",
        photo: "/placeholder.svg?height=60&width=60&text=CR",
        phone: "+1 (555) 123-4567",
        rating: 4.8,
        vehicle: "Honda Civic",
        licensePlate: "ABC-123",
      },
      {
        id: "dp2",
        name: "Maria Garcia",
        photo: "/placeholder.svg?height=60&width=60&text=MG",
        phone: "+1 (555) 234-5678",
        rating: 4.9,
        vehicle: "Toyota Prius",
        licensePlate: "XYZ-789",
      },
      {
        id: "dp3",
        name: "James Wilson",
        photo: "/placeholder.svg?height=60&width=60&text=JW",
        phone: "+1 (555) 345-6789",
        rating: 4.7,
        vehicle: "Ford Focus",
        licensePlate: "DEF-456",
      },
    ]

    const randomDeliveryPerson = deliveryPersons[Math.floor(Math.random() * deliveryPersons.length)]

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const taxes = items.reduce((sum, item) => sum + item.taxes * item.quantity, 0)
    const shipping = items.reduce((sum, item) => sum + item.shippingCost * item.quantity, 0)

    const newOrder: Order = {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      orderNumber,
      status: "pending",
      items: items.map((item) => ({
        id: item.id,
        productName: item.productName,
        productImage: item.productImage,
        storeName: item.storeName,
        quantity: item.quantity,
        price: item.price,
        taxes: item.taxes,
        shippingCost: item.shippingCost,
      })),
      subtotal,
      taxes,
      shipping,
      total: subtotal + taxes + shipping,
      shippingAddress,
      paymentMethod,
      createdAt: now,
      updatedAt: now,
      estimatedDelivery,
      deliveryPerson: randomDeliveryPerson,
      trackingUpdates: [
        {
          status: "Order Placed",
          message: "Your order has been successfully placed and is being processed.",
          timestamp: now,
        },
      ],
    }

    setOrders((prev) => [newOrder, ...prev])

    // Simulate order status updates
    setTimeout(() => {
      updateOrderStatus(newOrder.id, "confirmed")
    }, 2000)

    setTimeout(() => {
      updateOrderStatus(newOrder.id, "preparing")
    }, 5000)

    return newOrder
  }

  const getOrder = (id: string): Order | undefined => {
    return orders.find((order) => order.id === id)
  }

  const updateOrderStatus = (id: string, status: Order["status"]) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id === id) {
          const statusMessages = {
            pending: "Your order is being processed.",
            confirmed: "Your order has been confirmed and is being prepared.",
            preparing: "Your order is being prepared by the store.",
            out_for_delivery: "Your order is out for delivery.",
            delivered: "Your order has been delivered successfully.",
            cancelled: "Your order has been cancelled.",
          }

          const newUpdate = {
            status: status.charAt(0).toUpperCase() + status.slice(1).replace("_", " "),
            message: statusMessages[status],
            timestamp: new Date(),
          }

          return {
            ...order,
            status,
            updatedAt: new Date(),
            trackingUpdates: [newUpdate, ...order.trackingUpdates],
          }
        }
        return order
      }),
    )
  }

  return (
    <OrdersContext.Provider
      value={{
        orders,
        createOrder,
        getOrder,
        updateOrderStatus,
      }}
    >
      {children}
    </OrdersContext.Provider>
  )
}

export function useOrders() {
  const context = useContext(OrdersContext)
  if (context === undefined) {
    throw new Error("useOrders must be used within an OrdersProvider")
  }
  return context
}
