'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { OrderNotificationProvider, useOrderNotifications } from '@/contexts/order-notification-context'
import { createClient } from '@/lib/supabase/client'
import { DashboardUserMenu } from '@/components/dashboard-user-menu'
import { OrderNotificationBell } from '@/components/notifications/order-notification-bell'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import {
    LayoutDashboard,
    Truck,
    Users,
    MapPin,
    Settings,
    Menu,
    Home,
    ChevronDown,
    PanelLeftClose,
    PanelLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { VassooLogo, VassooLogoIcon } from '@/components/vassoo-logo'

interface NavItem {
    name: string
    href: string
    icon: typeof LayoutDashboard
    badgeKey?: 'deliveries'
}

const navigation: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard/delivery', icon: LayoutDashboard },
    { name: 'Deliveries', href: '/dashboard/delivery/deliveries', icon: Truck, badgeKey: 'deliveries' },
    { name: 'Drivers', href: '/dashboard/delivery/drivers', icon: Users },
    { name: 'Coverage', href: '/dashboard/delivery/coverage', icon: MapPin },
    { name: 'Settings', href: '/dashboard/delivery/settings', icon: Settings },
]

export default function DeliveryDashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { tenants, isPlatformAdmin, activeTenantId, setActiveTenantId } = useAuth()
    const [allDeliveryCompanies, setAllDeliveryCompanies] = useState<any[]>([])

    // Fetch all delivery companies if platform admin
    useEffect(() => {
        async function fetchAllCompanies() {
            if (isPlatformAdmin) {
                const supabase = createClient()
                const { data } = await supabase
                    .from('tenants')
                    .select('id, name, slug, type, status')
                    .eq('type', 'delivery_company')
                    .order('name')

                if (data) {
                    setAllDeliveryCompanies(data)
                    // If no active tenant selected and we have companies, pick the first one
                    if (!activeTenantId && data.length > 0) {
                        setActiveTenantId(data[0].id)
                    }
                }
            }
        }
        fetchAllCompanies()
    }, [isPlatformAdmin, activeTenantId, setActiveTenantId])

    // Filter delivery tenants or use all if admin
    const deliveryTenants = isPlatformAdmin
        ? allDeliveryCompanies.map(c => ({ tenant: c, id: c.id, role: 'admin' }))
        : tenants.filter(t => t.tenant?.type === 'delivery_company')

    // Get current delivery tenant
    const currentDeliveryTenant = deliveryTenants.find(t => t.tenant.id === activeTenantId) || deliveryTenants[0]

    return (
        <OrderNotificationProvider deliveryCompanyId={currentDeliveryTenant?.tenant?.id}>
            <DeliveryDashboardLayoutInner
                deliveryTenants={deliveryTenants}
                currentDeliveryTenant={currentDeliveryTenant}
            >
                {children}
            </DeliveryDashboardLayoutInner>
        </OrderNotificationProvider>
    )
}

