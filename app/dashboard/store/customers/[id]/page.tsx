'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useStoreDashboard } from '@/contexts/store-dashboard-context'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
    ArrowLeft,
    User,
    Mail,
    Phone,
    ShoppingBag,
    DollarSign,
    Calendar,
    TrendingUp,
    Loader2,
    Package,
    Clock,
    BarChart3,
    PieChart as PieChartIcon,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import Link from 'next/link'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    Legend,
} from 'recharts'

interface CustomerOrder {
    id: string
    orderNumber: string
    date: string | null
    total: number
    status: string | null
    itemCount: number
    items: Array<{
        id: string
        productName: string
        category: string
        quantity: number
        unitPrice: number
        total: number
    }>
}

interface CustomerData {
    id: string
    name: string
    email: string | null
    phone: string | null
    type: 'registered' | 'guest'
    createdAt: string | null
    orders: CustomerOrder[]
}

interface CategoryStats {
    name: string
    value: number
    count: number
}

interface MonthlySpending {
    month: string
    amount: number
    orders: number
}

interface DayOfWeekStats {
    day: string
    orders: number
    amount: number
}

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#eab308', '#06b6d4', '#f43f5e']

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    confirmed: 'bg-blue-500/20 text-blue-400',
    processing: 'bg-purple-500/20 text-purple-400',
    ready_for_pickup: 'bg-cyan-500/20 text-cyan-400',
    out_for_delivery: 'bg-orange-500/20 text-orange-400',
    delivered: 'bg-green-500/20 text-green-400',
    completed: 'bg-green-500/20 text-green-400',
    cancelled: 'bg-red-500/20 text-red-400',
}

