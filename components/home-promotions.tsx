"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/components/language-provider"
import { Gift, Truck, Percent, ArrowRight, Copy, Check } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"

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

export default function HomePromotions() {
  const { t } = useLanguage()
  const [data, setData] = useState<PromotionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Fetch promotions data
  useEffect(() => {
    async function fetchPromotions() {
      try {
        const response = await fetch('/api/homepage/promotions')
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
        bg: "bg-gradient-to-br from-emerald-500 to-teal-600",
        text: "text-emerald-600",
        border: "border-emerald-200 dark:border-emerald-800"
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

  // Don't render if loading
  if (loading) {
    return (
      <section className="py-16 px-4 bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-950/20 dark:to-teal-950/20">
        <div className="container mx-auto">
          <div className="text-center mb-10">
            <Skeleton className="h-10 w-64 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
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
      </section>
    )
  }

  // Don't render if no promotions
  if (!data || data.promotions.length === 0) {
    return null
  }

  return (
    <section className="py-16 px-4 bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-950/20 dark:to-teal-950/20">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Gift className="h-8 w-8 text-emerald-500" />
            <h2 className="text-3xl md:text-4xl font-bold text-emerald-600 dark:text-emerald-400">
              {t("promotions.title")}
            </h2>
          </div>
          <p className="text-muted-foreground">{t("promotions.subtitle")}</p>
        </div>

        {/* Promotions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {data.promotions.map((promo) => {
            const IconComponent = getPromoIcon(promo.type)
            const colors = getPromoColor(promo.type, promo.isGlobal)

            return (
              <Card
                key={promo.id}
                className={`group cursor-pointer transition-all duration-300 hover:shadow-xl ${colors.border} overflow-hidden`}
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
                        onClick={(e) => {
                          e.preventDefault()
                          handleCopyCode(promo.code)
                        }}
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

        {/* View All Link */}
        {data.hasMore && (
          <div className="text-center mt-8">
            <Link href="/promotions">
              <Button variant="outline" className="border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white">
                {t("promotions.viewAll")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
