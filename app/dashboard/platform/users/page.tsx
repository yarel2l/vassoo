'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    Search,
    MoreHorizontal,
    Users,
    ShieldCheck,
    Mail,
    Phone,
    Calendar,
    Store,
    Truck,
    Filter,
    ArrowUpDown,
    CheckCircle2,
    XCircle,
    Eye,
    Trash2,
    Loader2,
    RefreshCw,
    Download,
    ShieldAlert,
    AlertTriangle
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface UserProfile {
    id: string
    email: string
    full_name: string | null
    phone: string | null
    avatar_url: string | null
    birth_date: string | null
    age_verified: boolean
    created_at: string
    updated_at: string
    // Computed fields
    total_orders?: number
    total_spent?: number
    isPlatformAdmin?: boolean
    isDriver?: boolean
    driverCompanyId?: string
    adminRole?: string
    memberships?: Array<{
        id: string
        role: string
        tenant: {
            id: string
            name: string
            type: string
        }
    }>
}

interface UserStats {
    total_users: number
    verified_users: number
    store_owners: number
    delivery_partners: number
    new_this_month: number
}

type SortField = 'full_name' | 'email' | 'created_at'
type SortOrder = 'asc' | 'desc'
type FilterRole = 'all' | 'customer' | 'store_owner' | 'delivery' | 'driver' | 'admin'

