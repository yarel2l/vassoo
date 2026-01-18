"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    LogOut,
    User,
    ChevronDown,
    ShieldCheck,
    Store,
    Truck,
    LayoutDashboard,
    Languages,
    Check,
    ShoppingBag,
    Heart,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useLanguage } from '@/components/language-provider'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface DashboardUserMenuProps {
    variant?: 'platform' | 'store' | 'delivery'
}

export function DashboardUserMenu({ variant = 'store' }: DashboardUserMenuProps) {
    const { user, profile, tenants, isPlatformAdmin, signOut } = useAuth()
    const { language, setLanguage } = useLanguage()
    const pathname = usePathname()

    const languages = [
        { code: "en", name: "English", flag: "🇺🇸" },
        { code: "es", name: "Español", flag: "🇪🇸" },
    ]

    // Get user initials
    const getInitials = () => {
        if (profile?.full_name) {
            return profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        }
        if (user?.email) {
            return user.email[0].toUpperCase()
        }
        return 'U'
    }

    // Check if user has specific roles
    const hasStoreTenant = tenants.some(t => t.tenant?.type === 'owner_store')
    const hasDeliveryTenant = tenants.some(t => t.tenant?.type === 'delivery_company')

    // Color schemes based on variant
    const colors = {
        platform: {
            avatar: 'ring-indigo-500/20',
            fallback: 'bg-indigo-600',
            menu: 'bg-neutral-900 border-neutral-800',
            separator: 'bg-neutral-800',
            item: 'focus:bg-neutral-800',
            subMenu: 'bg-neutral-900 border-neutral-800',
        },
        store: {
            avatar: 'border-orange-500/20',
            fallback: 'bg-orange-500',
            menu: 'bg-gray-900 border-gray-800',
            separator: 'bg-gray-800',
            item: 'focus:bg-gray-800',
            subMenu: 'bg-gray-900 border-gray-800',
        },
        delivery: {
            avatar: 'border-blue-500',
            fallback: 'bg-blue-600',
            menu: 'bg-gray-900 border-gray-800',
            separator: 'bg-gray-800',
            item: 'focus:bg-gray-800',
            subMenu: 'bg-gray-900 border-gray-800',
        },
    }

    const colorScheme = colors[variant]

    if (!user) {
        return null
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 text-gray-400 hover:text-white px-2">
                    <Avatar className={cn("h-8 w-8 border-2", colorScheme.avatar)}>
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback className={cn("text-white text-sm", colorScheme.fallback)}>
                            {getInitials()}
                        </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm font-medium text-gray-300">
                        {profile?.full_name || user?.email?.split('@')[0]}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={cn("w-56", colorScheme.menu)}>
                <DropdownMenuLabel className="text-gray-400">
                    <div className="flex flex-col">
                        <span className="text-white">{profile?.full_name || 'User'}</span>
                        <span className="text-xs font-normal text-gray-500">{user?.email}</span>
                        {isPlatformAdmin && variant === 'platform' && (
                            <span className="text-xs font-medium text-indigo-400 mt-0.5">System Admin</span>
                        )}
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className={colorScheme.separator} />

                {/* Dashboard Submenu */}
                {(isPlatformAdmin || hasStoreTenant || hasDeliveryTenant) && (
                    <>
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger className={cn("text-white", colorScheme.item)}>
                                <LayoutDashboard className="mr-2 h-4 w-4" />
                                <span>Dashboard</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className={colorScheme.subMenu}>
                                {isPlatformAdmin && (
                                    <DropdownMenuItem asChild className={colorScheme.item}>
                                        <Link href="/dashboard/platform" className={cn(
                                            "flex items-center w-full font-semibold transition-colors",
                                            pathname.startsWith('/dashboard/platform') ? "text-indigo-400 bg-indigo-400/10" : "text-indigo-400 hover:bg-indigo-400/10"
                                        )}>
                                            <ShieldCheck className="mr-2 h-4 w-4" />
                                            Platform Control
                                        </Link>
                                    </DropdownMenuItem>
                                )}

                                {(hasStoreTenant || isPlatformAdmin) && (
                                    <DropdownMenuItem asChild className={colorScheme.item}>
                                        <Link href="/dashboard/store" className={cn(
                                            "flex items-center w-full transition-colors",
                                            pathname.startsWith('/dashboard/store') ? "text-purple-400 bg-purple-400/10" : "text-purple-500 hover:bg-purple-500/10"
                                        )}>
                                            <Store className="mr-2 h-4 w-4" />
                                            Store Dashboard
                                        </Link>
                                    </DropdownMenuItem>
                                )}

                                {(hasDeliveryTenant || isPlatformAdmin) && (
                                    <DropdownMenuItem asChild className={colorScheme.item}>
                                        <Link href="/dashboard/delivery" className={cn(
                                            "flex items-center w-full transition-colors",
                                            pathname.startsWith('/dashboard/delivery') ? "text-blue-400 bg-blue-400/10" : "text-blue-500 hover:bg-blue-500/10"
                                        )}>
                                            <Truck className="mr-2 h-4 w-4" />
                                            Delivery Dashboard
                                        </Link>
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator className={colorScheme.separator} />
                    </>
                )}

                {/* My Account */}
                <DropdownMenuItem asChild className={cn("text-white", colorScheme.item)}>
                    <Link href="/account" className="flex items-center w-full">
                        <User className="mr-2 h-4 w-4" />
                        My Account
                    </Link>
                </DropdownMenuItem>

                {/* Language Selector */}
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger className={cn("text-white", colorScheme.item)}>
                        <Languages className="mr-2 h-4 w-4" />
                        <span>Language</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className={colorScheme.subMenu}>
                        {languages.map((lang) => (
                            <DropdownMenuItem
                                key={lang.code}
                                onClick={() => setLanguage(lang.code as "en" | "es")}
                                className={cn("flex items-center justify-between text-white", colorScheme.item)}
                            >
                                <div className="flex items-center">
                                    <span className="mr-2">{lang.flag}</span>
                                    <span>{lang.name}</span>
                                </div>
                                {language === lang.code && <Check className="h-4 w-4" />}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator className={colorScheme.separator} />

                {/* Activity Section */}
                <DropdownMenuItem asChild className={cn("text-white", colorScheme.item)}>
                    <Link href="/purchases" className="flex items-center w-full">
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        Purchase History
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className={cn("text-white", colorScheme.item)}>
                    <Link href="/favorites" className="flex items-center w-full">
                        <Heart className="mr-2 h-4 w-4" />
                        Favorites
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator className={colorScheme.separator} />

                {/* Logout */}
                <DropdownMenuItem
                    className={cn("text-red-400 cursor-pointer", colorScheme.item)}
                    onClick={() => signOut()}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
