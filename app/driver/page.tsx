'use client'

import { useEffect, useState, useCallback } from 'react'
import { 
    Package, 
    Clock, 
    MapPin, 
    Navigation, 
    Phone, 
    Store,
    ChevronRight,
    RefreshCw,
    CheckCircle,
    Truck,
    AlertTriangle
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

interface Delivery {
    id: string
    order_id: string
    status: string
    pickup_address: string
    delivery_address: string
    customer_name: string
    customer_phone: string
    store_name: string
    store_phone?: string
    delivery_fee: number
    notes?: string
    assigned_at: string
    picked_up_at?: string
    estimated_delivery?: string
    order_number?: string
}

const STATUS_CONFIG: Record<string, { 
    label: string
    color: string
    icon: typeof Package
    bgColor: string
}> = {
    assigned: {
        label: 'Pick Up',
        color: 'text-blue-400',
        icon: Store,
        bgColor: 'bg-blue-500/10 border-blue-500/30'
    },
    picked_up: {
        label: 'Picked Up',
        color: 'text-purple-400',
        icon: Package,
        bgColor: 'bg-purple-500/10 border-purple-500/30'
    },
    in_transit: {
        label: 'Delivering',
        color: 'text-indigo-400',
        icon: Truck,
        bgColor: 'bg-indigo-500/10 border-indigo-500/30'
    },
}

export default function DriverDashboard() {
    const { user } = useAuth()
    const [deliveries, setDeliveries] = useState<Delivery[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active')
    const supabase = createClient()

    const fetchDeliveries = useCallback(async () => {
        if (!user) return

        try {
            const { data, error } = await supabase
                .from('deliveries')
                .select(`
                    *,
                    orders (
                        order_number,
                        store:stores(name, phone),
                        customer:profiles(full_name, phone)
                    )
                `)
                .eq('driver_id', user.id)
                .in('status', activeTab === 'active' 
                    ? ['assigned', 'picked_up', 'in_transit'] 
                    : ['delivered', 'failed']
                )
                .order('assigned_at', { ascending: false })
                .limit(50)

            if (error) throw error

            const formatted = (data || []).map(d => ({
                id: d.id,
                order_id: d.order_id,
                status: d.status,
                pickup_address: d.pickup_address || '',
                delivery_address: d.delivery_address || '',
                customer_name: d.orders?.customer?.full_name || 'Customer',
                customer_phone: d.orders?.customer?.phone || '',
                store_name: d.orders?.store?.name || 'Store',
                store_phone: d.orders?.store?.phone,
                delivery_fee: d.delivery_fee || 0,
                notes: d.notes,
                assigned_at: d.assigned_at,
                picked_up_at: d.picked_up_at,
                estimated_delivery: d.estimated_delivery,
                order_number: d.orders?.order_number,
            }))

            setDeliveries(formatted)
        } catch (error) {
            console.error('Error fetching deliveries:', error)
        } finally {
            setIsLoading(false)
            setIsRefreshing(false)
        }
    }, [user, activeTab, supabase])

    useEffect(() => {
        fetchDeliveries()
    }, [fetchDeliveries])

    // Real-time subscription
    useEffect(() => {
        if (!user) return

        const channel = supabase
            .channel('driver-deliveries')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'deliveries',
                    filter: `driver_id=eq.${user.id}`
                },
                () => {
                    fetchDeliveries()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user, supabase, fetchDeliveries])

    const handleRefresh = () => {
        setIsRefreshing(true)
        fetchDeliveries()
    }

    const updateDeliveryStatus = async (deliveryId: string, newStatus: string) => {
        try {
            const updateData: Record<string, string> = { status: newStatus }
            
            if (newStatus === 'picked_up') {
                updateData.picked_up_at = new Date().toISOString()
            } else if (newStatus === 'delivered') {
                updateData.delivered_at = new Date().toISOString()
            }

            const { error } = await supabase
                .from('deliveries')
                .update(updateData)
                .eq('id', deliveryId)

            if (error) throw error

            // Optimistic update
            setDeliveries(prev => 
                prev.map(d => d.id === deliveryId 
                    ? { ...d, status: newStatus } 
                    : d
                )
            )
        } catch (error) {
            console.error('Error updating delivery:', error)
        }
    }

    const getNextAction = (status: string) => {
        switch (status) {
            case 'assigned':
                return { label: 'Picked Up', nextStatus: 'picked_up', variant: 'default' as const }
            case 'picked_up':
                return { label: 'Start Delivery', nextStatus: 'in_transit', variant: 'default' as const }
            case 'in_transit':
                return { label: 'Delivered', nextStatus: 'delivered', variant: 'default' as const }
            default:
                return null
        }
    }

    const activeCount = deliveries.filter(d => 
        ['assigned', 'picked_up', 'in_transit'].includes(d.status)
    ).length

    return (
        <div className="p-4 space-y-4">
            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-3">
                <Card className="bg-blue-500/10 border-blue-500/30">
                    <CardContent className="p-3 text-center">
                        <p className="text-2xl font-bold text-blue-400">{activeCount}</p>
                        <p className="text-xs text-gray-400">Active</p>
                    </CardContent>
                </Card>
                <Card className="bg-green-500/10 border-green-500/30">
                    <CardContent className="p-3 text-center">
                        <p className="text-2xl font-bold text-green-400">
                            ${deliveries.reduce((sum, d) => sum + d.delivery_fee, 0).toFixed(0)}
                        </p>
                        <p className="text-xs text-gray-400">Today</p>
                    </CardContent>
                </Card>
                <Card className="bg-purple-500/10 border-purple-500/30">
                    <CardContent className="p-3 text-center">
                        <p className="text-2xl font-bold text-purple-400">
                            {deliveries.filter(d => d.status === 'in_transit').length}
                        </p>
                        <p className="text-xs text-gray-400">In Transit</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
                <Button
                    variant={activeTab === 'active' ? 'default' : 'outline'}
                    className={cn(
                        "flex-1",
                        activeTab === 'active' && "bg-blue-600 hover:bg-blue-700"
                    )}
                    onClick={() => setActiveTab('active')}
                >
                    Active ({activeCount})
                </Button>
                <Button
                    variant={activeTab === 'completed' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setActiveTab('completed')}
                >
                    Completed
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                >
                    <RefreshCw className={cn("h-5 w-5", isRefreshing && "animate-spin")} />
                </Button>
            </div>

            {/* Deliveries List */}
            <div className="space-y-3">
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <Card key={i} className="bg-gray-800/50 border-gray-700 animate-pulse">
                                <CardContent className="p-4 h-32" />
                            </Card>
                        ))}
                    </div>
                ) : deliveries.length === 0 ? (
                    <Card className="bg-gray-800/50 border-gray-700">
                        <CardContent className="p-8 text-center">
                            <Package className="h-12 w-12 mx-auto text-gray-600 mb-3" />
                            <p className="text-gray-400">
                                {activeTab === 'active' 
                                    ? 'No active deliveries' 
                                    : 'No completed deliveries yet'}
                            </p>
                            {activeTab === 'active' && (
                                <p className="text-sm text-gray-500 mt-2">
                                    New deliveries will appear here when assigned
                                </p>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    deliveries.map(delivery => {
                        const config = STATUS_CONFIG[delivery.status]
                        const nextAction = getNextAction(delivery.status)
                        const Icon = config?.icon || Package

                        return (
                            <Card 
                                key={delivery.id}
                                className={cn(
                                    "bg-gray-800/50 border transition-all",
                                    config?.bgColor || 'border-gray-700'
                                )}
                            >
                                <CardContent className="p-4 space-y-3">
                                    {/* Header */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "p-2 rounded-lg",
                                                config?.color === 'text-blue-400' && "bg-blue-500/20",
                                                config?.color === 'text-purple-400' && "bg-purple-500/20",
                                                config?.color === 'text-indigo-400' && "bg-indigo-500/20"
                                            )}>
                                                <Icon className={cn("h-5 w-5", config?.color)} />
                                            </div>
                                            <div>
                                                <p className="font-mono font-semibold">
                                                    #{delivery.order_number || delivery.id.slice(0, 8)}
                                                </p>
                                                <Badge variant="outline" className={config?.color}>
                                                    {config?.label || delivery.status}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-green-400">
                                                ${delivery.delivery_fee.toFixed(2)}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {formatDistanceToNow(new Date(delivery.assigned_at), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Locations */}
                                    <div className="space-y-2 text-sm">
                                        {/* Pickup */}
                                        <div className="flex items-start gap-2">
                                            <Store className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-white truncate">{delivery.store_name}</p>
                                                <p className="text-gray-400 truncate">{delivery.pickup_address}</p>
                                            </div>
                                            {delivery.store_phone && (
                                                <a 
                                                    href={`tel:${delivery.store_phone}`}
                                                    className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-700"
                                                >
                                                    <Phone className="h-4 w-4 text-gray-400" />
                                                </a>
                                            )}
                                        </div>

                                        {/* Delivery */}
                                        <div className="flex items-start gap-2">
                                            <MapPin className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-white truncate">{delivery.customer_name}</p>
                                                <p className="text-gray-400 truncate">{delivery.delivery_address}</p>
                                            </div>
                                            <a 
                                                href={`tel:${delivery.customer_phone}`}
                                                className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-700"
                                            >
                                                <Phone className="h-4 w-4 text-gray-400" />
                                            </a>
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    {delivery.notes && (
                                        <div className="flex items-start gap-2 p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                                            <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                                            <p className="text-xs text-yellow-400">{delivery.notes}</p>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    {activeTab === 'active' && (
                                        <div className="flex gap-2 pt-2 border-t border-gray-700">
                                            {/* Navigate Button */}
                                            <Button
                                                variant="outline"
                                                className="flex-1 border-gray-700"
                                                asChild
                                            >
                                                <a 
                                                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                                                        delivery.status === 'assigned' 
                                                            ? delivery.pickup_address 
                                                            : delivery.delivery_address
                                                    )}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <Navigation className="h-4 w-4 mr-2" />
                                                    Navigate
                                                </a>
                                            </Button>

                                            {/* Status Action */}
                                            {nextAction && (
                                                <Button
                                                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                                                    onClick={() => updateDeliveryStatus(delivery.id, nextAction.nextStatus)}
                                                >
                                                    <CheckCircle className="h-4 w-4 mr-2" />
                                                    {nextAction.label}
                                                </Button>
                                            )}
                                        </div>
                                    )}

                                    {/* View Details Link */}
                                    <Link 
                                        href={`/driver/delivery/${delivery.id}`}
                                        className="flex items-center justify-center gap-1 text-sm text-blue-400 hover:text-blue-300 pt-2"
                                    >
                                        View Details
                                        <ChevronRight className="h-4 w-4" />
                                    </Link>
                                </CardContent>
                            </Card>
                        )
                    })
                )}
            </div>
        </div>
    )
}