export default function PlatformUsersPage() {
    const [users, setUsers] = useState<UserProfile[]>([])
    const [stats, setStats] = useState<UserStats | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [sortField, setSortField] = useState<SortField>('created_at')
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
    const [filterRole, setFilterRole] = useState<FilterRole>('all')
    const [filterVerified, setFilterVerified] = useState<'all' | 'verified' | 'unverified'>('all')
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
    const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    
    const { toast } = useToast()
    const supabase = createClient()

    const fetchUsers = useCallback(async () => {
        setIsLoading(true)
        try {
            // Fetch users with their memberships
            let query = supabase
                .from('profiles')
                .select(`
                    *,
                    memberships:tenant_memberships!tenant_memberships_user_id_fkey(
                        id,
                        role,
                        tenant:tenants(id, name, type)
                    )
                `)
                .order(sortField, { ascending: sortOrder === 'asc' })

            // Apply search filter
            if (searchQuery) {
                query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
            }

            // Apply verification filter
            if (filterVerified === 'verified') {
                query = query.eq('age_verified', true)
            } else if (filterVerified === 'unverified') {
                query = query.eq('age_verified', false)
            }

            const { data: profilesData, error } = await query

            if (error) throw error

            // Fetch platform admins separately
            const { data: platformAdmins, error: adminError } = await supabase
                .from('platform_admins')
                .select('user_id, role, is_active')
                .eq('is_active', true)

            // Fetch delivery drivers separately
            const { data: deliveryDrivers, error: driverError } = await supabase
                .from('delivery_drivers')
                .select('user_id, delivery_company_id, is_active')
                .eq('is_active', true)

            console.log('Platform Admins Query Result:', { platformAdmins, adminError })
            console.log('Delivery Drivers Query Result:', { deliveryDrivers, driverError })

            // Create a map of admin user_ids
            const adminMap = new Map<string, { role: string, is_active: boolean }>()
            platformAdmins?.forEach(admin => {
                adminMap.set(admin.user_id, { role: admin.role, is_active: admin.is_active })
            })

            // Create a map of driver user_ids
            const driverMap = new Map<string, { companyId: string, is_active: boolean }>()
            deliveryDrivers?.forEach(driver => {
                driverMap.set(driver.user_id, { companyId: driver.delivery_company_id, is_active: driver.is_active })
            })

            console.log('Admin Map:', Object.fromEntries(adminMap))
            console.log('Driver Map:', Object.fromEntries(driverMap))

            // Process users and mark platform admins and drivers
            let processedUsers = (profilesData || []).map((user: any) => {
                const adminInfo = adminMap.get(user.id)
                const driverInfo = driverMap.get(user.id)
                return {
                    ...user,
                    isPlatformAdmin: !!adminInfo,
                    adminRole: adminInfo?.role || null,
                    isDriver: !!driverInfo,
                    driverCompanyId: driverInfo?.companyId || null
                }
            })

            // Filter by role if needed
            let filteredUsers = processedUsers
            if (filterRole !== 'all') {
                filteredUsers = filteredUsers.filter((user: any) => {
                    const memberships = user.memberships || []
                    if (filterRole === 'admin') {
                        return user.isPlatformAdmin
                    } else if (filterRole === 'driver') {
                        return user.isDriver
                    } else if (filterRole === 'customer') {
                        return memberships.length === 0 && !user.isPlatformAdmin && !user.isDriver
                    } else if (filterRole === 'store_owner') {
                        return memberships.some((m: any) => m.tenant?.type === 'owner_store')
                    } else if (filterRole === 'delivery') {
                        return memberships.some((m: any) => m.tenant?.type === 'delivery_company')
                    }
                    return true
                })
            }

            // Fetch order stats for each user
            const userIds = filteredUsers.map((u: any) => u.id)
            if (userIds.length > 0) {
                const { data: orderStats } = await supabase
                    .from('orders')
                    .select('customer_id, total')
                    .in('customer_id', userIds)

                const orderStatsMap = new Map<string, { count: number, total: number }>()
                orderStats?.forEach(order => {
                    const existing = orderStatsMap.get(order.customer_id) || { count: 0, total: 0 }
                    orderStatsMap.set(order.customer_id, {
                        count: existing.count + 1,
                        total: existing.total + (Number(order.total) || 0)
                    })
                })

                filteredUsers = filteredUsers.map((user: any) => ({
                    ...user,
                    total_orders: orderStatsMap.get(user.id)?.count || 0,
                    total_spent: orderStatsMap.get(user.id)?.total || 0
                }))
            }

            setUsers(filteredUsers)
        } catch (error) {
            console.error('Error fetching users:', error)
            toast({
                title: 'Error',
                description: 'Could not fetch users',
                variant: 'destructive'
            })
        } finally {
            setIsLoading(false)
        }
    }, [supabase, searchQuery, sortField, sortOrder, filterRole, filterVerified, toast])

    const fetchStats = useCallback(async () => {
        try {
            // Fetch basic counts
            const [totalResult, verifiedResult, newThisMonthResult] = await Promise.all([
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('age_verified', true),
                supabase.from('profiles').select('*', { count: 'exact', head: true })
                    .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
            ])

            // Fetch memberships with tenants separately to count store owners and delivery partners
            const { data: memberships } = await supabase
                .from('tenant_memberships')
                .select('user_id, tenant:tenants(type)')

            // Get unique store owners and delivery partners
            const uniqueStoreOwners = new Set(
                memberships?.filter((m: any) => m.tenant?.type === 'owner_store').map((m: any) => m.user_id) || []
            )
            const uniqueDeliveryPartners = new Set(
                memberships?.filter((m: any) => m.tenant?.type === 'delivery_company').map((m: any) => m.user_id) || []
            )

            setStats({
                total_users: totalResult.count || 0,
                verified_users: verifiedResult.count || 0,
                store_owners: uniqueStoreOwners.size,
                delivery_partners: uniqueDeliveryPartners.size,
                new_this_month: newThisMonthResult.count || 0
            })
        } catch (error) {
            console.error('Error fetching stats:', error)
        }
    }, [supabase])

    useEffect(() => {
        fetchUsers()
        fetchStats()
    }, [fetchUsers, fetchStats])

    const handleViewUser = (user: UserProfile) => {
        setSelectedUser(user)
        setIsDetailDialogOpen(true)
    }

    const handleDeleteUser = async () => {
        if (!userToDelete) return

        setIsDeleting(true)
        try {
            // Call admin API to delete user (this requires service role)
            const response = await fetch('/api/admin/delete-user', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userToDelete.id }),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to delete user')
            }

            toast({
                title: 'User deleted',
                description: `${userToDelete.full_name || userToDelete.email} has been permanently deleted`,
            })

            setIsDeleteDialogOpen(false)
            setUserToDelete(null)
            fetchUsers()
            fetchStats()
        } catch (error) {
            console.error('Error deleting user:', error)
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to delete user',
                variant: 'destructive',
            })
        } finally {
            setIsDeleting(false)
        }
    }

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortOrder('asc')
        }
    }

    const getInitials = (name: string | null, email: string) => {
        if (name) {
            return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        }
        return email[0].toUpperCase()
    }

    const getUserRoleBadges = (user: UserProfile) => {
        const badges = []
        const memberships = user.memberships || []

        const isStoreOwner = memberships.some((m: any) => m.tenant?.type === 'owner_store')
        const isDeliveryPartner = memberships.some((m: any) => m.tenant?.type === 'delivery_company')

        if (user.isPlatformAdmin) {
            const adminLabel = user.adminRole === 'super_admin' ? 'Super Admin' : 'Admin'
            badges.push(
                <Badge key="admin" variant="default" className="bg-indigo-600 text-white">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    {adminLabel}
                </Badge>
            )
        }
        if (isStoreOwner) {
            badges.push(
                <Badge key="store" variant="outline" className="border-purple-500 text-purple-400">
                    <Store className="h-3 w-3 mr-1" />
                    Store Owner
                </Badge>
            )
        }
        if (isDeliveryPartner) {
            badges.push(
                <Badge key="delivery" variant="outline" className="border-blue-500 text-blue-400">
                    <Truck className="h-3 w-3 mr-1" />
                    Delivery Admin
                </Badge>
            )
        }
        if (user.isDriver) {
            badges.push(
                <Badge key="driver" variant="outline" className="border-green-500 text-green-400">
                    <Truck className="h-3 w-3 mr-1" />
                    Driver
                </Badge>
            )
        }
        if (badges.length === 0) {
            badges.push(
                <Badge key="customer" variant="secondary" className="bg-gray-700 text-gray-300">
                    Customer
                </Badge>
            )
        }

        return badges
    }

    const exportUsers = async () => {
        try {
            const csvContent = [
                ['ID', 'Email', 'Name', 'Phone', 'Age Verified', 'Total Orders', 'Total Spent', 'Created At'].join(','),
                ...users.map(user => [
                    user.id,
                    user.email,
                    user.full_name || '',
                    user.phone || '',
                    user.age_verified ? 'Yes' : 'No',
                    user.total_orders || 0,
                    user.total_spent?.toFixed(2) || '0.00',
                    format(new Date(user.created_at), 'yyyy-MM-dd')
                ].join(','))
            ].join('\n')

            const blob = new Blob([csvContent], { type: 'text/csv' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `users-export-${format(new Date(), 'yyyy-MM-dd')}.csv`
            a.click()
            window.URL.revokeObjectURL(url)

            toast({
                title: 'Export successful',
                description: `Exported ${users.length} users`
            })
        } catch (error) {
            toast({
                title: 'Export failed',
                description: 'Could not export users',
                variant: 'destructive'
            })
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">User Management</h1>
                    <p className="text-gray-400 mt-1">Manage and monitor platform users</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={exportUsers}
                        className="border-gray-700 text-gray-300"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { fetchUsers(); fetchStats() }}
                        className="border-gray-700 text-gray-300"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card className="bg-gray-800/50 border-gray-700">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Total Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold text-white">{stats?.total_users || 0}</span>
                            <Users className="h-5 w-5 text-gray-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gray-800/50 border-gray-700">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Age Verified</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold text-green-400">{stats?.verified_users || 0}</span>
                            <ShieldCheck className="h-5 w-5 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gray-800/50 border-gray-700">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Store Owners</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold text-purple-400">{stats?.store_owners || 0}</span>
                            <Store className="h-5 w-5 text-purple-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gray-800/50 border-gray-700">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Delivery Partners</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold text-blue-400">{stats?.delivery_partners || 0}</span>
                            <Truck className="h-5 w-5 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gray-800/50 border-gray-700">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">New This Month</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold text-amber-400">{stats?.new_this_month || 0}</span>
                            <Calendar className="h-5 w-5 text-amber-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                <Input
                                    placeholder="Search by name, email or phone..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 bg-gray-900 border-gray-700 text-white"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Select value={filterRole} onValueChange={(v) => setFilterRole(v as FilterRole)}>
                                <SelectTrigger className="w-[150px] bg-gray-900 border-gray-700 text-white">
                                    <SelectValue placeholder="Role" />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-900 border-gray-700">
                                    <SelectItem value="all">All Roles</SelectItem>
                                    <SelectItem value="admin">Admins</SelectItem>
                                    <SelectItem value="customer">Customers</SelectItem>
                                    <SelectItem value="store_owner">Store Owners</SelectItem>
                                    <SelectItem value="delivery">Delivery Admin</SelectItem>
                                    <SelectItem value="driver">Drivers</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={filterVerified} onValueChange={(v) => setFilterVerified(v as 'all' | 'verified' | 'unverified')}>
                                <SelectTrigger className="w-[150px] bg-gray-900 border-gray-700 text-white">
                                    <SelectValue placeholder="Verification" />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-900 border-gray-700">
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="verified">Verified</SelectItem>
                                    <SelectItem value="unverified">Unverified</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Users Table */}
            <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Users ({users.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                        </div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No users found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-gray-700 hover:bg-transparent">
                                        <TableHead className="text-gray-400">User</TableHead>
                                        <TableHead className="text-gray-400">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleSort('email')}
                                                className="text-gray-400 hover:text-white -ml-3"
                                            >
                                                Email
                                                <ArrowUpDown className="ml-2 h-4 w-4" />
                                            </Button>
                                        </TableHead>
                                        <TableHead className="text-gray-400">Role</TableHead>
                                        <TableHead className="text-gray-400">Verification</TableHead>
                                        <TableHead className="text-gray-400">Orders</TableHead>
                                        <TableHead className="text-gray-400">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleSort('created_at')}
                                                className="text-gray-400 hover:text-white -ml-3"
                                            >
                                                Joined
                                                <ArrowUpDown className="ml-2 h-4 w-4" />
                                            </Button>
                                        </TableHead>
                                        <TableHead className="text-gray-400 w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow key={user.id} className="border-gray-700 hover:bg-gray-800/50">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-9 w-9">
                                                        <AvatarImage src={user.avatar_url || undefined} />
                                                        <AvatarFallback className="bg-gray-700 text-white text-sm">
                                                            {getInitials(user.full_name, user.email)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium text-white">
                                                            {user.full_name || 'No name'}
                                                        </p>
                                                        {user.phone && (
                                                            <p className="text-xs text-gray-500">{user.phone}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-gray-300">{user.email}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {getUserRoleBadges(user)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger>
                                                            {user.age_verified ? (
                                                                <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                                                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                                                    Verified
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="border-gray-600 text-gray-400">
                                                                    <XCircle className="h-3 w-3 mr-1" />
                                                                    Unverified
                                                                </Badge>
                                                            )}
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            {user.age_verified ? 'Age verified' : 'Age not verified'}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-white">{user.total_orders || 0}</div>
                                                <div className="text-xs text-gray-500">
                                                    ${(user.total_spent || 0).toFixed(2)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-gray-400">
                                                {format(new Date(user.created_at), 'MMM d, yyyy')}
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700">
                                                        <DropdownMenuLabel className="text-gray-400">Actions</DropdownMenuLabel>
                                                        <DropdownMenuSeparator className="bg-gray-700" />
                                                        <DropdownMenuItem
                                                            onClick={() => handleViewUser(user)}
                                                            className="text-white focus:bg-gray-800"
                                                        >
                                                            <Eye className="h-4 w-4 mr-2" />
                                                            View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem 
                                                            className="text-white focus:bg-gray-800"
                                                            onClick={() => {
                                                                window.location.href = `mailto:${user.email}`
                                                            }}
                                                        >
                                                            <Mail className="h-4 w-4 mr-2" />
                                                            Send Email
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="bg-gray-700" />
                                                        <DropdownMenuItem 
                                                            className="text-red-400 focus:bg-gray-800 focus:text-red-400"
                                                            onClick={() => {
                                                                setUserToDelete(user)
                                                                setIsDeleteDialogOpen(true)
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete User
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* User Detail Dialog */}
            <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
                <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            {selectedUser && (
                                <>
                                    <Avatar className="h-12 w-12">
                                        <AvatarImage src={selectedUser.avatar_url || undefined} />
                                        <AvatarFallback className="bg-gray-700 text-white">
                                            {getInitials(selectedUser.full_name, selectedUser.email)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p>{selectedUser.full_name || 'No name'}</p>
                                        <p className="text-sm font-normal text-gray-400">{selectedUser.email}</p>
                                    </div>
                                </>
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    {selectedUser && (
                        <div className="space-y-6 py-4">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-gray-400 text-xs">Phone</Label>
                                    <p className="text-white">{selectedUser.phone || 'Not provided'}</p>
                                </div>
                                <div>
                                    <Label className="text-gray-400 text-xs">Birth Date</Label>
                                    <p className="text-white">
                                        {selectedUser.birth_date
                                            ? format(new Date(selectedUser.birth_date), 'MMMM d, yyyy')
                                            : 'Not provided'}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-gray-400 text-xs">Age Verification</Label>
                                    <div className="mt-1">
                                        {selectedUser.age_verified ? (
                                            <Badge className="bg-green-600/20 text-green-400">
                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                                Verified
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="border-amber-600 text-amber-400">
                                                <ShieldAlert className="h-3 w-3 mr-1" />
                                                Not Verified
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-gray-400 text-xs">Member Since</Label>
                                    <p className="text-white">
                                        {format(new Date(selectedUser.created_at), 'MMMM d, yyyy')}
                                    </p>
                                </div>
                            </div>

                            {/* Roles */}
                            <div>
                                <Label className="text-gray-400 text-xs">Roles & Memberships</Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {getUserRoleBadges(selectedUser)}
                                </div>

                                {/* Platform Admin Info */}
                                {selectedUser.isPlatformAdmin && (
                                    <div className="mt-3">
                                        <div className="flex items-center justify-between bg-indigo-900/30 border border-indigo-700/50 rounded-lg px-3 py-2">
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck className="h-4 w-4 text-indigo-400" />
                                                <span className="text-white">Platform Administration</span>
                                            </div>
                                            <Badge className="bg-indigo-600 text-white">
                                                {selectedUser.adminRole === 'super_admin' ? 'Super Admin' : 'Admin'}
                                            </Badge>
                                        </div>
                                    </div>
                                )}

                                {/* Tenant Memberships */}
                                {selectedUser.memberships && selectedUser.memberships.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                        {selectedUser.memberships.map((m: any) => (
                                            <div key={m.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    {m.tenant?.type === 'owner_store' ? (
                                                        <Store className="h-4 w-4 text-purple-400" />
                                                    ) : m.tenant?.type === 'delivery_company' ? (
                                                        <Truck className="h-4 w-4 text-blue-400" />
                                                    ) : (
                                                        <ShieldCheck className="h-4 w-4 text-indigo-400" />
                                                    )}
                                                    <span className="text-white">{m.tenant?.name}</span>
                                                </div>
                                                <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                                                    {m.role}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Stats */}
                            <div>
                                <Label className="text-gray-400 text-xs">Activity</Label>
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                    <div className="bg-gray-800 rounded-lg p-4">
                                        <p className="text-2xl font-bold text-white">{selectedUser.total_orders || 0}</p>
                                        <p className="text-sm text-gray-400">Total Orders</p>
                                    </div>
                                    <div className="bg-gray-800 rounded-lg p-4">
                                        <p className="text-2xl font-bold text-green-400">
                                            ${(selectedUser.total_spent || 0).toFixed(2)}
                                        </p>
                                        <p className="text-sm text-gray-400">Total Spent</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsDetailDialogOpen(false)}
                            className="border-gray-700 text-gray-300"
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete User Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-400">
                            <AlertTriangle className="h-5 w-5" />
                            Delete User Account
                        </DialogTitle>
                        <DialogDescription className="text-gray-400">
                            This action cannot be undone. This will permanently delete the user account and all associated data.
                        </DialogDescription>
                    </DialogHeader>

                    {userToDelete && (
                        <div className="py-4">
                            <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={userToDelete.avatar_url || undefined} />
                                    <AvatarFallback className="bg-gray-700 text-white">
                                        {getInitials(userToDelete.full_name, userToDelete.email)}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium text-white">{userToDelete.full_name || 'No name'}</p>
                                    <p className="text-sm text-gray-400">{userToDelete.email}</p>
                                </div>
                            </div>
                            
                            <div className="mt-4 p-3 bg-red-900/20 border border-red-800/50 rounded-lg">
                                <p className="text-sm text-red-300">
                                    <strong>Warning:</strong> This will delete:
                                </p>
                                <ul className="mt-2 text-sm text-red-300/80 list-disc list-inside space-y-1">
                                    <li>User profile and authentication</li>
                                    <li>All tenant memberships</li>
                                    <li>Platform admin access (if any)</li>
                                    <li>Driver profile (if any)</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsDeleteDialogOpen(false)
                                setUserToDelete(null)
                            }}
                            className="border-gray-700 text-gray-300"
                            disabled={isDeleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteUser}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete User
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