export default function CustomerDetailPage() {
    const params = useParams()
    const router = useRouter()
    const customerId = params.id as string
    const { currentStore, isLoading: storeLoading } = useStoreDashboard()

    const [customer, setCustomer] = useState<CustomerData | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const tenantId = currentStore?.id

    const fetchCustomerData = useCallback(async () => {
        if (!tenantId || !customerId) {
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
                toast({ title: 'Error', description: 'Store not found', variant: 'destructive' })
                router.push('/dashboard/store/customers')
                return
            }

            const storeId = stores[0].id

            // Determine if this is a registered customer or guest
            const isGuest = customerId.startsWith('guest-')

            let ordersQuery = supabase
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
                    customer:profiles!customer_id(id, full_name, email, phone, created_at),
                    order_items(
                        id,
                        product_name,
                        quantity,
                        unit_price,
                        subtotal,
                        product:master_products!product_id(category)
                    )
                `)
                .eq('store_id', storeId)
                .order('created_at', { ascending: false })

            if (isGuest) {
                // For guests, we need to match by email, phone, or order id
                const guestIdentifier = customerId.replace('guest-', '')
                ordersQuery = ordersQuery.or(`guest_email.eq.${guestIdentifier},guest_phone.eq.${guestIdentifier},id.eq.${guestIdentifier}`)
            } else {
                ordersQuery = ordersQuery.eq('customer_id', customerId)
            }

            const { data: orders, error } = await ordersQuery

            if (error) {
                console.error('Error fetching customer orders:', error)
                toast({ title: 'Error', description: 'Failed to load customer data', variant: 'destructive' })
                return
            }

            if (!orders || orders.length === 0) {
                toast({ title: 'Not Found', description: 'Customer not found', variant: 'destructive' })
                router.push('/dashboard/store/customers')
                return
            }

            // Build customer data from orders
            const firstOrder = orders[0]
            const isRegistered = firstOrder.customer_id && firstOrder.customer

            const customerData: CustomerData = {
                id: customerId,
                name: isRegistered
                    ? (firstOrder.customer as any)?.full_name || 'Unknown'
                    : firstOrder.guest_name || 'Walk-in Customer',
                email: isRegistered
                    ? (firstOrder.customer as any)?.email
                    : firstOrder.guest_email,
                phone: isRegistered
                    ? (firstOrder.customer as any)?.phone
                    : firstOrder.guest_phone,
                type: isRegistered ? 'registered' : 'guest',
                createdAt: isRegistered ? (firstOrder.customer as any)?.created_at : null,
                orders: orders.map(order => ({
                    id: order.id,
                    orderNumber: order.order_number,
                    date: order.created_at,
                    total: Number(order.total) || 0,
                    status: order.status,
                    itemCount: (order.order_items as any[])?.length || 0,
                    items: (order.order_items as any[])?.map(item => ({
                        id: item.id,
                        productName: item.product_name || 'Product',
                        category: item.product?.category || 'Other',
                        quantity: item.quantity,
                        unitPrice: Number(item.unit_price) || 0,
                        total: Number(item.subtotal) || 0,
                    })) || [],
                })),
            }

            setCustomer(customerData)
        } catch (err) {
            console.error('Error in fetchCustomerData:', err)
            toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' })
        } finally {
            setIsLoading(false)
        }
    }, [tenantId, customerId, router])

    useEffect(() => {
        fetchCustomerData()
    }, [fetchCustomerData])

    // Calculate analytics
    const analytics = useMemo(() => {
        if (!customer) return null

        const orders = customer.orders
        const totalSpent = orders.reduce((sum, o) => sum + o.total, 0)
        const orderCount = orders.length
        const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0

        // Category breakdown
        const categoryMap = new Map<string, { value: number; count: number }>()
        orders.forEach(order => {
            order.items.forEach(item => {
                const cat = item.category || 'Other'
                const existing = categoryMap.get(cat) || { value: 0, count: 0 }
                categoryMap.set(cat, {
                    value: existing.value + item.total,
                    count: existing.count + item.quantity,
                })
            })
        })
        const categoryStats: CategoryStats[] = Array.from(categoryMap.entries())
            .map(([name, stats]) => ({ name, ...stats }))
            .sort((a, b) => b.value - a.value)

        // Monthly spending (last 12 months)
        const monthlyMap = new Map<string, { amount: number; orders: number }>()
        const now = new Date()
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
            monthlyMap.set(key, { amount: 0, orders: 0 })
        }

        orders.forEach(order => {
            if (!order.date) return
            const d = new Date(order.date)
            const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
            if (monthlyMap.has(key)) {
                const existing = monthlyMap.get(key)!
                monthlyMap.set(key, {
                    amount: existing.amount + order.total,
                    orders: existing.orders + 1,
                })
            }
        })
        const monthlySpending: MonthlySpending[] = Array.from(monthlyMap.entries())
            .map(([month, stats]) => ({ month, ...stats }))

        // Day of week analysis
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        const dayMap = new Map<number, { orders: number; amount: number }>()
        for (let i = 0; i < 7; i++) {
            dayMap.set(i, { orders: 0, amount: 0 })
        }

        orders.forEach(order => {
            if (!order.date) return
            const dayIndex = new Date(order.date).getDay()
            const existing = dayMap.get(dayIndex)!
            dayMap.set(dayIndex, {
                orders: existing.orders + 1,
                amount: existing.amount + order.total,
            })
        })
        const dayOfWeekStats: DayOfWeekStats[] = Array.from(dayMap.entries())
            .map(([dayIndex, stats]) => ({
                day: dayNames[dayIndex].substring(0, 3),
                ...stats,
            }))

        // Find favorite day
        const favoriteDay = dayOfWeekStats.reduce((max, current) =>
            current.orders > max.orders ? current : max
        , dayOfWeekStats[0])

        // Average time between orders
        let avgDaysBetweenOrders = 0
        const ordersWithDates = orders.filter(o => o.date)
        if (ordersWithDates.length > 1) {
            const sortedOrders = [...ordersWithDates].sort((a, b) =>
                new Date(a.date!).getTime() - new Date(b.date!).getTime()
            )
            let totalDays = 0
            for (let i = 1; i < sortedOrders.length; i++) {
                const diff = new Date(sortedOrders[i].date!).getTime() - new Date(sortedOrders[i - 1].date!).getTime()
                totalDays += diff / (1000 * 60 * 60 * 24)
            }
            avgDaysBetweenOrders = totalDays / (ordersWithDates.length - 1)
        }

        // Last order date
        const lastOrderDate = orders.length > 0 ? orders[0].date : null

        // First order date
        const firstOrderDate = orders.length > 0 ? orders[orders.length - 1].date : null

        return {
            totalSpent,
            orderCount,
            avgOrderValue,
            categoryStats,
            monthlySpending,
            dayOfWeekStats,
            favoriteDay: favoriteDay.day,
            avgDaysBetweenOrders: Math.round(avgDaysBetweenOrders),
            lastOrderDate,
            firstOrderDate,
            totalItems: orders.reduce((sum, o) => sum + o.itemCount, 0),
        }
    }, [customer])

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(value)
    }

    if (storeLoading || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-500" />
                    <p className="text-gray-400">Loading customer data...</p>
                </div>
            </div>
        )
    }

    if (!customer || !analytics) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <User className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-lg font-medium text-white mb-2">Customer not found</h3>
                    <Link href="/dashboard/store/customers">
                        <Button variant="outline" className="border-gray-700">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Customers
                        </Button>
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard/store/customers">
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-orange-600/20 flex items-center justify-center">
                            <User className="h-6 w-6 text-orange-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">{customer.name}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge
                                    variant="outline"
                                    className={customer.type === 'registered'
                                        ? 'border-green-500/30 text-green-400'
                                        : 'border-gray-600 text-gray-400'}
                                >
                                    {customer.type === 'registered' ? 'Registered Customer' : 'Guest'}
                                </Badge>
                                {customer.createdAt && (
                                    <span className="text-sm text-gray-500">
                                        Member since {formatDate(customer.createdAt)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contact & Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Contact Info */}
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="pt-6">
                        <h3 className="text-sm font-medium text-gray-400 mb-3">Contact Info</h3>
                        <div className="space-y-2">
                            {customer.email ? (
                                <div className="flex items-center gap-2 text-white">
                                    <Mail className="h-4 w-4 text-gray-500" />
                                    <span className="text-sm truncate">{customer.email}</span>
                                </div>
                            ) : null}
                            {customer.phone ? (
                                <div className="flex items-center gap-2 text-white">
                                    <Phone className="h-4 w-4 text-gray-500" />
                                    <span className="text-sm">{customer.phone}</span>
                                </div>
                            ) : null}
                            {!customer.email && !customer.phone && (
                                <p className="text-gray-500 text-sm">No contact information</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Total Spent */}
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400">Total Spent</p>
                                <p className="text-2xl font-bold text-orange-400">
                                    {formatCurrency(analytics.totalSpent)}
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                                <DollarSign className="h-6 w-6 text-orange-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Total Orders */}
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400">Total Orders</p>
                                <p className="text-2xl font-bold text-white">{analytics.orderCount}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <ShoppingBag className="h-6 w-6 text-blue-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Avg Order Value */}
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400">Avg Order Value</p>
                                <p className="text-2xl font-bold text-white">
                                    {formatCurrency(analytics.avgOrderValue)}
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                                <TrendingUp className="h-6 w-6 text-green-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Additional Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                                <Calendar className="h-5 w-5 text-purple-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Favorite Day</p>
                                <p className="text-lg font-semibold text-white">{analytics.favoriteDay}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                                <Clock className="h-5 w-5 text-cyan-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Avg Days Between Orders</p>
                                <p className="text-lg font-semibold text-white">
                                    {analytics.avgDaysBetweenOrders > 0 ? `${analytics.avgDaysBetweenOrders} days` : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                                <Package className="h-5 w-5 text-pink-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Total Items Purchased</p>
                                <p className="text-lg font-semibold text-white">{analytics.totalItems}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Spending Over Time */}
                <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-orange-500" />
                            Spending Over Time
                        </CardTitle>
                        <CardDescription className="text-gray-500">
                            Monthly spending (last 12 months)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.monthlySpending}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis
                                        dataKey="month"
                                        stroke="#9ca3af"
                                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                                    />
                                    <YAxis
                                        stroke="#9ca3af"
                                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                                        tickFormatter={(value) => `$${value}`}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1f2937',
                                            border: '1px solid #374151',
                                            borderRadius: '8px',
                                        }}
                                        labelStyle={{ color: '#fff' }}
                                        formatter={(value: number) => [formatCurrency(value), 'Amount']}
                                    />
                                    <Bar dataKey="amount" fill="#f97316" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Category Breakdown */}
                <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <PieChartIcon className="h-5 w-5 text-blue-500" />
                            Purchases by Category
                        </CardTitle>
                        <CardDescription className="text-gray-500">
                            Most purchased product categories
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {analytics.categoryStats.length > 0 ? (
                            <div className="h-[300px] flex items-center">
                                <ResponsiveContainer width="60%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={analytics.categoryStats}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={100}
                                            innerRadius={60}
                                        >
                                            {analytics.categoryStats.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#1f2937',
                                                border: '1px solid #374151',
                                                borderRadius: '8px',
                                            }}
                                            formatter={(value: number) => formatCurrency(value)}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex-1 space-y-2">
                                    {analytics.categoryStats.slice(0, 6).map((cat, index) => (
                                        <div key={cat.name} className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                            />
                                            <span className="text-sm text-gray-400 flex-1 truncate">{cat.name}</span>
                                            <span className="text-sm font-medium text-white">
                                                {formatCurrency(cat.value)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center">
                                <p className="text-gray-500">No category data available</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Day of Week Chart */}
            <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-purple-500" />
                        Purchase Patterns by Day
                    </CardTitle>
                    <CardDescription className="text-gray-500">
                        When this customer typically makes purchases
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={analytics.dayOfWeekStats}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis
                                    dataKey="day"
                                    stroke="#9ca3af"
                                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                                />
                                <YAxis
                                    yAxisId="left"
                                    stroke="#9ca3af"
                                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                                />
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    stroke="#9ca3af"
                                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                                    tickFormatter={(value) => `$${value}`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1f2937',
                                        border: '1px solid #374151',
                                        borderRadius: '8px',
                                    }}
                                    labelStyle={{ color: '#fff' }}
                                />
                                <Legend />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="orders"
                                    stroke="#a855f7"
                                    strokeWidth={2}
                                    dot={{ fill: '#a855f7' }}
                                    name="Orders"
                                />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="amount"
                                    stroke="#22c55e"
                                    strokeWidth={2}
                                    dot={{ fill: '#22c55e' }}
                                    name="Amount ($)"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Order History */}
            <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <ShoppingBag className="h-5 w-5 text-orange-500" />
                        Order History
                    </CardTitle>
                    <CardDescription className="text-gray-500">
                        All orders from this customer ({analytics.orderCount} total)
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-gray-800 hover:bg-transparent">
                                <TableHead className="text-gray-400">Order</TableHead>
                                <TableHead className="text-gray-400">Date</TableHead>
                                <TableHead className="text-gray-400 text-center">Items</TableHead>
                                <TableHead className="text-gray-400 text-right">Total</TableHead>
                                <TableHead className="text-gray-400">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {customer.orders.map(order => (
                                <TableRow
                                    key={order.id}
                                    className="border-gray-800 hover:bg-gray-800/50 cursor-pointer"
                                    onClick={() => router.push(`/dashboard/store/orders/${order.id}`)}
                                >
                                    <TableCell className="font-medium text-white">{order.orderNumber}</TableCell>
                                    <TableCell className="text-gray-400">{order.date ? formatDate(order.date) : 'N/A'}</TableCell>
                                    <TableCell className="text-center text-gray-400">{order.itemCount}</TableCell>
                                    <TableCell className="text-right font-medium text-orange-400">
                                        {formatCurrency(order.total)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={order.status ? STATUS_COLORS[order.status] || 'bg-gray-500/20 text-gray-400' : 'bg-gray-500/20 text-gray-400'}>
                                            {order.status || 'Unknown'}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
