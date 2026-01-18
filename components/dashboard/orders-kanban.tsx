'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    AlertCircle,
    CheckCircle,
    Package,
    Truck,
    Clock,
    MoreVertical,
    Eye,
    User,
    MapPin,
    Timer,
    ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow, differenceInMinutes } from 'date-fns'
import Link from 'next/link'

// Order type matching the parent component
interface OrderItem {
    id: string
    productName: string
    productImage?: string
    quantity: number
    unitPrice: number
    total: number
}

interface Order {
    id: string
    orderNumber: string
    customer: {
        id: string
        name: string
        email: string
        phone?: string
    }
    items: OrderItem[]
    total: number
    status: string
    paymentStatus: string
    fulfillmentType: 'delivery' | 'pickup'
    deliveryAddress?: {
        name: string
        street: string
        city: string
        state: string
        zipCode: string
        phone?: string
        notes?: string
    }
    createdAt: string
    notes?: string
    // Delivery tracking fields
    delivery?: {
        id: string
        status: string
        driverName?: string
        estimatedDeliveryTime?: string
    }
    statusChangedAt?: string
}

// Kanban column configuration
const KANBAN_COLUMNS = [
    {
        id: 'pending',
        title: 'Pending',
        description: 'Awaiting confirmation',
        icon: AlertCircle,
        color: 'border-yellow-500/50',
        headerColor: 'bg-yellow-500/10 text-yellow-400',
        statuses: ['pending'],
    },
    {
        id: 'confirmed',
        title: 'Confirmed',
        description: 'Order accepted',
        icon: CheckCircle,
        color: 'border-blue-500/50',
        headerColor: 'bg-blue-500/10 text-blue-400',
        statuses: ['confirmed'],
    },
    {
        id: 'preparing',
        title: 'Preparing',
        description: 'In preparation',
        icon: Package,
        color: 'border-purple-500/50',
        headerColor: 'bg-purple-500/10 text-purple-400',
        statuses: ['processing', 'preparing'],
    },
    {
        id: 'ready',
        title: 'Ready',
        description: 'Ready for pickup/delivery',
        icon: CheckCircle,
        color: 'border-orange-500/50',
        headerColor: 'bg-orange-500/10 text-orange-400',
        statuses: ['ready_for_pickup', 'ready'],
    },
    {
        id: 'out_for_delivery',
        title: 'Out for Delivery',
        description: 'Being delivered',
        icon: Truck,
        color: 'border-indigo-500/50',
        headerColor: 'bg-indigo-500/10 text-indigo-400',
        statuses: ['out_for_delivery'],
    },
    {
        id: 'completed',
        title: 'Completed',
        description: 'Successfully delivered',
        icon: CheckCircle,
        color: 'border-green-500/50',
        headerColor: 'bg-green-500/10 text-green-400',
        statuses: ['delivered', 'completed'],
    },
]

// Preparation time thresholds (in minutes)
const PREP_TIME_WARNING = 15 // Yellow warning
const PREP_TIME_URGENT = 30 // Red urgent

interface OrdersKanbanProps {
    orders: Order[]
    onStatusChange: (orderId: string, newStatus: string) => Promise<void>
    onOrderClick?: (order: Order) => void
    isUpdating?: boolean
}

