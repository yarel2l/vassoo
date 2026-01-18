'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useStoreDashboard } from '@/contexts/store-dashboard-context'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Search,
    Users,
    ShoppingBag,
    DollarSign,
    Phone,
    Mail,
    User,
    TrendingUp,
    Loader2,
    RefreshCw,
    Calendar,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

interface Customer {
    id: string
    name: string
    email: string | null
    phone: string | null
    type: 'registered' | 'guest'
    orderCount: number
    totalSpent: number
    lastOrderDate: string | null
    orders: CustomerOrder[]
}

interface CustomerOrder {
    id: string
    orderNumber: string
    date: string | null
    total: number
    status: string | null
    itemCount: number
}

export default function CustomersPage() {
    const { isLoading: authLoading } = useAuth()
    const { currentStore, isLoading: storeLoading } = useStoreDashboard()
    const [customers, setCustomers] = useState<Customer[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [storeId, setStoreId] = useState<string | null>(null)
    const router = useRouter()

    // Get the current store tenant ID from context
    const tenantId = currentStore?.id

    const fetchCustomers = useCallback(async () => {
        if (!tenantId) {
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        try {
            const supabase = createClient()

            // Get store ID
            const { data: stores } = await supabase
                .from('stores')
                .select('id')
                .eq('tenant_id', tenantId)
                .limit(1)

            if (!stores || stores.length === 0) {
                setCustomers([])
                return
            }

            const currentStoreId = stores[0].id
            setStoreId(currentStoreId)

            // Fetch orders with customer info
            const { data: orders, error } = await supabase
                .from('orders')
                .select(`
                    id,
                    order_number,
                    customer_id,
                    guest_name,
                    guest_email,
                    guest_phone,
                    total,
                    status,
                    created_at,
                    customer:profiles!customer_id(id, full_name, email, phone),
                    order_items(id)
                `)
                .eq('store_id', currentStoreId)
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Error fetching orders:', error)
                toast({ title: 'Error', description: 'Failed to load customers', variant: 'destructive' })
                return
            }

            // Process orders to build customer list
            const customerMap = new Map<string, Customer>()

            for (const order of orders || []) {
                const isRegistered = order.customer_id && order.customer
                const customerId = isRegistered && order.customer_id
                    ? order.customer_id
                    : `guest-${order.guest_email || order.guest_phone || order.id}`

                const customerName = isRegistered
                    ? (order.customer as any)?.full_name || 'Unknown'
                    : order.guest_name || 'Walk-in Customer'

                const customerEmail = isRegistered
                    ? (order.customer as any)?.email
                    : order.guest_email

                const customerPhone = isRegistered
                    ? (order.customer as any)?.phone
                    : order.guest_phone

                const orderData: CustomerOrder = {
                    id: order.id,
                    orderNumber: order.order_number,
                    date: order.created_at,
                    total: Number(order.total) || 0,
                    status: order.status,
                    itemCount: (order.order_items as any[])?.length || 0,
                }

                if (customerMap.has(customerId)) {
                    const existing = customerMap.get(customerId)!
                    existing.orderCount++
                    existing.totalSpent += orderData.total
                    existing.orders.push(orderData)
                } else {
                    customerMap.set(customerId, {
                        id: customerId,
                        name: customerName,
                        email: customerEmail || null,
                        phone: customerPhone || null,
                        type: isRegistered ? 'registered' : 'guest',
                        orderCount: 1,
                        totalSpent: orderData.total,
                        lastOrderDate: order.created_at,
                        orders: [orderData],
                    })
                }
            }

            // Convert to array and sort by total spent
            const customerList = Array.from(customerMap.values())
                .sort((a, b) => b.totalSpent - a.totalSpent)

            setCustomers(customerList)
        } catch (err) {
            console.error('Error in fetchCustomers:', err)
        } finally {
            setIsLoading(false)
        }
    }, [tenantId])

    useEffect(() => {
        fetchCustomers()
    }, [fetchCustomers])

    // Filter customers
    const filteredCustomers = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone?.includes(searchQuery)
    )

    // Stats
    const totalCustomers = customers.length
    const registeredCustomers = customers.filter(c => c.type === 'registered').length
    const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0)
    const avgOrderValue = totalRevenue / customers.reduce((sum, c) => sum + c.orderCount, 0) || 0

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })
    }

    if (authLoading || storeLoading || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-500" />
                    <p className="text-gray-400">Loading customers...</p>
                </div>
            </div>
        )
    }

    // No store found
    if (!storeId) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-lg font-medium text-white mb-2">No store found</h3>
                    <p className="text-gray-400">Please select a store from the sidebar</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Users className="h-6 w-6 text-orange-500" />
                        Customers
                    </h1>
                    <p className="text-gray-400 mt-1">
                        Manage your customer base and view purchase history
                    </p>
                </div>
                <Button
                    variant="outline"
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    onClick={fetchCustomers}
                >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400">Total Customers</p>
                                <p className="text-2xl font-bold text-white">{totalCustomers}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <Users className="h-6 w-6 text-blue-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400">Registered</p>
                                <p className="text-2xl font-bold text-white">{registeredCustomers}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                                <User className="h-6 w-6 text-green-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400">Total Revenue</p>
                                <p className="text-2xl font-bold text-white">${totalRevenue.toFixed(2)}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                                <DollarSign className="h-6 w-6 text-orange-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400">Avg Order Value</p>
                                <p className="text-2xl font-bold text-white">${avgOrderValue.toFixed(2)}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                                <TrendingUp className="h-6 w-6 text-purple-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                    placeholder="Search by name, email or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-gray-900 border-gray-700 text-white"
                />
            </div>

            {/* Customers Table */}
            <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-0">
                    {filteredCustomers.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                            <p className="text-gray-400">No customers found</p>
                            <p className="text-sm text-gray-500 mt-1">
                                Customers will appear here after they make purchases
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="border-gray-800 hover:bg-transparent">
                                    <TableHead className="text-gray-400">Customer</TableHead>
                                    <TableHead className="text-gray-400">Contact</TableHead>
                                    <TableHead className="text-gray-400 text-center">Orders</TableHead>
                                    <TableHead className="text-gray-400 text-right">Total Spent</TableHead>
                                    <TableHead className="text-gray-400">Last Order</TableHead>
                                    <TableHead className="text-gray-400 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCustomers.map(customer => (
                                    <TableRow key={customer.id} className="border-gray-800">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-gray-800 flex items-center justify-center">
                                                    <User className="h-5 w-5 text-gray-400" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-white">{customer.name}</p>
                                                    <Badge
                                                        variant="outline"
                                                        className={customer.type === 'registered'
                                                            ? 'border-green-500/30 text-green-400 text-xs'
                                                            : 'border-gray-600 text-gray-400 text-xs'}
                                                    >
                                                        {customer.type === 'registered' ? 'Registered' : 'Guest'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                {customer.email && (
                                                    <div className="flex items-center gap-1 text-sm text-gray-400">
                                                        <Mail className="h-3 w-3" />
                                                        {customer.email}
                                                    </div>
                                                )}
                                                {customer.phone && (
                                                    <div className="flex items-center gap-1 text-sm text-gray-400">
                                                        <Phone className="h-3 w-3" />
                                                        {customer.phone}
                                                    </div>
                                                )}
                                                {!customer.email && !customer.phone && (
                                                    <span className="text-gray-500 text-sm">No contact</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <ShoppingBag className="h-4 w-4 text-gray-500" />
                                                <span className="text-white font-medium">{customer.orderCount}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className="text-orange-400 font-semibold">
                                                ${customer.totalSpent.toFixed(2)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 text-sm text-gray-400">
                                                <Calendar className="h-3 w-3" />
                                                {customer.lastOrderDate ? formatDate(customer.lastOrderDate) : 'N/A'}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-orange-400 hover:text-orange-300"
                                                onClick={() => router.push(`/dashboard/store/customers/${customer.id}`)}
                                            >
                                                View Details
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
