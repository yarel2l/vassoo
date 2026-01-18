'use client'

import { ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
    Truck,
    MapPin,
    Menu,
    X,
    Bell,
    ChevronDown,
    LogOut,
    User,
    Store,
    PanelLeftClose,
    PanelLeft,
    Sun,
    Moon,
    Home,
    Globe,
    ShieldCheck,
    Coins,
    Percent,
    Tag,
    FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { VassooLogo, VassooLogoIcon } from '@/components/vassoo-logo'
import { useTheme } from 'next-themes'
import { DashboardSwitcher } from '@/components/dashboard-switcher'
import { DashboardUserMenu } from '@/components/dashboard-user-menu'
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

interface NavItem {
    title: string
    href: string
    icon: ReactNode
    iconComponent: any
    badge?: number
    category?: string
}

const navItems: NavItem[] = [
    {
        title: 'Platform Overview',
        href: '/dashboard/platform',
        icon: <LayoutDashboard className="h-5 w-5" />,
        iconComponent: LayoutDashboard,
    },
    {
        title: 'User Management',
        href: '/dashboard/platform/users',
        icon: <Users className="h-5 w-5" />,
        iconComponent: Users,
    },
    {
        title: 'Stores Management',
        href: '/dashboard/platform/stores',
        icon: <Store className="h-5 w-5" />,
        iconComponent: Store,
    },
    {
        title: 'Delivery Partners',
        href: '/dashboard/platform/delivery',
        icon: <Truck className="h-5 w-5" />,
        iconComponent: Truck,
    },
    {
        title: 'Product Catalog',
        href: '/dashboard/platform/catalog',
        icon: <Package className="h-5 w-5" />,
        iconComponent: Package,
    },
    {
        title: 'Categories & Brands',
        href: '/dashboard/platform/taxonomy',
        icon: <Tag className="h-5 w-5" />,
        iconComponent: Tag,
    },
    {
        title: 'US Jurisdictions',
        href: '/dashboard/platform/jurisdictions',
        icon: <MapPin className="h-5 w-5" />,
        iconComponent: MapPin,
    },
    {
        title: 'Tax Rates',
        href: '/dashboard/platform/taxes',
        icon: <Percent className="h-5 w-5" />,
        iconComponent: Percent,
    },
    {
        title: 'Platform Fees',
        href: '/dashboard/platform/fees',
        icon: <Coins className="h-5 w-5" />,
        iconComponent: Coins,
    },
    {
        title: 'Analytics',
        href: '/dashboard/platform/analytics',
        icon: <BarChart3 className="h-5 w-5" />,
        iconComponent: BarChart3,
    },
    {
        title: 'Content Management',
        href: '/dashboard/platform/content',
        icon: <FileText className="h-5 w-5" />,
        iconComponent: FileText,
    },
    {
        title: 'System Settings',
        href: '/dashboard/platform/settings',
        icon: <Settings className="h-5 w-5" />,
        iconComponent: Settings,
    },
]

export default function PlatformDashboardLayout({ children }: { children: ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const pathname = usePathname()
    const { user, profile, signOut } = useAuth()
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const saved = localStorage.getItem('platform-sidebar-collapsed')
        if (saved) setSidebarCollapsed(saved === 'true')
    }, [])

    const toggleCollapsed = () => {
        const newValue = !sidebarCollapsed
        setSidebarCollapsed(newValue)
        localStorage.setItem('platform-sidebar-collapsed', String(newValue))
    }

    return (
        <TooltipProvider delayDuration={0}>
            <div className="min-h-screen bg-neutral-950">
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
                        'fixed inset-y-0 left-0 z-50 bg-neutral-900 border-r border-neutral-800 transform transition-all duration-200 lg:translate-x-0 flex flex-col',
                        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
                        sidebarCollapsed ? 'w-20' : 'w-72'
                    )}
                >
                    {/* Logo */}
                    <div className="flex items-center justify-between h-16 px-4 border-b border-neutral-800">
                        <Link href="/dashboard/platform" className="flex items-center gap-3">
                            {sidebarCollapsed ? (
                                <VassooLogoIcon size="md" />
                            ) : (
                                <VassooLogo size="md" />
                            )}
                        </Link>
                        <button
                            className="lg:hidden p-2 text-neutral-400 hover:text-white"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Global Navigation Switcher */}
                    <DashboardSwitcher isCollapsed={sidebarCollapsed} />

                    {/* Navigation - pushed to top */}
                    <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href ||
                                (item.href !== '/dashboard/platform' && pathname.startsWith(item.href))
                            const Icon = item.iconComponent

                            const navLink = (
                                <Link
                                    href={item.href}
                                    className={cn(
                                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                                        isActive
                                            ? 'bg-indigo-500/20 text-indigo-400'
                                            : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50',
                                        sidebarCollapsed && 'justify-center px-2'
                                    )}
                                >
                                    <Icon className="h-5 w-5 flex-shrink-0" />
                                    {!sidebarCollapsed && (
                                        <span className="flex-1 text-sm font-medium">{item.title}</span>
                                    )}
                                </Link>
                            )

                            if (sidebarCollapsed) {
                                return (
                                    <Tooltip key={item.href}>
                                        <TooltipTrigger asChild>
                                            <div className="relative">{navLink}</div>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="bg-neutral-800 text-white border-neutral-700">
                                            {item.title}
                                        </TooltipContent>
                                    </Tooltip>
                                )
                            }

                            return <div key={item.href}>{navLink}</div>
                        })}
                    </nav>

                    {/* Collapse toggle - moved to the bottom */}
                    <div className="hidden lg:block p-3 border-t border-neutral-800">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={toggleCollapsed}
                                        className={cn(
                                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/50 transition-colors',
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
                                    <TooltipContent side="right" className="bg-neutral-800 text-white border-neutral-700">
                                        Expand sidebar
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </aside>

                {/* Main content */}
                <div className={cn(
                    'transition-all duration-200',
                    sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'
                )}>
                    {/* Top navbar */}
                    <header className="sticky top-0 z-30 h-16 bg-neutral-900/95 backdrop-blur border-b border-neutral-800 px-4 lg:px-6">
                        <div className="flex items-center justify-between h-full">
                            <button
                                className="lg:hidden p-2 text-neutral-400 hover:text-white"
                                onClick={() => setSidebarOpen(true)}
                            >
                                <Menu className="h-6 w-6" />
                            </button>

                            <div className="flex-1 lg:ml-0 overflow-hidden">
                                <Breadcrumb>
                                    <BreadcrumbList>
                                        <BreadcrumbItem className="hidden md:inline-flex">
                                            <BreadcrumbLink href="/dashboard/platform" className="text-neutral-500 hover:text-white transition-colors">
                                                Platform
                                            </BreadcrumbLink>
                                        </BreadcrumbItem>

                                        {pathname !== '/dashboard/platform' && (
                                            <>
                                                <BreadcrumbSeparator className="hidden md:block text-neutral-700" />
                                                <BreadcrumbItem>
                                                    <BreadcrumbPage className="text-white font-medium truncate max-w-[150px] md:max-w-none">
                                                        {navItems.find(item => pathname.startsWith(item.href) && item.href !== '/dashboard/platform')?.title ||
                                                            pathname.split('/').pop()?.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                                    </BreadcrumbPage>
                                                </BreadcrumbItem>
                                            </>
                                        )}

                                        {pathname === '/dashboard/platform' && (
                                            <>
                                                <BreadcrumbSeparator className="hidden md:block text-neutral-700" />
                                                <BreadcrumbItem>
                                                    <BreadcrumbPage className="text-white font-medium">Overview</BreadcrumbPage>
                                                </BreadcrumbItem>
                                            </>
                                        )}
                                    </BreadcrumbList>
                                </Breadcrumb>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Back to Marketplace */}
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            asChild
                                            className="text-neutral-400 hover:text-white"
                                        >
                                            <Link href="/">
                                                <Home className="h-5 w-5" />
                                            </Link>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-neutral-800 text-white border-neutral-700">
                                        Marketplace
                                    </TooltipContent>
                                </Tooltip>


                                {/* User menu */}
                                <DashboardUserMenu variant="platform" />
                            </div>
                        </div>
                    </header>

                    {/* Page content */}
                    <main className="p-4 lg:p-6 min-h-[calc(100-4rem)] bg-neutral-950">
                        {children}
                    </main>
                </div>
            </div>
        </TooltipProvider>
    )
}
