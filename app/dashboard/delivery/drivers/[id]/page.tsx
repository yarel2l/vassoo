'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
    ArrowLeft,
    Phone,
    Shield,
    Star,
    Truck,
    User,
    Mail,
    Loader2,
    RefreshCw,
    Edit,
    Trash2,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Car,
    Bike,
    Calendar,
    FileText,
    MapPin,
    TrendingUp,
    Save,
    Clock,
    Route,
    Award,
    Target,
    Package,
    DollarSign,
    Receipt,
    History,
    Store,
    Timer,
    TrendingDown,
    ChevronRight,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import Link from 'next/link'
import { format, differenceInDays, parseISO, formatDistanceToNow } from 'date-fns'

interface Driver {
    id: string
    userId: string
    fullName: string
    email: string
    phone: string
    vehicleType: string
    vehicleMake: string
    vehicleModel: string
    vehicleColor: string
    vehiclePlate: string
    driversLicenseNumber: string
    driversLicenseExpiry: string | null
    driversLicenseState: string
    insurancePolicyNumber: string
    insuranceExpiry: string | null
    isActive: boolean
    isAvailable: boolean
    isOnDelivery: boolean
    totalDeliveries: number
    completedDeliveries: number
    failedDeliveries: number
    avgDeliveryTimeMinutes: number
    performanceScore: number
    averageRating: number
    totalDistanceMiles: number
    preferredZones: string[]
    createdAt: string
    lastAssignmentAt: string | null
}

const vehicleTypes = ['Car', 'Motorcycle', 'Bicycle', 'Van', 'Truck', 'Scooter']

interface DeliveryRecord {
    id: string
    orderNumber: string
    storeName: string
    customerName: string
    status: string
    deliveryFee: number
    tip: number
    distance: number
    pickupAddress: string
    deliveryAddress: string
    assignedAt: string
    completedAt: string | null
    deliveryTime: number | null // in minutes
    rating: number | null
}

interface EarningsSummary {
    totalEarnings: number
    deliveryFees: number
    tips: number
    thisWeek: number
    thisMonth: number
    pendingPayout: number
    lastPayout: {
        amount: number
        date: string
    } | null
}

