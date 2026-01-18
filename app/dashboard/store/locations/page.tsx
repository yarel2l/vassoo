'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useStoreDashboard } from '@/contexts/store-dashboard-context'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    MapPin,
    Plus,
    Pencil,
    Trash2,
    Truck,
    Package,
    Loader2,
    Star,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface StoreLocation {
    id: string
    name: string
    address_line1: string
    address_line2?: string
    city: string
    state: string
    zip_code: string
    phone?: string
    is_active: boolean
    is_primary: boolean
    is_pickup_available: boolean
    is_delivery_available: boolean
    business_hours?: Record<string, { open: string; close: string; is_open: boolean }>
}

export default function LocationsPage() {
    const router = useRouter()
    const { isLoading: authLoading } = useAuth()
    const { currentStore, isLoading: storeLoading } = useStoreDashboard()
    const [locations, setLocations] = useState<StoreLocation[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [storeId, setStoreId] = useState<string | null>(null)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [locationToDelete, setLocationToDelete] = useState<StoreLocation | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const tenantId = currentStore?.id

    const fetchLocations = useCallback(async () => {
        if (!tenantId) {
            setIsLoading(false)
            return
        }

        try {
            setIsLoading(true)
            const supabase = createClient()

            // Get store for this tenant
            const { data: stores } = await supabase
                .from('stores')
                .select('id')
                .eq('tenant_id', tenantId)
                .limit(1)

            if (!stores || stores.length === 0) {
                setLocations([])
                return
            }

            setStoreId(stores[0].id)

            // Fetch locations
            const { data: locationsData, error } = await supabase
                .from('store_locations')
                .select('*')
                .eq('store_id', stores[0].id)
                .order('is_primary', { ascending: false })
                .order('name')

            if (error) {
                console.error('Error fetching locations:', error)
                toast({
                    title: 'Error',
                    description: 'Failed to load locations',
                    variant: 'destructive',
                })
                return
            }

            const transformedLocations: StoreLocation[] = (locationsData || []).map((loc) => ({
                id: loc.id,
                name: loc.name,
                address_line1: loc.address_line1 || '',
                address_line2: loc.address_line2 || '',
                city: loc.city || '',
                state: loc.state || '',
                zip_code: loc.zip_code || '',
                phone: (loc as Record<string, unknown>).phone as string | undefined,
                is_active: loc.is_active ?? true,
                is_primary: loc.is_primary ?? false,
                is_pickup_available: loc.is_pickup_available ?? true,
                is_delivery_available: loc.is_delivery_available ?? true,
                business_hours: loc.business_hours as StoreLocation['business_hours'],
            }))

            setLocations(transformedLocations)
        } catch (err) {
            console.error('Error in fetchLocations:', err)
        } finally {
            setIsLoading(false)
        }
    }, [tenantId])

    useEffect(() => {
        fetchLocations()
    }, [fetchLocations])

    const openDeleteDialog = (location: StoreLocation) => {
        setLocationToDelete(location)
        setDeleteDialogOpen(true)
    }

    const handleDelete = async () => {
        if (!locationToDelete) return

        setIsDeleting(true)
        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('store_locations')
                .delete()
                .eq('id', locationToDelete.id)

            if (error) throw error

            toast({ title: 'Location deleted' })
            fetchLocations()
        } catch (err) {
            console.error('Error deleting location:', err)
            toast({
                title: 'Error',
                description: 'Failed to delete location',
                variant: 'destructive',
            })
        } finally {
            setIsDeleting(false)
            setDeleteDialogOpen(false)
            setLocationToDelete(null)
        }
    }

    // Count open days for a location
    const getOpenDaysCount = (businessHours?: Record<string, { is_open: boolean }>) => {
        if (!businessHours) return 0
        return Object.values(businessHours).filter((day) => day.is_open).length
    }

    if (authLoading || storeLoading || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-500" />
                    <p className="text-gray-400">Loading locations...</p>
                </div>
            </div>
        )
    }

    // No store found
    if (!storeId) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-lg font-medium text-white mb-2">No store found</h3>
                    <p className="text-gray-400">Please select a store from the sidebar</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Locations</h1>
                    <p className="text-gray-400 mt-1">
                        Manage your store locations and operating hours
                    </p>
                </div>
                <Button
                    onClick={() => router.push('/dashboard/store/locations/new')}
                    className="bg-orange-600 hover:bg-orange-700"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Location
                </Button>
            </div>

            {/* Locations */}
            {locations.length === 0 ? (
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <MapPin className="h-12 w-12 text-gray-600 mb-4" />
                        <h3 className="text-lg font-medium text-white mb-1">No locations yet</h3>
                        <p className="text-gray-400 mb-4">Add your first store location to get started.</p>
                        <Button
                            onClick={() => router.push('/dashboard/store/locations/new')}
                            className="bg-orange-600 hover:bg-orange-700"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Location
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-gray-800 hover:bg-transparent">
                                    <TableHead className="text-gray-400">Name</TableHead>
                                    <TableHead className="text-gray-400">Address</TableHead>
                                    <TableHead className="text-gray-400">Services</TableHead>
                                    <TableHead className="text-gray-400">Hours</TableHead>
                                    <TableHead className="text-gray-400">Status</TableHead>
                                    <TableHead className="text-gray-400 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {locations.map((location) => (
                                    <TableRow key={location.id} className="border-gray-800 hover:bg-gray-800/50">
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-white">{location.name}</span>
                                                {location.is_primary && (
                                                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-400 max-w-[200px] truncate">
                                            {location.address_line1}, {location.city}, {location.state} {location.zip_code}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                {location.is_pickup_available && (
                                                    <Badge
                                                        variant="outline"
                                                        className="border-blue-500/50 text-blue-400 text-xs"
                                                    >
                                                        <Package className="h-3 w-3 mr-1" />
                                                        Pickup
                                                    </Badge>
                                                )}
                                                {location.is_delivery_available && (
                                                    <Badge
                                                        variant="outline"
                                                        className="border-green-500/50 text-green-400 text-xs"
                                                    >
                                                        <Truck className="h-3 w-3 mr-1" />
                                                        Delivery
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-400">
                                            {getOpenDaysCount(location.business_hours)} days/week
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                className={
                                                    location.is_active
                                                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                                        : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                                                }
                                            >
                                                {location.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        router.push(`/dashboard/store/locations/${location.id}`)
                                                    }
                                                    className="text-gray-400 hover:text-white"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openDeleteDialog(location)}
                                                    className="text-red-400 hover:text-red-300"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="bg-gray-900 border-gray-800">
                    <DialogHeader>
                        <DialogTitle className="text-white">Delete Location</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Are you sure you want to delete &quot;{locationToDelete?.name}&quot;? This action
                            cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
                            className="border-gray-700 text-gray-300 hover:bg-gray-800"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                'Delete'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
