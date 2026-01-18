'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
    ArrowLeft,
    Package, 
    Clock, 
    MapPin, 
    Navigation, 
    Phone,
    MessageSquare,
    Store,
    User,
    CheckCircle,
    Truck,
    AlertTriangle,
    Copy,
    ExternalLink,
    XCircle
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { format, formatDistanceToNow } from 'date-fns'
import { useToast } from '@/hooks/use-toast'

interface DeliveryDetail {
    id: string
    order_id: string
    status: string
    pickup_address: string
    delivery_address: string
    customer_name: string
    customer_phone: string
    store_name: string
    store_phone?: string
    store_address?: string
    delivery_fee: number
    tip?: number
    notes?: string
    assigned_at: string
    picked_up_at?: string
    delivered_at?: string
    estimated_delivery?: string
    order_number?: string
    items_count?: number
    order_total?: number
}

const STATUS_FLOW = ['assigned', 'picked_up', 'in_transit', 'delivered']

export default function DeliveryDetailPage() {
    const params = useParams()
    const router = useRouter()
    const { user } = useAuth()
    const { toast } = useToast()
    const [delivery, setDelivery] = useState<DeliveryDetail | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isUpdating, setIsUpdating] = useState(false)
    const supabase = createClient()

    const deliveryId = params.id as string

    const fetchDelivery = useCallback(async () => {
        if (!user || !deliveryId) return

        try {
            const { data, error } = await supabase
                .from('deliveries')
                .select(`
                    *,
                    orders (
                        order_number,
                        total,
                        items_count,
                        store:stores(name, phone, address),
                        customer:profiles(full_name, phone)
                    )
                `)
                .eq('id', deliveryId)
                .eq('driver_id', user.id)
                .single()

            if (error) throw error

            setDelivery({
                id: data.id,
                order_id: data.order_id,
                status: data.status,
                pickup_address: data.pickup_address || data.orders?.store?.address || '',
                delivery_address: data.delivery_address || '',
                customer_name: data.orders?.customer?.full_name || 'Customer',
                customer_phone: data.orders?.customer?.phone || '',
                store_name: data.orders?.store?.name || 'Store',
                store_phone: data.orders?.store?.phone,
                store_address: data.orders?.store?.address,
                delivery_fee: data.delivery_fee || 0,
                tip: data.tip,
                notes: data.notes,
                assigned_at: data.assigned_at,
                picked_up_at: data.picked_up_at,
                delivered_at: data.delivered_at,
                estimated_delivery: data.estimated_delivery,
                order_number: data.orders?.order_number,
                items_count: data.orders?.items_count,
                order_total: data.orders?.total,
            })
        } catch (error) {
            console.error('Error fetching delivery:', error)
            toast({
                title: 'Error',
                description: 'Could not load delivery details',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }, [user, deliveryId, supabase, toast])

    useEffect(() => {
        fetchDelivery()
    }, [fetchDelivery])

    const updateStatus = async (newStatus: string) => {
        if (!delivery) return
        setIsUpdating(true)

        try {
            const updateData: Record<string, string> = { status: newStatus }
            
            if (newStatus === 'picked_up') {
                updateData.picked_up_at = new Date().toISOString()
            } else if (newStatus === 'delivered' || newStatus === 'failed') {
                updateData.delivered_at = new Date().toISOString()
            }

            const { error } = await supabase
                .from('deliveries')
                .update(updateData)
                .eq('id', delivery.id)

            if (error) throw error

            setDelivery(prev => prev ? { ...prev, status: newStatus, ...updateData } : null)

            toast({
                title: 'Status Updated',
                description: `Delivery marked as ${newStatus.replace('_', ' ')}`,
            })

            // If delivered or failed, go back to dashboard
            if (newStatus === 'delivered' || newStatus === 'failed') {
                setTimeout(() => router.push('/driver'), 1500)
            }
        } catch (error) {
            console.error('Error updating status:', error)
            toast({
                title: 'Error',
                description: 'Could not update delivery status',
                variant: 'destructive',
            })
        } finally {
            setIsUpdating(false)
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        toast({
            title: 'Copied',
            description: 'Address copied to clipboard',
        })
    }

    const getNextStatus = () => {
        if (!delivery) return null
        const currentIndex = STATUS_FLOW.indexOf(delivery.status)
        if (currentIndex === -1 || currentIndex === STATUS_FLOW.length - 1) return null
        return STATUS_FLOW[currentIndex + 1]
    }

    const getStatusConfig = (status: string) => {
        const configs: Record<string, { label: string; color: string; icon: typeof Package }> = {
            assigned: { label: 'Pick Up Order', color: 'text-blue-400', icon: Store },
            picked_up: { label: 'Order Picked Up', color: 'text-purple-400', icon: Package },
            in_transit: { label: 'In Transit', color: 'text-indigo-400', icon: Truck },
            delivered: { label: 'Delivered', color: 'text-green-400', icon: CheckCircle },
            failed: { label: 'Failed', color: 'text-red-400', icon: XCircle },
        }
        return configs[status] || { label: status, color: 'text-gray-400', icon: Package }
    }

    if (isLoading) {
        return (
            <div className="p-4 space-y-4">
                <div className="h-10 w-32 bg-gray-800 rounded animate-pulse" />
                <div className="h-48 bg-gray-800 rounded-lg animate-pulse" />
                <div className="h-32 bg-gray-800 rounded-lg animate-pulse" />
            </div>
        )
    }

    if (!delivery) {
        return (
            <div className="p-4 text-center py-20">
                <Package className="h-12 w-12 mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400">Delivery not found</p>
                <Button
                    variant="link"
                    className="text-blue-400 mt-2"
                    onClick={() => router.push('/driver')}
                >
                    Back to Dashboard
                </Button>
            </div>
        )
    }

    const statusConfig = getStatusConfig(delivery.status)
    const StatusIcon = statusConfig.icon
    const nextStatus = getNextStatus()

    return (
        <div className="pb-32">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-4 py-3">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex-1">
                        <p className="font-mono font-bold">
                            Order #{delivery.order_number || delivery.id.slice(0, 8)}
                        </p>
                        <div className="flex items-center gap-2">
                            <Badge 
                                variant="outline" 
                                className={cn("text-xs", statusConfig.color)}
                            >
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusConfig.label}
                            </Badge>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-bold text-green-400">
                            ${delivery.delivery_fee.toFixed(2)}
                        </p>
                        {delivery.tip && delivery.tip > 0 && (
                            <p className="text-xs text-gray-400">
                                +${delivery.tip.toFixed(2)} tip
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Progress Timeline */}
                <Card className="bg-gray-800/50 border-gray-700">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            {STATUS_FLOW.map((status, index) => {
                                const config = getStatusConfig(status)
                                const Icon = config.icon
                                const isCompleted = STATUS_FLOW.indexOf(delivery.status) >= index
                                const isCurrent = delivery.status === status

                                return (
                                    <div key={status} className="flex items-center">
                                        <div className={cn(
                                            "flex flex-col items-center",
                                            isCompleted ? config.color : "text-gray-600"
                                        )}>
                                            <div className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center border-2",
                                                isCompleted 
                                                    ? "border-current bg-current/20" 
                                                    : "border-gray-700",
                                                isCurrent && "ring-2 ring-offset-2 ring-offset-gray-900 ring-current"
                                            )}>
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <span className="text-[10px] mt-1 font-medium">
                                                {config.label.split(' ')[0]}
                                            </span>
                                        </div>
                                        {index < STATUS_FLOW.length - 1 && (
                                            <div className={cn(
                                                "w-8 h-0.5 mx-1",
                                                STATUS_FLOW.indexOf(delivery.status) > index 
                                                    ? "bg-green-500" 
                                                    : "bg-gray-700"
                                            )} />
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Pickup Location */}
                <Card className={cn(
                    "border transition-colors",
                    delivery.status === 'assigned' 
                        ? "bg-blue-500/10 border-blue-500/30" 
                        : "bg-gray-800/50 border-gray-700"
                )}>
                    <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Store className="h-5 w-5 text-blue-400" />
                                <span className="font-semibold text-white">Pickup Location</span>
                            </div>
                            {delivery.status === 'assigned' && (
                                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                                    Current
                                </Badge>
                            )}
                        </div>
                        
                        <div className="space-y-2">
                            <p className="font-medium text-white">{delivery.store_name}</p>
                            <p className="text-sm text-gray-400">{delivery.pickup_address}</p>
                            
                            <div className="flex gap-2 pt-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 border-gray-700"
                                    onClick={() => copyToClipboard(delivery.pickup_address)}
                                >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy
                                </Button>
                                {delivery.store_phone && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-gray-700"
                                        asChild
                                    >
                                        <a href={`tel:${delivery.store_phone}`}>
                                            <Phone className="h-4 w-4" />
                                        </a>
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                                    asChild
                                >
                                    <a 
                                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(delivery.pickup_address)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <Navigation className="h-4 w-4 mr-2" />
                                        Navigate
                                    </a>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Delivery Location */}
                <Card className={cn(
                    "border transition-colors",
                    ['picked_up', 'in_transit'].includes(delivery.status)
                        ? "bg-green-500/10 border-green-500/30" 
                        : "bg-gray-800/50 border-gray-700"
                )}>
                    <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-green-400" />
                                <span className="font-semibold text-white">Delivery Location</span>
                            </div>
                            {['picked_up', 'in_transit'].includes(delivery.status) && (
                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                    Current
                                </Badge>
                            )}
                        </div>
                        
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-500" />
                                <p className="font-medium text-white">{delivery.customer_name}</p>
                            </div>
                            <p className="text-sm text-gray-400">{delivery.delivery_address}</p>
                            
                            <div className="flex gap-2 pt-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 border-gray-700"
                                    onClick={() => copyToClipboard(delivery.delivery_address)}
                                >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-gray-700"
                                    asChild
                                >
                                    <a href={`tel:${delivery.customer_phone}`}>
                                        <Phone className="h-4 w-4" />
                                    </a>
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-gray-700"
                                    asChild
                                >
                                    <a href={`sms:${delivery.customer_phone}`}>
                                        <MessageSquare className="h-4 w-4" />
                                    </a>
                                </Button>
                                <Button
                                    size="sm"
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                    asChild
                                >
                                    <a 
                                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(delivery.delivery_address)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <Navigation className="h-4 w-4 mr-2" />
                                        Navigate
                                    </a>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Notes */}
                {delivery.notes && (
                    <Card className="bg-yellow-500/10 border-yellow-500/30">
                        <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-yellow-400 mb-1">Delivery Notes</p>
                                    <p className="text-sm text-gray-300">{delivery.notes}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Order Info */}
                <Card className="bg-gray-800/50 border-gray-700">
                    <CardContent className="p-4 space-y-3">
                        <p className="font-semibold text-white">Order Details</p>
                        <Separator className="bg-gray-700" />
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-gray-500">Items</p>
                                <p className="text-white">{delivery.items_count || 'N/A'} items</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Order Total</p>
                                <p className="text-white">${delivery.order_total?.toFixed(2) || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Assigned</p>
                                <p className="text-white">
                                    {format(new Date(delivery.assigned_at), 'h:mm a')}
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-500">Time Elapsed</p>
                                <p className="text-white">
                                    {formatDistanceToNow(new Date(delivery.assigned_at))}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Fixed Bottom Actions */}
            {!['delivered', 'failed'].includes(delivery.status) && (
                <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-gray-950 via-gray-950/95 to-transparent">
                    <div className="flex gap-3">
                        {/* Mark Failed */}
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                                    disabled={isUpdating}
                                >
                                    <XCircle className="h-5 w-5" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-gray-900 border-gray-800">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-white">Mark as Failed?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will mark the delivery as failed. This action should only be used if the delivery cannot be completed.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-gray-800 border-gray-700 text-white">
                                        Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                        className="bg-red-600 hover:bg-red-700"
                                        onClick={() => updateStatus('failed')}
                                    >
                                        Mark Failed
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        {/* Next Status Action */}
                        {nextStatus && (
                            <Button
                                className="flex-1 h-14 text-lg bg-blue-600 hover:bg-blue-700"
                                onClick={() => updateStatus(nextStatus)}
                                disabled={isUpdating}
                            >
                                {isUpdating ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Updating...
                                    </div>
                                ) : (
                                    <>
                                        <CheckCircle className="h-6 w-6 mr-2" />
                                        {nextStatus === 'picked_up' && 'Mark as Picked Up'}
                                        {nextStatus === 'in_transit' && 'Start Delivery'}
                                        {nextStatus === 'delivered' && 'Mark as Delivered'}
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