export default function DriverDetailPage() {
    const params = useParams()
    const router = useRouter()
    const { tenants, activeTenantId } = useAuth()
    const driverId = params.id as string

    const [driver, setDriver] = useState<Driver | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [companyId, setCompanyId] = useState<string | null>(null)

    // Deliveries and earnings state
    const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([])
    const [earnings, setEarnings] = useState<EarningsSummary | null>(null)
    const [isLoadingDeliveries, setIsLoadingDeliveries] = useState(false)
    const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'completed' | 'failed'>('all')

    // Form state for editing
    const [formData, setFormData] = useState({
        phone: '',
        vehicleType: 'Car',
        vehicleMake: '',
        vehicleModel: '',
        vehicleColor: '',
        vehiclePlate: '',
        driversLicenseNumber: '',
        driversLicenseExpiry: '',
        driversLicenseState: '',
        insurancePolicyNumber: '',
        insuranceExpiry: '',
        preferredZones: [] as string[],
    })

    // Get tenant ID
    const deliveryTenant = tenants.find(t => t.tenant?.type === 'delivery_company')
    const tenantId = activeTenantId || deliveryTenant?.tenant?.id

    // Fetch company ID
    useEffect(() => {
        async function fetchCompanyId() {
            if (!tenantId) return

            const supabase = createClient()
            const { data: company } = await supabase
                .from('delivery_companies')
                .select('id')
                .eq('tenant_id', tenantId)
                .single()

            if (company) {
                setCompanyId(company.id)
            }
        }
        fetchCompanyId()
    }, [tenantId])

    // Fetch driver details
    const fetchDriver = useCallback(async () => {
        if (!driverId) return

        try {
            setIsLoading(true)
            const supabase = createClient()

            const { data, error } = await supabase
                .from('delivery_drivers')
                .select('*, profiles(full_name, email)')
                .eq('id', driverId)
                .single()

            if (error) throw error

            const driverData: Driver = {
                id: data.id,
                userId: data.user_id,
                fullName: data.profiles?.full_name || 'Unknown',
                email: data.profiles?.email || '',
                phone: data.phone || '',
                vehicleType: data.vehicle_type || 'Car',
                vehicleMake: data.vehicle_make || '',
                vehicleModel: data.vehicle_model || '',
                vehicleColor: data.vehicle_color || '',
                vehiclePlate: data.vehicle_plate || '',
                driversLicenseNumber: data.drivers_license_number || '',
                driversLicenseExpiry: data.drivers_license_expiry,
                driversLicenseState: data.drivers_license_state || '',
                insurancePolicyNumber: data.insurance_policy_number || '',
                insuranceExpiry: data.insurance_expiry,
                isActive: data.is_active ?? true,
                isAvailable: data.is_available ?? false,
                isOnDelivery: data.is_on_delivery ?? false,
                totalDeliveries: data.total_deliveries || 0,
                completedDeliveries: data.completed_deliveries || 0,
                failedDeliveries: data.failed_deliveries || 0,
                avgDeliveryTimeMinutes: data.avg_delivery_time_minutes || 30,
                performanceScore: parseFloat(data.performance_score) || 1.0,
                averageRating: parseFloat(data.average_rating) || 0,
                totalDistanceMiles: parseFloat(data.total_distance_miles) || 0,
                preferredZones: data.preferred_zones || [],
                createdAt: data.created_at,
                lastAssignmentAt: data.last_assignment_at,
            }

            setDriver(driverData)
            setFormData({
                phone: driverData.phone,
                vehicleType: driverData.vehicleType,
                vehicleMake: driverData.vehicleMake,
                vehicleModel: driverData.vehicleModel,
                vehicleColor: driverData.vehicleColor,
                vehiclePlate: driverData.vehiclePlate,
                driversLicenseNumber: driverData.driversLicenseNumber,
                driversLicenseExpiry: driverData.driversLicenseExpiry || '',
                driversLicenseState: driverData.driversLicenseState,
                insurancePolicyNumber: driverData.insurancePolicyNumber,
                insuranceExpiry: driverData.insuranceExpiry || '',
                preferredZones: driverData.preferredZones,
            })
        } catch (err) {
            console.error('Error fetching driver:', err)
            toast({
                title: 'Error',
                description: 'Failed to load driver details',
                variant: 'destructive',
            })
            router.push('/dashboard/delivery/drivers')
        } finally {
            setIsLoading(false)
        }
    }, [driverId, router])

    useEffect(() => {
        fetchDriver()
    }, [fetchDriver])

    // Fetch deliveries for this driver
    const fetchDeliveries = useCallback(async () => {
        if (!driverId) return

        setIsLoadingDeliveries(true)
        try {
            const supabase = createClient()

            // First get the driver's internal ID from the delivery_drivers table
            const { data: driverData } = await supabase
                .from('delivery_drivers')
                .select('id')
                .eq('id', driverId)
                .single()

            if (!driverData) {
                console.log('Driver not found')
                setDeliveries([])
                return
            }

            // Fetch deliveries for this driver
            const { data: deliveriesData, error } = await supabase
                .from('deliveries')
                .select(`
                    id,
                    status,
                    delivery_fee,
                    driver_earnings,
                    tip_amount,
                    distance_miles,
                    assigned_at,
                    actual_pickup_time,
                    actual_delivery_time,
                    customer_rating,
                    dropoff_address,
                    order:orders(
                        id,
                        order_number,
                        store:stores(name)
                    )
                `)
                .eq('driver_id', driverData.id)
                .order('assigned_at', { ascending: false })
                .limit(50)

            if (error) throw error

            const deliveryRecords: DeliveryRecord[] = (deliveriesData || []).map((d: any) => ({
                id: d.id,
                orderNumber: d.order?.order_number || 'N/A',
                storeName: d.order?.store?.name || 'Unknown Store',
                customerName: 'Customer',
                status: d.status,
                deliveryFee: parseFloat(d.driver_earnings || d.delivery_fee) || 0,
                tip: parseFloat(d.tip_amount) || 0,
                distance: parseFloat(d.distance_miles) || 0,
                pickupAddress: 'Store location',
                deliveryAddress: typeof d.dropoff_address === 'object' 
                    ? d.dropoff_address?.formatted_address || d.dropoff_address?.street || 'N/A'
                    : d.dropoff_address || 'N/A',
                assignedAt: d.assigned_at || d.created_at,
                completedAt: d.actual_delivery_time,
                deliveryTime: d.actual_pickup_time && d.actual_delivery_time
                    ? Math.round((new Date(d.actual_delivery_time).getTime() - new Date(d.actual_pickup_time).getTime()) / 60000)
                    : null,
                rating: d.customer_rating ? parseFloat(d.customer_rating) : null,
            }))

            setDeliveries(deliveryRecords)

            // Calculate earnings summary
            const completedDeliveries = deliveryRecords.filter(d => d.status === 'delivered')
            const totalEarnings = completedDeliveries.reduce((sum, d) => sum + d.deliveryFee + d.tip, 0)
            const deliveryFees = completedDeliveries.reduce((sum, d) => sum + d.deliveryFee, 0)
            const tips = completedDeliveries.reduce((sum, d) => sum + d.tip, 0)

            // This week's earnings (simple calculation)
            const oneWeekAgo = new Date()
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
            const thisWeekDeliveries = completedDeliveries.filter(d => 
                d.completedAt && new Date(d.completedAt) >= oneWeekAgo
            )
            const thisWeek = thisWeekDeliveries.reduce((sum, d) => sum + d.deliveryFee + d.tip, 0)

            // This month's earnings
            const firstOfMonth = new Date()
            firstOfMonth.setDate(1)
            firstOfMonth.setHours(0, 0, 0, 0)
            const thisMonthDeliveries = completedDeliveries.filter(d =>
                d.completedAt && new Date(d.completedAt) >= firstOfMonth
            )
            const thisMonth = thisMonthDeliveries.reduce((sum, d) => sum + d.deliveryFee + d.tip, 0)

            setEarnings({
                totalEarnings,
                deliveryFees,
                tips,
                thisWeek,
                thisMonth,
                pendingPayout: 0, // Would need payment tracking table
                lastPayout: null, // Would need payout history table
            })
        } catch (err) {
            console.error('Error fetching deliveries:', err)
        } finally {
            setIsLoadingDeliveries(false)
        }
    }, [driverId])

    useEffect(() => {
        if (driver) {
            fetchDeliveries()
        }
    }, [driver, fetchDeliveries])

    // Toggle availability
    const toggleAvailability = async () => {
        if (!driver) return

        const supabase = createClient()
        const { error } = await supabase
            .from('delivery_drivers')
            .update({ is_available: !driver.isAvailable })
            .eq('id', driver.id)

        if (!error) {
            setDriver({ ...driver, isAvailable: !driver.isAvailable })
            toast({ title: 'Success', description: `Driver ${driver.isAvailable ? 'marked as unavailable' : 'marked as available'}` })
        } else {
            toast({ title: 'Error', description: 'Failed to update availability', variant: 'destructive' })
        }
    }

    // Toggle active status
    const toggleActiveStatus = async () => {
        if (!driver) return

        const supabase = createClient()
        const { error } = await supabase
            .from('delivery_drivers')
            .update({ is_active: !driver.isActive })
            .eq('id', driver.id)

        if (!error) {
            setDriver({ ...driver, isActive: !driver.isActive })
            toast({ title: 'Success', description: `Driver ${driver.isActive ? 'deactivated' : 'activated'}` })
        } else {
            toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' })
        }
    }

    // Save changes
    const handleSave = async () => {
        if (!driver) return

        setIsSaving(true)
        try {
            const supabase = createClient()

            const { error } = await supabase
                .from('delivery_drivers')
                .update({
                    phone: formData.phone,
                    vehicle_type: formData.vehicleType,
                    vehicle_make: formData.vehicleMake,
                    vehicle_model: formData.vehicleModel,
                    vehicle_color: formData.vehicleColor,
                    vehicle_plate: formData.vehiclePlate,
                    drivers_license_number: formData.driversLicenseNumber,
                    drivers_license_expiry: formData.driversLicenseExpiry || null,
                    drivers_license_state: formData.driversLicenseState,
                    insurance_policy_number: formData.insurancePolicyNumber,
                    insurance_expiry: formData.insuranceExpiry || null,
                    preferred_zones: formData.preferredZones,
                })
                .eq('id', driver.id)

            if (error) throw error

            toast({ title: 'Success', description: 'Driver information updated' })
            setIsEditing(false)
            fetchDriver()
        } catch (err) {
            console.error('Error updating driver:', err)
            toast({ title: 'Error', description: 'Failed to update driver', variant: 'destructive' })
        } finally {
            setIsSaving(false)
        }
    }

    // Delete driver
    const handleDelete = async () => {
        if (!driver) return

        setIsSaving(true)
        try {
            const supabase = createClient()

            const { error } = await supabase
                .from('delivery_drivers')
                .delete()
                .eq('id', driver.id)

            if (error) throw error

            toast({ title: 'Success', description: 'Driver removed from company' })
            router.push('/dashboard/delivery/drivers')
        } catch (err) {
            console.error('Error deleting driver:', err)
            toast({ title: 'Error', description: 'Failed to remove driver', variant: 'destructive' })
        } finally {
            setIsSaving(false)
        }
    }

    // Cancel editing
    const cancelEditing = () => {
        if (driver) {
            setFormData({
                phone: driver.phone,
                vehicleType: driver.vehicleType,
                vehicleMake: driver.vehicleMake,
                vehicleModel: driver.vehicleModel,
                vehicleColor: driver.vehicleColor,
                vehiclePlate: driver.vehiclePlate,
                driversLicenseNumber: driver.driversLicenseNumber,
                driversLicenseExpiry: driver.driversLicenseExpiry || '',
                driversLicenseState: driver.driversLicenseState,
                insurancePolicyNumber: driver.insurancePolicyNumber,
                insuranceExpiry: driver.insuranceExpiry || '',
                preferredZones: driver.preferredZones,
            })
        }
        setIsEditing(false)
    }

    // Get status badge
    const getStatusBadge = () => {
        if (!driver) return null
        if (driver.isOnDelivery) {
            return <Badge className="bg-purple-600/20 text-purple-400 border-purple-500/30">On Delivery</Badge>
        }
        if (!driver.isActive) {
            return <Badge className="bg-gray-600/20 text-gray-400 border-gray-500/30">Inactive</Badge>
        }
        if (driver.isAvailable) {
            return <Badge className="bg-green-600/20 text-green-400 border-green-500/30">Available</Badge>
        }
        return <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-500/30">Busy</Badge>
    }

    // Get expiry status
    const getExpiryStatus = (expiryDate: string | null) => {
        if (!expiryDate) return { status: 'unknown', label: 'Not set', color: 'gray', icon: AlertTriangle }
        const now = new Date()
        const expiry = parseISO(expiryDate)
        const daysUntilExpiry = differenceInDays(expiry, now)

        if (daysUntilExpiry < 0) {
            return { status: 'expired', label: 'Expired', color: 'red', icon: XCircle }
        }
        if (daysUntilExpiry <= 30) {
            return { status: 'expiring', label: `Expires in ${daysUntilExpiry} days`, color: 'yellow', icon: AlertTriangle }
        }
        return { status: 'valid', label: 'Valid', color: 'green', icon: CheckCircle2 }
    }

    // Get vehicle icon
    const getVehicleIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case 'motorcycle':
            case 'scooter':
            case 'bicycle':
                return <Bike className="h-5 w-5" />
            default:
                return <Car className="h-5 w-5" />
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        )
    }

    if (!driver) {
        return (
            <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
                <p className="text-gray-500">Driver not found</p>
                <Link href="/dashboard/delivery/drivers">
                    <Button variant="outline" className="border-gray-700 text-gray-300">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Drivers
                    </Button>
                </Link>
            </div>
        )
    }

    const licenseStatus = getExpiryStatus(driver.driversLicenseExpiry)
    const insuranceStatus = getExpiryStatus(driver.insuranceExpiry)
    const successRate = driver.totalDeliveries > 0
        ? ((driver.completedDeliveries / driver.totalDeliveries) * 100).toFixed(1)
        : '0'

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex items-start gap-4">
                    <Link href="/dashboard/delivery/drivers">
                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white mt-1">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-blue-600/20 flex items-center justify-center font-bold text-blue-400 text-2xl">
                            {driver.fullName[0]?.toUpperCase()}
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-white">{driver.fullName}</h1>
                                {getStatusBadge()}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-gray-400">
                                <span className="flex items-center gap-1">
                                    <Mail className="h-4 w-4" />
                                    {driver.email}
                                </span>
                                {driver.phone && (
                                    <span className="flex items-center gap-1">
                                        <Phone className="h-4 w-4" />
                                        {driver.phone}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                                Joined {format(new Date(driver.createdAt), 'MMMM d, yyyy')}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 ml-12 lg:ml-0">
                    {isEditing ? (
                        <>
                            <Button variant="outline" onClick={cancelEditing} className="border-gray-700 text-gray-300">
                                Cancel
                            </Button>
                            <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                <Save className="h-4 w-4 mr-2" />
                                Save Changes
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => setIsEditing(true)} className="border-gray-700 text-gray-300">
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                            </Button>
                            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(true)} className="border-red-700 text-red-400 hover:bg-red-900/20">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-4 text-center">
                        <Package className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-white">{driver.totalDeliveries}</p>
                        <p className="text-xs text-gray-500">Total Deliveries</p>
                    </CardContent>
                </Card>
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-4 text-center">
                        <CheckCircle2 className="h-6 w-6 text-green-400 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-green-400">{successRate}%</p>
                        <p className="text-xs text-gray-500">Success Rate</p>
                    </CardContent>
                </Card>
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-4 text-center">
                        <Star className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-yellow-400">{driver.averageRating.toFixed(1)}</p>
                        <p className="text-xs text-gray-500">Rating</p>
                    </CardContent>
                </Card>
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-4 text-center">
                        <TrendingUp className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-purple-400">{(driver.performanceScore * 100).toFixed(0)}%</p>
                        <p className="text-xs text-gray-500">Performance</p>
                    </CardContent>
                </Card>
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-4 text-center">
                        <Clock className="h-6 w-6 text-cyan-400 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-cyan-400">{driver.avgDeliveryTimeMinutes}m</p>
                        <p className="text-xs text-gray-500">Avg. Time</p>
                    </CardContent>
                </Card>
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-4 text-center">
                        <Route className="h-6 w-6 text-orange-400 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-orange-400">{driver.totalDistanceMiles.toFixed(0)}</p>
                        <p className="text-xs text-gray-500">Miles Driven</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    <Tabs defaultValue="vehicle" className="w-full">
                        <TabsList className="bg-gray-800 border-gray-700 w-full justify-start overflow-x-auto">
                            <TabsTrigger value="vehicle" className="data-[state=active]:bg-gray-700">Vehicle</TabsTrigger>
                            <TabsTrigger value="documents" className="data-[state=active]:bg-gray-700">Documents</TabsTrigger>
                            <TabsTrigger value="performance" className="data-[state=active]:bg-gray-700">Performance</TabsTrigger>
                            <TabsTrigger value="deliveries" className="data-[state=active]:bg-gray-700">Deliveries</TabsTrigger>
                            <TabsTrigger value="earnings" className="data-[state=active]:bg-gray-700">Earnings</TabsTrigger>
                        </TabsList>

                        {/* Vehicle Tab */}
                        <TabsContent value="vehicle" className="mt-6">
                            <Card className="bg-gray-900 border-gray-800">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        {getVehicleIcon(isEditing ? formData.vehicleType : driver.vehicleType)}
                                        Vehicle Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {isEditing ? (
                                        <>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Vehicle Type</Label>
                                                    <Select
                                                        value={formData.vehicleType}
                                                        onValueChange={v => setFormData({ ...formData, vehicleType: v })}
                                                    >
                                                        <SelectTrigger className="bg-gray-800 border-gray-700">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-gray-900 border-gray-800">
                                                            {vehicleTypes.map(type => (
                                                                <SelectItem key={type} value={type}>{type}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>License Plate</Label>
                                                    <Input
                                                        value={formData.vehiclePlate}
                                                        onChange={e => setFormData({ ...formData, vehiclePlate: e.target.value })}
                                                        className="bg-gray-800 border-gray-700 focus:border-blue-500"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Make</Label>
                                                    <Input
                                                        value={formData.vehicleMake}
                                                        onChange={e => setFormData({ ...formData, vehicleMake: e.target.value })}
                                                        className="bg-gray-800 border-gray-700 focus:border-blue-500"
                                                        placeholder="Toyota"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Model</Label>
                                                    <Input
                                                        value={formData.vehicleModel}
                                                        onChange={e => setFormData({ ...formData, vehicleModel: e.target.value })}
                                                        className="bg-gray-800 border-gray-700 focus:border-blue-500"
                                                        placeholder="Corolla"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Color</Label>
                                                    <Input
                                                        value={formData.vehicleColor}
                                                        onChange={e => setFormData({ ...formData, vehicleColor: e.target.value })}
                                                        className="bg-gray-800 border-gray-700 focus:border-blue-500"
                                                        placeholder="White"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Type</p>
                                                <p className="text-gray-300 flex items-center gap-2">
                                                    {getVehicleIcon(driver.vehicleType)}
                                                    {driver.vehicleType}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">License Plate</p>
                                                <p className="text-gray-300 font-mono">{driver.vehiclePlate || '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Make</p>
                                                <p className="text-gray-300">{driver.vehicleMake || '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Model</p>
                                                <p className="text-gray-300">{driver.vehicleModel || '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Color</p>
                                                <p className="text-gray-300">{driver.vehicleColor || '—'}</p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Documents Tab */}
                        <TabsContent value="documents" className="mt-6 space-y-6">
                            {/* Driver's License */}
                            <Card className="bg-gray-900 border-gray-800">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-white flex items-center gap-2">
                                            <FileText className="h-5 w-5 text-blue-400" />
                                            Driver's License
                                        </CardTitle>
                                        {!isEditing && (
                                            <Badge variant="outline" className={`${
                                                licenseStatus.color === 'green' ? 'border-green-500/30 text-green-400' :
                                                licenseStatus.color === 'yellow' ? 'border-yellow-500/30 text-yellow-400' :
                                                licenseStatus.color === 'red' ? 'border-red-500/30 text-red-400' :
                                                'border-gray-500/30 text-gray-400'
                                            }`}>
                                                <licenseStatus.icon className="h-3 w-3 mr-1" />
                                                {licenseStatus.label}
                                            </Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {isEditing ? (
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label>License Number</Label>
                                                <Input
                                                    value={formData.driversLicenseNumber}
                                                    onChange={e => setFormData({ ...formData, driversLicenseNumber: e.target.value })}
                                                    className="bg-gray-800 border-gray-700 focus:border-blue-500"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>State</Label>
                                                <Input
                                                    value={formData.driversLicenseState}
                                                    onChange={e => setFormData({ ...formData, driversLicenseState: e.target.value.toUpperCase().slice(0, 2) })}
                                                    className="bg-gray-800 border-gray-700 focus:border-blue-500"
                                                    placeholder="CA"
                                                    maxLength={2}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Expiry Date</Label>
                                                <Input
                                                    type="date"
                                                    value={formData.driversLicenseExpiry}
                                                    onChange={e => setFormData({ ...formData, driversLicenseExpiry: e.target.value })}
                                                    className="bg-gray-800 border-gray-700 focus:border-blue-500"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-3 gap-6">
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">License Number</p>
                                                <p className="text-gray-300 font-mono">{driver.driversLicenseNumber || '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">State</p>
                                                <p className="text-gray-300">{driver.driversLicenseState || '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Expiry Date</p>
                                                <p className="text-gray-300">
                                                    {driver.driversLicenseExpiry
                                                        ? format(parseISO(driver.driversLicenseExpiry), 'MMM d, yyyy')
                                                        : '—'}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Insurance */}
                            <Card className="bg-gray-900 border-gray-800">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-white flex items-center gap-2">
                                            <Shield className="h-5 w-5 text-green-400" />
                                            Insurance
                                        </CardTitle>
                                        {!isEditing && (
                                            <Badge variant="outline" className={`${
                                                insuranceStatus.color === 'green' ? 'border-green-500/30 text-green-400' :
                                                insuranceStatus.color === 'yellow' ? 'border-yellow-500/30 text-yellow-400' :
                                                insuranceStatus.color === 'red' ? 'border-red-500/30 text-red-400' :
                                                'border-gray-500/30 text-gray-400'
                                            }`}>
                                                <insuranceStatus.icon className="h-3 w-3 mr-1" />
                                                {insuranceStatus.label}
                                            </Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {isEditing ? (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Policy Number</Label>
                                                <Input
                                                    value={formData.insurancePolicyNumber}
                                                    onChange={e => setFormData({ ...formData, insurancePolicyNumber: e.target.value })}
                                                    className="bg-gray-800 border-gray-700 focus:border-blue-500"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Expiry Date</Label>
                                                <Input
                                                    type="date"
                                                    value={formData.insuranceExpiry}
                                                    onChange={e => setFormData({ ...formData, insuranceExpiry: e.target.value })}
                                                    className="bg-gray-800 border-gray-700 focus:border-blue-500"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Policy Number</p>
                                                <p className="text-gray-300 font-mono">{driver.insurancePolicyNumber || '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Expiry Date</p>
                                                <p className="text-gray-300">
                                                    {driver.insuranceExpiry
                                                        ? format(parseISO(driver.insuranceExpiry), 'MMM d, yyyy')
                                                        : '—'}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Performance Tab */}
                        <TabsContent value="performance" className="mt-6">
                            <Card className="bg-gray-900 border-gray-800">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Award className="h-5 w-5 text-yellow-400" />
                                        Performance Metrics
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="p-4 bg-gray-800/50 rounded-lg text-center">
                                            <p className="text-3xl font-bold text-white">{driver.completedDeliveries}</p>
                                            <p className="text-xs text-gray-500 mt-1">Completed</p>
                                        </div>
                                        <div className="p-4 bg-gray-800/50 rounded-lg text-center">
                                            <p className="text-3xl font-bold text-red-400">{driver.failedDeliveries}</p>
                                            <p className="text-xs text-gray-500 mt-1">Failed</p>
                                        </div>
                                        <div className="p-4 bg-gray-800/50 rounded-lg text-center">
                                            <p className="text-3xl font-bold text-green-400">{successRate}%</p>
                                            <p className="text-xs text-gray-500 mt-1">Success Rate</p>
                                        </div>
                                        <div className="p-4 bg-gray-800/50 rounded-lg text-center">
                                            <p className="text-3xl font-bold text-cyan-400">{driver.avgDeliveryTimeMinutes}m</p>
                                            <p className="text-xs text-gray-500 mt-1">Avg. Time</p>
                                        </div>
                                    </div>

                                    <Separator className="bg-gray-800" />

                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm text-gray-400">Performance Score</span>
                                                <span className="text-sm text-purple-400 font-medium">{(driver.performanceScore * 100).toFixed(0)}%</span>
                                            </div>
                                            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                                                <div
                                                    className="bg-purple-500 h-full rounded-full transition-all"
                                                    style={{ width: `${driver.performanceScore * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm text-gray-400">Customer Rating</span>
                                                <span className="text-sm text-yellow-400 font-medium flex items-center gap-1">
                                                    <Star className="h-4 w-4 fill-yellow-400" />
                                                    {driver.averageRating.toFixed(1)} / 5.0
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                                                <div
                                                    className="bg-yellow-500 h-full rounded-full transition-all"
                                                    style={{ width: `${(driver.averageRating / 5) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {driver.lastAssignmentAt && (
                                        <div className="p-4 bg-gray-800/50 rounded-lg">
                                            <p className="text-xs text-gray-500 mb-1">Last Assignment</p>
                                            <p className="text-gray-300">
                                                {format(new Date(driver.lastAssignmentAt), 'MMMM d, yyyy h:mm a')}
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Deliveries Tab */}
                        <TabsContent value="deliveries" className="mt-6">
                            <Card className="bg-gray-900 border-gray-800">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-white flex items-center gap-2">
                                            <History className="h-5 w-5 text-blue-400" />
                                            Delivery History
                                        </CardTitle>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant={deliveryFilter === 'all' ? 'default' : 'outline'}
                                                onClick={() => setDeliveryFilter('all')}
                                                className={deliveryFilter === 'all' ? 'bg-blue-600' : 'border-gray-700 text-gray-400'}
                                            >
                                                All
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant={deliveryFilter === 'completed' ? 'default' : 'outline'}
                                                onClick={() => setDeliveryFilter('completed')}
                                                className={deliveryFilter === 'completed' ? 'bg-green-600' : 'border-gray-700 text-gray-400'}
                                            >
                                                Completed
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant={deliveryFilter === 'failed' ? 'default' : 'outline'}
                                                onClick={() => setDeliveryFilter('failed')}
                                                className={deliveryFilter === 'failed' ? 'bg-red-600' : 'border-gray-700 text-gray-400'}
                                            >
                                                Failed
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {isLoadingDeliveries ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                                        </div>
                                    ) : deliveries.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                            <p>No delivery records found</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {deliveries
                                                .filter(d => {
                                                    if (deliveryFilter === 'completed') return d.status === 'delivered'
                                                    if (deliveryFilter === 'failed') return d.status === 'failed' || d.status === 'cancelled'
                                                    return true
                                                })
                                                .map((delivery) => (
                                                    <div
                                                        key={delivery.id}
                                                        className="p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-white font-medium">#{delivery.orderNumber}</span>
                                                                    <Badge className={`text-xs ${
                                                                        delivery.status === 'delivered' ? 'bg-green-600/20 text-green-400' :
                                                                        delivery.status === 'failed' || delivery.status === 'cancelled' ? 'bg-red-600/20 text-red-400' :
                                                                        delivery.status === 'in_transit' ? 'bg-blue-600/20 text-blue-400' :
                                                                        'bg-yellow-600/20 text-yellow-400'
                                                                    }`}>
                                                                        {delivery.status.replace('_', ' ')}
                                                                    </Badge>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                                                    <Store className="h-3 w-3" />
                                                                    {delivery.storeName}
                                                                </div>
                                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                    <MapPin className="h-3 w-3" />
                                                                    {delivery.deliveryAddress}
                                                                </div>
                                                            </div>
                                                            <div className="text-right space-y-1">
                                                                <p className="text-green-400 font-medium">
                                                                    ${(delivery.deliveryFee + delivery.tip).toFixed(2)}
                                                                </p>
                                                                {delivery.tip > 0 && (
                                                                    <p className="text-xs text-gray-500">+${delivery.tip.toFixed(2)} tip</p>
                                                                )}
                                                                {delivery.rating && (
                                                                    <div className="flex items-center justify-end gap-1 text-yellow-400">
                                                                        <Star className="h-3 w-3 fill-yellow-400" />
                                                                        <span className="text-xs">{delivery.rating.toFixed(1)}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="mt-2 pt-2 border-t border-gray-700 flex items-center justify-between text-xs text-gray-500">
                                                            <span>
                                                                {formatDistanceToNow(new Date(delivery.assignedAt), { addSuffix: true })}
                                                            </span>
                                                            <div className="flex items-center gap-3">
                                                                {delivery.deliveryTime && (
                                                                    <span className="flex items-center gap-1">
                                                                        <Timer className="h-3 w-3" />
                                                                        {delivery.deliveryTime}m
                                                                    </span>
                                                                )}
                                                                <span className="flex items-center gap-1">
                                                                    <Route className="h-3 w-3" />
                                                                    {delivery.distance.toFixed(1)} mi
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Earnings Tab */}
                        <TabsContent value="earnings" className="mt-6">
                            <div className="space-y-6">
                                {/* Earnings Summary Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <Card className="bg-gray-900 border-gray-800">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                                                <DollarSign className="h-4 w-4" />
                                                Total Earnings
                                            </div>
                                            <p className="text-2xl font-bold text-green-400">
                                                ${earnings?.totalEarnings.toFixed(2) || '0.00'}
                                            </p>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-gray-900 border-gray-800">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                                                <Receipt className="h-4 w-4" />
                                                Delivery Fees
                                            </div>
                                            <p className="text-2xl font-bold text-blue-400">
                                                ${earnings?.deliveryFees.toFixed(2) || '0.00'}
                                            </p>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-gray-900 border-gray-800">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                                                <Star className="h-4 w-4" />
                                                Total Tips
                                            </div>
                                            <p className="text-2xl font-bold text-yellow-400">
                                                ${earnings?.tips.toFixed(2) || '0.00'}
                                            </p>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-gray-900 border-gray-800">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                                                <TrendingUp className="h-4 w-4" />
                                                This Week
                                            </div>
                                            <p className="text-2xl font-bold text-purple-400">
                                                ${earnings?.thisWeek.toFixed(2) || '0.00'}
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Earnings Breakdown */}
                                <Card className="bg-gray-900 border-gray-800">
                                    <CardHeader>
                                        <CardTitle className="text-white flex items-center gap-2">
                                            <DollarSign className="h-5 w-5 text-green-400" />
                                            Earnings Breakdown
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-gray-800/50 rounded-lg">
                                                <p className="text-sm text-gray-400 mb-1">This Month</p>
                                                <p className="text-xl font-bold text-white">
                                                    ${earnings?.thisMonth.toFixed(2) || '0.00'}
                                                </p>
                                            </div>
                                            <div className="p-4 bg-gray-800/50 rounded-lg">
                                                <p className="text-sm text-gray-400 mb-1">Avg per Delivery</p>
                                                <p className="text-xl font-bold text-white">
                                                    ${driver.completedDeliveries > 0 
                                                        ? ((earnings?.totalEarnings || 0) / driver.completedDeliveries).toFixed(2)
                                                        : '0.00'}
                                                </p>
                                            </div>
                                        </div>

                                        <Separator className="bg-gray-800" />

                                        <div>
                                            <p className="text-sm text-gray-400 mb-3">Earnings Distribution</p>
                                            <div className="space-y-3">
                                                <div>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-sm text-gray-300">Delivery Fees</span>
                                                        <span className="text-sm text-blue-400">
                                                            {earnings && earnings.totalEarnings > 0 
                                                                ? ((earnings.deliveryFees / earnings.totalEarnings) * 100).toFixed(0)
                                                                : 0}%
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                                                        <div
                                                            className="bg-blue-500 h-full rounded-full"
                                                            style={{ 
                                                                width: `${earnings && earnings.totalEarnings > 0 
                                                                    ? (earnings.deliveryFees / earnings.totalEarnings) * 100 
                                                                    : 0}%` 
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-sm text-gray-300">Tips</span>
                                                        <span className="text-sm text-yellow-400">
                                                            {earnings && earnings.totalEarnings > 0 
                                                                ? ((earnings.tips / earnings.totalEarnings) * 100).toFixed(0)
                                                                : 0}%
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                                                        <div
                                                            className="bg-yellow-500 h-full rounded-full"
                                                            style={{ 
                                                                width: `${earnings && earnings.totalEarnings > 0 
                                                                    ? (earnings.tips / earnings.totalEarnings) * 100 
                                                                    : 0}%` 
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {earnings?.lastPayout && (
                                            <>
                                                <Separator className="bg-gray-800" />
                                                <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                                                    <p className="text-sm text-gray-400 mb-1">Last Payout</p>
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-lg font-bold text-green-400">
                                                            ${earnings.lastPayout.amount.toFixed(2)}
                                                        </p>
                                                        <p className="text-sm text-gray-500">
                                                            {format(new Date(earnings.lastPayout.date), 'MMM d, yyyy')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Right Column - Status & Actions */}
                <div className="space-y-6">
                    {/* Status Card */}
                    <Card className="bg-gray-900 border-gray-800">
                        <CardHeader>
                            <CardTitle className="text-white">Status & Controls</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-white">Active Status</p>
                                    <p className="text-xs text-gray-500">Can receive delivery assignments</p>
                                </div>
                                <Switch
                                    checked={driver.isActive}
                                    onCheckedChange={toggleActiveStatus}
                                    className="data-[state=checked]:bg-green-600"
                                />
                            </div>
                            <Separator className="bg-gray-800" />
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-white">Availability</p>
                                    <p className="text-xs text-gray-500">Ready to take orders now</p>
                                </div>
                                <Switch
                                    checked={driver.isAvailable}
                                    onCheckedChange={toggleAvailability}
                                    disabled={!driver.isActive}
                                    className="data-[state=checked]:bg-blue-600"
                                />
                            </div>
                            {driver.isOnDelivery && (
                                <>
                                    <Separator className="bg-gray-800" />
                                    <div className="p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg">
                                        <div className="flex items-center gap-2 text-purple-400">
                                            <Truck className="h-4 w-4" />
                                            <span className="text-sm font-medium">Currently on delivery</span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Contact Card */}
                    <Card className="bg-gray-900 border-gray-800">
                        <CardHeader>
                            <CardTitle className="text-white">Contact Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {isEditing ? (
                                <div className="space-y-2">
                                    <Label>Phone Number</Label>
                                    <Input
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="bg-gray-800 border-gray-700 focus:border-blue-500"
                                        placeholder="+1 555-0000"
                                    />
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                                        <Mail className="h-5 w-5 text-gray-500" />
                                        <div>
                                            <p className="text-xs text-gray-500">Email</p>
                                            <p className="text-gray-300">{driver.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                                        <Phone className="h-5 w-5 text-gray-500" />
                                        <div>
                                            <p className="text-xs text-gray-500">Phone</p>
                                            <p className="text-gray-300">{driver.phone || 'Not set'}</p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Preferred Zones */}
                    {driver.preferredZones.length > 0 && (
                        <Card className="bg-gray-900 border-gray-800">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <MapPin className="h-5 w-5 text-blue-400" />
                                    Preferred Zones
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {driver.preferredZones.map((zone, i) => (
                                        <Badge key={i} variant="secondary" className="bg-gray-800 text-gray-300">
                                            {zone}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Document Alerts */}
                    {(licenseStatus.status !== 'valid' || insuranceStatus.status !== 'valid') && (
                        <Card className="bg-gray-900 border-yellow-800/50">
                            <CardHeader>
                                <CardTitle className="text-yellow-400 flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5" />
                                    Document Alerts
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {licenseStatus.status !== 'valid' && licenseStatus.status !== 'unknown' && (
                                    <div className={`p-3 rounded-lg ${
                                        licenseStatus.status === 'expired' ? 'bg-red-900/20 border border-red-500/30' : 'bg-yellow-900/20 border border-yellow-500/30'
                                    }`}>
                                        <p className={`text-sm ${licenseStatus.status === 'expired' ? 'text-red-400' : 'text-yellow-400'}`}>
                                            Driver's license {licenseStatus.status === 'expired' ? 'has expired' : 'is expiring soon'}
                                        </p>
                                    </div>
                                )}
                                {insuranceStatus.status !== 'valid' && insuranceStatus.status !== 'unknown' && (
                                    <div className={`p-3 rounded-lg ${
                                        insuranceStatus.status === 'expired' ? 'bg-red-900/20 border border-red-500/30' : 'bg-yellow-900/20 border border-yellow-500/30'
                                    }`}>
                                        <p className={`text-sm ${insuranceStatus.status === 'expired' ? 'text-red-400' : 'text-yellow-400'}`}>
                                            Insurance {insuranceStatus.status === 'expired' ? 'has expired' : 'is expiring soon'}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="bg-gray-900 border-gray-800">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Remove Driver</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                            Are you sure you want to remove {driver.fullName} from your company?
                            This will remove their association with your delivery company but will not delete their user account.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isSaving}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Remove Driver
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
