'use client'

import { Card, CardContent } from '@/components/ui/card'
import {
    Clock,
    Truck,
    CheckCircle,
    AlertTriangle,
    Package,
    User,
    Timer,
    DollarSign,
    MapPin,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DeliveryMetrics {
    pending: number
    assigned: number
    pickedUp: number
    inTransit: number
    delivered: number
    failed: number
    todayTotal: number
    todayRevenue: number
    avgDeliveryTime: number // in minutes
    activeDrivers: number
    totalDrivers: number
}

interface DeliveryMetricsBarProps {
    metrics: DeliveryMetrics
    className?: string
}

export function DeliveryMetricsBar({ metrics, className }: DeliveryMetricsBarProps) {
    const totalActive = metrics.pending + metrics.assigned + metrics.pickedUp + metrics.inTransit

    return (
        <div className={cn('grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-8 gap-2 md:gap-3', className)}>
            {/* Pending - Needs assignment */}
            <MetricCard
                icon={Clock}
                label="Pending"
                value={metrics.pending}
                color="yellow"
                pulse={metrics.pending > 0}
            />

            {/* Assigned */}
            <MetricCard
                icon={User}
                label="Assigned"
                value={metrics.assigned}
                color="blue"
            />

            {/* Picked Up */}
            <MetricCard
                icon={Package}
                label="Picked Up"
                value={metrics.pickedUp}
                color="purple"
            />

            {/* In Transit */}
            <MetricCard
                icon={Truck}
                label="In Transit"
                value={metrics.inTransit}
                color="indigo"
                pulse={metrics.inTransit > 0}
            />

            {/* Delivered Today */}
            <MetricCard
                icon={CheckCircle}
                label="Delivered"
                value={metrics.delivered}
                color="green"
                subtitle="today"
            />

            {/* Failed */}
            {metrics.failed > 0 && (
                <MetricCard
                    icon={AlertTriangle}
                    label="Failed"
                    value={metrics.failed}
                    color="red"
                    pulse
                />
            )}

            {/* Active Drivers */}
            <MetricCard
                icon={MapPin}
                label="Drivers"
                value={`${metrics.activeDrivers}/${metrics.totalDrivers}`}
                color="blue"
                isText
            />

            {/* Revenue Today */}
            <MetricCard
                icon={DollarSign}
                label="Revenue"
                value={`$${metrics.todayRevenue.toFixed(0)}`}
                color="green"
                subtitle="today"
                isText
            />

            {/* Average Delivery Time */}
            <MetricCard
                icon={Timer}
                label="Avg Time"
                value={`${metrics.avgDeliveryTime}m`}
                color="gray"
                isText
            />
        </div>
    )
}

interface MetricCardProps {
    icon: React.ComponentType<{ className?: string }>
    label: string
    value: number | string
    color: 'yellow' | 'blue' | 'purple' | 'indigo' | 'green' | 'red' | 'gray'
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

// Helper function to calculate metrics from deliveries
export function calculateDeliveryMetrics(
    deliveries: any[],
    drivers: { isAvailable: boolean }[],
    todayStart: Date
): DeliveryMetrics {
    const todayDeliveries = deliveries.filter(d => new Date(d.assignedAt || d.created_at) >= todayStart)

    // Count by status
    const pending = deliveries.filter(d => d.status === 'pending').length
    const assigned = deliveries.filter(d => d.status === 'assigned').length
    const pickedUp = deliveries.filter(d => d.status === 'picked_up').length
    const inTransit = deliveries.filter(d => d.status === 'in_transit').length
    const delivered = todayDeliveries.filter(d => d.status === 'delivered').length
    const failed = deliveries.filter(d => d.status === 'failed').length

    // Calculate revenue for delivered today
    const todayRevenue = todayDeliveries
        .filter(d => d.status === 'delivered')
        .reduce((sum, d) => sum + (d.deliveryFee || 0), 0)

    // Calculate average delivery time for completed deliveries
    const completedWithTime = deliveries
        .filter(d => d.status === 'delivered' && d.assignedAt && d.deliveredAt)
        .slice(0, 20)

    let avgDeliveryTime = 0
    if (completedWithTime.length > 0) {
        const totalMinutes = completedWithTime.reduce((sum, d) => {
            const start = new Date(d.assignedAt)
            const end = new Date(d.deliveredAt)
            return sum + Math.round((end.getTime() - start.getTime()) / 60000)
        }, 0)
        avgDeliveryTime = Math.round(totalMinutes / completedWithTime.length)
    }

    // Driver stats
    const activeDrivers = drivers.filter(d => d.isAvailable).length
    const totalDrivers = drivers.length

    return {
        pending,
        assigned,
        pickedUp,
        inTransit,
        delivered,
        failed,
        todayTotal: todayDeliveries.length,
        todayRevenue,
        avgDeliveryTime,
        activeDrivers,
        totalDrivers,
    }
}
