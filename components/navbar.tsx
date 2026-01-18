"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, Grid3X3, Zap, Gift, Shuffle, Heart } from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import { useLanguage } from "@/components/language-provider"
import UserMenu from "@/components/user-menu"
import SmartSearch from "@/components/smart-search"
import Link from "next/link"

export default function Navbar() {
  const { totalItems } = useCart()
  const { t } = useLanguage()
  const [isScrolled, setIsScrolled] = useState(false)

  // Handle scroll for navigation animation
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      setIsScrolled(scrollPosition > 100)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navigationItems = [
    {
      name: "Categories",
      icon: Grid3X3,
      href: "/categories",
    },
    {
      name: "Flash Sales",
      icon: Zap,
      href: "/flash-sales",
    },
    {
      name: "Promotions",
      icon: Gift,
      href: "/promotions",
    },
    {
      name: "Mix and Match",
      icon: Shuffle,
      href: "/mix-and-match",
    },
    {
      name: "Favorites",
      icon: Heart,
      href: "/favorites",
    },
  ]

  // Glass icon component
  const GlassIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 32" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4 L20 4 L18 28 L6 28 Z" stroke="currentColor" strokeWidth="1.5" fill="transparent" />
      <rect x="4" y="20" width="14" height="8" fill="currentColor" opacity="0.6" />
      <line x1="6" y1="28" x2="18" y2="28" stroke="currentColor" strokeWidth="2" />
    </svg>
  )

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        {/* Desktop Layout */}
        <div className="hidden md:block">
          {/* Main Row: Logo | Search Bar | Actions */}
          <div className="flex h-16 items-center justify-between">
            {/* Logo - Left Side */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Link href="/" className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                  <GlassIcon className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-xl">Vassoo</span>
              </Link>
            </div>

            {/* Smart Search Bar - Center */}
            <div className="flex-1 max-w-2xl mx-8">
              <SmartSearch placeholder={t("search.placeholder")} />
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-4 flex-shrink-0">
              {/* Cart */}
              <Link href="/cart">
                <Button variant="ghost" size="icon" className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {totalItems > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                      {totalItems}
                    </Badge>
                  )}
                </Button>
              </Link>

              {/* User Menu */}
              <UserMenu />
            </div>
          </div>

          {/* Navigation Menu Row */}
          <div className="pb-3 pt-2">
            <div className="flex justify-center">
              <div className="flex items-center space-x-8">
                {navigationItems.map((item) => {
                  const IconComponent = item.icon
                  return (
                    <Link key={item.name} href={item.href}>
                      <Button
                        variant="ghost"
                        className={`flex flex-col items-center space-y-1 h-auto py-2 px-4 text-muted-foreground hover:text-orange-500 hover:bg-muted/50 transition-all duration-300 group ${
                          isScrolled ? "px-2" : ""
                        }`}
                      >
                        <IconComponent className="h-5 w-5" />
                        <span
                          className={`text-xs font-medium transition-all duration-300 ${
                            isScrolled ? "opacity-0 max-h-0 overflow-hidden" : "opacity-100 max-h-6"
                          }`}
                        >
                          {item.name}
                        </span>
                      </Button>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden">
          {/* First Row: Logo + Search */}
          <div className="flex h-14 items-center space-x-3">
            {/* Logo - Left Side (no text) */}
            <Link href="/" className="flex-shrink-0">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                <GlassIcon className="w-5 h-5 text-primary-foreground" />
              </div>
            </Link>

            {/* Smart Search Bar - Takes remaining space */}
            <div className="flex-1">
              <SmartSearch placeholder={t("search.placeholder")} />
            </div>

            {/* Cart Icon */}
            <Link href="/cart" className="flex-shrink-0">
              <Button variant="ghost" size="icon" className="relative h-9 w-9">
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-[10px]">
                    {totalItems}
                  </Badge>
                )}
              </Button>
            </Link>
          </div>

          {/* Second Row: Navigation Icons Only */}
          <div className="pb-3 pt-2">
            <div className="flex justify-center">
              <div className="flex items-center space-x-6">
                {navigationItems.map((item) => {
                  const IconComponent = item.icon
                  return (
                    <Link key={item.name} href={item.href}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full text-muted-foreground hover:text-orange-500 hover:bg-muted/50 transition-colors"
                      >
                        <IconComponent className="h-5 w-5" />
                      </Button>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
