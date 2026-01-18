'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useStoreDashboard } from '@/contexts/store-dashboard-context'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    ArrowLeft,
    Package,
    User,
    Mail,
    Phone,
    MapPin,
    CreditCard,
    Truck,
    Clock,
    CheckCircle,
    XCircle,
    Loader2,
    Printer,
    RefreshCw,
    DollarSign,
    Calendar,
    ShoppingBag,
    AlertCircle,
    TrendingUp,
    Percent,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

interface OrderItem {
    id: string
    product_id: string
    product_name: string
    quantity: number
    unit_price: number
    total_price: number
}

interface Delivery {
    id: string
    status: string
    delivery_company: {
        id: string
        name: string
        logo_url?: string
    }
    driver?: {
        id: string
        user: {
            full_name: string
            phone?: string
        }
        vehicle_type?: string
        vehicle_color?: string
        vehicle_plate?: string
    }
    pickup_address: any
    dropoff_address: any
    distance_miles?: number
    delivery_fee: number
    estimated_pickup_time?: string
    estimated_delivery_time?: string
    actual_pickup_time?: string
    actual_delivery_time?: string
    created_at: string
}

interface Order {
    id: string
    order_number: string
    status: string
    fulfillment_type: string
    created_at: string
    confirmed_at?: string
    ready_at?: string
    completed_at?: string
    cancelled_at?: string
    cancellation_reason?: string
    // Customer
    customer_id?: string
    customer?: {
        id: string
        full_name: string
        email: string
        phone?: string
    }
    guest_name?: string
    guest_email?: string
    guest_phone?: string
    // Amounts
    subtotal: number
    tax_amount: number
    delivery_fee: number
    discount_amount: number
    tip_amount: number
    platform_fee: number // Platform commission charged to store
    total: number
    // Payment
    payment_method?: string
    payment_status?: string
    order_source?: string
    // Notes
    customer_notes?: string
    internal_notes?: string
    // Items and delivery
    order_items: OrderItem[]
    delivery?: Delivery
}

interface DeliveryCompany {
    id: string
    name: string
    logo_url?: string
    settings: {
        base_delivery_fee: number
    }
}

