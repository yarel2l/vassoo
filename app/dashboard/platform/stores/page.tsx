'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Search,
    MoreHorizontal,
    Store,
    ShieldCheck,
    ShieldAlert,
    ExternalLink,
    Filter,
    ArrowUpDown,
    CheckCircle2,
    XCircle,
    Download,
    FileSpreadsheet,
    ChevronLeft,
    ChevronRight,
    Package,
    DollarSign,
    X
} from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
    SheetClose,
} from '@/components/ui/sheet'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface StoreWithStats {
    id: string
    name: string
    slug: string
    is_active: boolean
    is_featured: boolean
    license_number: string
    license_verified: boolean
    created_at: string
    total_orders: number
    total_revenue: number
    total_products: number
    locations?: {
        id: string
        city: string
        state: string
        address_line1: string
    }[]
}

interface StoreStats {
    totalStores: number
    activeStores: number
    suspendedStores: number
    verifiedLicenses: number
    pendingLicenses: number
    totalRevenue: number
    totalOrders: number
}

interface Filters {
    status: 'all' | 'active' | 'suspended'
    license: 'all' | 'verified' | 'pending'
    featured: 'all' | 'featured' | 'not-featured'
    state: string
    dateFrom: string
    dateTo: string
}

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100]

export default function PlatformStoresPage() {
    const [stores, setStores] = useState<StoreWithStats[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [filters, setFilters] = useState<Filters>({
        status: 'all',
        license: 'all',
        featured: 'all',
        state: 'all',
        dateFrom: '',
        dateTo: ''
    })
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)
    const [sortField, setSortField] = useState<'name' | 'created_at' | 'total_orders' | 'total_revenue'>('created_at')
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
    const [isFiltersOpen, setIsFiltersOpen] = useState(false)
    const { toast } = useToast()

    // Fetch stores with stats
    const fetchStores = async () => {
        setIsLoading(true)
        const supabase = createClient()

        // Fetch stores with locations
        const { data: storesData, error: storesError } = await supabase
            .from('stores')
            .select(`
                id,
                name,
                slug,
                is_active,
                is_featured,
                license_number,
                license_verified,
                created_at,
                locations:store_locations(id, city, state, address_line1)
            `)
            .order('created_at', { ascending: false })

        if (storesError) {
            toast({
                title: 'Error fetching stores',
                description: storesError.message,
                variant: 'destructive'
            })
            setIsLoading(false)
            return
        }

        // Fetch order stats per store
        const { data: orderStats } = await supabase
            .from('orders')
            .select('store_id, total')

        // Fetch product counts per store
        const { data: inventoryData } = await supabase
            .from('store_inventories')
            .select('store_id, id')

        // Process and merge data
        const storesWithStats = (storesData || []).map(store => {
            const storeOrders = (orderStats || []).filter(o => o.store_id === store.id)
            const storeProducts = (inventoryData || []).filter(p => p.store_id === store.id)
            
            return {
                ...store,
                total_orders: storeOrders.length,
                total_revenue: storeOrders.reduce((sum, o) => sum + (o.total || 0), 0),
                total_products: storeProducts.length
            }
        })

        // De-duplicate stores
        const uniqueStores = Array.from(
            new Map(storesWithStats.map(s => [s.id, s])).values()
        )
        
        setStores(uniqueStores)
        setIsLoading(false)
    }

    useEffect(() => {
        fetchStores()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Calculate stats
    const stats: StoreStats = useMemo(() => {
        return {
            totalStores: stores.length,
            activeStores: stores.filter(s => s.is_active).length,
            suspendedStores: stores.filter(s => !s.is_active).length,
            verifiedLicenses: stores.filter(s => s.license_verified).length,
            pendingLicenses: stores.filter(s => !s.license_verified).length,
            totalRevenue: stores.reduce((sum, s) => sum + s.total_revenue, 0),
            totalOrders: stores.reduce((sum, s) => sum + s.total_orders, 0)
        }
    }, [stores])

    // Get unique states for filter
    const uniqueStates = useMemo(() => {
        const states = new Set<string>()
        stores.forEach(store => {
            store.locations?.forEach(loc => {
                if (loc.state) states.add(loc.state)
            })
        })
        return Array.from(states).sort()
    }, [stores])

    // Filter and sort stores
    const filteredStores = useMemo(() => {
        let result = stores.filter(s => {
            // Search filter
            const matchesSearch = 
                s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.slug.toLowerCase().includes(searchTerm.toLowerCase())
            
            // Status filter
            const matchesStatus = 
                filters.status === 'all' ||
                (filters.status === 'active' && s.is_active) ||
                (filters.status === 'suspended' && !s.is_active)
            
            // License filter
            const matchesLicense = 
                filters.license === 'all' ||
                (filters.license === 'verified' && s.license_verified) ||
                (filters.license === 'pending' && !s.license_verified)
            
            // Featured filter
            const matchesFeatured = 
                filters.featured === 'all' ||
                (filters.featured === 'featured' && s.is_featured) ||
                (filters.featured === 'not-featured' && !s.is_featured)
            
            // State filter
            const matchesState = 
                filters.state === 'all' ||
                s.locations?.some(loc => loc.state === filters.state)
            
            // Date filters
            const storeDate = new Date(s.created_at)
            const matchesDateFrom = !filters.dateFrom || storeDate >= new Date(filters.dateFrom)
            const matchesDateTo = !filters.dateTo || storeDate <= new Date(filters.dateTo + 'T23:59:59')
            
            return matchesSearch && matchesStatus && matchesLicense && matchesFeatured && matchesState && matchesDateFrom && matchesDateTo
        })

        // Sort
        result.sort((a, b) => {
            let comparison = 0
            switch (sortField) {
                case 'name':
                    comparison = a.name.localeCompare(b.name)
                    break
                case 'created_at':
                    comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                    break
                case 'total_orders':
                    comparison = a.total_orders - b.total_orders
                    break
                case 'total_revenue':
                    comparison = a.total_revenue - b.total_revenue
                    break
            }
            return sortDirection === 'asc' ? comparison : -comparison
        })

        return result
    }, [stores, searchTerm, filters, sortField, sortDirection])

    // Pagination
    const totalPages = Math.ceil(filteredStores.length / itemsPerPage)
    const paginatedStores = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage
        return filteredStores.slice(start, start + itemsPerPage)
    }, [filteredStores, currentPage, itemsPerPage])

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm, filters, itemsPerPage])

    // Count active filters
    const activeFiltersCount = useMemo(() => {
        let count = 0
        if (filters.status !== 'all') count++
        if (filters.license !== 'all') count++
        if (filters.featured !== 'all') count++
        if (filters.state !== 'all') count++
        if (filters.dateFrom) count++
        if (filters.dateTo) count++
        return count
    }, [filters])

    const clearFilters = () => {
        setFilters({
            status: 'all',
            license: 'all',
            featured: 'all',
            state: 'all',
            dateFrom: '',
            dateTo: ''
        })
    }

    const toggleStoreActive = async (id: string, currentStatus: boolean) => {
        const supabase = createClient()
        const { error } = await supabase
            .from('stores')
            .update({ is_active: !currentStatus })
            .eq('id', id)

        if (error) {
            toast({
                title: 'Operation failed',
                description: error.message,
                variant: 'destructive'
            })
        } else {
            toast({
                title: currentStatus ? 'Store suspended' : 'Store activated',
                description: `Successfully updated the status of the store.`
            })
            fetchStores()
        }
    }

    const verifyLicense = async (id: string) => {
        const supabase = createClient()
        const { error } = await supabase
            .from('stores')
            .update({ license_verified: true })
            .eq('id', id)

        if (error) {
            toast({
                title: 'Verification failed',
                description: error.message,
                variant: 'destructive'
            })
        } else {
            toast({
                title: 'License verified',
                description: 'The store license has been marked as verified.'
            })
            fetchStores()
        }
    }

    // Export functions
    const exportToCSV = () => {
        const headers = ['Name', 'Slug', 'Status', 'License', 'License Verified', 'Location', 'City', 'State', 'Orders', 'Revenue', 'Products', 'Created']
        const rows = filteredStores.map(store => [
            store.name,
            store.slug,
            store.is_active ? 'Active' : 'Suspended',
            store.license_number || 'N/A',
            store.license_verified ? 'Yes' : 'No',
            store.locations?.[0]?.address_line1 || 'N/A',
            store.locations?.[0]?.city || 'N/A',
            store.locations?.[0]?.state || 'N/A',
            store.total_orders,
            store.total_revenue.toFixed(2),
            store.total_products,
            new Date(store.created_at).toLocaleDateString()
        ])

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `stores-export-${new Date().toISOString().split('T')[0]}.csv`
        link.click()

        toast({
            title: 'Export successful',
            description: `Exported ${filteredStores.length} stores to CSV`
        })
    }

    const exportToExcel = () => {
        const headers = ['Name', 'Slug', 'Status', 'License Number', 'License Verified', 'Address', 'City', 'State', 'Total Orders', 'Total Revenue ($)', 'Total Products', 'Created Date', 'Featured']
        const rows = filteredStores.map(store => [
            store.name,
            store.slug,
            store.is_active ? 'Active' : 'Suspended',
            store.license_number || 'N/A',
            store.license_verified ? 'Yes' : 'No',
            store.locations?.[0]?.address_line1 || 'N/A',
            store.locations?.[0]?.city || 'N/A',
            store.locations?.[0]?.state || 'N/A',
            store.total_orders,
            store.total_revenue.toFixed(2),
            store.total_products,
            new Date(store.created_at).toLocaleDateString(),
            store.is_featured ? 'Yes' : 'No'
        ])

        // Add BOM for Excel to recognize UTF-8
        const BOM = '\uFEFF'
        const csvContent = BOM + [
            headers.join('\t'),
            ...rows.map(row => row.map(cell => `${cell}`).join('\t'))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `stores-export-${new Date().toISOString().split('T')[0]}.xls`
        link.click()

        toast({
            title: 'Export successful',
            description: `Exported ${filteredStores.length} stores to Excel`
        })
    }

    const handleSort = (field: typeof sortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDirection('desc')
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount)
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Stores Management</h1>
                    <p className="text-neutral-400">Monitor and manage all vendor stores on the platform</p>
                </div>
                <div className="flex items-center gap-2">
                    <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" className="bg-neutral-900 border-neutral-800 text-white hover:bg-neutral-800 relative">
                                <Filter className="h-4 w-4 mr-2" />
                                Filters
                                {activeFiltersCount > 0 && (
                                    <Badge className="ml-2 bg-indigo-600 text-white text-xs px-1.5 py-0.5 min-w-[20px]">
                                        {activeFiltersCount}
                                    </Badge>
                                )}
                            </Button>
                        </SheetTrigger>
                        <SheetContent className="bg-neutral-900 border-neutral-800 text-white">
                            <SheetHeader>
                                <SheetTitle className="text-white">Filter Stores</SheetTitle>
                                <SheetDescription className="text-neutral-400">
                                    Apply filters to narrow down your store list
                                </SheetDescription>
                            </SheetHeader>
                            <div className="space-y-6 py-6">
                                <div className="space-y-2">
                                    <Label className="text-neutral-300">Status</Label>
                                    <Select value={filters.status} onValueChange={(v) => setFilters(prev => ({ ...prev, status: v as Filters['status'] }))}>
                                        <SelectTrigger className="bg-neutral-950 border-neutral-800 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-neutral-900 border-neutral-800">
                                            <SelectItem value="all">All Statuses</SelectItem>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="suspended">Suspended</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-neutral-300">License</Label>
                                    <Select value={filters.license} onValueChange={(v) => setFilters(prev => ({ ...prev, license: v as Filters['license'] }))}>
                                        <SelectTrigger className="bg-neutral-950 border-neutral-800 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-neutral-900 border-neutral-800">
                                            <SelectItem value="all">All Licenses</SelectItem>
                                            <SelectItem value="verified">Verified</SelectItem>
                                            <SelectItem value="pending">Pending Verification</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-neutral-300">Featured</Label>
                                    <Select value={filters.featured} onValueChange={(v) => setFilters(prev => ({ ...prev, featured: v as Filters['featured'] }))}>
                                        <SelectTrigger className="bg-neutral-950 border-neutral-800 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-neutral-900 border-neutral-800">
                                            <SelectItem value="all">All</SelectItem>
                                            <SelectItem value="featured">Featured Only</SelectItem>
                                            <SelectItem value="not-featured">Not Featured</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-neutral-300">State</Label>
                                    <Select value={filters.state} onValueChange={(v) => setFilters(prev => ({ ...prev, state: v }))}>
                                        <SelectTrigger className="bg-neutral-950 border-neutral-800 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-neutral-900 border-neutral-800">
                                            <SelectItem value="all">All States</SelectItem>
                                            {uniqueStates.map(state => (
                                                <SelectItem key={state} value={state}>{state}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-neutral-300">Created From</Label>
                                    <Input
                                        type="date"
                                        value={filters.dateFrom}
                                        onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                                        className="bg-neutral-950 border-neutral-800 text-white"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-neutral-300">Created To</Label>
                                    <Input
                                        type="date"
                                        value={filters.dateTo}
                                        onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                                        className="bg-neutral-950 border-neutral-800 text-white"
                                    />
                                </div>
                            </div>
                            <SheetFooter className="flex gap-2">
                                <Button variant="outline" onClick={clearFilters} className="flex-1 bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700">
                                    Clear All
                                </Button>
                                <SheetClose asChild>
                                    <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
                                        Apply Filters
                                    </Button>
                                </SheetClose>
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                <Download className="h-4 w-4 mr-2" />
                                Export
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-neutral-900 border-neutral-800 text-white">
                            <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-neutral-800" />
                            <DropdownMenuItem onClick={exportToCSV} className="focus:bg-neutral-800 cursor-pointer">
                                <Download className="mr-2 h-4 w-4" />
                                Export as CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={exportToExcel} className="focus:bg-neutral-800 cursor-pointer">
                                <FileSpreadsheet className="mr-2 h-4 w-4" />
                                Export as Excel
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-neutral-900 border-neutral-800">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-neutral-400 uppercase tracking-wider">Total Stores</p>
                                <p className="text-2xl font-bold text-white">{stats.totalStores}</p>
                                <p className="text-xs text-neutral-500 mt-1">
                                    <span className="text-green-500">{stats.activeStores} active</span>
                                    {' · '}
                                    <span className="text-red-500">{stats.suspendedStores} suspended</span>
                                </p>
                            </div>
                            <div className="p-3 bg-indigo-500/10 rounded-lg">
                                <Store className="h-5 w-5 text-indigo-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-neutral-900 border-neutral-800">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-neutral-400 uppercase tracking-wider">Total Revenue</p>
                                <p className="text-2xl font-bold text-white">{formatCurrency(stats.totalRevenue)}</p>
                                <p className="text-xs text-neutral-500 mt-1">Across all stores</p>
                            </div>
                            <div className="p-3 bg-green-500/10 rounded-lg">
                                <DollarSign className="h-5 w-5 text-green-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-neutral-900 border-neutral-800">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-neutral-400 uppercase tracking-wider">Total Orders</p>
                                <p className="text-2xl font-bold text-white">{stats.totalOrders.toLocaleString()}</p>
                                <p className="text-xs text-neutral-500 mt-1">All time orders</p>
                            </div>
                            <div className="p-3 bg-blue-500/10 rounded-lg">
                                <Package className="h-5 w-5 text-blue-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-neutral-900 border-neutral-800">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-neutral-400 uppercase tracking-wider">Licenses</p>
                                <p className="text-2xl font-bold text-white">{stats.verifiedLicenses}</p>
                                <p className="text-xs text-neutral-500 mt-1">
                                    <span className="text-green-500">{stats.verifiedLicenses} verified</span>
                                    {' · '}
                                    <span className="text-amber-500">{stats.pendingLicenses} pending</span>
                                </p>
                            </div>
                            <div className="p-3 bg-amber-500/10 rounded-lg">
                                <ShieldCheck className="h-5 w-5 text-amber-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Active Filters Display */}
            {activeFiltersCount > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-neutral-400">Active filters:</span>
                    {filters.status !== 'all' && (
                        <Badge variant="secondary" className="bg-neutral-800 text-white gap-1">
                            Status: {filters.status}
                            <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters(prev => ({ ...prev, status: 'all' }))} />
                        </Badge>
                    )}
                    {filters.license !== 'all' && (
                        <Badge variant="secondary" className="bg-neutral-800 text-white gap-1">
                            License: {filters.license}
                            <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters(prev => ({ ...prev, license: 'all' }))} />
                        </Badge>
                    )}
                    {filters.featured !== 'all' && (
                        <Badge variant="secondary" className="bg-neutral-800 text-white gap-1">
                            Featured: {filters.featured}
                            <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters(prev => ({ ...prev, featured: 'all' }))} />
                        </Badge>
                    )}
                    {filters.state !== 'all' && (
                        <Badge variant="secondary" className="bg-neutral-800 text-white gap-1">
                            State: {filters.state}
                            <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters(prev => ({ ...prev, state: 'all' }))} />
                        </Badge>
                    )}
                    {filters.dateFrom && (
                        <Badge variant="secondary" className="bg-neutral-800 text-white gap-1">
                            From: {filters.dateFrom}
                            <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters(prev => ({ ...prev, dateFrom: '' }))} />
                        </Badge>
                    )}
                    {filters.dateTo && (
                        <Badge variant="secondary" className="bg-neutral-800 text-white gap-1">
                            To: {filters.dateTo}
                            <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters(prev => ({ ...prev, dateTo: '' }))} />
                        </Badge>
                    )}
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-neutral-400 hover:text-white h-6 px-2">
                        Clear all
                    </Button>
                </div>
            )}

            {/* Table Card */}
            <Card className="bg-neutral-900 border-neutral-800">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                            <Input
                                placeholder="Search stores..."
                                className="pl-10 bg-neutral-950 border-neutral-800 text-white"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-neutral-400">
                            <span>Showing {paginatedStores.length} of {filteredStores.length} stores</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-neutral-800 hover:bg-transparent">
                                <TableHead className="text-neutral-400">
                                    <Button 
                                        variant="ghost" 
                                        className="h-8 p-0 text-neutral-400 hover:text-white font-medium"
                                        onClick={() => handleSort('name')}
                                    >
                                        Store
                                        <ArrowUpDown className="ml-2 h-3 w-3" />
                                    </Button>
                                </TableHead>
                                <TableHead className="text-neutral-400">Location</TableHead>
                                <TableHead className="text-neutral-400">Status</TableHead>
                                <TableHead className="text-neutral-400">License</TableHead>
                                <TableHead className="text-neutral-400">
                                    <Button 
                                        variant="ghost" 
                                        className="h-8 p-0 text-neutral-400 hover:text-white font-medium"
                                        onClick={() => handleSort('total_orders')}
                                    >
                                        Orders
                                        <ArrowUpDown className="ml-2 h-3 w-3" />
                                    </Button>
                                </TableHead>
                                <TableHead className="text-neutral-400">
                                    <Button 
                                        variant="ghost" 
                                        className="h-8 p-0 text-neutral-400 hover:text-white font-medium"
                                        onClick={() => handleSort('total_revenue')}
                                    >
                                        Revenue
                                        <ArrowUpDown className="ml-2 h-3 w-3" />
                                    </Button>
                                </TableHead>
                                <TableHead className="text-neutral-400">
                                    <Button 
                                        variant="ghost" 
                                        className="h-8 p-0 text-neutral-400 hover:text-white font-medium"
                                        onClick={() => handleSort('created_at')}
                                    >
                                        Created
                                        <ArrowUpDown className="ml-2 h-3 w-3" />
                                    </Button>
                                </TableHead>
                                <TableHead className="text-neutral-400 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-10">
                                        <div className="animate-spin h-6 w-6 border-b-2 border-indigo-500 mx-auto"></div>
                                    </TableCell>
                                </TableRow>
                            ) : paginatedStores.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-10 text-neutral-500">
                                        No stores found.
                                    </TableCell>
                                </TableRow>
                            ) : paginatedStores.map((store) => (
                                <TableRow key={store.id} className="border-neutral-800">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-neutral-800 rounded-lg">
                                                <Store className="h-4 w-4 text-indigo-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-white">{store.name}</p>
                                                <p className="text-xs text-neutral-500">/{store.slug}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {store.locations && store.locations.length > 0 ? (
                                            <div className="flex flex-col">
                                                <p className="text-xs text-neutral-300">{store.locations[0].address_line1}</p>
                                                <p className="text-[10px] text-neutral-500">{store.locations[0].city}, {store.locations[0].state}</p>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-red-500">
                                                <ShieldAlert className="h-3 w-3" />
                                                <span className="text-[10px] font-medium uppercase tracking-wider">No Location</span>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={store.is_active ? 'default' : 'destructive'} className={cn(
                                            store.is_active ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                                        )}>
                                            {store.is_active ? 'Active' : 'Suspended'}
                                        </Badge>
                                        {store.is_featured && (
                                            <Badge className="ml-2 bg-amber-500/10 text-amber-500 border-amber-500/20">Featured</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {store.license_verified ? (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger>
                                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>Verified</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ) : (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger>
                                                            <ShieldAlert className="h-4 w-4 text-amber-500" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>Pending Verification</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                            <span className="text-xs text-neutral-400 font-mono">{store.license_number || 'N/A'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-neutral-300">
                                        {store.total_orders.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-sm text-neutral-300">
                                        {formatCurrency(store.total_revenue)}
                                    </TableCell>
                                    <TableCell className="text-sm text-neutral-400">
                                        {new Date(store.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-neutral-900 border-neutral-800 text-white">
                                                <DropdownMenuLabel>Store Actions</DropdownMenuLabel>
                                                <DropdownMenuSeparator className="bg-neutral-800" />
                                                <DropdownMenuItem asChild className="focus:bg-neutral-800 cursor-pointer">
                                                    <Link href={`/store/${store.slug}`} target="_blank">
                                                        <ExternalLink className="mr-2 h-4 w-4" />
                                                        View Public Store
                                                    </Link>
                                                </DropdownMenuItem>
                                                {!store.license_verified && (
                                                    <DropdownMenuItem
                                                        className="focus:bg-neutral-800 cursor-pointer text-green-400"
                                                        onClick={() => verifyLicense(store.id)}
                                                    >
                                                        <ShieldCheck className="mr-2 h-4 w-4" />
                                                        Verify License
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator className="bg-neutral-800" />
                                                <DropdownMenuItem
                                                    className={cn(
                                                        "focus:bg-neutral-800 cursor-pointer",
                                                        store.is_active ? "text-red-400" : "text-green-400"
                                                    )}
                                                    onClick={() => toggleStoreActive(store.id, store.is_active)}
                                                >
                                                    {store.is_active ? (
                                                        <>
                                                            <XCircle className="mr-2 h-4 w-4" />
                                                            Suspend Store
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle2 className="mr-2 h-4 w-4" />
                                                            Activate Store
                                                        </>
                                                    )}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    {filteredStores.length > 0 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-neutral-800">
                            <div className="flex items-center gap-2 text-sm text-neutral-400">
                                <span>Rows per page:</span>
                                <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(Number(v))}>
                                    <SelectTrigger className="w-[70px] bg-neutral-950 border-neutral-800 text-white h-8">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-neutral-900 border-neutral-800">
                                        {ITEMS_PER_PAGE_OPTIONS.map(option => (
                                            <SelectItem key={option} value={option.toString()}>{option}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-4">
                                <span className="text-sm text-neutral-400">
                                    Page {currentPage} of {totalPages || 1}
                                </span>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 bg-neutral-950 border-neutral-800 text-white hover:bg-neutral-800"
                                        onClick={() => setCurrentPage(1)}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        <ChevronLeft className="h-4 w-4 -ml-2" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 bg-neutral-950 border-neutral-800 text-white hover:bg-neutral-800"
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 bg-neutral-950 border-neutral-800 text-white hover:bg-neutral-800"
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages || totalPages === 0}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 bg-neutral-950 border-neutral-800 text-white hover:bg-neutral-800"
                                        onClick={() => setCurrentPage(totalPages)}
                                        disabled={currentPage === totalPages || totalPages === 0}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                        <ChevronRight className="h-4 w-4 -ml-2" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
