'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
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
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
} from '@/components/ui/sheet'
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
    Search,
    UserPlus,
    MoreHorizontal,
    Phone,
    Shield,
    Star,
    Truck,
    Clock,
    User,
    Users,
    Mail,
    AlertCircle,
    Loader2,
    RefreshCw,
    X,
    Map,
    Filter,
    Download,
    FileSpreadsheet,
    Edit,
    Trash2,
    Eye,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Car,
    Bike,
    Calendar,
    FileText,
    MapPin,
    Activity,
    TrendingUp,
    Award,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Send,
    UserCheck,
    Copy,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import Link from 'next/link'
import { format, differenceInDays, parseISO } from 'date-fns'

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

interface DriverStats {
    totalDrivers: number
    activeDrivers: number
    availableDrivers: number
    onDeliveryDrivers: number
    avgRating: number
    totalDeliveries: number
    avgPerformanceScore: number
    licensesExpiringSoon: number
    insuranceExpiringSoon: number
}

type SortField = 'fullName' | 'totalDeliveries' | 'averageRating' | 'performanceScore' | 'createdAt'
type SortOrder = 'asc' | 'desc'

interface Filters {
    status: string
    availability: string
    vehicleType: string
    licenseStatus: string
    insuranceStatus: string
}

const defaultFilters: Filters = {
    status: 'all',
    availability: 'all',
    vehicleType: 'all',
    licenseStatus: 'all',
    insuranceStatus: 'all',
}

const vehicleTypes = ['Car', 'Motorcycle', 'Bicycle', 'Van', 'Truck', 'Scooter']

