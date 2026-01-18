'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import {
    Clock,
    CheckCircle,
    Package,
    Truck,
    User,
    MapPin,
    Phone,
    MoreVertical,
    ChevronRight,
    ChevronDown,
    Store,
    Navigation,
    AlertTriangle,
    HelpCircle,
    GripVertical,
    ArrowRight,
    Info,
    Lock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface Delivery {
    id: string
    status: string
    orderNumber: string
    storeName: string
    storeAddress?: string
    customerName: string
    customerPhone?: string
    address: string
    driverName?: string
    driverPhone?: string
    driverId?: string
    assignedAt: string
    pickedUpAt?: string
    deliveredAt?: string
    deliveryFee: number
    notes?: string
    estimatedTime?: number // minutes
}

interface Driver {
    id: string
    name: string
    isAvailable: boolean
    vehicleType?: string
    phone?: string
}

// Kanban column configuration for deliveries
const DELIVERY_COLUMNS = [
    {
        id: 'pending',
        title: 'Pending',
        description: 'Awaiting driver assignment',
        icon: Clock,
        color: 'border-yellow-500/50',
        headerColor: 'bg-yellow-500/10 text-yellow-400',
        statuses: ['pending'],
    },
    {
        id: 'assigned',
        title: 'Assigned',
        description: 'Driver on the way to store',
        icon: User,
        color: 'border-blue-500/50',
        headerColor: 'bg-blue-500/10 text-blue-400',
        statuses: ['assigned'],
    },
    {
        id: 'picked_up',
        title: 'Picked Up',
        description: 'Order collected from store',
        icon: Package,
        color: 'border-purple-500/50',
        headerColor: 'bg-purple-500/10 text-purple-400',
        statuses: ['picked_up'],
    },
    {
        id: 'in_transit',
        title: 'In Transit',
        description: 'On the way to customer',
        icon: Truck,
        color: 'border-indigo-500/50',
        headerColor: 'bg-indigo-500/10 text-indigo-400',
        statuses: ['in_transit'],
    },
    {
        id: 'delivered',
        title: 'Delivered',
        description: 'Successfully completed',
        icon: CheckCircle,
        color: 'border-green-500/50',
        headerColor: 'bg-green-500/10 text-green-400',
        statuses: ['delivered'],
    },
    {
        id: 'failed',
        title: 'Failed',
        description: 'Delivery failed',
        icon: AlertTriangle,
        color: 'border-red-500/50',
        headerColor: 'bg-red-500/10 text-red-400',
        statuses: ['failed'],
    },
]

interface DeliveriesKanbanProps {
    deliveries: Delivery[]
    drivers: Driver[]
    onStatusChange: (deliveryId: string, newStatus: string) => Promise<void>
    onAssignDriver: (deliveryId: string, driverId: string) => Promise<void>
    onAutoAssign?: (deliveryId: string) => Promise<void>
    onDeliveryClick?: (delivery: Delivery) => void
    isUpdating?: boolean
}

