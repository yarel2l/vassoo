"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
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
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Heart,
  ShoppingBag,
  LogOut,
  Languages,
  Check,
  Store,
  Shield,
  Truck,
  User,
  LogIn,
  LayoutDashboard,
} from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export default function UserMenu() {
  const [isMounted, setIsMounted] = useState(false)
  const pathname = usePathname()
  const { language, setLanguage } = useLanguage()
  const { user, profile, tenants, isLoading, isPlatformAdmin, signOut } = useAuth()

  // Prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const languages = [
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "es", name: "Español", flag: "🇪🇸" },
  ]

  // Check if user has specific roles
  const hasStoreTenant = tenants.some(t => t.tenant?.type === 'owner_store')
  const hasDeliveryTenant = tenants.some(t => t.tenant?.type === 'delivery_company')

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

  // Don't render anything until mounted (prevents hydration mismatch)
  if (!isMounted) {
    return (
      <Button variant="ghost" className="relative h-8 w-8 rounded-full">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-gray-700">...</AvatarFallback>
        </Avatar>
      </Button>
    )
  }

  // Show loading state briefly
  if (isLoading) {
    return (
      <Button variant="ghost" className="relative h-8 w-8 rounded-full">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-gray-700 animate-pulse">...</AvatarFallback>
        </Avatar>
      </Button>
    )
  }

  // If not logged in, show login button
  if (!user) {
    return (
      <Button asChild variant="ghost" className="gap-2">
        <Link href="/login">
          <LogIn className="h-4 w-4" />
          <span className="hidden sm:inline">Sign In</span>
        </Link>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'User'} />
            <AvatarFallback className="bg-purple-600 text-white text-sm">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {profile?.full_name || 'User'}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Dashboard Access - Only show if user has roles */}
        {(isPlatformAdmin || hasStoreTenant || hasDeliveryTenant) && (
          <>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                <span>Dashboard</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {isPlatformAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/platform" className={cn(
                      "flex items-center font-semibold transition-colors",
                      pathname.startsWith('/dashboard/platform') ? "text-indigo-400 bg-indigo-400/10" : "text-indigo-400 hover:bg-indigo-400/10"
                    )}>
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Platform Control</span>
                    </Link>
                  </DropdownMenuItem>
                )}

                {(hasStoreTenant || isPlatformAdmin) && (
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/store" className={cn(
                      "flex items-center transition-colors",
                      pathname.startsWith('/dashboard/store') ? "text-purple-400 bg-purple-400/10" : "text-purple-500 hover:bg-purple-500/10"
                    )}>
                      <Store className="mr-2 h-4 w-4" />
                      <span>Store Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                )}

                {(hasDeliveryTenant || isPlatformAdmin) && (
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/delivery" className={cn(
                      "flex items-center transition-colors",
                      pathname.startsWith('/dashboard/delivery') ? "text-blue-400 bg-blue-400/10" : "text-blue-500 hover:bg-blue-500/10"
                    )}>
                      <Truck className="mr-2 h-4 w-4" />
                      <span>Delivery Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />
          </>
        )}

        {/* Configuration Section */}
        <DropdownMenuItem asChild>
          <Link href="/account">
            <User className="mr-2 h-4 w-4" />
            <span>My Account</span>
          </Link>
        </DropdownMenuItem>

        {/* Language Selector */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Languages className="mr-2 h-4 w-4" />
            <span>Language</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {languages.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => setLanguage(lang.code as "en" | "es")}
                className="flex items-center justify-between"
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

        <DropdownMenuSeparator />

        {/* Activity Section */}
        <DropdownMenuItem asChild>
          <Link href="/purchases">
            <ShoppingBag className="mr-2 h-4 w-4" />
            <span>Purchase History</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/favorites">
            <Heart className="mr-2 h-4 w-4" />
            <span>Favorites</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Logout Section - Simple click handler */}
        <DropdownMenuItem
          className="text-red-600 focus:text-red-600 cursor-pointer"
          onClick={() => signOut()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
