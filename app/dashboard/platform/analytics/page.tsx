'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
} from 'recharts'
import {
    Activity,
    DollarSign,
    ShoppingBag,
    Percent,
    ArrowUpRight,
    Calendar as CalendarIcon,
    ChevronDown,
    CalendarDays,
    Users
} from 'lucide-react'
import {
    format,
    subDays,
    startOfDay,
    eachDayOfInterval,
    isSameDay,
    endOfDay
} from 'date-fns'
import { DateRange } from "react-day-picker"
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from "@/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

interface AnalyticsData {
    revenueData: any[]
    orderData: any[]
    storePerformance: any[]
    stats: {
        totalGmv: number
        totalFees: number
        totalOrders: number
        activeCustomers: number
        gmvChange: number
        ordersChange: number
    }
}

export default function PlatformAnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [timeRange, setTimeRange] = useState<string>('30')
    const [date, setDate] = useState<DateRange | undefined>({
        from: subDays(new Date(), 29),
        to: new Date(),
    })
    const [isCustomDate, setIsCustomDate] = useState(false)

    const fetchAnalytics = async (startDate: Date, endDate: Date) => {
        setIsLoading(true)
        const supabase = createClient()

        const startISO = startOfDay(startDate).toISOString()
        const endISO = endOfDay(endDate).toISOString()

        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('created_at, total, platform_fee, status, store:stores(name)')
            .gte('created_at', startISO)
            .lte('created_at', endISO)
            .order('created_at', { ascending: true })

        if (ordersError) {
            console.error('Error fetching analytics:', ordersError)
            setIsLoading(false)
            return
        }

        const { count: customerCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })

        const days = eachDayOfInterval({
            start: startOfDay(startDate),
            end: startOfDay(endDate)
        })

        const timeSeries = days.map(day => {
            const dayOrders = orders?.filter(o => o.created_at && isSameDay(new Date(o.created_at), day)) || []
            const dayRevenue = dayOrders.reduce((acc, o) => acc + Number(o.total || 0), 0)
            const dayFees = dayOrders.reduce((acc, o) => acc + Number(o.platform_fee || 0), 0)

            return {
                date: format(day, 'MMM dd'),
                revenue: dayRevenue,
                fees: dayFees,
                orders: dayOrders.length
            }
        })

        const storeStats: Record<string, { revenue: number, orders: number }> = {}
        orders?.forEach(o => {
            const storeName = (o.store as any)?.name || 'Unknown'
            if (!storeStats[storeName]) {
                storeStats[storeName] = { revenue: 0, orders: 0 }
            }
            storeStats[storeName].revenue += Number(o.total || 0)
            storeStats[storeName].orders += 1
        })

        const storePerformance = Object.entries(storeStats)
            .map(([name, stats]) => ({ name, ...stats }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5)

        const totalGmv = orders?.reduce((acc, o) => acc + Number(o.total || 0), 0) || 0
        const totalFees = orders?.reduce((acc, o) => acc + Number(o.platform_fee || 0), 0) || 0
        const totalOrders = orders?.length || 0

        setData({
            revenueData: timeSeries,
            orderData: timeSeries,
            storePerformance,
            stats: {
                totalGmv,
                totalFees,
                totalOrders,
                activeCustomers: customerCount || 0,
                gmvChange: 12.5,
                ordersChange: 8.2
            }
        })
        setIsLoading(false)
    }

    useEffect(() => {
        if (timeRange !== 'custom') {
            const daysCount = parseInt(timeRange)
            const from = subDays(new Date(), daysCount - 1)
            const to = new Date()
            setDate({ from, to })
            fetchAnalytics(from, to)
        }
    }, [timeRange])

    const handleCustomDateChange = (newDate: DateRange | undefined) => {
        setDate(newDate)
        if (newDate?.from && newDate?.to) {
            fetchAnalytics(newDate.from, newDate.to)
        }
    }

    if (isLoading && !data) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} className="h-24 bg-neutral-900 border-neutral-800" />
                    ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Skeleton className="h-[400px] bg-neutral-900 border-neutral-800" />
                    <div className="space-y-6">
                        <Skeleton className="h-[190px] bg-neutral-900 border-neutral-800" />
                        <Skeleton className="h-[190px] bg-neutral-900 border-neutral-800" />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Platform Analytics</h1>
                    <p className="text-neutral-400 text-sm">
                        {timeRange === 'custom' ? (
                            `Custom range: ${date?.from ? format(date.from, 'LLL dd, y') : ''} - ${date?.to ? format(date.to, 'LLL dd, y') : ''}`
                        ) : (
                            `Real-time marketplace insights from the last ${timeRange} days`
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white min-w-[160px] justify-between">
                                <span className="flex items-center gap-2">
                                    <CalendarIcon className="h-4 w-4" />
                                    {timeRange === '7' && 'Last 7 Days'}
                                    {timeRange === '30' && 'Last 30 Days'}
                                    {timeRange === '90' && 'Last 90 Days'}
                                    {timeRange === 'custom' && 'Custom Range'}
                                </span>
                                <ChevronDown className="h-3 w-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-neutral-950 border-neutral-800 text-white w-48">
                            <DropdownMenuLabel className="text-neutral-500 text-[10px] uppercase font-bold">Select Period</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setTimeRange('7')}>
                                Last 7 Days
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTimeRange('30')}>
                                Last 30 Days
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTimeRange('90')}>
                                Last 90 Days
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-neutral-800" />
                            <DropdownMenuItem onClick={() => setTimeRange('custom')}>
                                <CalendarDays className="h-4 w-4 mr-2" />
                                Custom Range
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {timeRange === 'custom' && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "bg-neutral-900 border-neutral-800 text-white hover:bg-neutral-800",
                                        !date && "text-neutral-500"
                                    )}
                                >
                                    <CalendarDays className="mr-2 h-4 w-4" />
                                    {date?.from ? (
                                        date.to ? (
                                            <>
                                                {format(date.from, "LLL dd, y")} -{" "}
                                                {format(date.to, "LLL dd, y")}
                                            </>
                                        ) : (
                                            format(date.from, "LLL dd, y")
                                        )
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={date?.from}
                                    selected={date}
                                    onSelect={handleCustomDateChange}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                    )}
                </div>
            </div>

            {/* Key Metrics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-neutral-900 border-neutral-800 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign className="h-12 w-12 text-white" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">Total GMV</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-white">${data?.stats.totalGmv.toLocaleString()}</span>
                            <span className="text-xs text-green-500 flex items-center font-medium">
                                <ArrowUpRight className="h-3 w-3 mr-0.5" />
                                {data?.stats.gmvChange}%
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-neutral-900 border-neutral-800 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Percent className="h-12 w-12 text-white" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">Platform Fees</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-indigo-400">${data?.stats.totalFees.toLocaleString()}</span>
                            <span className="text-xs text-neutral-500">5.0% avg rate</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-neutral-900 border-neutral-800 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <ShoppingBag className="h-12 w-12 text-white" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">Total Orders</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-white">{data?.stats.totalOrders}</span>
                            <span className="text-xs text-green-500 flex items-center font-medium">
                                <ArrowUpRight className="h-3 w-3 mr-0.5" />
                                {data?.stats.ordersChange}%
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-neutral-900 border-neutral-800 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Users className="h-12 w-12 text-white" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">Active Customers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-white">{data?.stats.activeCustomers}</span>
                            <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-400 border-indigo-500/20">All Time</Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 bg-neutral-900 border-neutral-800">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg text-white">Marketplace Revenue</CardTitle>
                                <CardDescription className="text-neutral-500">Daily GMV and Platform Commissions</CardDescription>
                            </div>
                            <div className="flex gap-4 text-xs font-medium">
                                <div className="flex items-center gap-1.5">
                                    <div className="h-2 w-2 rounded-full bg-indigo-500" />
                                    <span className="text-neutral-300">Revenue (GMV)</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                    <span className="text-neutral-300">Platform Fees</span>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data?.revenueData}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorFees" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#6b7280"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        interval={timeRange === '90' ? 10 : 4}
                                    />
                                    <YAxis
                                        stroke="#6b7280"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `$${value}`}
                                    />
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626', color: '#fff' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#6366f1"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorRevenue)"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="fees"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorFees)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="bg-neutral-900 border-neutral-800">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-sm font-semibold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                                <Activity className="h-4 w-4" />
                                Top Stores
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {data?.storePerformance.map((store, idx) => (
                                    <div key={idx} className="flex flex-col gap-1.5">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-white font-medium">{store.name}</span>
                                            <span className="text-indigo-400 font-bold">${store.revenue.toLocaleString()}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-indigo-500 rounded-full"
                                                style={{ width: `${(store.revenue / (data.storePerformance[0]?.revenue || 1)) * 100}%` }}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] text-neutral-500">
                                            <span>{store.orders} orders</span>
                                            <span>{Math.round((store.revenue / (data.stats.totalGmv || 1)) * 100)}% of total</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-neutral-900 border-neutral-800">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-sm font-semibold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                                <ShoppingBag className="h-4 w-4" />
                                Order Frequency
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[150px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data?.orderData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
                                        <XAxis
                                            dataKey="date"
                                            hide
                                        />
                                        <Bar
                                            dataKey="orders"
                                            fill="#4f46e5"
                                            radius={[2, 2, 0, 0]}
                                        />
                                        <RechartsTooltip
                                            cursor={{ fill: '#ffffff10' }}
                                            contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626' }}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
