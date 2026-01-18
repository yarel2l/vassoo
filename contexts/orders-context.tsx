"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { createClient } from "@/lib/supabase/client"

export interface OrderItem {
  id: string
  productId: string
  productName: string
  productImage: string
  storeId: string
  storeName: string
  quantity: number
  unitPrice: number
  subtotal: number
  taxAmount: number
  total: number
}

export interface Order {
  id: string
  orderNumber: string
  status: "pending" | "confirmed" | "processing" | "ready_for_pickup" | "out_for_delivery" | "delivered" | "completed" | "cancelled" | "refunded"
  storeId: string
  storeName: string
  items: OrderItem[]
  subtotal: number
  taxAmount: number
  deliveryFee: number
  tipAmount: number
  total: number
  fulfillmentType: "delivery" | "pickup"
  deliveryAddress?: {
    name: string
    street: string
    city: string
    state: string
    zipCode: string
    country: string
    phone?: string
    notes?: string
  }
  paymentStatus: string
  paymentMethod: string
  customerEmail?: string
  createdAt: Date
  updatedAt: Date
  estimatedDelivery?: Date
  deliveryPerson?: {
    id: string
    name: string
    phone: string
    photo?: string
  }
  trackingUpdates?: Array<{
    status: string
    message: string
    timestamp: Date
  }>
  delivery?: {
    id: string
    status: string
    driver?: {
      id: string
      name: string
      phone: string
      photo?: string
      vehicleType?: string
      vehiclePlate?: string
    }
  }
}