export default function OrderDetailPage() {
    const { isLoading: authLoading } = useAuth()
    const { currentStore, isLoading: storeLoading } = useStoreDashboard()
    const params = useParams()
    const orderId = params.id as string

    const [order, setOrder] = useState<Order | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [storeId, setStoreId] = useState<string | null>(null)

    // Request delivery modal state
    const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false)
    const [deliveryCompanies, setDeliveryCompanies] = useState<DeliveryCompany[]>([])
    const [selectedCompanyId, setSelectedCompanyId] = useState('')
    const [deliveryAddress, setDeliveryAddress] = useState({
        street: '',
        city: '',
        state: '',
        zipCode: '',
        notes: '',
    })
    const [isRequestingDelivery, setIsRequestingDelivery] = useState(false)

    const tenantId = currentStore?.id

    // Fetch order details
    const fetchOrder = useCallback(async () => {
        if (!tenantId || !orderId) {
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        try {
            const supabase = createClient()

            // Get store ID first
            const { data: stores } = await supabase
                .from('stores')
                .select('id')
                .eq('tenant_id', tenantId)
                .limit(1)

            if (!stores || stores.length === 0) return

            const currentStoreId = stores[0].id
            setStoreId(currentStoreId)

            // Fetch order with all related data
            const { data: orderData, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    customer:profiles!customer_id(id, full_name, email, phone),
                    order_items(*),
                    delivery:deliveries(
                        *,
                        delivery_company:delivery_companies(id, name, logo_url),
                        driver:delivery_drivers(
                            id,
                            vehicle_type,
                            vehicle_color,
                            vehicle_plate,
                            user:profiles!user_id(full_name, phone)
                        )
                    )
                `)
                .eq('id', orderId)
                .eq('store_id', currentStoreId)
                .single()

            if (error) {
                console.error('Error fetching order:', error)
                toast({ title: 'Error', description: 'Failed to load order', variant: 'destructive' })
                return
            }

            // Transform delivery array to single object
            const transformedOrder = {
                ...orderData,
                delivery: Array.isArray(orderData.delivery) && orderData.delivery.length > 0
                    ? orderData.delivery[0]
                    : undefined
            }

            setOrder(transformedOrder as unknown as Order)
        } catch (err) {
            console.error('Error:', err)
        } finally {
            setIsLoading(false)
        }
    }, [tenantId, orderId])

    // Fetch delivery companies
    const fetchDeliveryCompanies = useCallback(async () => {
        if (!storeId) return

        try {
            const supabase = createClient()

            // Get delivery companies from store preferences or all active
            const { data } = await supabase
                .from('delivery_companies')
                .select('id, name, logo_url, settings')
                .eq('is_active', true)
                .limit(10)

            setDeliveryCompanies((data || []) as unknown as DeliveryCompany[])
        } catch (err) {
            console.error('Error fetching delivery companies:', err)
        }
    }, [storeId])

    useEffect(() => {
        fetchOrder()
    }, [fetchOrder])

    useEffect(() => {
        if (storeId) {
            fetchDeliveryCompanies()
        }
    }, [storeId, fetchDeliveryCompanies])

    // Request delivery
    const requestDelivery = async () => {
        if (!order || !storeId || !selectedCompanyId) {
            toast({ title: 'Error', description: 'Please select a delivery company', variant: 'destructive' })
            return
        }

        if (!deliveryAddress.street || !deliveryAddress.city || !deliveryAddress.state || !deliveryAddress.zipCode) {
            toast({ title: 'Error', description: 'Please fill in the delivery address', variant: 'destructive' })
            return
        }

        setIsRequestingDelivery(true)
        try {
            const supabase = createClient()

            // Get selected company for fee calculation
            const company = deliveryCompanies.find(c => c.id === selectedCompanyId)
            const deliveryFee = company?.settings?.base_delivery_fee || 5.99

            // Create delivery record
            const { error: deliveryError } = await supabase
                .from('deliveries')
                .insert({
                    order_id: order.id,
                    delivery_company_id: selectedCompanyId,
                    status: 'pending',
                    dropoff_address: deliveryAddress,
                    delivery_fee: deliveryFee,
                } as any)

            if (deliveryError) {
                console.error('Error creating delivery:', deliveryError)
                toast({ title: 'Error', description: deliveryError.message || 'Failed to request delivery', variant: 'destructive' })
                return
            }

            // Update order fulfillment_type if it was pickup
            if (order.fulfillment_type === 'pickup') {
                await supabase
                    .from('orders')
                    .update({
                        fulfillment_type: 'delivery',
                        delivery_fee: deliveryFee,
                        total: Number(order.total) + deliveryFee,
                    } as any)
                    .eq('id', order.id)
            }

            toast({ title: 'Success', description: 'Delivery requested successfully' })
            setIsDeliveryModalOpen(false)
            fetchOrder() // Refresh order data
        } catch (err) {
            console.error('Error:', err)
            toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' })
        } finally {
            setIsRequestingDelivery(false)
        }
    }

    // Update order status
    const updateOrderStatus = async (newStatus: string) => {
        if (!order) return

        try {
            const supabase = createClient()

            const updateData: any = { status: newStatus }

            // Set timestamp based on status
            if (newStatus === 'confirmed') updateData.confirmed_at = new Date().toISOString()
            else if (newStatus === 'ready_for_pickup') updateData.ready_at = new Date().toISOString()
            else if (newStatus === 'completed') updateData.completed_at = new Date().toISOString()

            const { error } = await supabase
                .from('orders')
                .update(updateData)
                .eq('id', order.id)

            if (error) {
                toast({ title: 'Error', description: 'Failed to update order', variant: 'destructive' })
                return
            }

            toast({ title: 'Success', description: `Order ${newStatus}` })
            fetchOrder()
        } catch (err) {
            console.error('Error:', err)
        }
    }

    // Format helpers
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        })
    }

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
            confirmed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            processing: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
            ready_for_pickup: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
            completed: 'bg-green-500/20 text-green-400 border-green-500/30',
            cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
        }
        return colors[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }

    const getDeliveryStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            pending: 'bg-yellow-500/20 text-yellow-400',
            assigned: 'bg-blue-500/20 text-blue-400',
            picked_up: 'bg-purple-500/20 text-purple-400',
            in_transit: 'bg-cyan-500/20 text-cyan-400',
            delivered: 'bg-green-500/20 text-green-400',
            cancelled: 'bg-red-500/20 text-red-400',
        }
        return colors[status] || 'bg-gray-500/20 text-gray-400'
    }

    // Loading state
    if (authLoading || storeLoading || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-500" />
                    <p className="text-gray-400">Loading order details...</p>
                </div>
            </div>
        )
    }

    // Order not found
    if (!order) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">Order Not Found</h2>
                <p className="text-gray-400 mb-4">The order you're looking for doesn't exist.</p>
                <Link href="/dashboard/store/orders">
                    <Button variant="outline" className="border-gray-700">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Orders
                    </Button>
                </Link>
            </div>
        )
    }

    // Customer info (registered or guest)
    const customerName = order.customer?.full_name || order.guest_name || 'Walk-in Customer'
    const customerEmail = order.customer?.email || order.guest_email
    const customerPhone = order.customer?.phone || order.guest_phone

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/store/orders">
                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Back
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-white">{order.order_number}</h1>
                            <Badge className={getStatusColor(order.status)}>
                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </Badge>
                            <Badge variant="outline" className="border-gray-600 text-gray-400">
                                {order.fulfillment_type === 'delivery' ? 'Delivery' : 'Pickup'}
                            </Badge>
                        </div>
                        <p className="text-gray-400 mt-1 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {formatDate(order.created_at)}
                            {order.order_source && (
                                <span className="text-gray-500">• via {order.order_source.toUpperCase()}</span>
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="border-gray-700" onClick={fetchOrder}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button variant="outline" className="border-gray-700">
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                    </Button>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Order Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Order Items */}
                    <Card className="bg-gray-900 border-gray-800">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <ShoppingBag className="h-5 w-5 text-orange-500" />
                                Order Items ({order.order_items.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-gray-800 hover:bg-transparent">
                                        <TableHead className="text-gray-400">Product</TableHead>
                                        <TableHead className="text-gray-400 text-center">Qty</TableHead>
                                        <TableHead className="text-gray-400 text-right">Price</TableHead>
                                        <TableHead className="text-gray-400 text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {order.order_items.map(item => (
                                        <TableRow key={item.id} className="border-gray-800">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded bg-gray-800 flex items-center justify-center">
                                                        <Package className="h-5 w-5 text-gray-500" />
                                                    </div>
                                                    <span className="font-medium text-white">{item.product_name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center text-white">{item.quantity}</TableCell>
                                            <TableCell className="text-right text-gray-400">${Number(item.unit_price).toFixed(2)}</TableCell>
                                            <TableCell className="text-right font-medium text-white">${Number(item.total_price).toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Delivery Section */}
                    <Card className="bg-gray-900 border-gray-800">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Truck className="h-5 w-5 text-orange-500" />
                                    Delivery
                                </CardTitle>
                                {!order.delivery && order.status !== 'cancelled' && order.status !== 'completed' && (
                                    <Button
                                        onClick={() => setIsDeliveryModalOpen(true)}
                                        className="bg-orange-600 hover:bg-orange-700"
                                    >
                                        <Truck className="h-4 w-4 mr-2" />
                                        Request Delivery
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {order.delivery ? (
                                <div className="space-y-4">
                                    {/* Delivery Status */}
                                    <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            {order.delivery.delivery_company?.logo_url ? (
                                                <img
                                                    src={order.delivery.delivery_company.logo_url}
                                                    alt=""
                                                    className="h-10 w-10 rounded"
                                                />
                                            ) : (
                                                <div className="h-10 w-10 rounded bg-gray-700 flex items-center justify-center">
                                                    <Truck className="h-5 w-5 text-gray-500" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-medium text-white">{order.delivery.delivery_company?.name}</p>
                                                <Badge className={getDeliveryStatusColor(order.delivery.status)}>
                                                    {order.delivery.status.replace('_', ' ')}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-400">Delivery Fee</p>
                                            <p className="font-semibold text-white">${Number(order.delivery.delivery_fee).toFixed(2)}</p>
                                        </div>
                                    </div>

                                    {/* Driver Info (if assigned) */}
                                    {order.delivery.driver && (
                                        <div className="p-3 bg-gray-800 rounded-lg">
                                            <p className="text-sm text-gray-400 mb-2">Driver</p>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium text-white">{order.delivery.driver.user?.full_name}</p>
                                                    {order.delivery.driver.user?.phone && (
                                                        <p className="text-sm text-gray-400 flex items-center gap-1">
                                                            <Phone className="h-3 w-3" />
                                                            {order.delivery.driver.user.phone}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right text-sm text-gray-400">
                                                    {order.delivery.driver.vehicle_color} {order.delivery.driver.vehicle_type}
                                                    <br />
                                                    {order.delivery.driver.vehicle_plate}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Delivery Address */}
                                    {order.delivery.dropoff_address && (
                                        <div className="p-3 bg-gray-800 rounded-lg">
                                            <p className="text-sm text-gray-400 mb-2">Delivery Address</p>
                                            <p className="text-white flex items-start gap-2">
                                                <MapPin className="h-4 w-4 mt-0.5 text-gray-500" />
                                                {order.delivery.dropoff_address.street}<br />
                                                {order.delivery.dropoff_address.city}, {order.delivery.dropoff_address.state} {order.delivery.dropoff_address.zipCode}
                                            </p>
                                        </div>
                                    )}

                                    {/* Estimated Times */}
                                    {(order.delivery.estimated_pickup_time || order.delivery.estimated_delivery_time) && (
                                        <div className="grid grid-cols-2 gap-3">
                                            {order.delivery.estimated_pickup_time && (
                                                <div className="p-3 bg-gray-800 rounded-lg">
                                                    <p className="text-sm text-gray-400">Est. Pickup</p>
                                                    <p className="text-white">{formatDate(order.delivery.estimated_pickup_time)}</p>
                                                </div>
                                            )}
                                            {order.delivery.estimated_delivery_time && (
                                                <div className="p-3 bg-gray-800 rounded-lg">
                                                    <p className="text-sm text-gray-400">Est. Delivery</p>
                                                    <p className="text-white">{formatDate(order.delivery.estimated_delivery_time)}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Truck className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                                    <p className="text-gray-400">No delivery requested</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {order.fulfillment_type === 'pickup'
                                            ? 'This is a pickup order. Click "Request Delivery" to convert it.'
                                            : 'Click the button above to request a delivery company.'
                                        }
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Summary & Actions */}
                <div className="space-y-6">
                    {/* Customer Info */}
                    <Card className="bg-gray-900 border-gray-800">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <User className="h-5 w-5 text-orange-500" />
                                Customer
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-gray-800 flex items-center justify-center">
                                    <User className="h-5 w-5 text-gray-500" />
                                </div>
                                <div>
                                    <p className="font-medium text-white">{customerName}</p>
                                    <Badge
                                        variant="outline"
                                        className={order.customer_id
                                            ? 'border-green-500/30 text-green-400 text-xs'
                                            : 'border-gray-600 text-gray-400 text-xs'}
                                    >
                                        {order.customer_id ? 'Registered' : 'Guest'}
                                    </Badge>
                                </div>
                            </div>
                            {customerEmail && (
                                <p className="text-gray-400 flex items-center gap-2 text-sm">
                                    <Mail className="h-4 w-4" />
                                    {customerEmail}
                                </p>
                            )}
                            {customerPhone && (
                                <p className="text-gray-400 flex items-center gap-2 text-sm">
                                    <Phone className="h-4 w-4" />
                                    {customerPhone}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Payment Summary */}
                    <Card className="bg-gray-900 border-gray-800">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-orange-500" />
                                Payment
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between text-gray-400">
                                <span>Subtotal</span>
                                <span>${Number(order.subtotal).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-400">
                                <span>Tax</span>
                                <span>${Number(order.tax_amount).toFixed(2)}</span>
                            </div>
                            {Number(order.delivery_fee) > 0 && (
                                <div className="flex justify-between text-gray-400">
                                    <span>Delivery</span>
                                    <span>${Number(order.delivery_fee).toFixed(2)}</span>
                                </div>
                            )}
                            {Number(order.discount_amount) > 0 && (
                                <div className="flex justify-between text-green-400">
                                    <span>Discount</span>
                                    <span>-${Number(order.discount_amount).toFixed(2)}</span>
                                </div>
                            )}
                            {Number(order.tip_amount) > 0 && (
                                <div className="flex justify-between text-gray-400">
                                    <span>Tip</span>
                                    <span>${Number(order.tip_amount).toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-xl font-bold text-white pt-3 border-t border-gray-700">
                                <span>Total</span>
                                <span className="text-orange-400">${Number(order.total).toFixed(2)}</span>
                            </div>
                            {order.payment_method && (
                                <div className="flex items-center justify-between pt-2 text-sm">
                                    <span className="text-gray-400 flex items-center gap-1">
                                        <CreditCard className="h-4 w-4" />
                                        {order.payment_method.charAt(0).toUpperCase() + order.payment_method.slice(1)}
                                    </span>
                                    <Badge className={order.payment_status === 'paid'
                                        ? 'bg-green-500/20 text-green-400'
                                        : 'bg-yellow-500/20 text-yellow-400'}>
                                        {order.payment_status}
                                    </Badge>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Store Earnings */}
                    <Card className="bg-gray-900 border-gray-800">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-green-500" />
                                Your Earnings
                            </CardTitle>
                            <CardDescription className="text-gray-500">
                                After platform fees
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between text-gray-400">
                                <span>Order Total</span>
                                <span>${Number(order.total).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-400">
                                <span className="flex items-center gap-1">
                                    <Percent className="h-3 w-3" />
                                    Platform Fee
                                </span>
                                <span className="text-red-400">
                                    -${Number(order.platform_fee || 0).toFixed(2)}
                                </span>
                            </div>
                            {Number(order.platform_fee) > 0 && (
                                <p className="text-xs text-gray-500">
                                    ({((Number(order.platform_fee) / Number(order.total)) * 100).toFixed(1)}% marketplace commission)
                                </p>
                            )}
                            <div className="flex justify-between text-xl font-bold pt-3 border-t border-gray-700">
                                <span className="text-white">Net Earnings</span>
                                <span className="text-green-400">
                                    ${(Number(order.total) - Number(order.platform_fee || 0)).toFixed(2)}
                                </span>
                            </div>
                            {order.payment_status === 'paid' && (
                                <div className="mt-2 p-2 bg-green-500/10 rounded border border-green-500/20">
                                    <p className="text-xs text-green-400 flex items-center gap-1">
                                        <CheckCircle className="h-3 w-3" />
                                        Funds will be transferred to your Stripe account
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <Card className="bg-gray-900 border-gray-800">
                        <CardHeader>
                            <CardTitle className="text-white">Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {order.status === 'pending' && (
                                <Button
                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                    onClick={() => updateOrderStatus('confirmed')}
                                >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Confirm Order
                                </Button>
                            )}
                            {order.status === 'confirmed' && (
                                <Button
                                    className="w-full bg-purple-600 hover:bg-purple-700"
                                    onClick={() => updateOrderStatus('processing')}
                                >
                                    <Clock className="h-4 w-4 mr-2" />
                                    Start Preparing
                                </Button>
                            )}
                            {order.status === 'processing' && (
                                <Button
                                    className="w-full bg-cyan-600 hover:bg-cyan-700"
                                    onClick={() => updateOrderStatus('ready_for_pickup')}
                                >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Mark as Ready
                                </Button>
                            )}
                            {order.status === 'ready_for_pickup' && order.fulfillment_type === 'pickup' && (
                                <Button
                                    className="w-full bg-green-600 hover:bg-green-700"
                                    onClick={() => updateOrderStatus('completed')}
                                >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Complete Order
                                </Button>
                            )}
                            {!['completed', 'cancelled'].includes(order.status) && (
                                <Button
                                    variant="outline"
                                    className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                                    onClick={() => updateOrderStatus('cancelled')}
                                >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Cancel Order
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    {/* Notes */}
                    {(order.customer_notes || order.internal_notes) && (
                        <Card className="bg-gray-900 border-gray-800">
                            <CardHeader>
                                <CardTitle className="text-white">Notes</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {order.customer_notes && (
                                    <div>
                                        <p className="text-sm text-gray-400">Customer Notes</p>
                                        <p className="text-white">{order.customer_notes}</p>
                                    </div>
                                )}
                                {order.internal_notes && (
                                    <div>
                                        <p className="text-sm text-gray-400">Internal Notes</p>
                                        <p className="text-white">{order.internal_notes}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Request Delivery Modal */}
            <Dialog open={isDeliveryModalOpen} onOpenChange={setIsDeliveryModalOpen}>
                <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <Truck className="h-5 w-5 text-orange-500" />
                            Request Delivery
                        </DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Select a delivery company and enter the delivery address
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Delivery Company */}
                        <div>
                            <Label className="text-gray-300">Delivery Company</Label>
                            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                                    <SelectValue placeholder="Select a company" />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700">
                                    {deliveryCompanies.map(company => (
                                        <SelectItem key={company.id} value={company.id} className="text-white">
                                            {company.name} - ${company.settings?.base_delivery_fee?.toFixed(2) || '5.99'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Address */}
                        <div>
                            <Label className="text-gray-300">Street Address</Label>
                            <Input
                                value={deliveryAddress.street}
                                onChange={(e) => setDeliveryAddress(prev => ({ ...prev, street: e.target.value }))}
                                placeholder="123 Main St"
                                className="bg-gray-800 border-gray-700 text-white"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-gray-300">City</Label>
                                <Input
                                    value={deliveryAddress.city}
                                    onChange={(e) => setDeliveryAddress(prev => ({ ...prev, city: e.target.value }))}
                                    placeholder="City"
                                    className="bg-gray-800 border-gray-700 text-white"
                                />
                            </div>
                            <div>
                                <Label className="text-gray-300">State</Label>
                                <Input
                                    value={deliveryAddress.state}
                                    onChange={(e) => setDeliveryAddress(prev => ({ ...prev, state: e.target.value }))}
                                    placeholder="CA"
                                    className="bg-gray-800 border-gray-700 text-white"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-gray-300">ZIP Code</Label>
                                <Input
                                    value={deliveryAddress.zipCode}
                                    onChange={(e) => setDeliveryAddress(prev => ({ ...prev, zipCode: e.target.value }))}
                                    placeholder="90210"
                                    className="bg-gray-800 border-gray-700 text-white"
                                />
                            </div>
                            <div>
                                <Label className="text-gray-300">Notes (optional)</Label>
                                <Input
                                    value={deliveryAddress.notes}
                                    onChange={(e) => setDeliveryAddress(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Apt 4B"
                                    className="bg-gray-800 border-gray-700 text-white"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            className="border-gray-700"
                            onClick={() => setIsDeliveryModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="bg-orange-600 hover:bg-orange-700"
                            onClick={requestDelivery}
                            disabled={isRequestingDelivery || !selectedCompanyId}
                        >
                            {isRequestingDelivery ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Truck className="h-4 w-4 mr-2" />
                            )}
                            Request Delivery
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
