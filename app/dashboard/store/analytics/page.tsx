'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useStoreDashboard } from '@/contexts/store-dashboard-context'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    DollarSign,
    ShoppingCart,
    Users,
    Package,
    Loader2,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface AnalyticsData {
    totalRevenue: number
    revenueChange: number
    totalOrders: number
    ordersChange: number
    averageOrderValue: number
    aovChange: number
    totalCustomers: number
    customersChange: number
    topProducts: { name: string; quantity: number; revenue: number }[]
    recentOrders: { date: string; count: number; revenue: number }[]
}

export default function AnalyticsPage() {
    const { isLoading: authLoading } = useAuth()
    const { currentStore, isLoading: storeLoading } = useStoreDashboard()
    const [isLoading, setIsLoading] = useState(true)
    const [period, setPeriod] = useState('30')
    const [data, setData] = useState<AnalyticsData>({
        totalRevenue: 0,
        revenueChange: 0,
        totalOrders: 0,
        ordersChange: 0,
        averageOrderValue: 0,
        aovChange: 0,
        totalCustomers: 0,
        customersChange: 0,
        topProducts: [],
        recentOrders: [],
    })

    const tenantId = currentStore?.id

    const fetchAnalytics = useCallback(async () => {
        if (!tenantId) {
            setIsLoading(false)
            return
        }

        try {
            setIsLoading(true)
            const supabase = createClient()

            const { data: stores } = await supabase
                .from('stores')
                .select('id')
                .eq('tenant_id', tenantId)
                .limit(1)

            if (!stores || stores.length === 0) return

            const storeId = stores[0].id
            const days = parseInt(period)
            const startDate = new Date()
            startDate.setDate(startDate.getDate() - days)
            const prevStartDate = new Date()
            prevStartDate.setDate(prevStartDate.getDate() - days * 2)

            // Current period orders
            const { data: currentOrders } = await supabase
                .from('orders')
                .select('id, total, customer_id, created_at')
                .eq('store_id', storeId)
                .gte('created_at', startDate.toISOString())
                .in('status', ['completed', 'delivered'])

            // Previous period orders for comparison
            const { data: prevOrders } = await supabase
                .from('orders')
                .select('id, total, customer_id')
                .eq('store_id', storeId)
                .gte('created_at', prevStartDate.toISOString())
                .lt('created_at', startDate.toISOString())
                .in('status', ['completed', 'delivered'])

            // Get order IDs for fetching items
            const orderIds = (currentOrders || []).map(o => o.id)

            // Fetch order items for top products
            let topProducts: { name: string; quantity: number; revenue: number }[] = []
            if (orderIds.length > 0) {
                const { data: itemsData } = await supabase
                    .from('order_items')
                    .select('quantity, subtotal, product_name')
                    .in('order_id', orderIds)

                // Aggregate top products
                const productMap = new Map<string, { quantity: number; revenue: number }>()
                    ; (itemsData || []).forEach((item: any) => {
                        const name = item.product_name || 'Unknown Product'
                        const existing = productMap.get(name) || { quantity: 0, revenue: 0 }
                        productMap.set(name, {
                            quantity: existing.quantity + (item.quantity || 0),
                            revenue: existing.revenue + Number(item.subtotal || 0),
                        })
                    })

                topProducts = Array.from(productMap.entries())
                    .map(([name, data]) => ({ name, ...data }))
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 5)
            }

            // Calculate metrics
            const orders = currentOrders || []
            const prevOrdersList = prevOrders || []

            const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0)
            const prevRevenue = prevOrdersList.reduce((sum, o) => sum + Number(o.total), 0)
            const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0

            const totalOrders = orders.length
            const prevOrdersCount = prevOrdersList.length
            const ordersChange = prevOrdersCount > 0 ? ((totalOrders - prevOrdersCount) / prevOrdersCount) * 100 : 0

            const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
            const prevAOV = prevOrdersCount > 0 ? prevRevenue / prevOrdersCount : 0
            const aovChange = prevAOV > 0 ? ((averageOrderValue - prevAOV) / prevAOV) * 100 : 0

            const uniqueCustomers = new Set(orders.map(o => o.customer_id)).size
            const prevUniqueCustomers = new Set(prevOrdersList.map(o => o.customer_id)).size
            const customersChange = prevUniqueCustomers > 0 ? ((uniqueCustomers - prevUniqueCustomers) / prevUniqueCustomers) * 100 : 0

            // Recent orders by day
            const ordersByDay = new Map<string, { count: number; revenue: number }>()
            orders.forEach((order: any) => {
                const date = new Date(order.created_at).toLocaleDateString()
                const existing = ordersByDay.get(date) || { count: 0, revenue: 0 }
                ordersByDay.set(date, {
                    count: existing.count + 1,
                    revenue: existing.revenue + Number(order.total),
                })
            })

            const recentOrders = Array.from(ordersByDay.entries())
                .map(([date, data]) => ({ date, ...data }))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(-7)

            setData({
                totalRevenue,
                revenueChange,
                totalOrders,
                ordersChange,
                averageOrderValue,
                aovChange,
                totalCustomers: uniqueCustomers,
                customersChange,
                topProducts,
                recentOrders,
            })
        } catch (err) {
            console.error('Error fetching analytics:', err)
        } finally {
            setIsLoading(false)
        }
    }, [tenantId, period])


    useEffect(() => {
        fetchAnalytics()
    }, [fetchAnalytics])

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(value)
    }

    const formatChange = (value: number) => {
        const isPositive = value >= 0
        return (
            <span className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {Math.abs(value).toFixed(1)}%
            </span>
        )
    }

    if (authLoading || storeLoading || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-500" />
                    <p className="text-gray-400">Loading analytics...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Analytics</h1>
                    <p className="text-gray-400 mt-1">
                        Track your store&apos;s performance
                    </p>
                </div>
                <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="w-40 bg-gray-800 border-gray-700 text-white">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-800">
                        <SelectItem value="7" className="text-white">Last 7 days</SelectItem>
                        <SelectItem value="30" className="text-white">Last 30 days</SelectItem>
                        <SelectItem value="90" className="text-white">Last 90 days</SelectItem>
                        <SelectItem value="365" className="text-white">Last year</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400">Total Revenue</p>
                                <p className="text-2xl font-bold text-white mt-1">
                                    {formatCurrency(data.totalRevenue)}
                                </p>
                                {formatChange(data.revenueChange)}
                            </div>
                            <div className="p-3 bg-orange-600/20 rounded-lg">
                                <DollarSign className="h-6 w-6 text-orange-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400">Total Orders</p>
                                <p className="text-2xl font-bold text-white mt-1">{data.totalOrders}</p>
                                {formatChange(data.ordersChange)}
                            </div>
                            <div className="p-3 bg-blue-600/20 rounded-lg">
                                <ShoppingCart className="h-6 w-6 text-blue-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400">Avg. Order Value</p>
                                <p className="text-2xl font-bold text-white mt-1">
                                    {formatCurrency(data.averageOrderValue)}
                                </p>
                                {formatChange(data.aovChange)}
                            </div>
                            <div className="p-3 bg-green-600/20 rounded-lg">
                                <BarChart3 className="h-6 w-6 text-green-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400">Customers</p>
                                <p className="text-2xl font-bold text-white mt-1">{data.totalCustomers}</p>
                                {formatChange(data.customersChange)}
                            </div>
                            <div className="p-3 bg-orange-600/20 rounded-lg">
                                <Users className="h-6 w-6 text-orange-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Recent Orders Chart */}
                <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                        <CardTitle className="text-white">Recent Orders</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.recentOrders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8">
                                <ShoppingCart className="h-8 w-8 text-gray-600 mb-2" />
                                <p className="text-gray-400">No orders in this period</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {data.recentOrders.map((day, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <div>
                                            <p className="text-white font-medium">{day.date}</p>
                                            <p className="text-sm text-gray-400">{day.count} orders</p>
                                        </div>
                                        <p className="text-orange-400 font-medium">
                                            {formatCurrency(day.revenue)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Top Products */}
                <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                        <CardTitle className="text-white">Top Products</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.topProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8">
                                <Package className="h-8 w-8 text-gray-600 mb-2" />
                                <p className="text-gray-400">No sales data available</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {data.topProducts.map((product, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-orange-600/20 rounded-lg flex items-center justify-center text-orange-400 font-bold text-sm">
                                                #{index + 1}
                                            </div>
                                            <div>
                                                <p className="text-white font-medium truncate max-w-[200px]">
                                                    {product.name}
                                                </p>
                                                <p className="text-sm text-gray-400">{product.quantity} sold</p>
                                            </div>
                                        </div>
                                        <p className="text-orange-400 font-medium">
                                            {formatCurrency(product.revenue)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