interface OrdersContextType {
  orders: Order[]
  isLoading: boolean
  error: string | null
  refreshOrders: () => Promise<void>
  getOrder: (id: string) => Order | undefined
  getOrderById: (id: string) => Promise<Order | null>
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined)

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const fetchOrders = useCallback(async () => {
    if (!user) {
      setOrders([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const supabase = createClient()

      // Fetch orders for the current user
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          store:stores(id, name, logo_url),
          items:order_items(
            id,
            quantity,
            unit_price,
            subtotal,
            inventory:store_inventories(
              id,
              product:master_products(id, name, thumbnail_url)
            )
          ),
          deliveries(
            id,
            status,
            driver:delivery_drivers(
                id,
                phone,
                vehicle_type,
                vehicle_plate,
                profile:profiles(full_name, avatar_url, phone)
            )
          )
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })

      if (ordersError) {
        console.error('Error fetching orders:', ordersError)
        setError('Failed to load orders')
        return
      }

      // Transform the data to match our Order interface
      const transformedOrders: Order[] = (ordersData || []).map((order: any) => ({
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        storeId: order.store_id,
        storeName: order.store?.name || 'Unknown Store',
        items: (order.items || []).map((item: any) => ({
          id: item.id,
          productId: item.inventory?.product?.id || item.inventory_id,
          productName: item.inventory?.product?.name || 'Product',
          productImage: item.inventory?.product?.thumbnail_url || '/placeholder.svg',
          storeId: order.store_id,
          storeName: order.store?.name || 'Unknown Store',
          quantity: item.quantity,
          unitPrice: parseFloat(item.unit_price),
          subtotal: parseFloat(item.subtotal),
          taxAmount: 0, // Not stored per item in current schema
          total: parseFloat(item.subtotal),
        })),
        delivery: order.deliveries?.[0] ? {
          id: order.deliveries[0].id,
          status: order.deliveries[0].status,
          driver: order.deliveries[0].driver ? {
            id: order.deliveries[0].driver.id,
            name: order.deliveries[0].driver.profile?.full_name || 'Driver',
            phone: order.deliveries[0].driver.phone || order.deliveries[0].driver.profile?.phone || '',
            photo: order.deliveries[0].driver.profile?.avatar_url,
            vehicleType: order.deliveries[0].driver.vehicle_type,
            vehiclePlate: order.deliveries[0].driver.vehicle_plate,
          } : undefined
        } : undefined,
        subtotal: parseFloat(order.subtotal),
        taxAmount: parseFloat(order.tax_amount),
        deliveryFee: parseFloat(order.delivery_fee || 0),
        tipAmount: parseFloat(order.tip_amount || 0),
        total: parseFloat(order.total),
        fulfillmentType: order.fulfillment_type,
        deliveryAddress: order.delivery_address ? {
          name: order.delivery_address.name,
          street: order.delivery_address.street,
          city: order.delivery_address.city,
          state: order.delivery_address.state,
          zipCode: order.delivery_address.zip_code,
          country: order.delivery_address.country || 'US',
          phone: order.delivery_address.phone,
          notes: order.delivery_address.notes,
        } : undefined,
        paymentStatus: order.payment_status,
        paymentMethod: order.payment_method,
        customerEmail: order.customer_email,
        createdAt: new Date(order.created_at),
        updatedAt: new Date(order.updated_at),
        estimatedDelivery: order.estimated_delivery ? new Date(order.estimated_delivery) : undefined,
        trackingUpdates: order.status_history || [],
      }))

      setOrders(transformedOrders)
    } catch (err) {
      console.error('Error in fetchOrders:', err)
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Fetch orders when user changes
  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return

    const supabase = createClient()

    const subscription = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `customer_id=eq.${user.id}`,
        },
        () => {
          // Refresh orders when any change happens
          fetchOrders()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user, fetchOrders])

  const getOrder = (id: string): Order | undefined => {
    return orders.find((order) => order.id === id)
  }

  const getOrderById = async (id: string): Promise<Order | null> => {
    // First check local cache
    const cachedOrder = orders.find((order) => order.id === id)
    if (cachedOrder) return cachedOrder

    // If not found, fetch from database
    try {
      const supabase = createClient()

      const { data: order, error } = await supabase
        .from('orders')
        .select(`
          *,
          store:stores(id, name, logo_url),
          items:order_items(
            id,
            quantity,
            unit_price,
            subtotal,
            inventory:store_inventories(
              id,
              product:master_products(id, name, thumbnail_url)
            )
          ),
          deliveries(
            id,
            status,
            driver:delivery_drivers(
                id,
                phone,
                vehicle_type,
                vehicle_plate,
                profile:profiles(full_name, avatar_url, phone)
            )
          )
        `)
        .eq('id', id)
        .single()

      if (error || !order) return null

      return {
        id: order.id,
        orderNumber: order.order_number,
        status: (order.status as Order['status']) || 'pending',
        storeId: order.store_id,
        storeName: (order as any).store?.name || 'Unknown Store',
        items: ((order as any).items || []).map((item: any) => ({
          id: item.id,
          productId: item.inventory?.product?.id || item.inventory_id,
          productName: item.inventory?.product?.name || 'Product',
          productImage: item.inventory?.product?.thumbnail_url || '/placeholder.svg',
          storeId: order.store_id,
          storeName: (order as any).store?.name || 'Unknown Store',
          quantity: item.quantity,
          unitPrice: Number(item.unit_price) || 0,
          subtotal: Number(item.subtotal) || 0,
          taxAmount: 0,
          total: Number(item.subtotal) || 0,
        })),
        subtotal: Number(order.subtotal) || 0,
        taxAmount: Number(order.tax_amount) || 0,
        deliveryFee: Number(order.delivery_fee) || 0,
        tipAmount: Number(order.tip_amount) || 0,
        total: Number(order.total) || 0,
        fulfillmentType: order.fulfillment_type as 'delivery' | 'pickup',
        deliveryAddress: order.delivery_address as any,
        paymentStatus: (order as any).payment_status || 'pending',
        paymentMethod: (order as any).payment_method || 'card',
        customerEmail: (order as any).customer_email || '',
        createdAt: order.created_at ? new Date(order.created_at) : new Date(),
        updatedAt: order.updated_at ? new Date(order.updated_at) : new Date(),
        estimatedDelivery: (order as any).estimated_delivery ? new Date((order as any).estimated_delivery) : undefined,
        delivery: (order as any).deliveries?.[0] ? {
          id: (order as any).deliveries[0].id,
          status: (order as any).deliveries[0].status,
          driver: (order as any).deliveries[0].driver ? {
            id: (order as any).deliveries[0].driver.id,
            name: (order as any).deliveries[0].driver.profile?.full_name || 'Driver',
            phone: (order as any).deliveries[0].driver.phone || (order as any).deliveries[0].driver.profile?.phone || '',
            photo: (order as any).deliveries[0].driver.profile?.avatar_url,
            vehicleType: (order as any).deliveries[0].driver.vehicle_type,
            vehiclePlate: (order as any).deliveries[0].driver.vehicle_plate,
          } : undefined
        } : undefined,
      }
    } catch (err) {
      console.error('Error fetching order:', err)
      return null
    }
  }

  return (
    <OrdersContext.Provider
      value={{
        orders,
        isLoading,
        error,
        refreshOrders: fetchOrders,
        getOrder,
        getOrderById,
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