export default function DriversPage() {
    const router = useRouter()
    const { tenants, activeTenantId, isPlatformAdmin } = useAuth()
    const [drivers, setDrivers] = useState<Driver[]>([])
    const [stats, setStats] = useState<DriverStats | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [companyId, setCompanyId] = useState<string | null>(null)
    
    // Dialogs
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    
    // New user creation state
    const [userExists, setUserExists] = useState<boolean | null>(null)
    const [isCheckingEmail, setIsCheckingEmail] = useState(false)
    const [existingUserId, setExistingUserId] = useState<string | null>(null)
    const [existingUserName, setExistingUserName] = useState<string | null>(null)
    
    // Filters
    const [isFiltersOpen, setIsFiltersOpen] = useState(false)
    const [filters, setFilters] = useState<Filters>(defaultFilters)
    const [activeFiltersCount, setActiveFiltersCount] = useState(0)
    
    // Sorting
    const [sortField, setSortField] = useState<SortField>('createdAt')
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const [rowsPerPage, setRowsPerPage] = useState(10)

    // Form state for new driver
    const [driverForm, setDriverForm] = useState({
        // User info (for new users)
        email: '',
        fullName: '',
        password: '',
        // Driver specific
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

    // Fetch drivers
    const fetchDrivers = useCallback(async () => {
        if (!companyId) return

        try {
            setIsLoading(true)
            const supabase = createClient()

            const { data: driversData, error } = await supabase
                .from('delivery_drivers')
                .select('*, profiles(full_name, email)')
                .eq('delivery_company_id', companyId)
                .order('created_at', { ascending: false })

            if (error) throw error

            const transformedDrivers: Driver[] = (driversData || []).map((d: any) => ({
                id: d.id,
                userId: d.user_id,
                fullName: d.profiles?.full_name || 'Unknown',
                email: d.profiles?.email || '',
                phone: d.phone || '',
                vehicleType: d.vehicle_type || 'Car',
                vehicleMake: d.vehicle_make || '',
                vehicleModel: d.vehicle_model || '',
                vehicleColor: d.vehicle_color || '',
                vehiclePlate: d.vehicle_plate || '',
                driversLicenseNumber: d.drivers_license_number || '',
                driversLicenseExpiry: d.drivers_license_expiry,
                driversLicenseState: d.drivers_license_state || '',
                insurancePolicyNumber: d.insurance_policy_number || '',
                insuranceExpiry: d.insurance_expiry,
                isActive: d.is_active ?? true,
                isAvailable: d.is_available ?? false,
                isOnDelivery: d.is_on_delivery ?? false,
                totalDeliveries: d.total_deliveries || 0,
                completedDeliveries: d.completed_deliveries || 0,
                failedDeliveries: d.failed_deliveries || 0,
                avgDeliveryTimeMinutes: d.avg_delivery_time_minutes || 30,
                performanceScore: parseFloat(d.performance_score) || 1.0,
                averageRating: parseFloat(d.average_rating) || 0,
                totalDistanceMiles: parseFloat(d.total_distance_miles) || 0,
                preferredZones: d.preferred_zones || [],
                createdAt: d.created_at,
                lastAssignmentAt: d.last_assignment_at,
            }))

            setDrivers(transformedDrivers)
            calculateStats(transformedDrivers)
        } catch (err) {
            console.error('Error fetching drivers:', err)
            toast({
                title: 'Error',
                description: 'Failed to load drivers',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }, [companyId])

    useEffect(() => {
        if (companyId) {
            fetchDrivers()
        }
    }, [companyId, fetchDrivers])

    // Calculate stats
    const calculateStats = (driversList: Driver[]) => {
        const now = new Date()
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        
        const stats: DriverStats = {
            totalDrivers: driversList.length,
            activeDrivers: driversList.filter(d => d.isActive).length,
            availableDrivers: driversList.filter(d => d.isAvailable && d.isActive).length,
            onDeliveryDrivers: driversList.filter(d => d.isOnDelivery).length,
            avgRating: driversList.length > 0 
                ? driversList.reduce((sum, d) => sum + d.averageRating, 0) / driversList.length 
                : 0,
            totalDeliveries: driversList.reduce((sum, d) => sum + d.totalDeliveries, 0),
            avgPerformanceScore: driversList.length > 0
                ? driversList.reduce((sum, d) => sum + d.performanceScore, 0) / driversList.length
                : 0,
            licensesExpiringSoon: driversList.filter(d => {
                if (!d.driversLicenseExpiry) return false
                const expiry = parseISO(d.driversLicenseExpiry)
                return expiry <= thirtyDaysFromNow && expiry >= now
            }).length,
            insuranceExpiringSoon: driversList.filter(d => {
                if (!d.insuranceExpiry) return false
                const expiry = parseISO(d.insuranceExpiry)
                return expiry <= thirtyDaysFromNow && expiry >= now
            }).length,
        }
        setStats(stats)
    }

    // Count active filters
    useEffect(() => {
        let count = 0
        if (filters.status !== 'all') count++
        if (filters.availability !== 'all') count++
        if (filters.vehicleType !== 'all') count++
        if (filters.licenseStatus !== 'all') count++
        if (filters.insuranceStatus !== 'all') count++
        setActiveFiltersCount(count)
    }, [filters])

    // Filter and sort drivers
    const filteredAndSortedDrivers = useMemo(() => {
        let result = [...drivers]
        const now = new Date()
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

        // Apply search
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            result = result.filter(d =>
                d.fullName.toLowerCase().includes(query) ||
                d.email.toLowerCase().includes(query) ||
                d.phone.includes(query) ||
                d.vehiclePlate.toLowerCase().includes(query)
            )
        }

        // Apply filters
        if (filters.status !== 'all') {
            if (filters.status === 'active') {
                result = result.filter(d => d.isActive)
            } else if (filters.status === 'inactive') {
                result = result.filter(d => !d.isActive)
            } else if (filters.status === 'on_delivery') {
                result = result.filter(d => d.isOnDelivery)
            }
        }

        if (filters.availability !== 'all') {
            result = result.filter(d => filters.availability === 'available' ? d.isAvailable : !d.isAvailable)
        }

        if (filters.vehicleType !== 'all') {
            result = result.filter(d => d.vehicleType === filters.vehicleType)
        }

        if (filters.licenseStatus !== 'all') {
            if (filters.licenseStatus === 'valid') {
                result = result.filter(d => {
                    if (!d.driversLicenseExpiry) return true
                    return parseISO(d.driversLicenseExpiry) > now
                })
            } else if (filters.licenseStatus === 'expiring') {
                result = result.filter(d => {
                    if (!d.driversLicenseExpiry) return false
                    const expiry = parseISO(d.driversLicenseExpiry)
                    return expiry <= thirtyDaysFromNow && expiry >= now
                })
            } else if (filters.licenseStatus === 'expired') {
                result = result.filter(d => {
                    if (!d.driversLicenseExpiry) return false
                    return parseISO(d.driversLicenseExpiry) < now
                })
            }
        }

        if (filters.insuranceStatus !== 'all') {
            if (filters.insuranceStatus === 'valid') {
                result = result.filter(d => {
                    if (!d.insuranceExpiry) return true
                    return parseISO(d.insuranceExpiry) > now
                })
            } else if (filters.insuranceStatus === 'expiring') {
                result = result.filter(d => {
                    if (!d.insuranceExpiry) return false
                    const expiry = parseISO(d.insuranceExpiry)
                    return expiry <= thirtyDaysFromNow && expiry >= now
                })
            } else if (filters.insuranceStatus === 'expired') {
                result = result.filter(d => {
                    if (!d.insuranceExpiry) return false
                    return parseISO(d.insuranceExpiry) < now
                })
            }
        }

        // Apply sorting
        result.sort((a, b) => {
            let comparison = 0
            switch (sortField) {
                case 'fullName':
                    comparison = a.fullName.localeCompare(b.fullName)
                    break
                case 'totalDeliveries':
                    comparison = a.totalDeliveries - b.totalDeliveries
                    break
                case 'averageRating':
                    comparison = a.averageRating - b.averageRating
                    break
                case 'performanceScore':
                    comparison = a.performanceScore - b.performanceScore
                    break
                case 'createdAt':
                    comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                    break
            }
            return sortOrder === 'asc' ? comparison : -comparison
        })

        return result
    }, [drivers, searchQuery, filters, sortField, sortOrder])

    // Pagination
    const totalPages = Math.ceil(filteredAndSortedDrivers.length / rowsPerPage)
    const paginatedDrivers = filteredAndSortedDrivers.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    )

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [filters, searchQuery])

    // Handle sort
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortOrder('desc')
        }
    }

    // Get sort icon
    const getSortIcon = (field: SortField) => {
        if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />
        return sortOrder === 'asc' 
            ? <ArrowUp className="h-4 w-4 ml-1" />
            : <ArrowDown className="h-4 w-4 ml-1" />
    }

    // Reset filters
    const resetFilters = () => {
        setFilters(defaultFilters)
    }

    // Export functions
    const exportToCSV = () => {
        const headers = [
            'Name', 'Email', 'Phone', 'Vehicle Type', 'Vehicle Make', 'Vehicle Model',
            'License Plate', 'License Number', 'License Expiry', 'Insurance Policy',
            'Insurance Expiry', 'Status', 'Available', 'Total Deliveries', 'Rating',
            'Performance Score', 'Joined Date'
        ]
        
        const rows = filteredAndSortedDrivers.map(d => [
            d.fullName,
            d.email,
            d.phone,
            d.vehicleType,
            d.vehicleMake,
            d.vehicleModel,
            d.vehiclePlate,
            d.driversLicenseNumber,
            d.driversLicenseExpiry || '',
            d.insurancePolicyNumber,
            d.insuranceExpiry || '',
            d.isActive ? 'Active' : 'Inactive',
            d.isAvailable ? 'Yes' : 'No',
            d.totalDeliveries,
            d.averageRating.toFixed(1),
            (d.performanceScore * 100).toFixed(0) + '%',
            format(new Date(d.createdAt), 'yyyy-MM-dd')
        ])

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `drivers_${format(new Date(), 'yyyy-MM-dd')}.csv`
        link.click()
        
        toast({ title: 'Success', description: 'Drivers exported to CSV' })
    }

    const exportToExcel = () => {
        // Create Excel-compatible XML
        const headers = [
            'Name', 'Email', 'Phone', 'Vehicle Type', 'Vehicle Make', 'Vehicle Model',
            'License Plate', 'License Number', 'License Expiry', 'Insurance Policy',
            'Insurance Expiry', 'Status', 'Available', 'Total Deliveries', 'Rating',
            'Performance Score', 'Joined Date'
        ]
        
        let xmlContent = '<?xml version="1.0"?>\n'
        xmlContent += '<?mso-application progid="Excel.Sheet"?>\n'
        xmlContent += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n'
        xmlContent += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n'
        xmlContent += '<Worksheet ss:Name="Drivers">\n<Table>\n'
        
        // Header row
        xmlContent += '<Row>\n'
        headers.forEach(h => {
            xmlContent += `<Cell><Data ss:Type="String">${h}</Data></Cell>\n`
        })
        xmlContent += '</Row>\n'
        
        // Data rows
        filteredAndSortedDrivers.forEach(d => {
            xmlContent += '<Row>\n'
            xmlContent += `<Cell><Data ss:Type="String">${d.fullName}</Data></Cell>\n`
            xmlContent += `<Cell><Data ss:Type="String">${d.email}</Data></Cell>\n`
            xmlContent += `<Cell><Data ss:Type="String">${d.phone}</Data></Cell>\n`
            xmlContent += `<Cell><Data ss:Type="String">${d.vehicleType}</Data></Cell>\n`
            xmlContent += `<Cell><Data ss:Type="String">${d.vehicleMake}</Data></Cell>\n`
            xmlContent += `<Cell><Data ss:Type="String">${d.vehicleModel}</Data></Cell>\n`
            xmlContent += `<Cell><Data ss:Type="String">${d.vehiclePlate}</Data></Cell>\n`
            xmlContent += `<Cell><Data ss:Type="String">${d.driversLicenseNumber}</Data></Cell>\n`
            xmlContent += `<Cell><Data ss:Type="String">${d.driversLicenseExpiry || ''}</Data></Cell>\n`
            xmlContent += `<Cell><Data ss:Type="String">${d.insurancePolicyNumber}</Data></Cell>\n`
            xmlContent += `<Cell><Data ss:Type="String">${d.insuranceExpiry || ''}</Data></Cell>\n`
            xmlContent += `<Cell><Data ss:Type="String">${d.isActive ? 'Active' : 'Inactive'}</Data></Cell>\n`
            xmlContent += `<Cell><Data ss:Type="String">${d.isAvailable ? 'Yes' : 'No'}</Data></Cell>\n`
            xmlContent += `<Cell><Data ss:Type="Number">${d.totalDeliveries}</Data></Cell>\n`
            xmlContent += `<Cell><Data ss:Type="Number">${d.averageRating.toFixed(1)}</Data></Cell>\n`
            xmlContent += `<Cell><Data ss:Type="Number">${(d.performanceScore * 100).toFixed(0)}</Data></Cell>\n`
            xmlContent += `<Cell><Data ss:Type="String">${format(new Date(d.createdAt), 'yyyy-MM-dd')}</Data></Cell>\n`
            xmlContent += '</Row>\n'
        })
        
        xmlContent += '</Table>\n</Worksheet>\n</Workbook>'
        
        const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `drivers_${format(new Date(), 'yyyy-MM-dd')}.xls`
        link.click()
        
        toast({ title: 'Success', description: 'Drivers exported to Excel' })
    }

    // Toggle availability
    const toggleAvailability = async (driver: Driver) => {
        const supabase = createClient()
        const { error } = await supabase
            .from('delivery_drivers')
            .update({ is_available: !driver.isAvailable })
            .eq('id', driver.id)

        if (!error) {
            setDrivers(drivers.map(d => d.id === driver.id ? { ...d, isAvailable: !driver.isAvailable } : d))
            toast({ title: 'Success', description: `Driver ${driver.isAvailable ? 'marked as unavailable' : 'marked as available'}` })
        } else {
            toast({ title: 'Error', description: 'Failed to update availability', variant: 'destructive' })
        }
    }

    // Toggle active status
    const toggleActiveStatus = async (driver: Driver) => {
        const supabase = createClient()
        const { error } = await supabase
            .from('delivery_drivers')
            .update({ is_active: !driver.isActive })
            .eq('id', driver.id)

        if (!error) {
            setDrivers(drivers.map(d => d.id === driver.id ? { ...d, isActive: !driver.isActive } : d))
            toast({ title: 'Success', description: `Driver ${driver.isActive ? 'deactivated' : 'activated'}` })
        } else {
            toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' })
        }
    }

    // Open delete dialog
    const openDeleteDialog = (driver: Driver) => {
        setSelectedDriver(driver)
        setIsDeleteDialogOpen(true)
    }

    // Reset form
    const resetForm = () => {
        setDriverForm({
            email: '',
            fullName: '',
            password: '',
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
            preferredZones: [],
        })
        setUserExists(null)
        setExistingUserId(null)
        setExistingUserName(null)
    }

    // Check if email exists in system
    const checkEmailExists = async (email: string) => {
        // Simple email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!email || !emailRegex.test(email)) {
            setUserExists(null)
            setExistingUserId(null)
            setExistingUserName(null)
            return
        }

        setIsCheckingEmail(true)
        try {
            const supabase = createClient()
            const { data: existingProfile, error } = await supabase
                .from('profiles')
                .select('id, full_name')
                .eq('email', email.trim().toLowerCase())
                .maybeSingle()

            if (error) {
                console.error('Error checking email:', error)
                // Assume user doesn't exist, allow creation
                setUserExists(false)
                setExistingUserId(null)
                setExistingUserName(null)
                return
            }

            if (existingProfile) {
                setUserExists(true)
                setExistingUserId(existingProfile.id)
                setExistingUserName(existingProfile.full_name)
                
                // Check if already a driver for this company
                if (companyId) {
                    const { data: existingDriver } = await supabase
                        .from('delivery_drivers')
                        .select('id')
                        .eq('delivery_company_id', companyId)
                        .eq('user_id', existingProfile.id)
                        .maybeSingle()

                    if (existingDriver) {
                        toast({
                            title: 'Already registered',
                            description: 'This user is already registered as a driver for this company',
                            variant: 'destructive',
                        })
                    }
                }
            } else {
                // User not found - can create new
                setUserExists(false)
                setExistingUserId(null)
                setExistingUserName(null)
            }
        } catch (err) {
            console.error('Error checking email:', err)
            // Allow creation on error
            setUserExists(false)
            setExistingUserId(null)
            setExistingUserName(null)
        } finally {
            setIsCheckingEmail(false)
        }
    }

    // Handle add driver
    const handleAddDriver = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!companyId) return

        setIsSubmitting(true)
        try {
            const supabase = createClient()
            let userId: string

            if (userExists && existingUserId) {
                // Use existing user
                userId = existingUserId
            } else if (userExists === false) {
                // Create new user
                if (!driverForm.password || driverForm.password.length < 6) {
                    toast({
                        title: 'Password required',
                        description: 'Please enter a password with at least 6 characters for the new user',
                        variant: 'destructive',
                    })
                    setIsSubmitting(false)
                    return
                }

                if (!driverForm.fullName) {
                    toast({
                        title: 'Name required',
                        description: 'Please enter the full name for the new user',
                        variant: 'destructive',
                    })
                    setIsSubmitting(false)
                    return
                }

                // Create user via Admin API (bypasses email domain restrictions)
                const response = await fetch('/api/admin/create-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: driverForm.email.trim().toLowerCase(),
                        password: driverForm.password,
                        fullName: driverForm.fullName,
                        role: 'driver', // Set role as driver
                    }),
                })

                const result = await response.json()

                if (!response.ok) {
                    if (response.status === 409) {
                        toast({
                            title: 'Email already registered',
                            description: 'This email is already in the system. Try searching for it.',
                            variant: 'destructive',
                        })
                    } else {
                        toast({
                            title: 'Error creating user',
                            description: result.error || 'Failed to create user account',
                            variant: 'destructive',
                        })
                    }
                    setIsSubmitting(false)
                    return
                }

                userId = result.user.id

                toast({
                    title: 'User created',
                    description: `Account created for ${driverForm.fullName}`,
                })
            } else {
                toast({
                    title: 'Please check email',
                    description: 'Enter an email and click Search to verify before adding the driver',
                    variant: 'destructive',
                })
                setIsSubmitting(false)
                return
            }

            // Create driver record
            const { error: insertError } = await supabase
                .from('delivery_drivers')
                .insert({
                    delivery_company_id: companyId,
                    user_id: userId,
                    phone: driverForm.phone,
                    vehicle_type: driverForm.vehicleType,
                    vehicle_make: driverForm.vehicleMake,
                    vehicle_model: driverForm.vehicleModel,
                    vehicle_color: driverForm.vehicleColor,
                    vehicle_plate: driverForm.vehiclePlate,
                    drivers_license_number: driverForm.driversLicenseNumber,
                    drivers_license_expiry: driverForm.driversLicenseExpiry || null,
                    drivers_license_state: driverForm.driversLicenseState,
                    insurance_policy_number: driverForm.insurancePolicyNumber,
                    insurance_expiry: driverForm.insuranceExpiry || null,
                    is_active: true,
                    is_available: false,
                })

            if (insertError) throw insertError

            toast({
                title: 'Driver added successfully',
                description: userExists 
                    ? `${existingUserName || driverForm.email} has been added as a driver`
                    : `New driver account created for ${driverForm.fullName}`,
            })
            setIsAddDialogOpen(false)
            resetForm()
            fetchDrivers()
        } catch (err) {
            console.error('Error adding driver:', err)
            toast({
                title: 'Error',
                description: 'Failed to add driver. Please try again.',
                variant: 'destructive',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    // Handle delete driver
    const handleDeleteDriver = async () => {
        if (!selectedDriver) return

        setIsSubmitting(true)
        try {
            const supabase = createClient()

            const { error } = await supabase
                .from('delivery_drivers')
                .delete()
                .eq('id', selectedDriver.id)

            if (error) throw error

            toast({ title: 'Success', description: 'Driver removed from company' })
            setIsDeleteDialogOpen(false)
            setSelectedDriver(null)
            fetchDrivers()
        } catch (err) {
            console.error('Error deleting driver:', err)
            toast({ title: 'Error', description: 'Failed to remove driver', variant: 'destructive' })
        } finally {
            setIsSubmitting(false)
        }
    }

    // Get status badge
    const getStatusBadge = (driver: Driver) => {
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
        if (!expiryDate) return { status: 'unknown', label: 'Not set', color: 'gray' }
        const now = new Date()
        const expiry = parseISO(expiryDate)
        const daysUntilExpiry = differenceInDays(expiry, now)
        
        if (daysUntilExpiry < 0) {
            return { status: 'expired', label: 'Expired', color: 'red' }
        }
        if (daysUntilExpiry <= 30) {
            return { status: 'expiring', label: `${daysUntilExpiry}d left`, color: 'yellow' }
        }
        return { status: 'valid', label: 'Valid', color: 'green' }
    }

    // Get vehicle icon
    const getVehicleIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case 'motorcycle':
            case 'scooter':
            case 'bicycle':
                return <Bike className="h-4 w-4" />
            default:
                return <Car className="h-4 w-4" />
        }
    }

    if (isLoading && drivers.length === 0) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Drivers Management</h1>
                    <p className="text-gray-400 mt-1">Manage your delivery team members</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Link href="/dashboard/delivery/drivers/map">
                        <Button variant="outline" className="border-blue-600 text-blue-400 hover:bg-blue-600/20">
                            <Map className="h-4 w-4 mr-2" />
                            Live Map
                        </Button>
                    </Link>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
                                <Download className="h-4 w-4 mr-2" />
                                Export
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-gray-900 border-gray-800">
                            <DropdownMenuItem onClick={exportToCSV} className="text-gray-300 hover:bg-gray-800">
                                <FileText className="h-4 w-4 mr-2" />
                                Export CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={exportToExcel} className="text-gray-300 hover:bg-gray-800">
                                <FileSpreadsheet className="h-4 w-4 mr-2" />
                                Export Excel
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800" onClick={fetchDrivers}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) resetForm() }}>
                        <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                                <UserPlus className="h-4 w-4 mr-2" />
                                Add Driver
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
                            <form onSubmit={handleAddDriver}>
                                <DialogHeader>
                                    <DialogTitle>Add New Driver</DialogTitle>
                                    <DialogDescription className="text-gray-400">
                                        Enter the driver's email. If they already have an account, they'll be added. Otherwise, you can create a new account.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-6 py-4">
                                    {/* User Email with verification */}
                                    <div className="space-y-2">
                                        <Label>Email Address *</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                type="email"
                                                required
                                                value={driverForm.email}
                                                onChange={e => {
                                                    setDriverForm({ ...driverForm, email: e.target.value })
                                                    setUserExists(null) // Reset when email changes
                                                }}
                                                className="bg-gray-800 border-gray-700 focus:border-blue-500 flex-1"
                                                placeholder="driver@example.com"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => checkEmailExists(driverForm.email)}
                                                disabled={isCheckingEmail || !driverForm.email.includes('@')}
                                                className="border-gray-700 text-gray-300 hover:bg-gray-800"
                                            >
                                                {isCheckingEmail ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Search className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                        
                                        {/* Email verification status */}
                                        {userExists === true && (
                                            <div className="flex items-center gap-2 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                                                <CheckCircle2 className="h-4 w-4 text-green-400" />
                                                <div>
                                                    <p className="text-sm text-green-400">User found: {existingUserName || driverForm.email}</p>
                                                    <p className="text-xs text-gray-500">This user will be added as a driver</p>
                                                </div>
                                            </div>
                                        )}
                                        {userExists === false && (
                                            <div className="flex items-center gap-2 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                                                <AlertCircle className="h-4 w-4 text-yellow-400" />
                                                <div>
                                                    <p className="text-sm text-yellow-400">User not found</p>
                                                    <p className="text-xs text-gray-500">Fill in the details below to create a new account</p>
                                                </div>
                                            </div>
                                        )}
                                        {userExists === null && (
                                            <p className="text-xs text-gray-500">Click the search button to verify the email</p>
                                        )}
                                    </div>

                                    {/* New User Fields - Only show if user doesn't exist */}
                                    {userExists === false && (
                                        <>
                                            <Separator className="bg-gray-800" />
                                            <div className="space-y-4">
                                                <h4 className="font-medium text-yellow-400 flex items-center gap-2">
                                                    <User className="h-4 w-4" />
                                                    New User Account
                                                </h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>Full Name *</Label>
                                                        <Input
                                                            required
                                                            value={driverForm.fullName}
                                                            onChange={e => setDriverForm({ ...driverForm, fullName: e.target.value })}
                                                            className="bg-gray-800 border-gray-700 focus:border-blue-500"
                                                            placeholder="John Doe"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Password *</Label>
                                                        <Input
                                                            type="password"
                                                            required
                                                            value={driverForm.password}
                                                            onChange={e => setDriverForm({ ...driverForm, password: e.target.value })}
                                                            className="bg-gray-800 border-gray-700 focus:border-blue-500"
                                                            placeholder="Min. 6 characters"
                                                        />
                                                    </div>
                                                </div>
                                                <p className="text-xs text-gray-500">
                                                    A confirmation email will be sent to the driver to verify their account.
                                                </p>
                                            </div>
                                        </>
                                    )}

                                    <Separator className="bg-gray-800" />

                                    {/* Contact */}
                                    <div className="space-y-2">
                                        <Label>Phone Number</Label>
                                        <Input
                                            value={driverForm.phone}
                                            onChange={e => setDriverForm({ ...driverForm, phone: e.target.value })}
                                            className="bg-gray-800 border-gray-700 focus:border-blue-500"
                                            placeholder="+1 555-0000"
                                        />
                                    </div>

                                    {/* Vehicle Info */}
                                    <div className="space-y-4">
                                        <h4 className="font-medium text-gray-300">Vehicle Information</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Vehicle Type</Label>
                                                <Select
                                                    value={driverForm.vehicleType}
                                                    onValueChange={v => setDriverForm({ ...driverForm, vehicleType: v })}
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
                                                    value={driverForm.vehiclePlate}
                                                    onChange={e => setDriverForm({ ...driverForm, vehiclePlate: e.target.value })}
                                                    className="bg-gray-800 border-gray-700 focus:border-blue-500"
                                                    placeholder="ABC-1234"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label>Make</Label>
                                                <Input
                                                    value={driverForm.vehicleMake}
                                                    onChange={e => setDriverForm({ ...driverForm, vehicleMake: e.target.value })}
                                                    className="bg-gray-800 border-gray-700 focus:border-blue-500"
                                                    placeholder="Toyota"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Model</Label>
                                                <Input
                                                    value={driverForm.vehicleModel}
                                                    onChange={e => setDriverForm({ ...driverForm, vehicleModel: e.target.value })}
                                                    className="bg-gray-800 border-gray-700 focus:border-blue-500"
                                                    placeholder="Corolla"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Color</Label>
                                                <Input
                                                    value={driverForm.vehicleColor}
                                                    onChange={e => setDriverForm({ ...driverForm, vehicleColor: e.target.value })}
                                                    className="bg-gray-800 border-gray-700 focus:border-blue-500"
                                                    placeholder="White"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* License Info */}
                                    <div className="space-y-4">
                                        <h4 className="font-medium text-gray-300">Driver's License</h4>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label>License Number</Label>
                                                <Input
                                                    value={driverForm.driversLicenseNumber}
                                                    onChange={e => setDriverForm({ ...driverForm, driversLicenseNumber: e.target.value })}
                                                    className="bg-gray-800 border-gray-700 focus:border-blue-500"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>State</Label>
                                                <Input
                                                    value={driverForm.driversLicenseState}
                                                    onChange={e => setDriverForm({ ...driverForm, driversLicenseState: e.target.value.toUpperCase().slice(0, 2) })}
                                                    className="bg-gray-800 border-gray-700 focus:border-blue-500"
                                                    placeholder="CA"
                                                    maxLength={2}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Expiry Date</Label>
                                                <Input
                                                    type="date"
                                                    value={driverForm.driversLicenseExpiry}
                                                    onChange={e => setDriverForm({ ...driverForm, driversLicenseExpiry: e.target.value })}
                                                    className="bg-gray-800 border-gray-700 focus:border-blue-500"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Insurance Info */}
                                    <div className="space-y-4">
                                        <h4 className="font-medium text-gray-300">Insurance</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Policy Number</Label>
                                                <Input
                                                    value={driverForm.insurancePolicyNumber}
                                                    onChange={e => setDriverForm({ ...driverForm, insurancePolicyNumber: e.target.value })}
                                                    className="bg-gray-800 border-gray-700 focus:border-blue-500"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Expiry Date</Label>
                                                <Input
                                                    type="date"
                                                    value={driverForm.insuranceExpiry}
                                                    onChange={e => setDriverForm({ ...driverForm, insuranceExpiry: e.target.value })}
                                                    className="bg-gray-800 border-gray-700 focus:border-blue-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="ghost" onClick={() => setIsAddDialogOpen(false)} className="text-gray-400">
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                                        {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                        Add Driver
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    <Card className="bg-gray-900 border-gray-800">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-500">Total Drivers</p>
                                    <p className="text-2xl font-bold text-white">{stats.totalDrivers}</p>
                                </div>
                                <Users className="h-8 w-8 text-blue-500" />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">{stats.activeDrivers} active</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gray-900 border-gray-800">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-500">Available Now</p>
                                    <p className="text-2xl font-bold text-green-400">{stats.availableDrivers}</p>
                                </div>
                                <UserCheck className="h-8 w-8 text-green-500" />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">{stats.onDeliveryDrivers} on delivery</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gray-900 border-gray-800">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-500">Avg. Rating</p>
                                    <p className="text-2xl font-bold text-yellow-400">{stats.avgRating.toFixed(1)}</p>
                                </div>
                                <Star className="h-8 w-8 text-yellow-500" />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">{stats.totalDeliveries} total deliveries</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gray-900 border-gray-800">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-500">Performance</p>
                                    <p className="text-2xl font-bold text-purple-400">{(stats.avgPerformanceScore * 100).toFixed(0)}%</p>
                                </div>
                                <TrendingUp className="h-8 w-8 text-purple-500" />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Average score</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gray-900 border-gray-800">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-500">Expiring Soon</p>
                                    <p className="text-2xl font-bold text-orange-400">{stats.licensesExpiringSoon + stats.insuranceExpiringSoon}</p>
                                </div>
                                <AlertTriangle className="h-8 w-8 text-orange-500" />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">{stats.licensesExpiringSoon} lic. / {stats.insuranceExpiringSoon} ins.</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search by name, email, phone, or plate..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-gray-900 border-gray-800 text-white focus:border-blue-500"
                    />
                </div>
                <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                    <SheetTrigger asChild>
                        <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
                            <Filter className="h-4 w-4 mr-2" />
                            Filters
                            {activeFiltersCount > 0 && (
                                <Badge className="ml-2 bg-blue-600 text-white">{activeFiltersCount}</Badge>
                            )}
                        </Button>
                    </SheetTrigger>
                    <SheetContent className="bg-gray-900 border-gray-800 text-white">
                        <SheetHeader>
                            <SheetTitle className="text-white">Filter Drivers</SheetTitle>
                            <SheetDescription className="text-gray-400">
                                Narrow down the list of drivers
                            </SheetDescription>
                        </SheetHeader>
                        <div className="space-y-6 py-6">
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={filters.status} onValueChange={v => setFilters({ ...filters, status: v })}>
                                    <SelectTrigger className="bg-gray-800 border-gray-700">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-900 border-gray-800">
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                        <SelectItem value="on_delivery">On Delivery</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Availability</Label>
                                <Select value={filters.availability} onValueChange={v => setFilters({ ...filters, availability: v })}>
                                    <SelectTrigger className="bg-gray-800 border-gray-700">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-900 border-gray-800">
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="available">Available</SelectItem>
                                        <SelectItem value="unavailable">Unavailable</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Vehicle Type</Label>
                                <Select value={filters.vehicleType} onValueChange={v => setFilters({ ...filters, vehicleType: v })}>
                                    <SelectTrigger className="bg-gray-800 border-gray-700">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-900 border-gray-800">
                                        <SelectItem value="all">All Types</SelectItem>
                                        {vehicleTypes.map(type => (
                                            <SelectItem key={type} value={type}>{type}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>License Status</Label>
                                <Select value={filters.licenseStatus} onValueChange={v => setFilters({ ...filters, licenseStatus: v })}>
                                    <SelectTrigger className="bg-gray-800 border-gray-700">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-900 border-gray-800">
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="valid">Valid</SelectItem>
                                        <SelectItem value="expiring">Expiring Soon</SelectItem>
                                        <SelectItem value="expired">Expired</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Insurance Status</Label>
                                <Select value={filters.insuranceStatus} onValueChange={v => setFilters({ ...filters, insuranceStatus: v })}>
                                    <SelectTrigger className="bg-gray-800 border-gray-700">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-900 border-gray-800">
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="valid">Valid</SelectItem>
                                        <SelectItem value="expiring">Expiring Soon</SelectItem>
                                        <SelectItem value="expired">Expired</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <SheetFooter>
                            <Button variant="outline" onClick={resetFilters} className="text-gray-300 border-gray-700">
                                Reset Filters
                            </Button>
                        </SheetFooter>
                    </SheetContent>
                </Sheet>
            </div>

            {/* Active Filters */}
            {activeFiltersCount > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-gray-400">Active filters:</span>
                    {filters.status !== 'all' && (
                        <Badge variant="secondary" className="bg-gray-800 text-gray-300 gap-1">
                            Status: {filters.status}
                            <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, status: 'all' })} />
                        </Badge>
                    )}
                    {filters.availability !== 'all' && (
                        <Badge variant="secondary" className="bg-gray-800 text-gray-300 gap-1">
                            Availability: {filters.availability}
                            <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, availability: 'all' })} />
                        </Badge>
                    )}
                    {filters.vehicleType !== 'all' && (
                        <Badge variant="secondary" className="bg-gray-800 text-gray-300 gap-1">
                            Vehicle: {filters.vehicleType}
                            <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, vehicleType: 'all' })} />
                        </Badge>
                    )}
                    {filters.licenseStatus !== 'all' && (
                        <Badge variant="secondary" className="bg-gray-800 text-gray-300 gap-1">
                            License: {filters.licenseStatus}
                            <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, licenseStatus: 'all' })} />
                        </Badge>
                    )}
                    {filters.insuranceStatus !== 'all' && (
                        <Badge variant="secondary" className="bg-gray-800 text-gray-300 gap-1">
                            Insurance: {filters.insuranceStatus}
                            <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, insuranceStatus: 'all' })} />
                        </Badge>
                    )}
                    <Button variant="ghost" size="sm" onClick={resetFilters} className="text-gray-400 hover:text-gray-300">
                        Clear all
                    </Button>
                </div>
            )}

            {/* Drivers Table */}
            <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-gray-800 hover:bg-transparent">
                                <TableHead className="text-gray-400">
                                    <Button variant="ghost" className="text-gray-400 hover:text-white p-0" onClick={() => handleSort('fullName')}>
                                        Driver {getSortIcon('fullName')}
                                    </Button>
                                </TableHead>
                                <TableHead className="text-gray-400">Vehicle</TableHead>
                                <TableHead className="text-gray-400">Status</TableHead>
                                <TableHead className="text-gray-400">Documents</TableHead>
                                <TableHead className="text-gray-400">
                                    <Button variant="ghost" className="text-gray-400 hover:text-white p-0" onClick={() => handleSort('totalDeliveries')}>
                                        Deliveries {getSortIcon('totalDeliveries')}
                                    </Button>
                                </TableHead>
                                <TableHead className="text-gray-400">
                                    <Button variant="ghost" className="text-gray-400 hover:text-white p-0" onClick={() => handleSort('averageRating')}>
                                        Rating {getSortIcon('averageRating')}
                                    </Button>
                                </TableHead>
                                <TableHead className="text-gray-400 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedDrivers.map((driver) => {
                                const licenseStatus = getExpiryStatus(driver.driversLicenseExpiry)
                                const insuranceStatus = getExpiryStatus(driver.insuranceExpiry)
                                
                                return (
                                    <TableRow 
                                        key={driver.id} 
                                        className="border-gray-800 hover:bg-gray-800/50 cursor-pointer"
                                        onClick={() => router.push(`/dashboard/delivery/drivers/${driver.id}`)}
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-blue-600/20 flex items-center justify-center font-bold text-blue-400">
                                                    {driver.fullName[0]?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-white font-medium">{driver.fullName}</div>
                                                    <div className="text-gray-500 text-xs">{driver.email}</div>
                                                    {driver.phone && (
                                                        <div className="text-gray-500 text-xs flex items-center gap-1">
                                                            <Phone className="h-3 w-3" />
                                                            {driver.phone}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-gray-300 text-sm">
                                                {getVehicleIcon(driver.vehicleType)}
                                                {driver.vehicleType}
                                            </div>
                                            {driver.vehiclePlate && (
                                                <div className="text-xs text-gray-500 font-mono mt-1">{driver.vehiclePlate}</div>
                                            )}
                                            {driver.vehicleMake && driver.vehicleModel && (
                                                <div className="text-xs text-gray-600">{driver.vehicleMake} {driver.vehicleModel}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(driver)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500">License:</span>
                                                    <Badge variant="outline" className={`text-xs ${
                                                        licenseStatus.color === 'green' ? 'border-green-500/30 text-green-400' :
                                                        licenseStatus.color === 'yellow' ? 'border-yellow-500/30 text-yellow-400' :
                                                        licenseStatus.color === 'red' ? 'border-red-500/30 text-red-400' :
                                                        'border-gray-500/30 text-gray-400'
                                                    }`}>
                                                        {licenseStatus.label}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500">Insurance:</span>
                                                    <Badge variant="outline" className={`text-xs ${
                                                        insuranceStatus.color === 'green' ? 'border-green-500/30 text-green-400' :
                                                        insuranceStatus.color === 'yellow' ? 'border-yellow-500/30 text-yellow-400' :
                                                        insuranceStatus.color === 'red' ? 'border-red-500/30 text-red-400' :
                                                        'border-gray-500/30 text-gray-400'
                                                    }`}>
                                                        {insuranceStatus.label}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-white font-medium">{driver.totalDeliveries}</div>
                                            <div className="text-xs text-gray-500">
                                                {driver.completedDeliveries} completed
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                                                <span className="text-white font-medium">{driver.averageRating.toFixed(1)}</span>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {(driver.performanceScore * 100).toFixed(0)}% perf.
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-gray-900 border-gray-800">
                                                    <DropdownMenuItem asChild className="text-gray-300 hover:bg-gray-800">
                                                        <Link href={`/dashboard/delivery/drivers/${driver.id}`}>
                                                            <Eye className="h-4 w-4 mr-2" />
                                                            View Details
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator className="bg-gray-800" />
                                                    <DropdownMenuItem onClick={() => toggleAvailability(driver)} className="text-gray-300 hover:bg-gray-800">
                                                        {driver.isAvailable ? (
                                                            <>
                                                                <XCircle className="h-4 w-4 mr-2" />
                                                                Mark Unavailable
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                                                Mark Available
                                                            </>
                                                        )}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => toggleActiveStatus(driver)} className="text-gray-300 hover:bg-gray-800">
                                                        {driver.isActive ? (
                                                            <>
                                                                <XCircle className="h-4 w-4 mr-2 text-red-400" />
                                                                Deactivate
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CheckCircle2 className="h-4 w-4 mr-2 text-green-400" />
                                                                Activate
                                                            </>
                                                        )}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator className="bg-gray-800" />
                                                    <DropdownMenuItem onClick={() => openDeleteDialog(driver)} className="text-red-400 hover:bg-gray-800">
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Remove Driver
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                    {filteredAndSortedDrivers.length === 0 && (
                        <div className="py-20 text-center">
                            <Users className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                            <p className="text-gray-500">No drivers found</p>
                            <p className="text-gray-600 text-sm mt-1">Try adjusting your search or filters</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            {filteredAndSortedDrivers.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span>Rows per page:</span>
                        <Select value={String(rowsPerPage)} onValueChange={v => { setRowsPerPage(Number(v)); setCurrentPage(1) }}>
                            <SelectTrigger className="w-[70px] bg-gray-900 border-gray-800">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-gray-800">
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                        </Select>
                        <span>
                            {((currentPage - 1) * rowsPerPage) + 1}-{Math.min(currentPage * rowsPerPage, filteredAndSortedDrivers.length)} of {filteredAndSortedDrivers.length}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="border-gray-700 text-gray-300"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum
                                if (totalPages <= 5) {
                                    pageNum = i + 1
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i
                                } else {
                                    pageNum = currentPage - 2 + i
                                }
                                return (
                                    <Button
                                        key={pageNum}
                                        variant={currentPage === pageNum ? 'default' : 'outline'}
                                        size="sm"
                                        className={currentPage === pageNum ? 'bg-blue-600' : 'border-gray-700 text-gray-300'}
                                        onClick={() => setCurrentPage(pageNum)}
                                    >
                                        {pageNum}
                                    </Button>
                                )
                            })}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="border-gray-700 text-gray-300"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => p + 1)}
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="bg-gray-900 border-gray-800">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Remove Driver</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                            Are you sure you want to remove {selectedDriver?.fullName} from your company? 
                            This will remove their association with your delivery company but will not delete their user account.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteDriver}
                            disabled={isSubmitting}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Remove Driver
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
