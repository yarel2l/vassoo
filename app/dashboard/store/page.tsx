'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    DollarSign,
    ShoppingCart,
    Package,
    TrendingUp,
    TrendingDown,
    ArrowUpRight,
    Clock,
    Star,
    Users,
    AlertTriangle,
    Loader2,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useStoreDashboard } from '@/contexts/store-dashboard-context'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface DashboardStats {
    todayRevenue: number
    todayRevenueChange: number
    todayOrders: number
    todayOrdersChange: number
    productsSold: number
    productsSoldChange: number
    avgOrderValue: number
    avgOrderValueChange: number
}

interface RecentOrder {
    id: string
    order_number: string
    customer_name: string
    items_count: number
    total: number
    status: string
    created_at: string
}

interface LowStockItem {
    id: string
    name: string
    sku: string
    quantity: number
    min_stock: number
}

interface StorePerformance {
    averageRating: number
    newCustomers: number
    ordersCompleted: number
    totalRevenue: number
}

interface EarningsSummary {
    grossRevenue: number
    platformFees: number
    netEarnings: number
    avgFeeRate: number
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
        case 'confirmed': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
        case 'processing': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
        case 'ready_for_pickup': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
        case 'out_for_delivery': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
        case 'completed':
        case 'delivered': return 'bg-green-500/20 text-green-400 border-green-500/30'
        default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
}

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'pending': return 'Pending'
        case 'confirmed': return 'Confirmed'
        case 'processing': return 'Processing'
        case 'ready_for_pickup': return 'Ready'
        case 'out_for_delivery': return 'Out for Delivery'
        case 'completed': return 'Completed'
        case 'delivered': return 'Delivered'
        default: return status
    }
}

const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(value)
}

