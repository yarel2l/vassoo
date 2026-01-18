'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
    User,
    Phone,
    Mail,
    Car,
    Star,
    Package,
    DollarSign,
    Clock,
    LogOut,
    ChevronRight,
    Bell,
    Shield,
    HelpCircle,
    Settings,
    CreditCard,
    MapPin,
    Calendar,
    FileText,
    Edit2,
    Check,
    X,
    ShoppingBag,
    Heart,
    Camera,
    AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

interface DriverStats {
    totalDeliveries: number
    totalEarnings: number
    averageRating: number
    thisWeekDeliveries: number
    thisWeekEarnings: number
    completedDeliveries: number
    failedDeliveries: number
    avgDeliveryTimeMinutes: number
    performanceScore: number
}

interface UserProfile {
    id: string
    email: string
    full_name: string | null
    phone: string | null
    avatar_url: string | null
    birth_date: string | null
    age_verified: boolean
    preferred_language: string
    notification_preferences: {
        email: boolean
        push: boolean
        sms: boolean
    }
    current_address: any | null
    created_at: string
}

interface DriverProfile {
    id: string
    delivery_company_id: string
    vehicle_type: string | null
    vehicle_make: string | null
    vehicle_model: string | null
    vehicle_color: string | null
    vehicle_plate: string | null
    drivers_license_number: string | null
    drivers_license_expiry: string | null
    drivers_license_state: string | null
    insurance_policy_number: string | null
    insurance_expiry: string | null
    is_active: boolean
    is_available: boolean
    total_deliveries: number
    average_rating: number
    phone: string | null
    completed_deliveries: number
    failed_deliveries: number
    avg_delivery_time_minutes: number
    performance_score: number
    preferred_zones: string[] | null
    delivery_company?: {
        name: string
    }
}

interface SavedAddress {
    id: string
    label: string
    address_line1: string
    address_line2: string | null
    city: string
    state: string
    zip_code: string
    is_default: boolean
}

const VEHICLE_TYPES = ['car', 'motorcycle', 'bicycle', 'scooter', 'van', 'truck']
const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']