// Inner component that can use the notification context
function DeliveryDashboardLayoutInner({
    children,
    deliveryTenants,
    currentDeliveryTenant,
}: {
    children: React.ReactNode
    deliveryTenants: any[]
    currentDeliveryTenant: any
}) {
    const router = useRouter()
    const pathname = usePathname()
    const { user, isLoading, isPlatformAdmin, activeTenantId, setActiveTenantId } = useAuth()
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    
    // Get notification counts for badges
    const { pendingDeliveriesCount } = useOrderNotifications()
    const badgeCounts: Record<string, number> = {
        deliveries: pendingDeliveriesCount,
    }

    // Load sidebar state from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('delivery-sidebar-collapsed')
        if (saved) {
            setSidebarCollapsed(JSON.parse(saved))
        }
    }, [])

    // Save sidebar state
    const toggleSidebar = () => {
        const newState = !sidebarCollapsed
        setSidebarCollapsed(newState)
        localStorage.setItem('delivery-sidebar-collapsed', JSON.stringify(newState))
    }

    // Note: Authentication and authorization is handled by proxy.ts
    // This is just a fallback for client-side navigation edge cases
    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login')
        }
        // Platform admin access is validated at proxy level
        // The proxy ensures only admins or delivery owners can reach this layout
    }, [user, isLoading, router])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
            </div>
        )
    }

    if (!user) {
        return null
    }

    return (
        <TooltipProvider>
            <div className="min-h-screen bg-gray-950">
                {/* Mobile Header */}
                <div className="lg:hidden sticky top-0 z-50 bg-gray-900 border-b border-gray-800 px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="text-gray-400"
                            >
                                <Menu className="h-5 w-5" />
                            </Button>
                            <VassooLogoIcon size="sm" />
                            <span className="font-semibold text-white">Delivery</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <OrderNotificationBell />
                        </div>
                    </div>
                </div>

                {/* Mobile Menu Overlay */}
                {mobileMenuOpen && (
                    <div
                        className="lg:hidden fixed inset-0 z-40 bg-black/50"
                        onClick={() => setMobileMenuOpen(false)}
                    />
                )}

                {/* Mobile Sidebar */}
                <div className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 transform transition-transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    {/* Logo */}
                    <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
                        <Link href="/dashboard/delivery" className="flex items-center gap-3">
                            <VassooLogo size="md" />
                        </Link>
                        <button
                            className="p-2 text-gray-400 hover:text-white"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Company Switcher - Mobile */}
                    {(deliveryTenants.length > 0 || isPlatformAdmin) && (
                        <div className="p-4 border-b border-gray-800">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors group">
                                        <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg group-hover:scale-110 transition-transform">
                                            <Truck className="h-4 w-4 text-white" />
                                        </div>
                                        <div className="flex-1 text-left overflow-hidden">
                                            <p className="text-sm font-medium text-white truncate">
                                                {currentDeliveryTenant?.tenant.name || 'Platform Admin'}
                                            </p>
                                            <p className="text-xs text-gray-400 capitalize">
                                                {currentDeliveryTenant?.tenant.status || 'Active'}
                                            </p>
                                        </div>
                                        <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-white transition-colors" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-64 bg-gray-900 border-gray-800">
                                    <div className="px-2 py-1.5">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Delivery Companies</p>
                                    </div>
                                    <DropdownMenuSeparator className="bg-gray-800" />
                                    {deliveryTenants.length > 0 ? (
                                        deliveryTenants.map(t => (
                                            <DropdownMenuItem
                                                key={t.tenant.id}
                                                className={cn(
                                                    "text-gray-300 focus:bg-gray-800 cursor-pointer",
                                                    activeTenantId === t.tenant.id && "bg-blue-500/10 text-blue-400"
                                                )}
                                                onClick={() => setActiveTenantId(t.tenant.id)}
                                            >
                                                <Truck className="mr-2 h-4 w-4" />
                                                <span className="truncate">{t.tenant.name}</span>
                                            </DropdownMenuItem>
                                        ))
                                    ) : (
                                        <div className="px-4 py-3 text-xs text-gray-400 italic">
                                            No specific memberships
                                        </div>
                                    )}
                                    <DropdownMenuSeparator className="bg-gray-800" />
                                    <DropdownMenuItem asChild className="text-blue-400 focus:bg-gray-800">
                                        <Link href="/onboarding?type=delivery_company">+ Register new company</Link>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}

                    <nav className="p-4 space-y-1">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href
                            const badgeCount = item.badgeKey ? badgeCounts[item.badgeKey] || 0 : 0
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                        }`}
                                >
                                    <item.icon className="h-5 w-5" />
                                    <span className="flex-1">{item.name}</span>
                                    {badgeCount > 0 && (
                                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-500 text-white rounded-full animate-pulse">
                                            {badgeCount > 99 ? '99+' : badgeCount}
                                        </span>
                                    )}
                                </Link>
                            )
                        })}
                    </nav>
                </div>

                <div className="flex">
                    {/* Desktop Sidebar */}
                    <aside className={`hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 bg-gray-900 border-r border-gray-800 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
                        {/* Logo */}
                        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
                            <Link href="/dashboard/delivery" className="flex items-center gap-3">
                                {sidebarCollapsed ? (
                                    <VassooLogoIcon size="md" />
                                ) : (
                                    <VassooLogo size="md" />
                                )}
                            </Link>
                        </div>

                        {/* Company Switcher */}
                        {(deliveryTenants.length > 0 || isPlatformAdmin) && !sidebarCollapsed && (
                            <div className="p-4 border-b border-gray-800">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors group">
                                            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg group-hover:scale-110 transition-transform">
                                                <Truck className="h-4 w-4 text-white" />
                                            </div>
                                            <div className="flex-1 text-left overflow-hidden">
                                                <p className="text-sm font-medium text-white truncate">
                                                    {currentDeliveryTenant?.tenant.name || 'Platform Admin'}
                                                </p>
                                                <p className="text-xs text-gray-400 capitalize">
                                                    {currentDeliveryTenant?.tenant.status || 'Active'}
                                                </p>
                                            </div>
                                            <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-white transition-colors" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-64 bg-gray-900 border-gray-800">
                                        <div className="px-2 py-1.5">
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Delivery Companies</p>
                                        </div>
                                        <DropdownMenuSeparator className="bg-gray-800" />
                                        {deliveryTenants.length > 0 ? (
                                            deliveryTenants.map(t => (
                                                <DropdownMenuItem
                                                    key={t.tenant.id}
                                                    className={cn(
                                                        "text-gray-300 focus:bg-gray-800 cursor-pointer",
                                                        activeTenantId === t.tenant.id && "bg-blue-500/10 text-blue-400"
                                                    )}
                                                    onClick={() => setActiveTenantId(t.tenant.id)}
                                                >
                                                    <Truck className="mr-2 h-4 w-4" />
                                                    <span className="truncate">{t.tenant.name}</span>
                                                </DropdownMenuItem>
                                            ))
                                        ) : (
                                            <div className="px-4 py-3 text-xs text-gray-400 italic">
                                                No specific memberships
                                            </div>
                                        )}
                                        <DropdownMenuSeparator className="bg-gray-800" />
                                        <DropdownMenuItem asChild className="text-blue-400 focus:bg-gray-800">
                                            <Link href="/onboarding?type=delivery_company">+ Register new company</Link>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        )}

                        {/* Collapsed switcher indicator */}
                        {(deliveryTenants.length > 0 || isPlatformAdmin) && sidebarCollapsed && (
                            <div className="p-3 border-b border-gray-800 flex justify-center">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg cursor-pointer">
                                            <Truck className="h-4 w-4 text-white" />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="bg-gray-800 text-white border-gray-700">
                                        {currentDeliveryTenant?.tenant.name || 'Platform Admin'}
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        )}

                        {/* Navigation */}
                        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                            {navigation.map((item) => {
                                const isActive = pathname === item.href
                                const badgeCount = item.badgeKey ? badgeCounts[item.badgeKey] || 0 : 0
                                const NavLink = (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors relative ${isActive
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                            } ${sidebarCollapsed ? 'justify-center' : ''}`}
                                    >
                                        <item.icon className="h-5 w-5 flex-shrink-0" />
                                        {!sidebarCollapsed && (
                                            <>
                                                <span className="flex-1">{item.name}</span>
                                                {badgeCount > 0 && (
                                                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-500 text-white rounded-full animate-pulse">
                                                        {badgeCount > 99 ? '99+' : badgeCount}
                                                    </span>
                                                )}
                                            </>
                                        )}
                                        {sidebarCollapsed && badgeCount > 0 && (
                                            <span className="absolute top-0 right-0 h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                                        )}
                                    </Link>
                                )

                                if (sidebarCollapsed) {
                                    return (
                                        <Tooltip key={item.name}>
                                            <TooltipTrigger asChild>{NavLink}</TooltipTrigger>
                                            <TooltipContent side="right">
                                                <p>{item.name}</p>
                                                {badgeCount > 0 && <span className="ml-2 text-blue-400">({badgeCount})</span>}
                                            </TooltipContent>
                                        </Tooltip>
                                    )
                                }

                                return NavLink
                            })}
                        </nav>

                        {/* Collapse Button */}
                        <div className="hidden lg:block p-3 border-t border-gray-800">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={toggleSidebar}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors",
                                            sidebarCollapsed && "justify-center px-2"
                                        )}
                                    >
                                        {sidebarCollapsed ? (
                                            <PanelLeft className="h-5 w-5" />
                                        ) : (
                                            <>
                                                <PanelLeftClose className="h-5 w-5" />
                                                <span className="text-sm font-medium">Collapse</span>
                                            </>
                                        )}
                                    </button>
                                </TooltipTrigger>
                                {sidebarCollapsed && (
                                    <TooltipContent side="right" className="bg-gray-800 text-white border-gray-700">
                                        Expand sidebar
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className={`flex-1 overflow-x-hidden transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
                        {/* Top Bar */}
                        <header className="hidden lg:flex sticky top-0 z-20 bg-gray-900/95 backdrop-blur border-b border-gray-800 px-6 py-3 items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                                    <Home className="h-5 w-5" />
                                </Link>
                                <span className="text-gray-600">/</span>
                                <span className="text-gray-400">Delivery Dashboard</span>
                            </div>

                            <div className="flex items-center gap-4">
                                {/* Order/Delivery Notifications (Real-time) */}
                                <OrderNotificationBell />

                                {/* User Menu */}
                                <DashboardUserMenu variant="delivery" />
                            </div>
                        </header>

                        {/* Page Content */}
                        <div className="p-4 lg:p-6">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
            </TooltipProvider>
    )
}