export function DeliveriesKanban({
    deliveries,
    drivers,
    onStatusChange,
    onAssignDriver,
    onAutoAssign,
    onDeliveryClick,
    isUpdating,
}: DeliveriesKanbanProps) {
    const [draggedDelivery, setDraggedDelivery] = useState<Delivery | null>(null)
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

    // Group deliveries by column
    const deliveriesByColumn = DELIVERY_COLUMNS.reduce((acc, column) => {
        acc[column.id] = deliveries.filter(d => column.statuses.includes(d.status))
        return acc
    }, {} as Record<string, Delivery[]>)

    // Available drivers for assignment
    const availableDrivers = drivers.filter(d => d.isAvailable)

    // Handle drag events
    const handleDragStart = (e: React.DragEvent, delivery: Delivery) => {
        // Prevent dragging pending deliveries (need driver first)
        if (delivery.status === 'pending') {
            e.preventDefault()
            return
        }
        setDraggedDelivery(delivery)
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleDragOver = (e: React.DragEvent, columnId: string) => {
        e.preventDefault()
        setDragOverColumn(columnId)
    }

    const handleDragLeave = () => {
        setDragOverColumn(null)
    }

    const handleDrop = async (e: React.DragEvent, columnId: string) => {
        e.preventDefault()
        setDragOverColumn(null)

        if (!draggedDelivery) return

        const column = DELIVERY_COLUMNS.find(c => c.id === columnId)
        if (!column || column.statuses.includes(draggedDelivery.status)) {
            setDraggedDelivery(null)
            return
        }

        const newStatus = column.statuses[0]
        await onStatusChange(draggedDelivery.id, newStatus)
        setDraggedDelivery(null)
    }

    return (
        <TooltipProvider>
        <div className="space-y-4">
            {/* Quick Guide */}
            <QuickGuide />
            
            {/* Kanban Board */}
            <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-350px)]">
            {DELIVERY_COLUMNS.map((column) => {
                const columnDeliveries = deliveriesByColumn[column.id] || []
                const Icon = column.icon

                return (
                    <div
                        key={column.id}
                        className={cn(
                            'flex-shrink-0 w-[280px] rounded-lg border bg-gray-900/50',
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
                                    {columnDeliveries.length}
                                </Badge>
                            </div>
                            <p className="text-xs opacity-70 mt-1">{column.description}</p>
                        </div>

                        {/* Column Content */}
                        <ScrollArea className="h-[calc(100vh-450px)] min-h-[350px]">
                            <div className="p-3 space-y-3">
                                {columnDeliveries.length === 0 ? (
                                    <div className="py-8 text-center text-gray-500">
                                        <p className="text-sm">No deliveries</p>
                                    </div>
                                ) : (
                                    columnDeliveries.map((delivery) => (
                                        <DeliveryCard
                                            key={delivery.id}
                                            delivery={delivery}
                                            drivers={availableDrivers}
                                            columnId={column.id}
                                            onDragStart={handleDragStart}
                                            onClick={() => onDeliveryClick?.(delivery)}
                                            onStatusChange={onStatusChange}
                                            onAssignDriver={onAssignDriver}
                                            onAutoAssign={onAutoAssign}
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
        </div>
        </TooltipProvider>
    )
}

// Quick Guide Component
function QuickGuide() {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-800/70 transition-colors rounded-lg"
            >
                <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-md bg-blue-500/20">
                        <HelpCircle className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-white">Delivery Flow Guide</p>
                        <p className="text-xs text-gray-400">Learn how to manage deliveries with drag & drop</p>
                    </div>
                </div>
                <ChevronDown className={cn(
                    "h-4 w-4 text-gray-400 transition-transform",
                    isOpen && "rotate-180"
                )} />
            </button>
            {isOpen && (
                <div className="px-4 pb-4 pt-2 border-t border-gray-700/50">
                    {/* Flow Visualization */}
                    <div className="flex items-center justify-center gap-1 flex-wrap mb-4 py-3 bg-gray-900/50 rounded-lg">
                        <FlowStep icon={Clock} label="Pending" color="yellow" locked />
                        <ArrowRight className="h-4 w-4 text-gray-600 mx-1" />
                        <FlowStep icon={User} label="Assigned" color="blue" />
                        <ArrowRight className="h-4 w-4 text-gray-600 mx-1" />
                        <FlowStep icon={Package} label="Picked Up" color="purple" />
                        <ArrowRight className="h-4 w-4 text-gray-600 mx-1" />
                        <FlowStep icon={Truck} label="In Transit" color="indigo" />
                        <ArrowRight className="h-4 w-4 text-gray-600 mx-1" />
                        <FlowStep icon={CheckCircle} label="Delivered" color="green" />
                    </div>

                    {/* Instructions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                            <Lock className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-yellow-400">Pending Deliveries</p>
                                <p className="text-gray-400 text-xs mt-1">
                                    Can't be dragged. Use <span className="text-blue-400">Smart Auto-Assign</span> or <span className="text-blue-400">Manual Assign</span> to assign a driver first.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <GripVertical className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-blue-400">Drag & Drop</p>
                                <p className="text-gray-400 text-xs mt-1">
                                    Once assigned, drag cards between columns to update status. Or use the quick action buttons.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Status Descriptions */}
                    <div className="mt-3 pt-3 border-t border-gray-700/50">
                        <p className="text-xs font-medium text-gray-400 mb-2">Status Descriptions:</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                            <StatusDesc color="yellow" label="Pending" desc="Waiting for driver" />
                            <StatusDesc color="blue" label="Assigned" desc="Driver heading to store" />
                            <StatusDesc color="purple" label="Picked Up" desc="Order collected" />
                            <StatusDesc color="indigo" label="In Transit" desc="On the way to customer" />
                            <StatusDesc color="green" label="Delivered" desc="Successfully completed" />
                            <StatusDesc color="red" label="Failed" desc="Delivery unsuccessful" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// Flow Step Component
function FlowStep({ 
    icon: Icon, 
    label, 
    color, 
    locked 
}: { 
    icon: React.ComponentType<{ className?: string }>
    label: string
    color: string
    locked?: boolean 
}) {
    const colorClasses: Record<string, string> = {
        yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        indigo: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
        green: 'bg-green-500/20 text-green-400 border-green-500/30',
    }

    return (
        <div className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs",
            colorClasses[color],
            locked && "opacity-70"
        )}>
            <Icon className="h-3 w-3" />
            <span>{label}</span>
            {locked && <Lock className="h-2.5 w-2.5 ml-0.5" />}
        </div>
    )
}

// Status Description Component
function StatusDesc({ color, label, desc }: { color: string; label: string; desc: string }) {
    const dotColors: Record<string, string> = {
        yellow: 'bg-yellow-400',
        blue: 'bg-blue-400',
        purple: 'bg-purple-400',
        indigo: 'bg-indigo-400',
        green: 'bg-green-400',
        red: 'bg-red-400',
    }

    return (
        <div className="flex items-center gap-2 text-gray-400">
            <div className={cn("h-2 w-2 rounded-full", dotColors[color])} />
            <span><span className="text-white">{label}:</span> {desc}</span>
        </div>
    )
}

interface DeliveryCardProps {
    delivery: Delivery
    drivers: Driver[]
    columnId: string
    onDragStart: (e: React.DragEvent, delivery: Delivery) => void
    onClick?: () => void
    onStatusChange: (deliveryId: string, newStatus: string) => Promise<void>
    onAssignDriver: (deliveryId: string, driverId: string) => Promise<void>
    onAutoAssign?: (deliveryId: string) => Promise<void>
    isUpdating?: boolean
}

function DeliveryCard({
    delivery,
    drivers,
    columnId,
    onDragStart,
    onClick,
    onStatusChange,
    onAssignDriver,
    onAutoAssign,
    isUpdating,
}: DeliveryCardProps) {
    const [showDrivers, setShowDrivers] = useState(false)

    // Get next status options
    const getNextStatusOptions = () => {
        switch (columnId) {
            case 'pending':
                return [] // Need to assign driver first
            case 'assigned':
                return [{ status: 'picked_up', label: 'Mark Picked Up' }]
            case 'picked_up':
                return [{ status: 'in_transit', label: 'Start Delivery' }]
            case 'in_transit':
                return [
                    { status: 'delivered', label: 'Mark Delivered' },
                    { status: 'failed', label: 'Mark Failed' },
                ]
            case 'failed':
                return [{ status: 'pending', label: 'Retry Delivery' }]
            default:
                return []
        }
    }

    const nextOptions = getNextStatusOptions()
    const isPending = columnId === 'pending'
    const canDrag = !isPending

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Card
                    className={cn(
                        'bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-all',
                        'hover:shadow-lg hover:shadow-black/20',
                        canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-not-allowed'
                    )}
                    draggable={canDrag}
                    onDragStart={(e) => onDragStart(e, delivery)}
                    onClick={onClick}
                >
                    <CardContent className="p-3 space-y-3">
                        {/* Pending Lock Indicator */}
                        {isPending && (
                            <div className="flex items-center gap-2 text-xs text-yellow-400/80 bg-yellow-500/10 px-2 py-1 rounded -mt-1 -mx-1 mb-2">
                                <Lock className="h-3 w-3" />
                                <span>Assign driver to unlock drag</span>
                            </div>
                        )}
                        
                        {/* Header: Order Number & Store */}
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                                {canDrag && (
                                    <GripVertical className="h-4 w-4 text-gray-600 flex-shrink-0" />
                                )}
                                <div>
                                    <p className="font-mono text-sm font-semibold text-white">
                                        #{delivery.orderNumber}
                                    </p>
                                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                                        <Store className="h-3 w-3" />
                                        <span className="truncate max-w-[130px]">{delivery.storeName}</span>
                                    </div>
                                </div>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isUpdating}>
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-gray-900 border-gray-800">
                            {nextOptions.map((option) => (
                                <DropdownMenuItem
                                    key={option.status}
                                    onClick={() => onStatusChange(delivery.id, option.status)}
                                    className={option.status === 'failed' ? 'text-red-400' : ''}
                                >
                                    <ChevronRight className="mr-2 h-4 w-4" />
                                    {option.label}
                                </DropdownMenuItem>
                            ))}
                            {delivery.customerPhone && (
                                <DropdownMenuItem asChild>
                                    <a href={`tel:${delivery.customerPhone}`} className="flex items-center">
                                        <Phone className="mr-2 h-4 w-4" />
                                        Call Customer
                                    </a>
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Customer Info */}
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-300 truncate">{delivery.customerName}</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-gray-400">
                        <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{delivery.address}</span>
                    </div>
                </div>

                {/* Driver Info (if assigned) */}
                {delivery.driverName && (
                    <div className="flex items-center gap-2 text-sm pt-2 border-t border-gray-700">
                        <div className="p-1 rounded bg-blue-500/20">
                            <Navigation className="h-3 w-3 text-blue-400" />
                        </div>
                        <span className="text-gray-300">{delivery.driverName}</span>
                        {delivery.driverPhone && (
                            <a
                                href={`tel:${delivery.driverPhone}`}
                                className="ml-auto text-blue-400 hover:text-blue-300"
                            >
                                <Phone className="h-4 w-4" />
                            </a>
                        )}
                    </div>
                )}

                {/* Timing Info */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                        {formatDistanceToNow(new Date(delivery.assignedAt || Date.now()), { addSuffix: true })}
                    </span>
                    <span className="font-medium text-green-400">${delivery.deliveryFee.toFixed(2)}</span>
                </div>

                {/* Actions */}
                {columnId === 'pending' && (
                    <div className="pt-2 border-t border-gray-700 space-y-2" onClick={(e) => e.stopPropagation()}>
                        {/* Smart Auto-Assign Button */}
                        {onAutoAssign && (
                            <Button
                                size="sm"
                                className="w-full bg-blue-600 hover:bg-blue-700"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onAutoAssign(delivery.id)
                                }}
                                disabled={isUpdating}
                            >
                                <Navigation className="h-4 w-4 mr-2" />
                                Smart Auto-Assign
                            </Button>
                        )}
                        
                        {/* Manual Driver Assignment */}
                        {drivers.length > 0 ? (
                            <DropdownMenu open={showDrivers} onOpenChange={setShowDrivers}>
                                <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="outline" className="w-full border-gray-700" disabled={isUpdating}>
                                        <User className="h-4 w-4 mr-2" />
                                        Manual Assign
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-gray-900 border-gray-800 w-56">
                                    {drivers.map((driver) => (
                                        <DropdownMenuItem
                                            key={driver.id}
                                            onClick={() => {
                                                onAssignDriver(delivery.id, driver.id)
                                                setShowDrivers(false)
                                            }}
                                        >
                                            <User className="mr-2 h-4 w-4" />
                                            {driver.name}
                                            {driver.vehicleType && (
                                                <span className="ml-auto text-xs text-gray-500">
                                                    {driver.vehicleType}
                                                </span>
                                            )}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <p className="text-xs text-center text-gray-500">No drivers available for manual assignment</p>
                        )}
                    </div>
                )}

                {nextOptions.length > 0 && nextOptions[0].status !== 'failed' && columnId !== 'pending' && (
                    <Button
                        size="sm"
                        className="w-full"
                        variant={columnId === 'in_transit' ? 'default' : 'secondary'}
                        onClick={(e) => {
                            e.stopPropagation()
                            onStatusChange(delivery.id, nextOptions[0].status)
                        }}
                        disabled={isUpdating}
                    >
                        {nextOptions[0].label}
                    </Button>
                )}
            </CardContent>
        </Card>
            </TooltipTrigger>
            {isPending && (
                <TooltipContent side="top" className="bg-gray-800 text-white border-gray-700">
                    <p className="text-xs">Assign a driver first to enable drag & drop</p>
                </TooltipContent>
            )}
        </Tooltip>
    )
}
