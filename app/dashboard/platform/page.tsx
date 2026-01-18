'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Store,
    Truck,
    ShoppingCart,
    DollarSign,
    TrendingUp,
    TrendingDown,
    Activity,
    Users,
    Map
} from 'lucide-react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as ChartTooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    AreaChart,
    Area
} from 'recharts'

interface Stats {
    total_stores: number
    total_delivery_partners: number
    total_orders: number
    total_revenue: number
    total_users: number
    active_deliveries: number
}

const chartData = [
    { name: 'Mon', sales: 4000, orders: 24 },
    { name: 'Tue', sales: 3000, orders: 13 },
    { name: 'Wed', sales: 2000, orders: 98 },
    { name: 'Thu', sales: 2780, orders: 39 },
    { name: 'Fri', sales: 1890, orders: 48 },
    { name: 'Sat', sales: 2390, orders: 38 },
    { name: 'Sun', sales: 3490, orders: 43 },
]

export default function PlatformOverviewPage() {
    const [stats, setStats] = useState<Stats | null>(null)
    const [chartData, setChartData] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchGlobalStats() {
            const supabase = createClient()

            // Fetch counts and revenue
            const [
                { count: storeCount },
                { count: deliveryCount },
                { count: orderCount },
                { data: revenueData },
                { count: userCount },
                { count: activeDeliveryCount },
                { data: recentOrders }
            ] = await Promise.all([
                supabase.from('stores').select('*', { count: 'exact', head: true }),
                supabase.from('delivery_companies').select('*', { count: 'exact', head: true }),
                supabase.from('orders').select('*', { count: 'exact', head: true }),
                supabase.from('orders').select('total'),
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                supabase.from('deliveries').select('*', { count: 'exact', head: true }).neq('status', 'delivered'),
                supabase.from('orders').select('created_at, total').order('created_at', { ascending: true }).limit(50)
            ])

            const totalRevenue = revenueData?.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0) || 0

            setStats({
                total_stores: storeCount || 0,
                total_delivery_partners: deliveryCount || 0,
                total_orders: orderCount || 0,
                total_revenue: totalRevenue,
                total_users: userCount || 0,
                active_deliveries: activeDeliveryCount || 0
            })

            // Process chart data from recent orders
            if (recentOrders && recentOrders.length > 0) {
                const dayGroups: Record<string, { name: string, sales: number, orders: number }> = {}
                recentOrders.forEach(o => {
                    if (!o.created_at) return
                    const day = new Date(o.created_at).toLocaleDateString('en-US', { weekday: 'short' })
                    if (!dayGroups[day]) dayGroups[day] = { name: day, sales: 0, orders: 0 }
                    dayGroups[day].sales += Number(o.total) || 0
                    dayGroups[day].orders += 1
                })

                const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                setChartData(days.map(d => dayGroups[d] || { name: d, sales: 0, orders: 0 }))
            } else {
                // Fallback to mock if no data
                setChartData([
                    { name: 'Mon', sales: 4000, orders: 24 },
                    { name: 'Tue', sales: 3000, orders: 13 },
                    { name: 'Wed', sales: 2000, orders: 98 },
                    { name: 'Thu', sales: 2780, orders: 39 },
                    { name: 'Fri', sales: 1890, orders: 48 },
                    { name: 'Sat', sales: 2390, orders: 38 },
                    { name: 'Sun', sales: 3490, orders: 43 },
                ])
            }

            setIsLoading(false)
        }

        fetchGlobalStats()
    }, [])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-white">Platform Health</h1>
                <p className="text-neutral-400">Consolidated real-time operational overview</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-neutral-900 border-neutral-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-neutral-400">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">${stats?.total_revenue.toLocaleString()}</div>
                        <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                            <TrendingUp className="h-3 w-3" />
                            +12.5% from last month
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-neutral-900 border-neutral-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-neutral-400">Total Orders</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats?.total_orders}</div>
                        <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                            <TrendingUp className="h-3 w-3" />
                            +8.2% from last month
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-neutral-900 border-neutral-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-neutral-400">Connected Stores</CardTitle>
                        <Store className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats?.total_stores}</div>
                        <p className="text-xs text-neutral-400 mt-1">Across 42 jurisdictions</p>
                    </CardContent>
                </Card>

                <Card className="bg-neutral-900 border-neutral-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-neutral-400">Active Deliveries</CardTitle>
                        <Truck className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats?.active_deliveries}</div>
                        <p className="text-xs text-indigo-400 mt-1 flex items-center gap-1">
                            <Activity className="h-3 w-3 animate-pulse" />
                            Real-time logistics load
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-neutral-900 border-neutral-800">
                    <CardHeader>
                        <CardTitle className="text-white text-lg font-semibold">Revenue Growth</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                <ChartTooltip
                                    contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="sales" stroke="#6366f1" fillOpacity={1} fill="url(#colorSales)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="bg-neutral-900 border-neutral-800">
                    <CardHeader>
                        <CardTitle className="text-white text-lg font-semibold">Order Volume</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                <ChartTooltip
                                    contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Bar dataKey="orders" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Platform Users / Footprint */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-neutral-900 border-neutral-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-500/10 rounded-full">
                                <Users className="h-6 w-6 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-sm text-neutral-400">Global Users</p>
                                <p className="text-2xl font-bold text-white">{stats?.total_users}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-neutral-900 border-neutral-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-500/10 rounded-full">
                                <Truck className="h-6 w-6 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-sm text-neutral-400">Logistics Partners</p>
                                <p className="text-2xl font-bold text-white">{stats?.total_delivery_partners}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-neutral-900 border-neutral-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-amber-500/10 rounded-full">
                                <Map className="h-6 w-6 text-amber-500" />
                            </div>
                            <div>
                                <p className="text-sm text-neutral-400">Jurisdictions</p>
                                <p className="text-2xl font-bold text-white">42 Active</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