export function OrdersKanban({ orders, onStatusChange, onOrderClick, isUpdating }: OrdersKanbanProps) {
    const [draggedOrder, setDraggedOrder] = useState<Order | null>(null)
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

    // Group orders by column
    const ordersByColumn = KANBAN_COLUMNS.reduce((acc, column) => {
        acc[column.id] = orders.filter(order => column.statuses.includes(order.status))
        return acc
    }, {} as Record<string, Order[]>)

    // Handle drag start
    const handleDragStart = (e: React.DragEvent, order: Order) => {
        setDraggedOrder(order)
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', order.id)
    }

    // Handle drag over column
    const handleDragOver = (e: React.DragEvent, columnId: string) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setDragOverColumn(columnId)
    }

    // Handle drag leave
    const handleDragLeave = () => {
        setDragOverColumn(null)
    }

    // Handle drop
    const handleDrop = async (e: React.DragEvent, columnId: string) => {
        e.preventDefault()
        setDragOverColumn(null)

        if (!draggedOrder) return

        // Get the target status for this column
        const column = KANBAN_COLUMNS.find(c => c.id === columnId)
        if (!column) return

        // Don't do anything if dropping in the same column
        if (column.statuses.includes(draggedOrder.status)) {
            setDraggedOrder(null)
            return
        }

        // Get the primary status for this column
        const newStatus = column.statuses[0]

        try {
            await onStatusChange(draggedOrder.id, newStatus)
        } catch (error) {
            console.error('Failed to update order status:', error)
        }

        setDraggedOrder(null)
    }

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-300px)]">
            {KANBAN_COLUMNS.map((column) => {
                const columnOrders = ordersByColumn[column.id] || []
                const Icon = column.icon

                return (
                    <div
                        key={column.id}
                        className={cn(
                            'flex-shrink-0 w-[320px] rounded-lg border bg-gray-900/50',
                            column.color,
                            dragOverColumn === column.id && 'ring-2 ring-primary'
                        )}
                        onDragOver={(e) => handleDragOver(e, column.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, column.id)}
                    >
                        {/* Column Header */}
                        <div className={cn('px-4 py-3 border-b border-gray-800 rounded-t-lg', column.headerColor)}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4" />
                                    <span className="font-semibold">{column.title}</span>
                                </div>
                                <Badge variant="secondary" className="bg-white/10">
                                    {columnOrders.length}
                                </Badge>
                            </div>
                            <p className="text-xs opacity-70 mt-1">{column.description}</p>
                        </div>

                        {/* Column Content */}
                        <ScrollArea className="h-[calc(100vh-400px)] min-h-[400px]">
                            <div className="p-3 space-y-3">
                                {columnOrders.length === 0 ? (
                                    <div className="py-8 text-center text-gray-500">
                                        <p className="text-sm">No orders</p>
                                    </div>
                                ) : (
                                    columnOrders.map((order) => (
                                        <OrderCard
                                            key={order.id}
                                            order={order}
                                            onDragStart={handleDragStart}
                                            onClick={() => onOrderClick?.(order)}
                                            columnId={column.id}
                                            onStatusChange={onStatusChange}
                                            isUpdating={isUpdating}
                                        />
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                )
            })}
        </div>
    )
}

// Individual order card component
interface OrderCardProps {
    order: Order
    onDragStart: (e: React.DragEvent, order: Order) => void
    onClick?: () => void
    columnId: string
    onStatusChange: (orderId: string, newStatus: string) => Promise<void>
    isUpdating?: boolean
}

function OrderCard({ order, onDragStart, onClick, columnId, onStatusChange, isUpdating }: OrderCardProps) {
    const [prepTime, setPrepTime] = useState<number>(0)

    // Calculate preparation time for orders in "preparing" status
    useEffect(() => {
        if (columnId !== 'preparing') return

        const calculateTime = () => {
            const startTime = order.statusChangedAt ? new Date(order.statusChangedAt) : new Date(order.createdAt)
            setPrepTime(differenceInMinutes(new Date(), startTime))
        }

        calculateTime()
        const interval = setInterval(calculateTime, 60000) // Update every minute

        return () => clearInterval(interval)
    }, [order.statusChangedAt, order.createdAt, columnId])

    // Get time indicator color
    const getTimeColor = () => {
        if (prepTime >= PREP_TIME_URGENT) return 'text-red-400 bg-red-500/20'
        if (prepTime >= PREP_TIME_WARNING) return 'text-yellow-400 bg-yellow-500/20'
        return 'text-gray-400 bg-gray-500/20'
    }

    // Get next status options
    const getNextStatusOptions = () => {
        switch (columnId) {
            case 'pending':
                return [
                    { status: 'confirmed', label: 'Confirm Order' },
                    { status: 'cancelled', label: 'Cancel Order' },
                ]
            case 'confirmed':
                return [{ status: 'processing', label: 'Start Preparing' }]
            case 'preparing':
                return [{ status: 'ready_for_pickup', label: 'Mark Ready' }]
            case 'ready':
                return order.fulfillmentType === 'delivery'
                    ? [{ status: 'out_for_delivery', label: 'Out for Delivery' }]
                    : [{ status: 'completed', label: 'Complete (Picked Up)' }]
            case 'out_for_delivery':
                return [{ status: 'completed', label: 'Mark Delivered' }]
            default:
                return []
        }
    }

    const nextOptions = getNextStatusOptions()

    return (
        <Card
            className={cn(
                'cursor-grab active:cursor-grabbing bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-all',
                'hover:shadow-lg hover:shadow-black/20'
            )}
            draggable
            onDragStart={(e) => onDragStart(e, order)}
        >
            <CardContent className="p-3 space-y-3">
                {/* Header: Order Number & Actions */}
                <div className="flex items-start justify-between">
                    <div>
                        <Link
                            href={`/dashboard/store/orders/${order.id}`}
                            className="font-mono text-sm font-semibold text-white hover:text-orange-400 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                        >
                            #{order.orderNumber}
                        </Link>
                        <p className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                        </p>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isUpdating}>
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-gray-900 border-gray-800">
                            <DropdownMenuItem asChild>
                                <Link href={`/dashboard/store/orders/${order.id}`} className="flex items-center">
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                </Link>
                            </DropdownMenuItem>
                            {nextOptions.map((option) => (
                                <DropdownMenuItem
                                    key={option.status}
                                    onClick={() => onStatusChange(order.id, option.status)}
                                    className={option.status === 'cancelled' ? 'text-red-400' : ''}
                                >
                                    <ChevronRight className="mr-2 h-4 w-4" />
                                    {option.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Customer Info */}
                <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-300 truncate">{order.customer.name}</span>
                </div>

                {/* Items Summary */}
                <div className="text-xs text-gray-400">
                    {order.items.length} item{order.items.length !== 1 ? 's' : ''} •{' '}
                    <span className="text-white font-medium">${order.total.toFixed(2)}</span>
                </div>

                {/* Fulfillment Type Badge */}
                <div className="flex items-center gap-2">
                    <Badge
                        variant="outline"
                        className={cn(
                            'text-xs',
                            order.fulfillmentType === 'delivery'
                                ? 'border-blue-500/50 text-blue-400'
                                : 'border-orange-500/50 text-orange-400'
                        )}
                    >
                        {order.fulfillmentType === 'delivery' ? (
                            <>
                                <Truck className="h-3 w-3 mr-1" />
                                Delivery
                            </>
                        ) : (
                            <>
                                <MapPin className="h-3 w-3 mr-1" />
                                Pickup
                            </>
                        )}
                    </Badge>

                    {/* Preparation Timer (only for preparing column) */}
                    {columnId === 'preparing' && (
                        <Badge variant="outline" className={cn('text-xs', getTimeColor())}>
                            <Timer className="h-3 w-3 mr-1" />
                            {prepTime}m
                        </Badge>
                    )}
                </div>

                {/* Delivery Status (if applicable) */}
                {order.delivery && columnId === 'out_for_delivery' && (
                    <div className="pt-2 border-t border-gray-700">
                        <div className="flex items-center gap-2 text-xs">
                            <Truck className="h-3 w-3 text-indigo-400" />
                            <span className="text-gray-400">
                                Driver: {order.delivery.driverName || 'Assigned'}
                            </span>
                        </div>
                    </div>
                )}

                {/* Quick Action Button */}
                {nextOptions.length > 0 && nextOptions[0].status !== 'cancelled' && (
                    <Button
                        size="sm"
                        className="w-full mt-2"
                        variant={columnId === 'preparing' ? 'default' : 'secondary'}
                        onClick={(e) => {
                            e.stopPropagation()
                            onStatusChange(order.id, nextOptions[0].status)
                        }}
                        disabled={isUpdating}
                    >
                        {nextOptions[0].label}
                    </Button>
                )}
            </CardContent>
        </Card>
    )
}
