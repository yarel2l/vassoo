'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useStoreDashboard } from '@/contexts/store-dashboard-context'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
    Search,
    Plus,
    Minus,
    MoreHorizontal,
    Eye,
    Package,
    Truck,
    CheckCircle,
    XCircle,
    AlertCircle,
    User,
    Loader2,
    RefreshCw,
    ShoppingCart,
    Trash2,
    LayoutGrid,
    List,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { OrdersKanban } from '@/components/dashboard/orders-kanban'
import { OrdersMetricsBar, calculateOrderMetrics } from '@/components/dashboard/orders-metrics-bar'

interface OrderItem {
    id: string
    productName: string
    productImage?: string
    quantity: number
    unitPrice: number
    total: number
}

interface Order {
    id: string
    orderNumber: string
    customer: {
        id: string
        name: string
        email: string
        phone?: string
    }
    items: OrderItem[]
    total: number
    status: string
    paymentStatus: string
    fulfillmentType: 'delivery' | 'pickup'
    deliveryAddress?: {
        name: string
        street: string
        city: string
        state: string
        zipCode: string
        phone?: string
        notes?: string
    }
    createdAt: string
    notes?: string
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: AlertCircle },
    confirmed: { label: 'Confirmed', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: CheckCircle },
    processing: { label: 'Processing', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Package },
    ready_for_pickup: { label: 'Ready', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: CheckCircle },
    out_for_delivery: { label: 'Out for Delivery', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30', icon: Truck },
    delivered: { label: 'Delivered', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
    completed: { label: 'Completed', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
    cancelled: { label: 'Cancelled', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
    refunded: { label: 'Refunded', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: XCircle },
}

export default function OrdersPage() {
    const { isLoading: authLoading } = useAuth()
    const { currentStore, isLoading: storeLoading } = useStoreDashboard()
    const [orders, setOrders] = useState<Order[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedTab, setSelectedTab] = useState('all')
    const [isUpdating, setIsUpdating] = useState(false)
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban')
    const router = useRouter()

    // New order modal state
    const [isNewOrderOpen, setIsNewOrderOpen] = useState(false)
    const [orderStep, setOrderStep] = useState<'products' | 'customer' | 'confirm'>('products')
    const [inventoryProducts, setInventoryProducts] = useState<any[]>([])
    const [cart, setCart] = useState<{ inventoryId: string, productId: string, name: string, price: number, quantity: number, maxQty: number }[]>([])
    const [productSearch, setProductSearch] = useState('')
    const [customerInfo, setCustomerInfo] = useState({
        name: '',
        email: '',
        phone: '',
    })
    const [orderNotes, setOrderNotes] = useState('')
    const [isCreatingOrder, setIsCreatingOrder] = useState(false)
    const [actualStoreId, setActualStoreId] = useState<string | null>(null)

    // Enhanced order options
    const [fulfillmentType, setFulfillmentType] = useState<'pickup' | 'delivery'>('pickup')
    const [deliveryAddress, setDeliveryAddress] = useState({
        street: '',
        city: '',
        state: '',
        zipCode: '',
    })
    const [pickupPerson, setPickupPerson] = useState('')
    const [couponCode, setCouponCode] = useState('')
    const [couponDiscount, setCouponDiscount] = useState(0)
    const [appliedCoupon, setAppliedCoupon] = useState<{ id: string, code: string, discount_type: string, discount_value: number } | null>(null)

    // Get the current store tenant ID from context
    const storeId = currentStore?.id

    const fetchOrders = useCallback(async () => {
        if (!storeId) {
            setIsLoading(false)
            return
        }

        try {
            setIsLoading(true)
            const supabase = createClient()

            // First get the store ID from the tenant
            const { data: stores } = await supabase
                .from('stores')
                .select('id')
                .eq('tenant_id', storeId)
                .limit(1)

            if (!stores || stores.length === 0) {
                setOrders([])
                return
            }

            const currentStoreId = stores[0].id
            setActualStoreId(currentStoreId)

            // Fetch orders for this store - using direct fields from order_items
            const { data: ordersData, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    customer:profiles!customer_id(id, full_name, email, phone),
                    items:order_items(
                        id,
                        quantity,
                        unit_price,
                        subtotal,
                        product_name,
                        product_image,
                        product_sku
                    )
                `)
                .eq('store_id', currentStoreId)
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Error fetching orders:', error)
                toast({
                    title: 'Error',
                    description: 'Failed to load orders: ' + error.message,
                    variant: 'destructive',
                })
                return
            }

            // Transform orders data
            const transformedOrders: Order[] = (ordersData || []).map((order: any) => ({
                id: order.id,
                orderNumber: order.order_number,
                customer: {
                    id: order.customer?.id || order.customer_id,
                    name: order.customer?.full_name || order.customer_email || 'Customer',
                    email: order.customer?.email || order.customer_email,
                    phone: order.customer?.phone,
                },
                items: (order.items || []).map((item: any) => ({
                    id: item.id,
                    productName: item.product_name || 'Product',
                    productImage: item.product_image,
                    quantity: item.quantity,
                    unitPrice: Number(item.unit_price) || 0,
                    total: Number(item.subtotal) || 0,
                })),
                total: Number(order.total) || 0,
                status: order.status,
                paymentStatus: order.payment_status || 'pending',
                fulfillmentType: order.fulfillment_type,
                deliveryAddress: order.delivery_address,
                createdAt: order.created_at,
                notes: order.delivery_address?.notes,
            }))

            setOrders(transformedOrders)
        } catch (err) {
            console.error('Error in fetchOrders:', err)
            toast({
                title: 'Error',
                description: 'An unexpected error occurred',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }, [storeId])


    useEffect(() => {
        fetchOrders()
    }, [fetchOrders])

    // Subscribe to realtime updates
    useEffect(() => {
        if (!storeId) return

        const supabase = createClient()

        const subscription = supabase
            .channel('store-orders')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                },
                () => {
                    fetchOrders()
                }
            )
            .subscribe()

        return () => {
            subscription.unsubscribe()
        }
    }, [storeId, fetchOrders])

    const tabs = [
        { value: 'all', label: 'All', count: orders.length },
        { value: 'pending', label: 'Pending', count: orders.filter(o => o.status === 'pending').length },
        { value: 'confirmed', label: 'Confirmed', count: orders.filter(o => o.status === 'confirmed').length },
        { value: 'processing', label: 'Processing', count: orders.filter(o => o.status === 'processing').length },
        { value: 'ready_for_pickup', label: 'Ready', count: orders.filter(o => o.status === 'ready_for_pickup').length },
        { value: 'delivered', label: 'Delivered', count: orders.filter(o => ['delivered', 'completed'].includes(o.status)).length },
    ]

    const filteredOrders = orders.filter(order => {
        const matchesSearch = order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.customer.name.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesTab = selectedTab === 'all' || order.status === selectedTab ||
            (selectedTab === 'delivered' && ['delivered', 'completed'].includes(order.status))
        return matchesSearch && matchesTab
    })

    // Cart management functions
    const openNewOrderModal = async () => {
        setIsNewOrderOpen(true)
        setOrderStep('products')
        setCart([])
        setCustomerInfo({ name: '', email: '', phone: '' })
        setOrderNotes('')
        setProductSearch('')

        // Fetch inventory products
        if (!actualStoreId) return
        const supabase = createClient()

        const { data: inventory } = await supabase
            .from('store_inventories')
            .select(`
                id,
                price,
                quantity,
                product:master_products!product_id(id, name, sku, thumbnail_url)
            `)
            .eq('store_id', actualStoreId)
            .gt('quantity', 0)

        setInventoryProducts(inventory || [])
    }

    const addToCart = (inventoryId: string, productId: string, name: string, price: number, maxQty: number) => {
        setCart(prev => {
            const existing = prev.find(item => item.productId === productId)
            if (existing) {
                return prev.map(item =>
                    item.productId === productId
                        ? { ...item, quantity: Math.min(item.quantity + 1, item.maxQty) }
                        : item
                )
            }
            return [...prev, { inventoryId, productId, name, price, quantity: 1, maxQty }]
        })
    }

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.productId !== productId))
    }

    const updateCartQuantity = (productId: string, quantity: number) => {
        setCart(prev => prev.map(item =>
            item.productId === productId
                ? { ...item, quantity: Math.max(1, Math.min(quantity, item.maxQty)) }
                : item
        ))
    }

    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

    const createOrder = async () => {
        if (!actualStoreId || cart.length === 0 || !customerInfo.name) return

        // Validate delivery address if delivery type
        if (fulfillmentType === 'delivery' && (!deliveryAddress.street || !deliveryAddress.city || !deliveryAddress.state || !deliveryAddress.zipCode)) {
            toast({ title: 'Error', description: 'Please fill in the delivery address', variant: 'destructive' })
            return
        }

        setIsCreatingOrder(true)
        try {
            const supabase = createClient()

            // Generate order number
            const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`

            // Calculate totals
            const subtotal = cartTotal
            const discount = couponDiscount
            const finalTotal = Math.max(0, subtotal - discount)

            // Create order with correct schema columns
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert({
                    store_id: actualStoreId,
                    order_number: orderNumber,
                    status: 'confirmed',
                    fulfillment_type: fulfillmentType,
                    subtotal: subtotal,
                    tax_amount: 0,
                    delivery_fee: 0,
                    discount_amount: discount,
                    total: finalTotal,
                    // Guest info for manual orders
                    guest_name: customerInfo.name,
                    guest_email: customerInfo.email || null,
                    guest_phone: customerInfo.phone || null,
                    // Delivery address if delivery type
                    delivery_address: fulfillmentType === 'delivery' ? deliveryAddress : null,
                    // Payment info
                    payment_method: 'cash',
                    payment_status: 'pending',
                    // Order source
                    order_source: 'phone',
                    customer_notes: orderNotes || null,
                    internal_notes: pickupPerson ? `Pickup person: ${pickupPerson}` : null,
                    // Coupon if applied
                    coupon_id: appliedCoupon?.id || null,
                    coupon_code: appliedCoupon?.code || null,
                    coupon_discount: discount,
                } as any)
                .select()
                .single()

            if (orderError) {
                console.error('Error creating order:', orderError)
                toast({
                    title: 'Error',
                    description: orderError.message || 'Failed to create order',
                    variant: 'destructive',
                })
                return
            }

            // Create order items with inventory_id
            const orderItems = cart.map(item => ({
                order_id: orderData.id,
                inventory_id: item.inventoryId,
                product_id: item.productId,
                product_name: item.name,
                quantity: item.quantity,
                unit_price: item.price,
                subtotal: item.price * item.quantity,
            }))

            await supabase.from('order_items').insert(orderItems as any)

            // Decrement inventory for each cart item
            for (const item of cart) {
                const inventoryItem = inventoryProducts.find(p => p.id === item.inventoryId)
                if (inventoryItem) {
                    const newQuantity = Math.max(0, inventoryItem.quantity - item.quantity)
                    await supabase
                        .from('store_inventories')
                        .update({ quantity: newQuantity })
                        .eq('id', item.inventoryId)
                }
            }

            toast({
                title: 'Order Created',
                description: `Order ${orderNumber} created successfully`,
            })

            // Reset form
            setIsNewOrderOpen(false)
            setCart([])
            setOrderStep('products')
            setCustomerInfo({ name: '', email: '', phone: '' })
            setOrderNotes('')
            setFulfillmentType('pickup')
            setDeliveryAddress({ street: '', city: '', state: '', zipCode: '' })
            setPickupPerson('')
            setCouponCode('')
            setCouponDiscount(0)
            setAppliedCoupon(null)

            fetchOrders()
        } catch (err) {
            console.error('Error in createOrder:', err)
            toast({
                title: 'Error',
                description: 'An unexpected error occurred',
                variant: 'destructive',
            })
        } finally {
            setIsCreatingOrder(false)
        }
    }


    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        })
    }

    const updateOrderStatus = async (orderId: string, newStatus: string) => {
        setIsUpdating(true)
        try {
            const supabase = createClient()

            const { error } = await supabase
                .from('orders')
                .update({
                    status: newStatus as any,
                    updated_at: new Date().toISOString(),
                    ...(newStatus === 'confirmed' ? { confirmed_at: new Date().toISOString() } : {}),
                    ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {}),
                    ...(newStatus === 'cancelled' ? { cancelled_at: new Date().toISOString() } : {}),
                })
                .eq('id', orderId)

            if (error) throw error

            toast({
                title: 'Order updated',
                description: `Order status changed to ${statusConfig[newStatus]?.label || newStatus}`,
            })

            // Refresh orders
            fetchOrders()
        } catch (err) {
            console.error('Error updating order:', err)
            toast({
                title: 'Error',
                description: 'Failed to update order',
                variant: 'destructive',
            })
        } finally {
            setIsUpdating(false)
        }
    }

    if (authLoading || storeLoading || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-500" />
                    <p className="text-gray-400">Loading orders...</p>
                </div>
            </div>
        )
    }

    // No store tenant found
    if (!storeId) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-lg font-medium text-white mb-2">No store found</h3>
                    <p className="text-gray-400">Please select a store from the sidebar</p>
                </div>
            </div>
        )
    }

    // Calculate metrics for the metrics bar
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const metrics = calculateOrderMetrics(orders, todayStart)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Orders</h1>
                    <p className="text-gray-400 mt-1">
                        Manage and fulfill customer orders
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-gray-900 border border-gray-800 rounded-lg p-1">
                        <Button
                            variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                            size="sm"
                            className={viewMode === 'kanban' ? 'bg-orange-600' : 'text-gray-400'}
                            onClick={() => setViewMode('kanban')}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === 'list' ? 'default' : 'ghost'}
                            size="sm"
                            className={viewMode === 'list' ? 'bg-orange-600' : 'text-gray-400'}
                            onClick={() => setViewMode('list')}
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button
                        variant="outline"
                        className="border-gray-700 text-gray-300 hover:bg-gray-800"
                        onClick={() => fetchOrders()}
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button
                        className="bg-orange-600 hover:bg-orange-700"
                        onClick={openNewOrderModal}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New Order
                    </Button>
                </div>
            </div>

            {/* Metrics Bar */}
            <OrdersMetricsBar metrics={metrics} />

            {/* Kanban View */}
            {viewMode === 'kanban' ? (
                <div className="space-y-4">
                    {/* Search for Kanban */}
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search orders..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-gray-900 border-gray-800 text-white"
                        />
                    </div>
                    <OrdersKanban
                        orders={filteredOrders}
                        onStatusChange={updateOrderStatus}
                        isUpdating={isUpdating}
                    />
                </div>
            ) : (
            <>
            {/* Tabs and Search for List View */}
            <div className="space-y-4">
                <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                    <TabsList className="bg-gray-900 border border-gray-800 p-1 flex-wrap">
                        {tabs.map(tab => (
                            <TabsTrigger
                                key={tab.value}
                                value={tab.value}
                                className="data-[state=active]:bg-orange-600 data-[state=active]:text-white text-gray-400"
                            >
                                {tab.label}
                                <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-gray-800">
                                    {tab.count}
                                </span>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>

                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search orders..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-gray-900 border-gray-800 text-white"
                    />
                </div>
            </div>

            {/* Orders Table */}
            <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-0">
                    {filteredOrders.length === 0 ? (
                        <div className="text-center py-12">
                            <Package className="h-12 w-12 mx-auto text-gray-600 mb-4" />
                            <h3 className="text-lg font-medium text-white mb-2">No orders found</h3>
                            <p className="text-gray-400">
                                {searchQuery ? 'Try adjusting your search' : 'Orders will appear here when customers place them'}
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="border-gray-800 hover:bg-transparent">
                                    <TableHead className="text-gray-400">Order</TableHead>
                                    <TableHead className="text-gray-400">Customer</TableHead>
                                    <TableHead className="text-gray-400">Items</TableHead>
                                    <TableHead className="text-gray-400">Total</TableHead>
                                    <TableHead className="text-gray-400">Status</TableHead>
                                    <TableHead className="text-gray-400">Type</TableHead>
                                    <TableHead className="text-gray-400">Date</TableHead>
                                    <TableHead className="text-gray-400 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredOrders.map((order) => {
                                    const StatusIcon = statusConfig[order.status]?.icon || AlertCircle
                                    return (
                                        <TableRow
                                            key={order.id}
                                            className="border-gray-800 hover:bg-gray-800/50 cursor-pointer"
                                            onClick={() => router.push(`/dashboard/store/orders/${order.id}`)}
                                        >
                                            <TableCell className="font-medium text-white">{order.orderNumber}</TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="text-white">{order.customer.name}</p>
                                                    <p className="text-xs text-gray-400">{order.customer.email}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-gray-400">{order.items.length} items</TableCell>
                                            <TableCell className="text-white font-medium">${order.total.toFixed(2)}</TableCell>
                                            <TableCell>
                                                <Badge className={statusConfig[order.status]?.color || 'bg-gray-500/20 text-gray-400'}>
                                                    <StatusIcon className="h-3 w-3 mr-1" />
                                                    {statusConfig[order.status]?.label || order.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="border-gray-700 text-gray-400">
                                                    {order.fulfillmentType === 'delivery' ? (
                                                        <><Truck className="h-3 w-3 mr-1" /> Delivery</>
                                                    ) : (
                                                        <><Package className="h-3 w-3 mr-1" /> Pickup</>
                                                    )}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-gray-400">{formatDate(order.createdAt)}</TableCell>
                                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="bg-gray-900 border-gray-800">
                                                        <Link href={`/dashboard/store/orders/${order.id}`}>
                                                            <DropdownMenuItem className="text-white focus:bg-gray-800">
                                                                <Eye className="mr-2 h-4 w-4" />
                                                                View Details
                                                            </DropdownMenuItem>
                                                        </Link>
                                                        <DropdownMenuSeparator className="bg-gray-800" />
                                                        {order.status === 'pending' && (
                                                            <DropdownMenuItem
                                                                className="text-green-400 focus:bg-gray-800"
                                                                onClick={() => updateOrderStatus(order.id, 'confirmed')}
                                                                disabled={isUpdating}
                                                            >
                                                                <CheckCircle className="mr-2 h-4 w-4" />
                                                                Confirm Order
                                                            </DropdownMenuItem>
                                                        )}
                                                        {order.status === 'confirmed' && (
                                                            <DropdownMenuItem
                                                                className="text-blue-400 focus:bg-gray-800"
                                                                onClick={() => updateOrderStatus(order.id, 'processing')}
                                                                disabled={isUpdating}
                                                            >
                                                                <Package className="mr-2 h-4 w-4" />
                                                                Start Processing
                                                            </DropdownMenuItem>
                                                        )}
                                                        {order.status === 'processing' && (
                                                            <DropdownMenuItem
                                                                className="text-orange-400 focus:bg-gray-800"
                                                                onClick={() => updateOrderStatus(order.id, 'ready_for_pickup')}
                                                                disabled={isUpdating}
                                                            >
                                                                <CheckCircle className="mr-2 h-4 w-4" />
                                                                Mark Ready
                                                            </DropdownMenuItem>
                                                        )}
                                                        {!['delivered', 'completed', 'cancelled'].includes(order.status) && (
                                                            <DropdownMenuItem
                                                                className="text-red-400 focus:bg-gray-800"
                                                                onClick={() => updateOrderStatus(order.id, 'cancelled')}
                                                                disabled={isUpdating}
                                                            >
                                                                <XCircle className="mr-2 h-4 w-4" />
                                                                Cancel Order
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
            </>
            )}

            {/* New Order Modal */}
            <Dialog open={isNewOrderOpen} onOpenChange={setIsNewOrderOpen}>
                <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-4xl max-h-[85vh] overflow-hidden">
                    <DialogHeader>
                        <DialogTitle className="text-xl text-white flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5" />
                            Create New Order
                        </DialogTitle>
                        <DialogDescription className="text-gray-400">
                            {orderStep === 'products' && 'Select products to add to the order'}
                            {orderStep === 'customer' && 'Enter customer information'}
                            {orderStep === 'confirm' && 'Review and confirm the order'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden">
                        {/* Products Step */}
                        {orderStep === 'products' && (
                            <div className="grid grid-cols-2 gap-4 h-[400px]">
                                {/* Product Selection */}
                                <div className="space-y-3 overflow-y-auto pr-2">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            placeholder="Search products..."
                                            value={productSearch}
                                            onChange={(e) => setProductSearch(e.target.value)}
                                            className="pl-9 bg-gray-800 border-gray-700 text-white"
                                        />
                                    </div>
                                    {inventoryProducts.length === 0 ? (
                                        <div className="text-center py-8">
                                            <Package className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                                            <p className="text-gray-400">No products in inventory</p>
                                            <p className="text-sm text-gray-500">Add products from the catalog first</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {inventoryProducts
                                                .filter(item =>
                                                    item.product?.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
                                                    item.product?.sku?.toLowerCase().includes(productSearch.toLowerCase())
                                                )
                                                .map(item => (
                                                    <div
                                                        key={item.id}
                                                        className="p-3 rounded-lg border border-gray-700 bg-gray-800/50 hover:border-gray-600 cursor-pointer"
                                                        onClick={() => addToCart(item.id, item.product?.id, item.product?.name || 'Product', item.price, item.quantity)}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className="font-medium text-white">{item.product?.name}</p>
                                                                <p className="text-sm text-gray-400">Stock: {item.quantity} | ${Number(item.price).toFixed(2)}</p>
                                                            </div>
                                                            <Button size="sm" variant="ghost" className="text-orange-400">
                                                                <Plus className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>

                                {/* Cart */}
                                <div className="border-l border-gray-700 pl-4 flex flex-col">
                                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                                        <ShoppingCart className="h-4 w-4" /> Cart ({cart.length})
                                    </h3>
                                    {cart.length === 0 ? (
                                        <div className="flex-1 flex items-center justify-center">
                                            <p className="text-gray-500">Cart is empty</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex-1 overflow-y-auto space-y-2">
                                                {cart.map(item => (
                                                    <div key={item.productId} className="p-2 rounded bg-gray-800 flex items-center gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-white truncate">{item.name}</p>
                                                            <p className="text-xs text-gray-400">${item.price.toFixed(2)} each</p>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-6 w-6 p-0"
                                                                onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                                                            >
                                                                <Minus className="h-3 w-3" />
                                                            </Button>
                                                            <span className="w-6 text-center text-sm">{item.quantity}</span>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-6 w-6 p-0"
                                                                onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                                                            >
                                                                <Plus className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-6 w-6 p-0 text-red-400"
                                                            onClick={() => removeFromCart(item.productId)}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="pt-3 border-t border-gray-700 mt-3">
                                                <div className="flex justify-between text-lg font-bold">
                                                    <span>Total:</span>
                                                    <span className="text-orange-400">${cartTotal.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Customer Step */}
                        {orderStep === 'customer' && (
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label className="text-gray-300">Customer Name *</Label>
                                    <Input
                                        value={customerInfo.name}
                                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Enter customer name"
                                        className="bg-gray-800 border-gray-700 text-white"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-gray-300">Email</Label>
                                        <Input
                                            type="email"
                                            value={customerInfo.email}
                                            onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                                            placeholder="customer@email.com"
                                            className="bg-gray-800 border-gray-700 text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-gray-300">Phone</Label>
                                        <Input
                                            type="tel"
                                            value={customerInfo.phone}
                                            onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                                            placeholder="(555) 123-4567"
                                            className="bg-gray-800 border-gray-700 text-white"
                                        />
                                    </div>
                                </div>

                                {/* Fulfillment Type */}
                                <div className="space-y-2">
                                    <Label className="text-gray-300">Fulfillment Type *</Label>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant={fulfillmentType === 'pickup' ? 'default' : 'outline'}
                                            className={fulfillmentType === 'pickup'
                                                ? 'flex-1 bg-orange-600 hover:bg-orange-700'
                                                : 'flex-1 border-gray-700 text-gray-300'}
                                            onClick={() => setFulfillmentType('pickup')}
                                        >
                                            <Package className="h-4 w-4 mr-2" />
                                            Pickup
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={fulfillmentType === 'delivery' ? 'default' : 'outline'}
                                            className={fulfillmentType === 'delivery'
                                                ? 'flex-1 bg-orange-600 hover:bg-orange-700'
                                                : 'flex-1 border-gray-700 text-gray-300'}
                                            onClick={() => setFulfillmentType('delivery')}
                                        >
                                            <Truck className="h-4 w-4 mr-2" />
                                            Delivery
                                        </Button>
                                    </div>
                                </div>

                                {/* Delivery Address (only shown for delivery) */}
                                {fulfillmentType === 'delivery' && (
                                    <div className="space-y-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                                        <Label className="text-gray-300 font-semibold">Delivery Address</Label>
                                        <div className="space-y-2">
                                            <Input
                                                value={deliveryAddress.street}
                                                onChange={(e) => setDeliveryAddress(prev => ({ ...prev, street: e.target.value }))}
                                                placeholder="Street address *"
                                                className="bg-gray-800 border-gray-700 text-white"
                                            />
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <Input
                                                value={deliveryAddress.city}
                                                onChange={(e) => setDeliveryAddress(prev => ({ ...prev, city: e.target.value }))}
                                                placeholder="City *"
                                                className="bg-gray-800 border-gray-700 text-white"
                                            />
                                            <Input
                                                value={deliveryAddress.state}
                                                onChange={(e) => setDeliveryAddress(prev => ({ ...prev, state: e.target.value }))}
                                                placeholder="State *"
                                                className="bg-gray-800 border-gray-700 text-white"
                                            />
                                            <Input
                                                value={deliveryAddress.zipCode}
                                                onChange={(e) => setDeliveryAddress(prev => ({ ...prev, zipCode: e.target.value }))}
                                                placeholder="ZIP *"
                                                className="bg-gray-800 border-gray-700 text-white"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Pickup Person (only shown for pickup) */}
                                {fulfillmentType === 'pickup' && (
                                    <div className="space-y-2">
                                        <Label className="text-gray-300">Pickup Person Name</Label>
                                        <Input
                                            value={pickupPerson}
                                            onChange={(e) => setPickupPerson(e.target.value)}
                                            placeholder="Who will pick up the order?"
                                            className="bg-gray-800 border-gray-700 text-white"
                                        />
                                    </div>
                                )}

                                {/* Coupon Code */}
                                <div className="space-y-2">
                                    <Label className="text-gray-300">Coupon Code</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={couponCode}
                                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                            placeholder="Enter coupon code"
                                            className="bg-gray-800 border-gray-700 text-white flex-1"
                                            disabled={!!appliedCoupon}
                                        />
                                        {appliedCoupon ? (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="border-red-500/30 text-red-400"
                                                onClick={() => {
                                                    setAppliedCoupon(null)
                                                    setCouponDiscount(0)
                                                    setCouponCode('')
                                                }}
                                            >
                                                Remove
                                            </Button>
                                        ) : (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="border-gray-700 text-gray-300"
                                                onClick={async () => {
                                                    if (!couponCode.trim()) return
                                                    const supabase = createClient()
                                                    const { data: coupon } = await supabase
                                                        .from('coupons')
                                                        .select('id, code, type, value')
                                                        .eq('code', couponCode.toUpperCase())
                                                        .eq('is_active', true)
                                                        .single()
                                                    if (coupon) {
                                                        setAppliedCoupon({
                                                            id: coupon.id,
                                                            code: coupon.code,
                                                            discount_type: coupon.type,
                                                            discount_value: Number(coupon.value)
                                                        })
                                                        const discount = coupon.type === 'percentage'
                                                            ? cartTotal * (Number(coupon.value) / 100)
                                                            : Number(coupon.value)
                                                        setCouponDiscount(Math.min(discount, cartTotal))
                                                        toast({ title: 'Coupon Applied', description: `Discount: $${discount.toFixed(2)}` })
                                                    } else {
                                                        toast({ title: 'Invalid Coupon', description: 'Coupon not found or expired', variant: 'destructive' })
                                                    }
                                                }}
                                            >
                                                Apply
                                            </Button>
                                        )}
                                    </div>
                                    {appliedCoupon && (
                                        <p className="text-sm text-green-400">
                                            ✓ {appliedCoupon.code} applied - ${couponDiscount.toFixed(2)} off
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-gray-300">Order Notes</Label>
                                    <Input
                                        value={orderNotes}
                                        onChange={(e) => setOrderNotes(e.target.value)}
                                        placeholder="Special instructions..."
                                        className="bg-gray-800 border-gray-700 text-white"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Confirm Step */}
                        {orderStep === 'confirm' && (
                            <div className="space-y-4 py-4">
                                {/* Customer Info */}
                                <div className="bg-gray-800 rounded-lg p-4">
                                    <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                                        <User className="h-4 w-4 text-orange-500" />
                                        Customer
                                    </h4>
                                    <p className="text-gray-300">{customerInfo.name}</p>
                                    {customerInfo.email && <p className="text-sm text-gray-400">{customerInfo.email}</p>}
                                    {customerInfo.phone && <p className="text-sm text-gray-400">{customerInfo.phone}</p>}
                                </div>

                                {/* Fulfillment Info */}
                                <div className="bg-gray-800 rounded-lg p-4">
                                    <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                                        {fulfillmentType === 'delivery' ? (
                                            <><Truck className="h-4 w-4 text-orange-500" /> Delivery</>
                                        ) : (
                                            <><Package className="h-4 w-4 text-orange-500" /> Pickup</>
                                        )}
                                    </h4>
                                    {fulfillmentType === 'delivery' && deliveryAddress.street && (
                                        <div className="text-gray-300 text-sm">
                                            <p>{deliveryAddress.street}</p>
                                            <p>{deliveryAddress.city}, {deliveryAddress.state} {deliveryAddress.zipCode}</p>
                                        </div>
                                    )}
                                    {fulfillmentType === 'pickup' && pickupPerson && (
                                        <p className="text-gray-300 text-sm">Pickup by: {pickupPerson}</p>
                                    )}
                                </div>

                                {/* Order Items */}
                                <div className="bg-gray-800 rounded-lg p-4">
                                    <h4 className="font-semibold text-white mb-2">Order Items ({cart.length})</h4>
                                    {cart.map(item => (
                                        <div key={item.productId} className="flex justify-between py-1">
                                            <span className="text-gray-300">{item.name} x{item.quantity}</span>
                                            <span className="text-white">${(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                    ))}

                                    {/* Subtotal, Discounts, Total */}
                                    <div className="border-t border-gray-700 mt-2 pt-2 space-y-1">
                                        <div className="flex justify-between text-gray-400">
                                            <span>Subtotal</span>
                                            <span>${cartTotal.toFixed(2)}</span>
                                        </div>
                                        {couponDiscount > 0 && (
                                            <div className="flex justify-between text-green-400">
                                                <span>Coupon ({appliedCoupon?.code})</span>
                                                <span>-${couponDiscount.toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between font-bold text-lg pt-1">
                                            <span className="text-white">Total</span>
                                            <span className="text-orange-400">${Math.max(0, cartTotal - couponDiscount).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Notes */}
                                {orderNotes && (
                                    <div className="bg-gray-800 rounded-lg p-4">
                                        <h4 className="font-semibold text-white mb-2">Notes</h4>
                                        <p className="text-gray-300 text-sm">{orderNotes}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="border-t border-gray-700 pt-4">
                        <div className="flex justify-between w-full">
                            <div>
                                {orderStep !== 'products' && (
                                    <Button
                                        variant="outline"
                                        className="border-gray-700 text-gray-300"
                                        onClick={() => setOrderStep(orderStep === 'confirm' ? 'customer' : 'products')}
                                    >
                                        Back
                                    </Button>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    className="border-gray-700 text-gray-300"
                                    onClick={() => setIsNewOrderOpen(false)}
                                >
                                    Cancel
                                </Button>
                                {orderStep === 'products' && (
                                    <Button
                                        className="bg-orange-600 hover:bg-orange-700"
                                        disabled={cart.length === 0}
                                        onClick={() => setOrderStep('customer')}
                                    >
                                        Continue
                                    </Button>
                                )}
                                {orderStep === 'customer' && (
                                    <Button
                                        className="bg-orange-600 hover:bg-orange-700"
                                        disabled={!customerInfo.name}
                                        onClick={() => setOrderStep('confirm')}
                                    >
                                        Review Order
                                    </Button>
                                )}
                                {orderStep === 'confirm' && (
                                    <Button
                                        className="bg-orange-600 hover:bg-orange-700"
                                        onClick={createOrder}
                                        disabled={isCreatingOrder}
                                    >
                                        {isCreatingOrder ? (
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        ) : (
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                        )}
                                        Create Order
                                    </Button>
                                )}
                            </div>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
