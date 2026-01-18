'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Search,
    MoreHorizontal,
    Eye,
    Printer,
    Phone,
    MapPin,
    Truck,
    CheckCircle,
    XCircle,
    AlertCircle,
    User,
    Package,
    Loader2,
    RefreshCw,
    Clock,
    LayoutGrid,
    List,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { DeliveriesKanban } from '@/components/dashboard/deliveries-kanban'
import { DeliveryMetricsBar, calculateDeliveryMetrics } from '@/components/dashboard/delivery-metrics-bar'

interface Delivery {
    id: string
    status: string
    orderNumber: string
    storeName: string
    customerName: string
    customerPhone?: string
    address: string
    driverName?: string
    driverPhone?: string
    assignedAt: string
    pickedUpAt?: string
    deliveredAt?: string
    deliveryFee: number
    notes?: string
    driverId?: string
}

interface Driver {
    id: string
    name: string
    isAvailable: boolean
    vehicleType?: string
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
    assigned: { label: 'Assigned', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: User },
    picked_up: { label: 'Picked Up', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: Package },
    in_transit: { label: 'In Transit', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30', icon: Truck },
    delivered: { label: 'Delivered', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
    failed: { label: 'Failed', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
}



export default function DeliveriesPage() {
    const { tenants } = useAuth()
    const [deliveries, setDeliveries] = useState<Delivery[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedTab, setSelectedTab] = useState('all')
    const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null)
    const [isUpdating, setIsUpdating] = useState(false)
    const [isAssigning, setIsAssigning] = useState(false)
    const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([])
    const [isAssigningDriver, setIsAssigningDriver] = useState(false)
    const [deliveryToAssign, setDeliveryToAssign] = useState<Delivery | null>(null)
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban')

    // Get the delivery tenant
    const deliveryTenant = tenants.find(t => t.tenant.type === 'delivery_company')
    const tenantId = deliveryTenant?.tenant.id

    const fetchDeliveries = useCallback(async () => {
        if (!tenantId) return

        try {
            setIsLoading(true)
            const supabase = createClient()

            // Get company ID
            const { data: company } = await supabase
                .from('delivery_companies')
                .select('id')
                .eq('tenant_id', tenantId)
                .single()

            if (!company) {
                setDeliveries([])
                return
            }

            // Fetch deliveries
            const { data: deliveriesData, error } = await (supabase
                .from('deliveries' as any)
                .select(`
                    *,
                    driver:delivery_drivers(
                        id, 
                        phone, 
                        profiles(full_name)
                    ),
                    order:orders(
                        order_number,
                        delivery_address,
                        store:stores(name)
                    )
                `)
                .eq('delivery_company_id', company.id)
                .order('created_at', { ascending: false }) as any)

            if (error) throw error

            const transformedDeliveries: Delivery[] = (deliveriesData || []).map((d: any) => ({
                id: d.id,
                status: d.status,
                orderNumber: d.order?.order_number || 'N/A',
                storeName: d.order?.store?.name || 'Unknown Store',
                customerName: d.order?.delivery_address?.name || 'Customer',
                customerPhone: d.order?.delivery_address?.phone,
                address: d.order?.delivery_address ?
                    `${d.order.delivery_address.street}, ${d.order.delivery_address.city}` : 'N/A',
                driverName: d.driver?.profiles?.full_name,
                driverPhone: d.driver?.phone,
                assignedAt: d.assigned_at,
                pickedUpAt: d.actual_pickup_time,
                deliveredAt: d.actual_delivery_time,
                deliveryFee: parseFloat(d.delivery_fee) || 0,
                notes: d.order?.delivery_address?.notes,
                driverId: d.driver_id,
            }))

            setDeliveries(transformedDeliveries)
        } catch (err) {
            console.error('Error fetching deliveries:', err)
            toast({
                title: 'Error',
                description: 'Failed to load deliveries',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }, [tenantId])

    useEffect(() => {
        fetchDeliveries()
    }, [fetchDeliveries])

    const fetchAvailableDrivers = async () => {
        if (!tenantId) return
        try {
            const supabase = createClient()

            // Get company ID
            const { data: company } = await supabase
                .from('delivery_companies')
                .select('id')
                .eq('tenant_id', tenantId)
                .single()

            if (!company) return

            const { data, error } = await (supabase
                .from('delivery_drivers' as any)
                .select(`
                    id,
                    is_available,
                    vehicle_type,
                    profile:profiles(full_name)
                `)
                .eq('delivery_company_id', company.id)
                .eq('is_active', true) as any)

            if (error) throw error

            const transformed: Driver[] = (data || []).map((d: any) => ({
                id: d.id,
                name: d.profile?.full_name || 'Unknown Driver',
                isAvailable: d.is_available,
                vehicleType: d.vehicle_type,
            }))

            setAvailableDrivers(transformed)
        } catch (err) {
            console.error('Error fetching drivers:', err)
        }
    }

    const assignDriver = async (deliveryId: string, driverId: string) => {
        setIsAssigningDriver(true)
        try {
            const supabase = createClient()
            const now = new Date().toISOString()

            const { error } = await (supabase
                .from('deliveries' as any)
                .update({
                    driver_id: driverId,
                    status: 'assigned',
                    assigned_at: now,
                    updated_at: now
                })
                .eq('id', deliveryId) as any)

            if (error) throw error

            toast({
                title: 'Driver assigned',
                description: 'The delivery has been successfully assigned to the driver.',
            })

            setDeliveryToAssign(null)
            setIsAssigning(false)
            fetchDeliveries()
        } catch (err) {
            console.error('Error assigning driver:', err)
            toast({
                title: 'Error',
                description: 'Failed to assign driver',
                variant: 'destructive',
            })
        } finally {
            setIsAssigningDriver(false)
        }
    }

    const filteredDeliveries = deliveries.filter(d => {
        const matchesSearch = d.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.driverName?.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesTab = selectedTab === 'all' || d.status === selectedTab
        return matchesSearch && matchesTab
    })

    const tabs = [
        { value: 'all', label: 'All', count: deliveries.length },
        { value: 'assigned', label: 'Assigned', count: deliveries.filter(d => d.status === 'assigned').length },
        { value: 'in_transit', label: 'In Transit', count: deliveries.filter(d => d.status === 'in_transit').length },
        { value: 'delivered', label: 'Delivered', count: deliveries.filter(d => d.status === 'delivered').length },
    ]

    const updateDeliveryStatus = async (id: string, newStatus: string) => {
        setIsUpdating(true)
        try {
            const supabase = createClient()
            const now = new Date().toISOString()

            const updates: any = {
                status: newStatus,
                updated_at: now,
            }

            if (newStatus === 'picked_up') updates.actual_pickup_time = now
            if (newStatus === 'delivered') updates.actual_delivery_time = now

            const { error } = await (supabase
                .from('deliveries' as any)
                .update(updates)
                .eq('id', id) as any)

            if (error) throw error

            toast({
                title: 'Delivery updated',
                description: `Status changed to ${statusConfig[newStatus]?.label || newStatus}`,
            })

            fetchDeliveries()
            if (selectedDelivery?.id === id) setSelectedDelivery(null)
        } catch (err) {
            console.error('Error updating delivery:', err)
            toast({
                title: 'Error',
                description: 'Failed to update delivery status',
                variant: 'destructive',
            })
        } finally {
            setIsAssigningDriver(false)
        }
    }

    const autoAssign = async (deliveryId: string) => {
        setIsUpdating(true)
        try {
            const supabase = createClient()

            // Call the improved smart auto-assignment RPC function
            const { data, error } = await supabase.rpc('smart_auto_assign_delivery', {
                p_delivery_id: deliveryId
            })

            if (error) throw error

            if (data?.success) {
                toast({
                    title: 'Auto-assignment successful',
                    description: `${data.driver_name} assigned (Score: ${data.assignment_score}, Distance: ${data.distance_km}km)`,
                })
                fetchDeliveries()
            } else {
                toast({
                    title: 'No drivers available',
                    description: data?.error || 'Could not find an available driver within range. Try manual assignment.',
                    variant: 'warning' as any,
                })
            }
        } catch (err) {
            console.error('Error in autoAssign:', err)
            toast({
                title: 'Error',
                description: 'Failed to run auto-assignment',
                variant: 'destructive',
            })
        } finally {
            setIsUpdating(false)
        }
    }

    if (isLoading && deliveries.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        )
    }

    // Calculate metrics
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const metrics = calculateDeliveryMetrics(deliveries, availableDrivers, todayStart)

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Deliveries</h1>
                    <p className="text-gray-400 mt-1">Monitor and manage all delivery tasks</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-gray-900 border border-gray-800 rounded-lg p-1">
                        <Button
                            variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                            size="sm"
                            className={viewMode === 'kanban' ? 'bg-blue-600' : 'text-gray-400'}
                            onClick={() => setViewMode('kanban')}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === 'list' ? 'default' : 'ghost'}
                            size="sm"
                            className={viewMode === 'list' ? 'bg-blue-600' : 'text-gray-400'}
                            onClick={() => setViewMode('list')}
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button
                        variant="outline"
                        className="border-gray-800 text-gray-300 hover:bg-gray-800"
                        onClick={() => fetchDeliveries()}
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Metrics Bar */}
            <DeliveryMetricsBar metrics={metrics} />

            {/* Kanban View */}
            {viewMode === 'kanban' ? (
                <div className="space-y-4">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search by order, customer, or driver..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-gray-900 border-gray-800 text-white focus:border-blue-500"
                        />
                    </div>
                    <DeliveriesKanban
                        deliveries={filteredDeliveries}
                        drivers={availableDrivers}
                        onStatusChange={updateDeliveryStatus}
                        onAssignDriver={assignDriver}
                        onAutoAssign={autoAssign}
                        onDeliveryClick={setSelectedDelivery}
                        isUpdating={isUpdating}
                    />
                </div>
            ) : (
            <>
            {/* List View */}
            <div className="space-y-4 overflow-hidden">
                <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                    <div className="overflow-x-auto pb-1">
                        <TabsList className="bg-gray-900 border border-gray-800 p-1 inline-flex w-auto min-w-full sm:min-w-0">
                            {tabs.map(tab => (
                                <TabsTrigger
                                    key={tab.value}
                                    value={tab.value}
                                    className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 text-xs sm:text-sm whitespace-nowrap"
                                >
                                    {tab.label}
                                    <span className="ml-1 sm:ml-2 px-1 sm:px-1.5 py-0.5 text-xs rounded-full bg-gray-800">
                                        {tab.count}
                                    </span>
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>
                </Tabs>

                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search by order, customer, or driver..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-gray-900 border-gray-800 text-white focus:border-blue-500"
                    />
                </div>
            </div>

            <Card className="bg-gray-900 border-gray-800 rounded-xl overflow-hidden">
                <CardContent className="p-0 overflow-x-auto">
                    <Table className="min-w-[700px]">
                        <TableHeader>
                            <TableRow className="border-gray-800 hover:bg-transparent">
                                <TableHead className="text-gray-400 w-[100px]">Order</TableHead>
                                <TableHead className="text-gray-400 w-[120px]">Store</TableHead>
                                <TableHead className="text-gray-400 min-w-[150px]">Customer</TableHead>
                                <TableHead className="text-gray-400 w-[130px]">Driver</TableHead>
                                <TableHead className="text-gray-400 w-[110px]">Status</TableHead>
                                <TableHead className="text-gray-400 text-right w-[80px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredDeliveries.map((delivery) => {
                                const StatusIcon = statusConfig[delivery.status]?.icon || AlertCircle
                                return (
                                    <TableRow
                                        key={delivery.id}
                                        className="border-gray-800 hover:bg-gray-800/50 cursor-pointer"
                                        onClick={() => setSelectedDelivery(delivery)}
                                    >
                                        <TableCell className="font-medium text-white whitespace-nowrap">
                                            {delivery.orderNumber}
                                        </TableCell>
                                        <TableCell className="text-gray-400 truncate max-w-[120px]">
                                            {delivery.storeName}
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-white text-sm truncate max-w-[130px]">{delivery.customerName}</div>
                                            <div className="text-gray-500 text-xs truncate max-w-[130px]">
                                                {delivery.address}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {delivery.driverName ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="h-6 w-6 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                                                        <User className="h-3 w-3 text-blue-400" />
                                                    </div>
                                                    <span className="text-gray-300 text-sm truncate max-w-[80px]">{delivery.driverName}</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-600 italic text-sm">Unassigned</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={`${statusConfig[delivery.status]?.color || 'bg-gray-500/20 text-gray-400'} whitespace-nowrap`}>
                                                <StatusIcon className="h-3 w-3 mr-1" />
                                                {statusConfig[delivery.status]?.label || delivery.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-gray-900 border-gray-800">
                                                    <DropdownMenuItem
                                                        className="text-white focus:bg-gray-800"
                                                        onClick={() => setSelectedDelivery(delivery)}
                                                    >
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        View Details
                                                    </DropdownMenuItem>
                                                    {delivery.status === 'pending' && (
                                                        <DropdownMenuItem
                                                            className="text-blue-400 focus:bg-gray-800"
                                                            onClick={() => {
                                                                setDeliveryToAssign(delivery)
                                                                setIsAssigning(true)
                                                                fetchAvailableDrivers()
                                                            }}
                                                        >
                                                            <User className="mr-2 h-4 w-4" />
                                                            Assign Driver
                                                        </DropdownMenuItem>
                                                    )}
                                                    {delivery.status === 'pending' && (
                                                        <DropdownMenuItem
                                                            className="text-amber-400 focus:bg-gray-800"
                                                            onClick={() => autoAssign(delivery.id)}
                                                        >
                                                            <RefreshCw className="mr-2 h-4 w-4" />
                                                            Auto-assign Driver
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator className="bg-gray-800" />
                                                    {delivery.status === 'assigned' && (
                                                        <DropdownMenuItem
                                                            className="text-blue-400 focus:bg-gray-800"
                                                            onClick={() => updateDeliveryStatus(delivery.id, 'picked_up')}
                                                        >
                                                            <Package className="mr-2 h-4 w-4" />
                                                            Mark Picked Up
                                                        </DropdownMenuItem>
                                                    )}
                                                    {delivery.status === 'picked_up' && (
                                                        <DropdownMenuItem
                                                            className="text-indigo-400 focus:bg-gray-800"
                                                            onClick={() => updateDeliveryStatus(delivery.id, 'in_transit')}
                                                        >
                                                            <Truck className="mr-2 h-4 w-4" />
                                                            Mark In Transit
                                                        </DropdownMenuItem>
                                                    )}
                                                    {delivery.status === 'in_transit' && (
                                                        <DropdownMenuItem
                                                            className="text-green-400 focus:bg-gray-800"
                                                            onClick={() => updateDeliveryStatus(delivery.id, 'delivered')}
                                                        >
                                                            <CheckCircle className="mr-2 h-4 w-4" />
                                                            Mark Delivered
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                    {filteredDeliveries.length === 0 && (
                        <div className="py-20 text-center">
                            <Truck className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                            <p className="text-gray-500">No deliveries found matching your criteria</p>
                        </div>
                    )}
                </CardContent>
            </Card>
            </>
            )}

            <Dialog open={!!selectedDelivery} onOpenChange={() => setSelectedDelivery(null)}>
                <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl">
                    {selectedDelivery && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center justify-between">
                                    <DialogTitle className="text-xl font-bold">
                                        Delivery Details: {selectedDelivery.orderNumber}
                                    </DialogTitle>
                                    <Badge className={statusConfig[selectedDelivery.status]?.color}>
                                        {statusConfig[selectedDelivery.status]?.label}
                                    </Badge>
                                </div>
                            </DialogHeader>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Customer & Address</h4>
                                        <div className="bg-gray-800/50 p-3 rounded-lg flex items-start gap-3">
                                            <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                                            <div>
                                                <p className="font-medium">{selectedDelivery.customerName}</p>
                                                <p className="text-sm text-gray-400">{selectedDelivery.address}</p>
                                                {selectedDelivery.customerPhone && (
                                                    <p className="text-sm text-blue-400 mt-1 flex items-center gap-1">
                                                        <Phone className="h-3 w-3" />
                                                        {selectedDelivery.customerPhone}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Store Info</h4>
                                        <div className="bg-gray-800/50 p-3 rounded-lg flex items-center gap-3">
                                            <Package className="h-5 w-5 text-gray-400" />
                                            <p className="font-medium">{selectedDelivery.storeName}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Assigned Driver</h4>
                                        <div className="bg-gray-800/50 p-3 rounded-lg flex items-start gap-3">
                                            <User className="h-5 w-5 text-gray-400 mt-1" />
                                            <div>
                                                {selectedDelivery.driverName ? (
                                                    <>
                                                        <p className="font-medium">{selectedDelivery.driverName}</p>
                                                        {selectedDelivery.driverPhone && (
                                                            <p className="text-sm text-blue-400 mt-1 flex items-center gap-1">
                                                                <Phone className="h-3 w-3" />
                                                                {selectedDelivery.driverPhone}
                                                            </p>
                                                        )}
                                                    </>
                                                ) : (
                                                    <p className="text-gray-500 italic">No driver assigned</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Timeline</h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between text-gray-400">
                                                <span>Assigned:</span>
                                                <span className="text-white">{new Date(selectedDelivery.assignedAt).toLocaleString()}</span>
                                            </div>
                                            {selectedDelivery.pickedUpAt && (
                                                <div className="flex justify-between text-gray-400">
                                                    <span>Picked Up:</span>
                                                    <span className="text-white">{new Date(selectedDelivery.pickedUpAt).toLocaleString()}</span>
                                                </div>
                                            )}
                                            {selectedDelivery.deliveredAt && (
                                                <div className="flex justify-between text-gray-400">
                                                    <span>Delivered:</span>
                                                    <span className="text-white">{new Date(selectedDelivery.deliveredAt).toLocaleString()}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {selectedDelivery.notes && (
                                <div className="mt-4 p-3 bg-amber-900/20 border border-amber-800/30 rounded-lg">
                                    <p className="text-xs font-semibold text-amber-400 uppercase mb-1">Delivery Notes</p>
                                    <p className="text-sm text-amber-200">{selectedDelivery.notes}</p>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 mt-6">
                                <Button variant="ghost" onClick={() => setSelectedDelivery(null)}>
                                    Close
                                </Button>
                                {selectedDelivery.status !== 'delivered' && selectedDelivery.status !== 'failed' && (
                                    <Button className="bg-blue-600 hover:bg-blue-700">
                                        Update Status
                                    </Button>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Assign Driver Dialog */}
            <Dialog open={isAssigning} onOpenChange={setIsAssigning}>
                <DialogContent className="bg-gray-900 border-gray-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Assign Driver</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Select an available driver for order {deliveryToAssign?.orderNumber}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {availableDrivers.length === 0 ? (
                                <p className="text-center text-gray-500 py-4 text-sm">No drivers found.</p>
                            ) : (
                                availableDrivers.map((driver) => (
                                    <div
                                        key={driver.id}
                                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${driver.isAvailable
                                            ? 'bg-gray-800/50 border-gray-700 hover:border-blue-500/50'
                                            : 'bg-gray-800/20 border-gray-800 opacity-60'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${driver.isAvailable ? 'bg-blue-600/20 text-blue-400' : 'bg-gray-700 text-gray-500'
                                                }`}>
                                                <User className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{driver.name}</p>
                                                <p className="text-xs text-gray-500 uppercase">{driver.vehicleType || 'No vehicle'}</p>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            disabled={!driver.isAvailable || isAssigningDriver}
                                            onClick={() => assignDriver(deliveryToAssign!.id, driver.id)}
                                            className={driver.isAvailable ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700'}
                                        >
                                            {isAssigningDriver ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Assign'}
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
