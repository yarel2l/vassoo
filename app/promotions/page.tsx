"use client"

import { useState, useEffect } from "react"
import { Gift, Percent, Truck, ArrowLeft, Copy, Check } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/components/language-provider"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import Link from "next/link"

interface ActivePromotion {
  id: string
  code: string
  title: string
  description: string
  type: 'percentage' | 'fixed' | 'free_shipping'
  value: number
  minOrder: number | null
  storeId: string | null
  storeName: string | null
  endDate: string | null
  isGlobal: boolean
}

interface PromotionsData {
  promotions: ActivePromotion[]
  hasMore: boolean
  count: number
}

export default function PromotionsPage() {
  const { t } = useLanguage()
  const [data, setData] = useState<PromotionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Fetch promotions data
  useEffect(() => {
    async function fetchPromotions() {
      try {
        const response = await fetch('/api/homepage/promotions?limit=50')
        const result = await response.json()
        setData(result)
      } catch (error) {
        console.error('Error fetching promotions:', error)
        setData({ promotions: [], hasMore: false, count: 0 })
      } finally {
        setLoading(false)
      }
    }

    fetchPromotions()
  }, [])

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const getPromoIcon = (type: string) => {
    switch (type) {
      case 'free_shipping':
        return Truck
      case 'percentage':
      case 'fixed':
      default:
        return Percent
    }
  }

  const getPromoColor = (type: string, isGlobal: boolean) => {
    if (isGlobal) {
      return {
        bg: "bg-gradient-to-br from-orange-500 to-amber-600",
        text: "text-orange-600",
        border: "border-orange-200 dark:border-orange-800"
      }
    }
    switch (type) {
      case 'free_shipping':
        return {
          bg: "bg-gradient-to-br from-blue-500 to-indigo-600",
          text: "text-blue-600",
          border: "border-blue-200 dark:border-blue-800"
        }
      case 'percentage':
        return {
          bg: "bg-gradient-to-br from-purple-500 to-pink-600",
          text: "text-purple-600",
          border: "border-purple-200 dark:border-purple-800"
        }
      case 'fixed':
      default:
        return {
          bg: "bg-gradient-to-br from-amber-500 to-orange-600",
          text: "text-amber-600",
          border: "border-amber-200 dark:border-amber-800"
        }
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1">
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
            <div className="container mx-auto px-4 py-12">
              <Skeleton className="h-10 w-64 bg-white/20 mb-4" />
              <Skeleton className="h-6 w-96 bg-white/20" />
            </div>
          </div>
          <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Card key={i}>
                  <CardContent className="p-0">
                    <Skeleton className="h-20 w-full" />
                    <div className="p-4">
                      <Skeleton className="h-6 w-24 mb-2" />
                      <Skeleton className="h-4 w-full mb-3" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // No promotions available
  if (!data || data.promotions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1">
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
            <div className="container mx-auto px-4 py-12">
              <div className="flex items-center space-x-3 mb-4">
                <Gift className="h-8 w-8" />
                <h1 className="text-3xl font-bold">{t("promotions.title")}</h1>
              </div>
              <p className="text-orange-100 text-lg">{t("promotions.subtitle")}</p>
            </div>
          </div>
          <div className="container mx-auto px-4 py-16 text-center">
            <Gift className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No Promotions Available</h2>
            <p className="text-muted-foreground mb-6">
              Check back soon for exciting promotions and coupon codes!
            </p>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
          <div className="container mx-auto px-4 py-12">
            <div className="flex items-center space-x-3 mb-4">
              <Gift className="h-8 w-8" />
              <h1 className="text-3xl font-bold">{t("promotions.title")}</h1>
            </div>
            <p className="text-orange-100 text-lg">{t("promotions.subtitle")}</p>
          </div>
        </div>

        {/* Promotions Grid */}
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <p className="text-muted-foreground">
              {data.count} {data.count === 1 ? 'promotion' : 'promotions'} available
            </p>
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {data.promotions.map((promo) => {
              const IconComponent = getPromoIcon(promo.type)
              const colors = getPromoColor(promo.type, promo.isGlobal)

              return (
                <Card
                  key={promo.id}
                  className={`group transition-all duration-300 hover:shadow-xl ${colors.border} overflow-hidden`}
                >
                  <CardContent className="p-0">
                    {/* Icon Header */}
                    <div className={`${colors.bg} p-4 flex items-center justify-between`}>
                      <IconComponent className="h-10 w-10 text-white" />
                      {promo.isGlobal && (
                        <Badge className="bg-white/20 text-white hover:bg-white/30">
                          Platform-wide
                        </Badge>
                      )}
                    </div>

                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className={`font-bold text-lg ${colors.text}`}>{promo.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{promo.description}</p>
                      </div>

                      {promo.storeName && (
                        <p className="text-xs text-muted-foreground">
                          At: {promo.storeName}
                        </p>
                      )}

                      {promo.endDate && (
                        <p className="text-xs text-muted-foreground">
                          Expires: {new Date(promo.endDate).toLocaleDateString()}
                        </p>
                      )}

                      {/* Coupon Code */}
                      <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
                        <code className="font-mono font-bold text-sm">{promo.code}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleCopyCode(promo.code)}
                        >
                          {copiedCode === promo.code ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* How to use section */}
          <Card className="mt-12 bg-gradient-to-r from-orange-500 to-amber-500 text-white">
            <CardContent className="p-8 text-center">
              <Gift className="h-12 w-12 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">How to Use Promo Codes</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <div className="text-center">
                  <div className="text-3xl mb-2">1</div>
                  <h3 className="font-semibold mb-2">Copy the Code</h3>
                  <p className="text-orange-100 text-sm">Click the copy button next to your desired promotion</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">2</div>
                  <h3 className="font-semibold mb-2">Shop & Add to Cart</h3>
                  <p className="text-orange-100 text-sm">Browse products and add your favorites to the cart</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">3</div>
                  <h3 className="font-semibold mb-2">Apply at Checkout</h3>
                  <p className="text-orange-100 text-sm">Paste the code in the promo field to get your discount</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}
