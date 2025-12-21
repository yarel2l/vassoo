"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, ShoppingCart, Mic, Camera, Grid3X3, Zap, Gift, Shuffle, Heart } from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import { useLanguage } from "@/components/language-provider"
import { useDeviceCapabilities } from "@/hooks/use-device-capabilities"
import UserMenu from "@/components/user-menu"
import VoiceSearch from "@/components/voice-search"
import ImageSearch from "@/components/image-search"
import Link from "next/link"

export default function Navbar() {
  const { totalItems } = useCart()
  const { t } = useLanguage()
  const { hasVoiceRecognition, hasCamera } = useDeviceCapabilities()
  const [searchQuery, setSearchQuery] = useState("")
  const [showVoiceSearch, setShowVoiceSearch] = useState(false)
  const [showImageSearch, setShowImageSearch] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      console.log("Searching for:", searchQuery)
      // Implement search functionality
    }
  }

  const handleVoiceResult = (transcript: string) => {
    setSearchQuery(transcript)
    setShowVoiceSearch(false)
  }

  const handleImageResult = (description: string) => {
    setSearchQuery(description)
    setShowImageSearch(false)
  }

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
    <>
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

              {/* Search Bar - Center */}
              <div className="flex flex-1 max-w-2xl mx-8">
                <form onSubmit={handleSearch} className="relative w-full">
                  <div className="relative flex items-center">
                    <Search className="absolute left-4 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder={t("search.placeholder")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 pr-24 h-11 text-base rounded-full border-2 border-muted focus:border-primary transition-colors w-full"
                    />
                    <div className="absolute right-3 flex items-center gap-2">
                      {hasVoiceRecognition && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full hover:bg-muted/80"
                          onClick={() => setShowVoiceSearch(true)}
                        >
                          <Mic className="h-4 w-4 text-muted-foreground hover:text-primary" />
                        </Button>
                      )}
                      {hasCamera && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full hover:bg-muted/80"
                          onClick={() => setShowImageSearch(true)}
                        >
                          <Camera className="h-4 w-4 text-muted-foreground hover:text-primary" />
                        </Button>
                      )}
                    </div>
                  </div>
                </form>
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

              {/* Search Bar - Takes remaining space */}
              <div className="flex-1">
                <form onSubmit={handleSearch} className="relative">
                  <div className="relative flex items-center">
                    <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder={t("search.placeholder")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-20 h-9 text-sm rounded-full border-2 border-muted focus:border-primary transition-colors"
                    />
                    <div className="absolute right-2 flex items-center gap-1">
                      {hasVoiceRecognition && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full"
                          onClick={() => setShowVoiceSearch(true)}
                        >
                          <Mic className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      )}
                      {hasCamera && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full"
                          onClick={() => setShowImageSearch(true)}
                        >
                          <Camera className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  </div>
                </form>
              </div>
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

      {/* Voice Search Modal */}
      {showVoiceSearch && <VoiceSearch onResult={handleVoiceResult} onClose={() => setShowVoiceSearch(false)} />}

      {/* Image Search Modal */}
      {showImageSearch && <ImageSearch onResult={handleImageResult} onClose={() => setShowImageSearch(false)} />}
    </>
  )
}