export default function DriverProfilePage() {
    const router = useRouter()
    const { user, signOut } = useAuth()
    const { toast } = useToast()
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
    const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null)
    const [stats, setStats] = useState<DriverStats | null>(null)
    const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [notificationsEnabled, setNotificationsEnabled] = useState(false)
    const [activeTab, setActiveTab] = useState('overview')
    
    // Edit states
    const [isEditingPersonal, setIsEditingPersonal] = useState(false)
    const [isEditingVehicle, setIsEditingVehicle] = useState(false)
    const [isEditingLicense, setIsEditingLicense] = useState(false)
    
    // Form data
    const [personalForm, setPersonalForm] = useState({
        full_name: '',
        phone: '',
        birth_date: ''
    })
    const [vehicleForm, setVehicleForm] = useState({
        vehicle_type: '',
        vehicle_make: '',
        vehicle_model: '',
        vehicle_color: '',
        vehicle_plate: ''
    })
    const [licenseForm, setLicenseForm] = useState({
        drivers_license_number: '',
        drivers_license_state: '',
        drivers_license_expiry: '',
        insurance_policy_number: '',
        insurance_expiry: ''
    })
    
    const supabase = createClient()

    useEffect(() => {
        const fetchAllData = async () => {
            if (!user) return

            try {
                // Fetch user profile
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()

                if (profileError) throw profileError
                setUserProfile(profileData)
                setPersonalForm({
                    full_name: profileData.full_name || '',
                    phone: profileData.phone || '',
                    birth_date: profileData.birth_date || ''
                })

                // Fetch driver profile
                const { data: driverData, error: driverError } = await supabase
                    .from('delivery_drivers')
                    .select(`
                        *,
                        delivery_company:delivery_companies(name)
                    `)
                    .eq('user_id', user.id)
                    .single()

                if (!driverError && driverData) {
                    setDriverProfile(driverData)
                    setVehicleForm({
                        vehicle_type: driverData.vehicle_type || '',
                        vehicle_make: driverData.vehicle_make || '',
                        vehicle_model: driverData.vehicle_model || '',
                        vehicle_color: driverData.vehicle_color || '',
                        vehicle_plate: driverData.vehicle_plate || ''
                    })
                    setLicenseForm({
                        drivers_license_number: driverData.drivers_license_number || '',
                        drivers_license_state: driverData.drivers_license_state || '',
                        drivers_license_expiry: driverData.drivers_license_expiry || '',
                        insurance_policy_number: driverData.insurance_policy_number || '',
                        insurance_expiry: driverData.insurance_expiry || ''
                    })

                    // Fetch delivery stats
                    const { data: deliveriesData } = await supabase
                        .from('deliveries')
                        .select('delivery_fee, tip, status, delivered_at')
                        .eq('driver_id', driverData.id)

                    if (deliveriesData) {
                        const now = new Date()
                        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                        const completedDeliveries = deliveriesData.filter(d => d.status === 'delivered')
                        const thisWeekDeliveries = completedDeliveries.filter(d => 
                            d.delivered_at && new Date(d.delivered_at) > weekAgo
                        )

                        setStats({
                            totalDeliveries: completedDeliveries.length,
                            totalEarnings: completedDeliveries.reduce((sum, d) => 
                                sum + (d.delivery_fee || 0) + (d.tip || 0), 0
                            ),
                            averageRating: driverData.average_rating || 0,
                            thisWeekDeliveries: thisWeekDeliveries.length,
                            thisWeekEarnings: thisWeekDeliveries.reduce((sum, d) => 
                                sum + (d.delivery_fee || 0) + (d.tip || 0), 0
                            ),
                            completedDeliveries: driverData.completed_deliveries || 0,
                            failedDeliveries: driverData.failed_deliveries || 0,
                            avgDeliveryTimeMinutes: driverData.avg_delivery_time_minutes || 30,
                            performanceScore: driverData.performance_score || 1.0
                        })
                    }
                }

                // Fetch saved addresses
                const { data: addressesData } = await supabase
                    .from('user_addresses')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('is_default', { ascending: false })

                if (addressesData) {
                    setSavedAddresses(addressesData)
                }

                // Check notification permission
                if ('Notification' in window) {
                    setNotificationsEnabled(Notification.permission === 'granted')
                }
            } catch (error) {
                console.error('Error fetching profile:', error)
                toast({
                    title: 'Error loading profile',
                    description: 'Please try again later',
                    variant: 'destructive'
                })
            } finally {
                setIsLoading(false)
            }
        }

        fetchAllData()
    }, [user, supabase, toast])

    const savePersonalInfo = async () => {
        if (!user) return
        setIsSaving(true)
        
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: personalForm.full_name,
                    phone: personalForm.phone,
                    birth_date: personalForm.birth_date || null
                })
                .eq('id', user.id)

            if (error) throw error

            setUserProfile(prev => prev ? {
                ...prev,
                full_name: personalForm.full_name,
                phone: personalForm.phone,
                birth_date: personalForm.birth_date
            } : null)
            
            setIsEditingPersonal(false)
            toast({
                title: 'Profile updated',
                description: 'Your personal information has been saved'
            })
        } catch (error) {
            console.error('Error saving profile:', error)
            toast({
                title: 'Error saving profile',
                description: 'Please try again',
                variant: 'destructive'
            })
        } finally {
            setIsSaving(false)
        }
    }

    const saveVehicleInfo = async () => {
        if (!driverProfile) return
        setIsSaving(true)
        
        try {
            const { error } = await supabase
                .from('delivery_drivers')
                .update({
                    vehicle_type: vehicleForm.vehicle_type,
                    vehicle_make: vehicleForm.vehicle_make,
                    vehicle_model: vehicleForm.vehicle_model,
                    vehicle_color: vehicleForm.vehicle_color,
                    vehicle_plate: vehicleForm.vehicle_plate
                })
                .eq('id', driverProfile.id)

            if (error) throw error

            setDriverProfile(prev => prev ? {
                ...prev,
                ...vehicleForm
            } : null)
            
            setIsEditingVehicle(false)
            toast({
                title: 'Vehicle info updated',
                description: 'Your vehicle information has been saved'
            })
        } catch (error) {
            console.error('Error saving vehicle info:', error)
            toast({
                title: 'Error saving vehicle info',
                description: 'Please try again',
                variant: 'destructive'
            })
        } finally {
            setIsSaving(false)
        }
    }

    const saveLicenseInfo = async () => {
        if (!driverProfile) return
        setIsSaving(true)
        
        try {
            const { error } = await supabase
                .from('delivery_drivers')
                .update({
                    drivers_license_number: licenseForm.drivers_license_number,
                    drivers_license_state: licenseForm.drivers_license_state,
                    drivers_license_expiry: licenseForm.drivers_license_expiry || null,
                    insurance_policy_number: licenseForm.insurance_policy_number,
                    insurance_expiry: licenseForm.insurance_expiry || null
                })
                .eq('id', driverProfile.id)

            if (error) throw error

            setDriverProfile(prev => prev ? {
                ...prev,
                ...licenseForm
            } : null)
            
            setIsEditingLicense(false)
            toast({
                title: 'License info updated',
                description: 'Your license information has been saved'
            })
        } catch (error) {
            console.error('Error saving license info:', error)
            toast({
                title: 'Error saving license info',
                description: 'Please try again',
                variant: 'destructive'
            })
        } finally {
            setIsSaving(false)
        }
    }

    const handleNotificationToggle = async () => {
        if (!('Notification' in window)) {
            toast({
                title: 'Not supported',
                description: 'Notifications are not supported in this browser',
                variant: 'destructive'
            })
            return
        }

        if (Notification.permission === 'granted') {
            toast({
                title: 'Browser settings required',
                description: 'To disable notifications, please update your browser settings'
            })
            return
        }

        const permission = await Notification.requestPermission()
        setNotificationsEnabled(permission === 'granted')
    }

    const handleSignOut = async () => {
        await signOut()
        router.push('/driver/login')
    }

    const isLicenseExpiringSoon = (date: string | null) => {
        if (!date) return false
        const expiry = new Date(date)
        const now = new Date()
        const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return daysUntilExpiry <= 30 && daysUntilExpiry > 0
    }

    const isLicenseExpired = (date: string | null) => {
        if (!date) return false
        return new Date(date) < new Date()
    }

    if (isLoading) {
        return (
            <div className="p-4 space-y-4">
                <div className="h-32 bg-gray-800 rounded-lg animate-pulse" />
                <div className="h-24 bg-gray-800 rounded-lg animate-pulse" />
                <div className="h-48 bg-gray-800 rounded-lg animate-pulse" />
            </div>
        )
    }

    return (
        <div className="p-4 space-y-4 pb-24">
            {/* Profile Header */}
            <Card className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-gray-700">
                <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center overflow-hidden">
                                {userProfile?.avatar_url ? (
                                    <img 
                                        src={userProfile.avatar_url} 
                                        alt="Profile" 
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <User className="h-10 w-10 text-blue-400" />
                                )}
                            </div>
                            <button className="absolute bottom-0 right-0 p-1.5 bg-blue-600 rounded-full hover:bg-blue-700 transition-colors">
                                <Camera className="h-3 w-3 text-white" />
                            </button>
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-white">
                                {userProfile?.full_name || 'Driver'}
                            </h2>
                            <p className="text-sm text-gray-400">{userProfile?.email}</p>
                            {driverProfile?.delivery_company && (
                                <Badge variant="secondary" className="mt-1 bg-blue-500/20 text-blue-400 border-blue-500/30">
                                    {driverProfile.delivery_company.name}
                                </Badge>
                            )}
                        </div>
                        <div className="text-center">
                            <div className="flex items-center gap-1 text-yellow-400">
                                <Star className="h-5 w-5 fill-yellow-400" />
                                <span className="text-lg font-bold">{stats?.averageRating.toFixed(1) || '0.0'}</span>
                            </div>
                            <p className="text-xs text-gray-500">Rating</p>
                        </div>
                    </div>
                    
                    {/* Driver Status Badge */}
                    <div className="flex items-center gap-2 mt-4">
                        <Badge className={cn(
                            driverProfile?.is_active 
                                ? "bg-green-500/20 text-green-400 border-green-500/30" 
                                : "bg-red-500/20 text-red-400 border-red-500/30"
                        )}>
                            {driverProfile?.is_active ? 'Active Driver' : 'Inactive'}
                        </Badge>
                        {stats && stats.performanceScore >= 0.9 && (
                            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                                ⭐ Top Performer
                            </Badge>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full bg-gray-800/50 border border-gray-700">
                    <TabsTrigger value="overview" className="flex-1 data-[state=active]:bg-blue-600">
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="driver" className="flex-1 data-[state=active]:bg-blue-600">
                        Driver Info
                    </TabsTrigger>
                    <TabsTrigger value="account" className="flex-1 data-[state=active]:bg-blue-600">
                        Account
                    </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4 mt-4">
                    {/* Stats Summary */}
                    <div className="grid grid-cols-2 gap-3">
                        <Card className="bg-gray-800/50 border-gray-700">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-green-500/20">
                                        <DollarSign className="h-5 w-5 text-green-400" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-white">
                                            ${stats?.thisWeekEarnings.toFixed(2) || '0.00'}
                                        </p>
                                        <p className="text-xs text-gray-400">This Week</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-gray-800/50 border-gray-700">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-blue-500/20">
                                        <Package className="h-5 w-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-white">
                                            {stats?.thisWeekDeliveries || 0}
                                        </p>
                                        <p className="text-xs text-gray-400">Deliveries</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* All Time Stats */}
                    <Card className="bg-gray-800/50 border-gray-700">
                        <CardContent className="p-4">
                            <h3 className="font-semibold text-white mb-3">All Time Stats</h3>
                            <div className="grid grid-cols-4 gap-2 text-center">
                                <div>
                                    <p className="text-xl font-bold text-blue-400">
                                        {stats?.totalDeliveries || 0}
                                    </p>
                                    <p className="text-[10px] text-gray-400">Deliveries</p>
                                </div>
                                <div>
                                    <p className="text-xl font-bold text-green-400">
                                        ${stats?.totalEarnings.toFixed(0) || 0}
                                    </p>
                                    <p className="text-[10px] text-gray-400">Earned</p>
                                </div>
                                <div>
                                    <p className="text-xl font-bold text-purple-400">
                                        {stats?.avgDeliveryTimeMinutes || 30}m
                                    </p>
                                    <p className="text-[10px] text-gray-400">Avg Time</p>
                                </div>
                                <div>
                                    <p className="text-xl font-bold text-amber-400">
                                        {((stats?.performanceScore || 1) * 100).toFixed(0)}%
                                    </p>
                                    <p className="text-[10px] text-gray-400">Score</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Driver Info Tab */}
                <TabsContent value="driver" className="space-y-4 mt-4">
                    {/* Vehicle Information */}
                    <Card className="bg-gray-800/50 border-gray-700">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm text-white flex items-center gap-2">
                                <Car className="h-4 w-4" />
                                Vehicle Information
                            </CardTitle>
                            {!isEditingVehicle ? (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setIsEditingVehicle(true)}
                                    className="text-blue-400 hover:text-blue-300"
                                >
                                    <Edit2 className="h-4 w-4" />
                                </Button>
                            ) : (
                                <div className="flex gap-1">
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => setIsEditingVehicle(false)}
                                        className="text-gray-400"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={saveVehicleInfo}
                                        disabled={isSaving}
                                        className="text-green-400"
                                    >
                                        <Check className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {isEditingVehicle ? (
                                <>
                                    <div className="space-y-2">
                                        <Label className="text-gray-400 text-xs">Vehicle Type</Label>
                                        <Select 
                                            value={vehicleForm.vehicle_type} 
                                            onValueChange={(v) => setVehicleForm(prev => ({ ...prev, vehicle_type: v }))}
                                        >
                                            <SelectTrigger className="bg-gray-900 border-gray-700">
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-gray-900 border-gray-700">
                                                {VEHICLE_TYPES.map(type => (
                                                    <SelectItem key={type} value={type} className="capitalize">
                                                        {type}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-2">
                                            <Label className="text-gray-400 text-xs">Make</Label>
                                            <Input 
                                                value={vehicleForm.vehicle_make}
                                                onChange={(e) => setVehicleForm(prev => ({ ...prev, vehicle_make: e.target.value }))}
                                                className="bg-gray-900 border-gray-700"
                                                placeholder="Toyota"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-gray-400 text-xs">Model</Label>
                                            <Input 
                                                value={vehicleForm.vehicle_model}
                                                onChange={(e) => setVehicleForm(prev => ({ ...prev, vehicle_model: e.target.value }))}
                                                className="bg-gray-900 border-gray-700"
                                                placeholder="Camry"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-2">
                                            <Label className="text-gray-400 text-xs">Color</Label>
                                            <Input 
                                                value={vehicleForm.vehicle_color}
                                                onChange={(e) => setVehicleForm(prev => ({ ...prev, vehicle_color: e.target.value }))}
                                                className="bg-gray-900 border-gray-700"
                                                placeholder="Silver"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-gray-400 text-xs">License Plate</Label>
                                            <Input 
                                                value={vehicleForm.vehicle_plate}
                                                onChange={(e) => setVehicleForm(prev => ({ ...prev, vehicle_plate: e.target.value }))}
                                                className="bg-gray-900 border-gray-700"
                                                placeholder="ABC-1234"
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400 text-sm">Type</span>
                                        <span className="text-white text-sm capitalize">{driverProfile?.vehicle_type || 'Not set'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400 text-sm">Vehicle</span>
                                        <span className="text-white text-sm">
                                            {driverProfile?.vehicle_make && driverProfile?.vehicle_model 
                                                ? `${driverProfile.vehicle_make} ${driverProfile.vehicle_model}`
                                                : 'Not set'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400 text-sm">Color</span>
                                        <span className="text-white text-sm">{driverProfile?.vehicle_color || 'Not set'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400 text-sm">Plate</span>
                                        <span className="text-white text-sm font-mono">{driverProfile?.vehicle_plate || 'Not set'}</span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* License & Insurance */}
                    <Card className="bg-gray-800/50 border-gray-700">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm text-white flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                License & Insurance
                            </CardTitle>
                            {!isEditingLicense ? (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setIsEditingLicense(true)}
                                    className="text-blue-400 hover:text-blue-300"
                                >
                                    <Edit2 className="h-4 w-4" />
                                </Button>
                            ) : (
                                <div className="flex gap-1">
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => setIsEditingLicense(false)}
                                        className="text-gray-400"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={saveLicenseInfo}
                                        disabled={isSaving}
                                        className="text-green-400"
                                    >
                                        <Check className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {isEditingLicense ? (
                                <>
                                    <div className="space-y-2">
                                        <Label className="text-gray-400 text-xs">Driver&apos;s License Number</Label>
                                        <Input 
                                            value={licenseForm.drivers_license_number}
                                            onChange={(e) => setLicenseForm(prev => ({ ...prev, drivers_license_number: e.target.value }))}
                                            className="bg-gray-900 border-gray-700"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-2">
                                            <Label className="text-gray-400 text-xs">State</Label>
                                            <Select 
                                                value={licenseForm.drivers_license_state} 
                                                onValueChange={(v) => setLicenseForm(prev => ({ ...prev, drivers_license_state: v }))}
                                            >
                                                <SelectTrigger className="bg-gray-900 border-gray-700">
                                                    <SelectValue placeholder="State" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-gray-900 border-gray-700 max-h-48">
                                                    {US_STATES.map(state => (
                                                        <SelectItem key={state} value={state}>{state}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-gray-400 text-xs">Expiry Date</Label>
                                            <Input 
                                                type="date"
                                                value={licenseForm.drivers_license_expiry}
                                                onChange={(e) => setLicenseForm(prev => ({ ...prev, drivers_license_expiry: e.target.value }))}
                                                className="bg-gray-900 border-gray-700"
                                            />
                                        </div>
                                    </div>
                                    <Separator className="bg-gray-700" />
                                    <div className="space-y-2">
                                        <Label className="text-gray-400 text-xs">Insurance Policy Number</Label>
                                        <Input 
                                            value={licenseForm.insurance_policy_number}
                                            onChange={(e) => setLicenseForm(prev => ({ ...prev, insurance_policy_number: e.target.value }))}
                                            className="bg-gray-900 border-gray-700"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-gray-400 text-xs">Insurance Expiry</Label>
                                        <Input 
                                            type="date"
                                            value={licenseForm.insurance_expiry}
                                            onChange={(e) => setLicenseForm(prev => ({ ...prev, insurance_expiry: e.target.value }))}
                                            className="bg-gray-900 border-gray-700"
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Driver&apos;s License</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-white text-sm font-mono">
                                                {driverProfile?.drivers_license_number || 'Not provided'}
                                            </span>
                                            {driverProfile?.drivers_license_state && (
                                                <Badge variant="outline" className="border-gray-600">
                                                    {driverProfile.drivers_license_state}
                                                </Badge>
                                            )}
                                        </div>
                                        {driverProfile?.drivers_license_expiry && (
                                            <div className="flex items-center gap-2 mt-1">
                                                <Calendar className="h-3 w-3 text-gray-500" />
                                                <span className={cn(
                                                    "text-xs",
                                                    isLicenseExpired(driverProfile.drivers_license_expiry) 
                                                        ? "text-red-400" 
                                                        : isLicenseExpiringSoon(driverProfile.drivers_license_expiry)
                                                            ? "text-amber-400"
                                                            : "text-gray-400"
                                                )}>
                                                    Expires: {new Date(driverProfile.drivers_license_expiry).toLocaleDateString()}
                                                    {isLicenseExpired(driverProfile.drivers_license_expiry) && ' (EXPIRED)'}
                                                    {isLicenseExpiringSoon(driverProfile.drivers_license_expiry) && ' (Expiring soon)'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <Separator className="bg-gray-700" />
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Insurance</p>
                                        <span className="text-white text-sm font-mono">
                                            {driverProfile?.insurance_policy_number || 'Not provided'}
                                        </span>
                                        {driverProfile?.insurance_expiry && (
                                            <div className="flex items-center gap-2 mt-1">
                                                <Calendar className="h-3 w-3 text-gray-500" />
                                                <span className={cn(
                                                    "text-xs",
                                                    isLicenseExpired(driverProfile.insurance_expiry) 
                                                        ? "text-red-400" 
                                                        : isLicenseExpiringSoon(driverProfile.insurance_expiry)
                                                            ? "text-amber-400"
                                                            : "text-gray-400"
                                                )}>
                                                    Expires: {new Date(driverProfile.insurance_expiry).toLocaleDateString()}
                                                    {isLicenseExpired(driverProfile.insurance_expiry) && ' (EXPIRED)'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Alerts */}
                    {(isLicenseExpired(driverProfile?.drivers_license_expiry || null) || 
                      isLicenseExpired(driverProfile?.insurance_expiry || null) ||
                      isLicenseExpiringSoon(driverProfile?.drivers_license_expiry || null) ||
                      isLicenseExpiringSoon(driverProfile?.insurance_expiry || null)) && (
                        <Card className="bg-amber-500/10 border-amber-500/30">
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-amber-400">Action Required</p>
                                        <p className="text-xs text-amber-300/80 mt-1">
                                            {isLicenseExpired(driverProfile?.drivers_license_expiry || null) && 
                                                'Your driver\'s license has expired. '}
                                            {isLicenseExpired(driverProfile?.insurance_expiry || null) && 
                                                'Your insurance has expired. '}
                                            {isLicenseExpiringSoon(driverProfile?.drivers_license_expiry || null) && 
                                                'Your driver\'s license is expiring soon. '}
                                            {isLicenseExpiringSoon(driverProfile?.insurance_expiry || null) && 
                                                'Your insurance is expiring soon. '}
                                            Please update your documents to continue delivering.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Account Tab */}
                <TabsContent value="account" className="space-y-4 mt-4">
                    {/* Personal Information */}
                    <Card className="bg-gray-800/50 border-gray-700">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm text-white flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Personal Information
                            </CardTitle>
                            {!isEditingPersonal ? (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setIsEditingPersonal(true)}
                                    className="text-blue-400 hover:text-blue-300"
                                >
                                    <Edit2 className="h-4 w-4" />
                                </Button>
                            ) : (
                                <div className="flex gap-1">
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => setIsEditingPersonal(false)}
                                        className="text-gray-400"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={savePersonalInfo}
                                        disabled={isSaving}
                                        className="text-green-400"
                                    >
                                        <Check className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {isEditingPersonal ? (
                                <>
                                    <div className="space-y-2">
                                        <Label className="text-gray-400 text-xs">Full Name</Label>
                                        <Input 
                                            value={personalForm.full_name}
                                            onChange={(e) => setPersonalForm(prev => ({ ...prev, full_name: e.target.value }))}
                                            className="bg-gray-900 border-gray-700"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-gray-400 text-xs">Phone Number</Label>
                                        <Input 
                                            value={personalForm.phone}
                                            onChange={(e) => setPersonalForm(prev => ({ ...prev, phone: e.target.value }))}
                                            className="bg-gray-900 border-gray-700"
                                            placeholder="+1 (555) 000-0000"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-gray-400 text-xs">Date of Birth</Label>
                                        <Input 
                                            type="date"
                                            value={personalForm.birth_date}
                                            onChange={(e) => setPersonalForm(prev => ({ ...prev, birth_date: e.target.value }))}
                                            className="bg-gray-900 border-gray-700"
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-gray-500" />
                                            <span className="text-gray-400 text-sm">Name</span>
                                        </div>
                                        <span className="text-white text-sm">{userProfile?.full_name || 'Not set'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-gray-500" />
                                            <span className="text-gray-400 text-sm">Email</span>
                                        </div>
                                        <span className="text-white text-sm">{userProfile?.email}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-4 w-4 text-gray-500" />
                                            <span className="text-gray-400 text-sm">Phone</span>
                                        </div>
                                        <span className="text-white text-sm">{userProfile?.phone || 'Not set'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-gray-500" />
                                            <span className="text-gray-400 text-sm">Birthday</span>
                                        </div>
                                        <span className="text-white text-sm">
                                            {userProfile?.birth_date 
                                                ? new Date(userProfile.birth_date).toLocaleDateString() 
                                                : 'Not set'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Saved Addresses */}
                    <Card className="bg-gray-800/50 border-gray-700">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-white flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                Saved Addresses
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {savedAddresses.length === 0 ? (
                                <p className="text-gray-400 text-sm text-center py-4">
                                    No saved addresses yet
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {savedAddresses.map(address => (
                                        <div 
                                            key={address.id} 
                                            className="p-3 bg-gray-900/50 rounded-lg border border-gray-700"
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-white text-sm font-medium">{address.label}</span>
                                                {address.is_default && (
                                                    <Badge variant="secondary" className="text-xs">Default</Badge>
                                                )}
                                            </div>
                                            <p className="text-gray-400 text-xs">
                                                {address.address_line1}
                                                {address.address_line2 && `, ${address.address_line2}`}
                                            </p>
                                            <p className="text-gray-500 text-xs">
                                                {address.city}, {address.state} {address.zip_code}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <Link href="/account">
                                <Button variant="outline" className="w-full mt-3 border-gray-700 text-white">
                                    Manage Addresses
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Settings */}
                    <Card className="bg-gray-800/50 border-gray-700">
                        <CardContent className="p-0">
                            <div className="p-4 border-b border-gray-700">
                                <h3 className="font-semibold text-white">Settings</h3>
                            </div>
                            
                            {/* Notifications */}
                            <div 
                                onClick={handleNotificationToggle}
                                className="w-full flex items-center justify-between p-4 hover:bg-gray-700/50 transition-colors cursor-pointer"
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === 'Enter' && handleNotificationToggle()}
                            >
                                <div className="flex items-center gap-3">
                                    <Bell className="h-5 w-5 text-gray-400" />
                                    <div className="text-left">
                                        <p className="text-white">Push Notifications</p>
                                        <p className="text-xs text-gray-400">
                                            Get notified about new deliveries
                                        </p>
                                    </div>
                                </div>
                                <Switch checked={notificationsEnabled} />
                            </div>

                            <Separator className="bg-gray-700" />

                            {/* Full Account Settings */}
                            <Link href="/account" className="block">
                                <button className="w-full flex items-center justify-between p-4 hover:bg-gray-700/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <Settings className="h-5 w-5 text-gray-400" />
                                        <span className="text-white">Full Account Settings</span>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-gray-500" />
                                </button>
                            </Link>

                            <Separator className="bg-gray-700" />

                            {/* Help */}
                            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-700/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <HelpCircle className="h-5 w-5 text-gray-400" />
                                    <span className="text-white">Help & Support</span>
                                </div>
                                <ChevronRight className="h-5 w-5 text-gray-500" />
                            </button>

                            <Separator className="bg-gray-700" />

                            {/* Privacy */}
                            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-700/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <Shield className="h-5 w-5 text-gray-400" />
                                    <span className="text-white">Privacy Policy</span>
                                </div>
                                <ChevronRight className="h-5 w-5 text-gray-500" />
                            </button>
                        </CardContent>
                    </Card>

                    {/* Sign Out */}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button 
                                variant="outline" 
                                className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                            >
                                <LogOut className="h-5 w-5 mr-2" />
                                Sign Out
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-gray-900 border-gray-800">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-white">Sign Out?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    You will need to sign in again to access the driver app.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="bg-gray-800 border-gray-700 text-white">
                                    Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    className="bg-red-600 hover:bg-red-700"
                                    onClick={handleSignOut}
                                >
                                    Sign Out
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    {/* App Version */}
                    <p className="text-center text-xs text-gray-600">
                        Vassoo Driver v1.0.0
                    </p>
                </TabsContent>
            </Tabs>
        </div>
    )
}
