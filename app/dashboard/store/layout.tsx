'use client'

import { ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { StoreDashboardProvider, useStoreDashboard } from '@/contexts/store-dashboard-context'
import { OrderNotificationProvider, useOrderNotifications } from '@/contexts/order-notification-context'
import { DashboardUserMenu } from '@/components/dashboard-user-menu'
import { OrderNotificationBell } from '@/components/notifications/order-notification-bell'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
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
    Package,
    ShoppingCart,
    Users,
    Settings,
    BarChart3,
    Megaphone,
    Tag,
    Truck,
    Star,
    MapPin,
    Menu,
    X,
    Receipt,
    ChevronDown,
    Store,
    PanelLeftClose,
    PanelLeft,
    Home,
    Loader2,
    Zap,
    Shuffle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { VassooLogo, VassooLogoIcon } from '@/components/vassoo-logo'

interface NavItem {
    title: string
    href: string
    icon: ReactNode
    iconComponent: typeof LayoutDashboard
    badgeKey?: 'orders' | 'deliveries' // Key to lookup badge count from context
}

const navItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard/store',
        icon: <LayoutDashboard className="h-5 w-5" />,
        iconComponent: LayoutDashboard,
    },
    {
        title: 'Orders',
        href: '/dashboard/store/orders',
        icon: <ShoppingCart className="h-5 w-5" />,
        iconComponent: ShoppingCart,
        badgeKey: 'orders',
    },
    {
        title: 'POS',
        href: '/dashboard/store/pos',
        icon: <Receipt className="h-5 w-5" />,
        iconComponent: Receipt,
    },
    {
        title: 'Customers',
        href: '/dashboard/store/customers',
        icon: <Users className="h-5 w-5" />,
        iconComponent: Users,
    },
    {
        title: 'Products',
        href: '/dashboard/store/products',
        icon: <Package className="h-5 w-5" />,
        iconComponent: Package,
    },
    {
        title: 'Inventory',
        href: '/dashboard/store/inventory',
        icon: <Package className="h-5 w-5" />,
        iconComponent: Package,
    },
    {
        title: 'Locations',
        href: '/dashboard/store/locations',
        icon: <MapPin className="h-5 w-5" />,
        iconComponent: MapPin,
    },
    {
        title: 'Promotions',
        href: '/dashboard/store/promotions',
        icon: <Megaphone className="h-5 w-5" />,
        iconComponent: Megaphone,
    },
    {
        title: 'Flash Sales',
        href: '/dashboard/store/flash-sales',
        icon: <Zap className="h-5 w-5" />,
        iconComponent: Zap,
    },
    {
        title: 'Mix & Match',
        href: '/dashboard/store/mix-and-match',
        icon: <Shuffle className="h-5 w-5" />,
        iconComponent: Shuffle,
    },
    {
        title: 'Coupons',
        href: '/dashboard/store/coupons',
        icon: <Tag className="h-5 w-5" />,
        iconComponent: Tag,
    },
    {
        title: 'Delivery',
        href: '/dashboard/store/delivery',
        icon: <Truck className="h-5 w-5" />,
        iconComponent: Truck,
    },
    {
        title: 'Staff',
        href: '/dashboard/store/staff',
        icon: <Users className="h-5 w-5" />,
        iconComponent: Users,
    },
    {
        title: 'Reviews',
        href: '/dashboard/store/reviews',
        icon: <Star className="h-5 w-5" />,
        iconComponent: Star,
    },
    {
        title: 'Analytics',
        href: '/dashboard/store/analytics',
        icon: <BarChart3 className="h-5 w-5" />,
        iconComponent: BarChart3,
    },
    {
        title: 'Settings',
        href: '/dashboard/store/settings',
        icon: <Settings className="h-5 w-5" />,
        iconComponent: Settings,
    },
]