export default function StoreDashboardPage() {
    const { profile, isLoading: authLoading } = useAuth()
    const { currentStore, isLoading: storeLoading } = useStoreDashboard()
    const [isLoading, setIsLoading] = useState(true)
    const [stats, setStats] = useState<DashboardStats>({
        todayRevenue: 0,
        todayRevenueChange: 0,
        todayOrders: 0,
        todayOrdersChange: 0,
        productsSold: 0,
        productsSoldChange: 0,
        avgOrderValue: 0,
        avgOrderValueChange: 0,
    })
    const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
    const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
    const [performance, setPerformance] = useState<StorePerformance>({
        averageRating: 0,
        newCustomers: 0,
        ordersCompleted: 0,
        totalRevenue: 0,
    })
    const [earnings, setEarnings] = useState<EarningsSummary>({
        grossRevenue: 0,
        platformFees: 0,
        netEarnings: 0,
        avgFeeRate: 0,
    })

    const tenantId = currentStore?.id

    const fetchDashboardData = useCallback(async () => {
        if (!tenantId) {
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        try {
            const supabase = createClient()

            // Get store for this tenant
            const { data: stores } = await supabase
                .from('stores')
                .select('id')
                .eq('tenant_id', tenantId)
                .limit(1)

            if (!stores || stores.length === 0) {
                setIsLoading(false)
                return
            }

            const storeId = stores[0].id

            // Get today's date range
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const tomorrow = new Date(today)
            tomorrow.setDate(tomorrow.getDate() + 1)
            const yesterday = new Date(today)
            yesterday.setDate(yesterday.getDate() - 1)

            // Get this month's date range
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

            // Fetch today's orders
            const { data: todayOrders } = await supabase
                .from('orders')
                .select('id, total, order_items(quantity)')
                .eq('store_id', storeId)
                .gte('created_at', today.toISOString())
                .lt('created_at', tomorrow.toISOString())

            // Fetch yesterday's orders for comparison
            const { data: yesterdayOrders } = await supabase
                .from('orders')
                .select('id, total, order_items(quantity)')
                .eq('store_id', storeId)
                .gte('created_at', yesterday.toISOString())
                .lt('created_at', today.toISOString())

            // Calculate today's stats
            const todayRevenue = (todayOrders || []).reduce((sum, o) => sum + Number(o.total || 0), 0)
            const yesterdayRevenue = (yesterdayOrders || []).reduce((sum, o) => sum + Number(o.total || 0), 0)
            const todayRevenueChange = yesterdayRevenue > 0
                ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
                : 0

            const todayOrderCount = todayOrders?.length || 0
            const yesterdayOrderCount = yesterdayOrders?.length || 0
            const todayOrdersChange = yesterdayOrderCount > 0
                ? ((todayOrderCount - yesterdayOrderCount) / yesterdayOrderCount) * 100
                : 0

            const todayProductsSold = (todayOrders || []).reduce((sum, o) => {
                const items = o.order_items as any[] || []
                return sum + items.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0)
            }, 0)
            const yesterdayProductsSold = (yesterdayOrders || []).reduce((sum, o) => {
                const items = o.order_items as any[] || []
                return sum + items.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0)
            }, 0)
            const productsSoldChange = yesterdayProductsSold > 0
                ? ((todayProductsSold - yesterdayProductsSold) / yesterdayProductsSold) * 100
                : 0

            const avgOrderValue = todayOrderCount > 0 ? todayRevenue / todayOrderCount : 0
            const yesterdayAvg = yesterdayOrderCount > 0 ? yesterdayRevenue / yesterdayOrderCount : 0
            const avgOrderValueChange = yesterdayAvg > 0
                ? ((avgOrderValue - yesterdayAvg) / yesterdayAvg) * 100
                : 0

            setStats({
                todayRevenue,
                todayRevenueChange,
                todayOrders: todayOrderCount,
                todayOrdersChange,
                productsSold: todayProductsSold,
                productsSoldChange,
                avgOrderValue,
                avgOrderValueChange,
            })

            // Fetch recent orders
            const { data: recentOrdersData } = await supabase
                .from('orders')
                .select(`
                    id,
                    order_number,
                    total,
                    status,
                    created_at,
                    customer:profiles!customer_id(full_name),
                    guest_name,
                    order_items(id)
                `)
                .eq('store_id', storeId)
                .order('created_at', { ascending: false })
                .limit(5)

            const formattedOrders: RecentOrder[] = (recentOrdersData || []).map((order: any) => ({
                id: order.id,
                order_number: order.order_number || order.id.substring(0, 8).toUpperCase(),
                customer_name: order.customer?.full_name || order.guest_name || 'Walk-in Customer',
                items_count: order.order_items?.length || 0,
                total: Number(order.total || 0),
                status: order.status,
                created_at: order.created_at,
            }))
            setRecentOrders(formattedOrders)

            // Fetch low stock items
            const { data: lowStockData } = await supabase
                .from('store_inventories')
                .select(`
                    id,
                    quantity,
                    low_stock_threshold,
                    product:master_products(id, name, sku)
                `)
                .eq('store_id', storeId)
                .lt('quantity', 10) // Items with less than 10 in stock
                .order('quantity', { ascending: true })
                .limit(5)

            const formattedLowStock: LowStockItem[] = (lowStockData || [])
                .filter((item: any) => item.product)
                .map((item: any) => ({
                    id: item.id,
                    name: item.product?.name || 'Unknown Product',
                    sku: item.product?.sku || 'N/A',
                    quantity: item.quantity || 0,
                    min_stock: item.low_stock_threshold || 5,
                }))
            setLowStockItems(formattedLowStock)

            // Fetch this month's performance
            const { data: monthOrders } = await supabase
                .from('orders')
                .select('id, total, customer_id, status')
                .eq('store_id', storeId)
                .gte('created_at', monthStart.toISOString())

            const totalRevenue = (monthOrders || []).reduce((sum, o) => sum + Number(o.total || 0), 0)
            const ordersCompleted = (monthOrders || []).filter(o =>
                o.status && ['completed', 'delivered'].includes(o.status)
            ).length
            const uniqueCustomers = new Set((monthOrders || []).filter(o => o.customer_id).map(o => o.customer_id)).size

            // Fetch store rating
            const { data: storeData } = await supabase
                .from('stores')
                .select('average_rating')
                .eq('id', storeId)
                .single()

            setPerformance({
                averageRating: storeData?.average_rating || 0,
                newCustomers: uniqueCustomers,
                ordersCompleted,
                totalRevenue,
            })

            // Fetch earnings summary (this month)
            const { data: earningsData } = await supabase
                .from('orders')
                .select('total, platform_fee')
                .eq('store_id', storeId)
                .gte('created_at', monthStart.toISOString())
                .in('payment_status', ['paid', 'completed'])

            const grossRevenue = (earningsData || []).reduce((sum, o) => sum + Number(o.total || 0), 0)
            const platformFees = (earningsData || []).reduce((sum, o) => sum + Number(o.platform_fee || 0), 0)
            const netEarnings = grossRevenue - platformFees
            const avgFeeRate = grossRevenue > 0 ? (platformFees / grossRevenue) * 100 : 0

            setEarnings({
                grossRevenue,
                platformFees,
                netEarnings,
                avgFeeRate,
            })

        } catch (err) {
            console.error('Error fetching dashboard data:', err)
        } finally {
            setIsLoading(false)
        }
    }, [tenantId])

    useEffect(() => {
        fetchDashboardData()
    }, [fetchDashboardData])

    if (authLoading || storeLoading || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-500" />
                    <p className="text-gray-400">Loading dashboard...</p>
                </div>
            </div>
        )
    }

    if (!currentStore) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-lg font-medium text-white mb-2">No store selected</h3>
                    <p className="text-gray-400">Please select a store from the sidebar</p>
                </div>
            </div>
        )
    }

    const statCards = [
        {
            title: "Today's Revenue",
            value: formatCurrency(stats.todayRevenue),
            change: stats.todayRevenueChange,
            changeLabel: 'vs yesterday',
            icon: <DollarSign className="h-5 w-5" />,
            trend: stats.todayRevenueChange >= 0 ? 'up' : 'down' as 'up' | 'down',
        },
        {
            title: 'New Orders',
            value: stats.todayOrders.toString(),
            change: stats.todayOrdersChange,
            changeLabel: 'vs yesterday',
            icon: <ShoppingCart className="h-5 w-5" />,
            trend: stats.todayOrdersChange >= 0 ? 'up' : 'down' as 'up' | 'down',
        },
        {
            title: 'Products Sold',
            value: stats.productsSold.toString(),
            change: stats.productsSoldChange,
            changeLabel: 'vs yesterday',
            icon: <Package className="h-5 w-5" />,
            trend: stats.productsSoldChange >= 0 ? 'up' : 'down' as 'up' | 'down',
        },
        {
            title: 'Avg Order Value',
            value: formatCurrency(stats.avgOrderValue),
            change: stats.avgOrderValueChange,
            changeLabel: 'vs yesterday',
            icon: <TrendingUp className="h-5 w-5" />,
            trend: stats.avgOrderValueChange >= 0 ? 'up' : 'down' as 'up' | 'down',
        },
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">
                        Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}!
                    </h1>
                    <p className="text-gray-400 mt-1">
                        Here's what's happening with {currentStore.name} today.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/store/analytics">
                        <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
                            View Reports
                        </Button>
                    </Link>
                    <Link href="/dashboard/store/pos">
                        <Button className="bg-orange-600 hover:bg-orange-700">
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            New Order
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat) => (
                    <Card key={stat.title} className="bg-gray-900 border-gray-800">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="p-2 bg-orange-600/20 rounded-lg">
                                    {stat.icon}
                                </div>
                                <div className={`flex items-center gap-1 text-sm ${stat.trend === 'up' ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                    {stat.trend === 'up' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                    {stat.change > 0 ? '+' : ''}{stat.change.toFixed(1)}%
                                </div>
                            </div>
                            <div className="mt-4">
                                <p className="text-2xl font-bold text-white">{stat.value}</p>
                                <p className="text-sm text-gray-400 mt-1">{stat.title}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main content grid */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Recent Orders */}
                <Card className="lg:col-span-2 bg-gray-900 border-gray-800">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-white">Recent Orders</CardTitle>
                            <CardDescription className="text-gray-400">
                                Latest orders from {currentStore.name}
                            </CardDescription>
                        </div>
                        <Link href="/dashboard/store/orders">
                            <Button variant="ghost" size="sm" className="text-orange-400 hover:text-orange-300">
                                View all
                                <ArrowUpRight className="h-4 w-4 ml-1" />
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {recentOrders.length === 0 ? (
                            <div className="text-center py-8">
                                <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                                <p className="text-gray-400">No orders yet</p>
                                <p className="text-sm text-gray-500">Orders will appear here when customers make purchases</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {recentOrders.map((order) => (
                                    <Link
                                        key={order.id}
                                        href={`/dashboard/store/orders/${order.id}`}
                                        className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors block"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div>
                                                <p className="font-medium text-white">{order.order_number}</p>
                                                <p className="text-sm text-gray-400">{order.customer_name} • {order.items_count} items</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <Badge className={getStatusColor(order.status)}>
                                                {getStatusLabel(order.status)}
                                            </Badge>
                                            <div className="text-right">
                                                <p className="font-medium text-white">{formatCurrency(order.total)}</p>
                                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {formatTimeAgo(order.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Right column */}
                <div className="space-y-6">
                    {/* Low Stock Alert */}
                    <Card className="bg-gray-900 border-gray-800">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-white flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-400" />
                                Low Stock Alert
                            </CardTitle>
                            <Link href="/dashboard/store/inventory">
                                <Button variant="ghost" size="sm" className="text-orange-400 hover:text-orange-300">
                                    Manage
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent>
                            {lowStockItems.length === 0 ? (
                                <div className="text-center py-4">
                                    <Package className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                                    <p className="text-sm text-gray-400">All items are well stocked</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {lowStockItems.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center justify-between p-3 bg-amber-900/20 border border-amber-700/30 rounded-lg"
                                        >
                                            <div>
                                                <p className="text-sm font-medium text-white">{item.name}</p>
                                                <p className="text-xs text-gray-400">{item.sku}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-amber-400">{item.quantity} left</p>
                                                <p className="text-xs text-gray-400">Min: {item.min_stock}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Store Stats */}
                    <Card className="bg-gray-900 border-gray-800">
                        <CardHeader>
                            <CardTitle className="text-white">Store Performance</CardTitle>
                            <CardDescription className="text-gray-400">This month</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Star className="h-4 w-4 text-yellow-400" />
                                    <span className="text-gray-400">Average Rating</span>
                                </div>
                                <span className="font-bold text-white">
                                    {performance.averageRating > 0 ? performance.averageRating.toFixed(1) : 'N/A'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-blue-400" />
                                    <span className="text-gray-400">Unique Customers</span>
                                </div>
                                <span className="font-bold text-white">{performance.newCustomers}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Package className="h-4 w-4 text-green-400" />
                                    <span className="text-gray-400">Orders Completed</span>
                                </div>
                                <span className="font-bold text-white">{performance.ordersCompleted}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-orange-400" />
                                    <span className="text-gray-400">Total Revenue</span>
                                </div>
                                <span className="font-bold text-white">{formatCurrency(performance.totalRevenue)}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Earnings Summary */}
                    <Card className="bg-gray-900 border-gray-800">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-green-500" />
                                Your Earnings
                            </CardTitle>
                            <CardDescription className="text-gray-400">This month (after fees)</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400">Gross Revenue</span>
                                <span className="font-medium text-white">{formatCurrency(earnings.grossRevenue)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400">Platform Fees</span>
                                <span className="font-medium text-red-400">-{formatCurrency(earnings.platformFees)}</span>
                            </div>
                            {earnings.avgFeeRate > 0 && (
                                <p className="text-xs text-gray-500">
                                    ({earnings.avgFeeRate.toFixed(1)}% average commission)
                                </p>
                            )}
                            <div className="pt-3 border-t border-gray-700">
                                <div className="flex items-center justify-between">
                                    <span className="text-white font-medium">Net Earnings</span>
                                    <span className="text-xl font-bold text-green-400">{formatCurrency(earnings.netEarnings)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
