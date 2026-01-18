'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Truck,
    Users,
    Clock,
    CheckCircle,
    DollarSign,
    TrendingUp,
    MapPin,
    Package,
    Loader2,
} from 'lucide-react'

interface DashboardStats {
    totalDeliveries: number
    pendingDeliveries: number
    completedToday: number
    activeDrivers: number
    totalDrivers: number
    totalEarnings: number
}

interface RecentDelivery {
    id: string
    orderNumber: string
    storeName: string
    customerName: string
    address: string
    status: string
    assignedAt: string
}

export default function DeliveryDashboardPage() {
    const { tenants } = useAuth()
    const [stats, setStats] = useState<DashboardStats>({
        totalDeliveries: 0,
        pendingDeliveries: 0,
        completedToday: 0,
        activeDrivers: 0,
        totalDrivers: 0,
        totalEarnings: 0,
    })
    const [recentDeliveries, setRecentDeliveries] = useState<RecentDelivery[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const deliveryTenant = tenants.find(t => t.tenant.type === 'delivery_company')

    const fetchDashboardData = useCallback(async () => {
        if (!deliveryTenant) return

        try {
            setIsLoading(true)
            const supabase = createClient()

            // Get delivery company
            const { data: company } = await supabase
                .from('delivery_companies')
                .select('id')
                .eq('tenant_id', deliveryTenant.tenant.id)
                .single()

            if (!company) {
                setIsLoading(false)
                return
            }

            // Get drivers count
            const { count: driversCount } = await supabase
                .from('delivery_drivers')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', company.id)

            // Get active drivers (those currently on a delivery)
            const { count: activeDriversCount } = await supabase
                .from('delivery_drivers')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', company.id)
                .eq('is_available', true)

            // Get deliveries stats
            const { data: deliveries, count: totalCount } = await supabase
                .from('deliveries')
                .select('*', { count: 'exact' })
                .eq('delivery_company_id', company.id)

            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const pendingCount = deliveries?.filter(d =>
                ['assigned', 'picked_up', 'in_transit'].includes(d.status)
            ).length || 0

            const completedTodayCount = deliveries?.filter(d =>
                d.status === 'delivered' &&
                new Date(d.delivered_at) >= today
            ).length || 0

            const totalEarnings = deliveries?.reduce((sum, d) =>
                sum + (parseFloat(d.delivery_fee) || 0), 0
            ) || 0

            setStats({
                totalDeliveries: totalCount || 0,
                pendingDeliveries: pendingCount,
                completedToday: completedTodayCount,
                activeDrivers: activeDriversCount || 0,
                totalDrivers: driversCount || 0,
                totalEarnings,
            })

            // Get recent deliveries
            const { data: recentData } = await supabase
                .from('deliveries')
                .select(`
                    id,
                    status,
                    assigned_at,
                    order:orders(
                        order_number,
                        delivery_address,
                        store:stores(name)
                    )
                `)
                .eq('delivery_company_id', company.id)
                .order('created_at', { ascending: false })
                .limit(5)

            const transformedDeliveries: RecentDelivery[] = (recentData || []).map((d: any) => ({
                id: d.id,
                orderNumber: d.order?.order_number || 'N/A',
                storeName: d.order?.store?.name || 'Unknown Store',
                customerName: d.order?.delivery_address?.name || 'Customer',
                address: d.order?.delivery_address ?
                    `${d.order.delivery_address.city}, ${d.order.delivery_address.state}` : 'N/A',
                status: d.status,
                assignedAt: d.assigned_at,
            }))

            setRecentDeliveries(transformedDeliveries)
        } catch (err) {
            console.error('Error fetching dashboard data:', err)
        } finally {
            setIsLoading(false)
        }
    }, [deliveryTenant])

    useEffect(() => {
        fetchDashboardData()
    }, [fetchDashboardData])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
                    <p className="text-gray-400">Loading dashboard...</p>
                </div>
            </div>
        )
    }

    const statusColors: Record<string, string> = {
        assigned: 'bg-yellow-500/20 text-yellow-400',
        picked_up: 'bg-blue-500/20 text-blue-400',
        in_transit: 'bg-purple-500/20 text-purple-400',
        delivered: 'bg-green-500/20 text-green-400',
        failed: 'bg-red-500/20 text-red-400',
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Delivery Dashboard</h1>
                <p className="text-gray-400 mt-1">
                    Overview of your delivery operations
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400">Total Deliveries</p>
                                <p className="text-3xl font-bold text-white mt-1">{stats.totalDeliveries}</p>
                            </div>
                            <div className="p-3 bg-blue-600/20 rounded-lg">
                                <Truck className="h-6 w-6 text-blue-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400">Pending Deliveries</p>
                                <p className="text-3xl font-bold text-white mt-1">{stats.pendingDeliveries}</p>
                            </div>
                            <div className="p-3 bg-yellow-600/20 rounded-lg">
                                <Clock className="h-6 w-6 text-yellow-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400">Completed Today</p>
                                <p className="text-3xl font-bold text-white mt-1">{stats.completedToday}</p>
                            </div>
                            <div className="p-3 bg-green-600/20 rounded-lg">
                                <CheckCircle className="h-6 w-6 text-green-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400">Active Drivers</p>
                                <p className="text-3xl font-bold text-white mt-1">
                                    {stats.activeDrivers}/{stats.totalDrivers}
                                </p>
                            </div>
                            <div className="p-3 bg-purple-600/20 rounded-lg">
                                <Users className="h-6 w-6 text-purple-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Earnings Card */}
            <Card className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-gray-800">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-300">Total Earnings</p>
                            <p className="text-4xl font-bold text-white mt-2">
                                ${stats.totalEarnings.toFixed(2)}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-green-400 text-sm">
                                <TrendingUp className="h-4 w-4" />
                                <span>All time earnings</span>
                            </div>
                        </div>
                        <div className="p-4 bg-white/10 rounded-xl">
                            <DollarSign className="h-10 w-10 text-white" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Recent Deliveries */}
            <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Recent Deliveries
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {recentDeliveries.length === 0 ? (
                        <div className="text-center py-8">
                            <Truck className="h-12 w-12 mx-auto text-gray-600 mb-4" />
                            <p className="text-gray-400">No deliveries yet</p>
                            <p className="text-sm text-gray-500">Deliveries will appear here when assigned</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentDeliveries.map((delivery) => (
                                <div
                                    key={delivery.id}
                                    className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-blue-600/20 rounded-lg">
                                            <Truck className="h-5 w-5 text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">{delivery.orderNumber}</p>
                                            <p className="text-sm text-gray-400">{delivery.storeName}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <Badge className={statusColors[delivery.status] || 'bg-gray-500/20 text-gray-400'}>
                                            {delivery.status.replace('_', ' ')}
                                        </Badge>
                                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1 justify-end">
                                            <MapPin className="h-3 w-3" />
                                            {delivery.address}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