// Inner layout component that uses the store dashboard context
function StoreDashboardLayoutInner({ children }: { children: ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const pathname = usePathname()
    const router = useRouter()

    const { user, isPlatformAdmin, isLoading: authLoading } = useAuth()
    const { availableStores, currentStore, selectStore, isLoading: storesLoading } = useStoreDashboard()
    
    // Get notification context for badge counts
    const { pendingOrdersCount } = useOrderNotifications()
    
    // Map badge keys to actual counts
    const badgeCounts: Record<string, number> = {
        orders: pendingOrdersCount,
    }

    useEffect(() => {
        // Load collapsed state from localStorage
        const saved = localStorage.getItem('sidebar-collapsed')
        if (saved) setSidebarCollapsed(saved === 'true')
    }, [])

    // Note: Authentication and authorization is handled by proxy.ts
    // This is just a fallback for client-side navigation edge cases
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login')
        }
    }, [user, authLoading, router])

    const toggleCollapsed = () => {
        const newValue = !sidebarCollapsed
        setSidebarCollapsed(newValue)
        localStorage.setItem('sidebar-collapsed', String(newValue))
    }

    // Helper for breadcrumbs
    const getBreadcrumbs = () => {
        const parts = pathname.split('/').filter(Boolean)
        return parts.map((part, index) => {
            const href = '/' + parts.slice(0, index + 1).join('/')
            const label = part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ')
            return { label, href }
        })
    }

    const breadcrumbs = getBreadcrumbs()

    // Show loading while stores are being fetched
    if (storesLoading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-500" />
                    <p className="text-gray-400">Loading store data...</p>
                </div>
            </div>
        )
    }

    return (
        <TooltipProvider delayDuration={0}>
            <div className="min-h-screen bg-gray-950">
                {/* Mobile sidebar overlay */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Sidebar */}
                <aside
                    className={cn(
                        'fixed inset-y-0 left-0 z-50 bg-gray-900 border-r border-gray-800 flex flex-col transform transition-all duration-200 lg:translate-x-0',
                        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
                        sidebarCollapsed ? 'w-20' : 'w-72'
                    )}
                >
                    {/* Logo */}
                    <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
                        <Link href="/dashboard/store" className="flex items-center gap-3">
                            {sidebarCollapsed ? (
                                <VassooLogoIcon size="md" />
                            ) : (
                                <VassooLogo size="md" />
                            )}
                        </Link>
                        <button
                            className="lg:hidden p-2 text-gray-400 hover:text-white"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Store selector */}
                    {(availableStores.length > 0 || isPlatformAdmin) && !sidebarCollapsed && (
                        <div className="p-4 border-b border-gray-800">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors group">
                                        <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg group-hover:scale-110 transition-transform">
                                            <Store className="h-4 w-4 text-white" />
                                        </div>
                                        <div className="flex-1 text-left overflow-hidden">
                                            <p className="text-sm font-medium text-white truncate">
                                                {currentStore?.name || 'Platform Admin'}
                                            </p>
                                            <p className="text-xs text-gray-400 capitalize">
                                                {currentStore?.status || 'Active'}
                                            </p>
                                        </div>
                                        <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-white transition-colors" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-64 bg-gray-900 border-gray-800">
                                    <DropdownMenuLabel className="text-gray-400">
                                        {isPlatformAdmin ? 'All Stores' : 'Your Stores'}
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator className="bg-gray-800" />
                                    <div className="max-h-[300px] overflow-y-auto">
                                        {availableStores.length > 0 ? (
                                            availableStores.map(store => (
                                                <DropdownMenuItem
                                                    key={store.id}
                                                    className={cn(
                                                        "text-white focus:bg-gray-800 cursor-pointer",
                                                        currentStore?.id === store.id && "bg-orange-500/10 text-orange-400"
                                                    )}
                                                    onClick={() => selectStore(store.id)}
                                                >
                                                    <Store className="mr-2 h-4 w-4 text-orange-400" />
                                                    <span className="truncate">{store.name}</span>
                                                </DropdownMenuItem>
                                            ))
                                        ) : (
                                            <div className="px-4 py-3 text-xs text-gray-400 italic">
                                                No stores registered yet
                                            </div>
                                        )}
                                    </div>
                                    <DropdownMenuSeparator className="bg-gray-800" />
                                    <DropdownMenuItem asChild className="text-orange-400 focus:bg-gray-800">
                                        <Link href="/onboarding?type=owner_store">+ Add new store</Link>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}

                    {/* Collapsed store indicator */}
                    {(availableStores.length > 0 || isPlatformAdmin) && sidebarCollapsed && (
                        <div className="p-3 border-b border-gray-800 flex justify-center">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg cursor-pointer">
                                        <Store className="h-4 w-4 text-white" />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="bg-gray-800 text-white border-gray-700">
                                    {currentStore?.name || 'Platform Admin'}
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    )}

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href ||
                                (item.href !== '/dashboard/store' && pathname.startsWith(item.href))
                            const Icon = item.iconComponent
                            const badgeCount = item.badgeKey ? badgeCounts[item.badgeKey] || 0 : 0

                            const navLink = (
                                <Link
                                    href={item.href}
                                    className={cn(
                                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                                        isActive
                                            ? 'bg-orange-500/20 text-orange-400'
                                            : 'text-gray-400 hover:text-white hover:bg-gray-800/50',
                                        sidebarCollapsed && 'justify-center px-2'
                                    )}
                                >
                                    <Icon className="h-5 w-5 flex-shrink-0" />
                                    {!sidebarCollapsed && (
                                        <>
                                            <span className="flex-1 text-sm font-medium">{item.title}</span>
                                            {badgeCount > 0 && (
                                                <span className="px-2 py-0.5 text-xs font-medium bg-orange-500 text-white rounded-full animate-pulse">
                                                    {badgeCount > 99 ? '99+' : badgeCount}
                                                </span>
                                            )}
                                        </>
                                    )}
                                    {sidebarCollapsed && badgeCount > 0 && (
                                        <span className="absolute top-0 right-0 h-2 w-2 bg-orange-500 rounded-full animate-pulse" />
                                    )}
                                </Link>
                            )

                            if (sidebarCollapsed) {
                                return (
                                    <Tooltip key={item.href}>
                                        <TooltipTrigger asChild>
                                            <div className="relative">{navLink}</div>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="bg-gray-800 text-white border-gray-700">
                                            {item.title}
                                            {badgeCount > 0 && <span className="ml-2 text-orange-400">({badgeCount})</span>}
                                        </TooltipContent>
                                    </Tooltip>
                                )
                            }

                            return <div key={item.href}>{navLink}</div>
                        })}
                    </nav>

                    {/* Collapse toggle at bottom */}
                    <div className="p-3 border-t border-gray-800">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={toggleCollapsed}
                                    className={cn(
                                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors',
                                        sidebarCollapsed && 'justify-center px-2'
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

                {/* Main content */}
                <div className={cn(
                    'transition-all duration-200',
                    sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'
                )}>
                    {/* Top navbar */}
                    <header className="sticky top-0 z-30 h-16 bg-gray-900/95 backdrop-blur border-b border-gray-800">
                        <div className="flex items-center justify-between h-full px-4 lg:px-6">
                            <div className="flex items-center gap-4">
                                <button
                                    className="lg:hidden p-2 text-gray-400 hover:text-white"
                                    onClick={() => setSidebarOpen(true)}
                                >
                                    <Menu className="h-6 w-6" />
                                </button>

                                {/* Breadcrumbs */}
                                <div className="hidden lg:flex items-center gap-4 text-sm">
                                    <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                                        <Home className="h-5 w-5" />
                                    </Link>
                                    {breadcrumbs.map((crumb, i) => (
                                        <div key={crumb.href} className="flex items-center gap-4">
                                            <span className="text-gray-600">/</span>
                                            <Link
                                                href={crumb.href}
                                                className={cn(
                                                    "transition-colors",
                                                    i === breadcrumbs.length - 1
                                                        ? "text-white font-medium pointer-events-none"
                                                        : "text-gray-400 hover:text-white"
                                                )}
                                            >
                                                {crumb.label}
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Back to store icon remains but as a tooltip icon as before */}
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            asChild
                                            className="text-gray-400 hover:text-white"
                                        >
                                            <Link href="/">
                                                <Home className="h-5 w-5" />
                                            </Link>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-gray-800 text-white border-gray-700">
                                        Back to Store
                                    </TooltipContent>
                                </Tooltip>


                                {/* Order Notifications (Real-time) */}
                                <OrderNotificationBell />

                                {/* User menu */}
                                <DashboardUserMenu variant="store" />
                            </div>
                        </div>
                    </header>

                    {/* Page content */}
                    <main className="p-4 lg:p-6">
                        {children}
                    </main>
                </div>
            </div>
        </TooltipProvider>
    )
}

// Main layout export that wraps with StoreDashboardProvider and OrderNotificationProvider
export default function StoreDashboardLayout({ children }: { children: ReactNode }) {
    return (
        <StoreDashboardProvider>
            <StoreDashboardLayoutWithNotifications>{children}</StoreDashboardLayoutWithNotifications>
        </StoreDashboardProvider>
    )
}

// Intermediate component to access currentStore from context
function StoreDashboardLayoutWithNotifications({ children }: { children: ReactNode }) {
    const { currentStore } = useStoreDashboard()
    
    return (
        <OrderNotificationProvider storeId={currentStore?.id}>
            <StoreDashboardLayoutInner>{children}</StoreDashboardLayoutInner>
        </OrderNotificationProvider>
    )
}
