'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Clock,
    Package,
    Truck,
    CheckCircle,
    AlertTriangle,
    TrendingUp,
    DollarSign,
    Timer,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface OrderMetrics {
    pending: number
    confirmed: number
    preparing: number
    ready: number
    outForDelivery: number
    completed: number
    todayTotal: number
    todayRevenue: number
    avgPrepTime: number // in minutes
    delayedOrders: number // orders taking too long
}

interface OrdersMetricsBarProps {
    metrics: OrderMetrics
    className?: string
}

export function OrdersMetricsBar({ metrics, className }: OrdersMetricsBarProps) {
    const totalActive = metrics.pending + metrics.confirmed + metrics.preparing + metrics.ready + metrics.outForDelivery

    return (
        <div className={cn('grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3', className)}>
            {/* Pending - Needs attention */}
            <MetricCard
                icon={Clock}
                label="Pending"
                value={metrics.pending}
                color="yellow"
                pulse={metrics.pending > 0}
            />

            {/* Confirmed */}
            <MetricCard
                icon={CheckCircle}
                label="Confirmed"
                value={metrics.confirmed}
                color="blue"
            />

            {/* Preparing */}
            <MetricCard
                icon={Package}
                label="Preparing"
                value={metrics.preparing}
                color="purple"
            />

            {/* Ready */}
            <MetricCard
                icon={CheckCircle}
                label="Ready"
                value={metrics.ready}
                color="orange"
                pulse={metrics.ready > 0}
            />

            {/* Out for Delivery */}
            <MetricCard
                icon={Truck}
                label="Delivering"
                value={metrics.outForDelivery}
                color="indigo"
            />

            {/* Completed Today */}
            <MetricCard
                icon={TrendingUp}
                label="Completed"
                value={metrics.completed}
                color="green"
                subtitle="today"
            />

            {/* Today's Revenue */}
            <MetricCard
                icon={DollarSign}
                label="Revenue"
                value={`$${metrics.todayRevenue.toLocaleString()}`}
                color="green"
                subtitle="today"
                isText
            />

            {/* Delayed Orders Alert */}
            <MetricCard
                icon={metrics.delayedOrders > 0 ? AlertTriangle : Timer}
                label={metrics.delayedOrders > 0 ? 'Delayed' : 'Avg Time'}
                value={metrics.delayedOrders > 0 ? metrics.delayedOrders : `${metrics.avgPrepTime}m`}
                color={metrics.delayedOrders > 0 ? 'red' : 'gray'}
                pulse={metrics.delayedOrders > 0}
                isText={metrics.delayedOrders === 0}
            />
        </div>
    )
}

interface MetricCardProps {
    icon: React.ComponentType<{ className?: string }>
    label: string
    value: number | string
    color: 'yellow' | 'blue' | 'purple' | 'orange' | 'indigo' | 'green' | 'red' | 'gray'
    subtitle?: string
    pulse?: boolean
    isText?: boolean
}

const colorClasses = {
    yellow: {
        bg: 'bg-yellow-500/10',
        text: 'text-yellow-400',
        border: 'border-yellow-500/30',
    },
    blue: {
        bg: 'bg-blue-500/10',
        text: 'text-blue-400',
        border: 'border-blue-500/30',
    },
    purple: {
        bg: 'bg-purple-500/10',
        text: 'text-purple-400',
        border: 'border-purple-500/30',
    },
    orange: {
        bg: 'bg-orange-500/10',
        text: 'text-orange-400',
        border: 'border-orange-500/30',
    },
    indigo: {
        bg: 'bg-indigo-500/10',
        text: 'text-indigo-400',
        border: 'border-indigo-500/30',
    },
    green: {
        bg: 'bg-green-500/10',
        text: 'text-green-400',
        border: 'border-green-500/30',
    },
    red: {
        bg: 'bg-red-500/10',
        text: 'text-red-400',
        border: 'border-red-500/30',
    },
    gray: {
        bg: 'bg-gray-500/10',
        text: 'text-gray-400',
        border: 'border-gray-500/30',
    },
}

function MetricCard({ icon: Icon, label, value, color, subtitle, pulse, isText }: MetricCardProps) {
    const colors = colorClasses[color]

    return (
        <Card className={cn('border', colors.border, colors.bg)}>
            <CardContent className="p-3">
                <div className="flex items-center gap-2">
                    <div className={cn('p-1.5 rounded', colors.bg)}>
                        <Icon className={cn('h-4 w-4', colors.text, pulse && 'animate-pulse')} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-gray-400 truncate">{label}</p>
                        <div className="flex items-baseline gap-1">
                            <span className={cn('text-lg font-bold', isText ? colors.text : 'text-white')}>
                                {value}
                            </span>
                            {subtitle && (
                                <span className="text-xs text-gray-500">{subtitle}</span>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

// Helper function to calculate metrics from orders
export function calculateOrderMetrics(orders: any[], todayStart: Date): OrderMetrics {
    const now = new Date()
    const todayOrders = orders.filter(o => new Date(o.createdAt) >= todayStart)

    // Count by status
    const pending = orders.filter(o => o.status === 'pending').length
    const confirmed = orders.filter(o => o.status === 'confirmed').length
    const preparing = orders.filter(o => ['processing', 'preparing'].includes(o.status)).length
    const ready = orders.filter(o => ['ready_for_pickup', 'ready'].includes(o.status)).length
    const outForDelivery = orders.filter(o => o.status === 'out_for_delivery').length
    const completed = todayOrders.filter(o => ['delivered', 'completed'].includes(o.status)).length

    // Calculate revenue for completed orders today
    const todayRevenue = todayOrders
        .filter(o => ['delivered', 'completed'].includes(o.status))
        .reduce((sum, o) => sum + (o.total || 0), 0)

    // Calculate average preparation time for completed orders
    const completedWithTime = orders
        .filter(o => o.status === 'completed' && o.statusChangedAt)
        .slice(0, 20) // Last 20 completed orders

    let avgPrepTime = 0
    if (completedWithTime.length > 0) {
        const totalMinutes = completedWithTime.reduce((sum, o) => {
            const start = new Date(o.createdAt)
            const end = new Date(o.statusChangedAt)
            return sum + Math.round((end.getTime() - start.getTime()) / 60000)
        }, 0)
        avgPrepTime = Math.round(totalMinutes / completedWithTime.length)
    }

    // Count delayed orders (preparing for more than 30 minutes)
    const DELAY_THRESHOLD = 30 // minutes
    const delayedOrders = orders.filter(o => {
        if (!['processing', 'preparing'].includes(o.status)) return false
        const startTime = o.statusChangedAt ? new Date(o.statusChangedAt) : new Date(o.createdAt)
        const minutes = Math.round((now.getTime() - startTime.getTime()) / 60000)
        return minutes > DELAY_THRESHOLD
    }).length

    return {
        pending,
        confirmed,
        preparing,
        ready,
        outForDelivery,
        completed,
        todayTotal: todayOrders.length,
        todayRevenue,
        avgPrepTime,
        delayedOrders,
    }
}
