"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/components/language-provider"
import { Shuffle, ArrowRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState, useEffect } from "react"

interface MixMatchDeal {
  id: string
  title: string
  description: string
  discount: number
  discountType: 'percentage' | 'fixed'
  minItems: number
  maxItems: number
  storeId: string
  storeName: string
  category: string | null
  products: Array<{
    id: string
    name: string
    price: number
    image: string
  }>
}

interface MixMatchData {
  deals: MixMatchDeal[]
  hasMore: boolean
  count: number
}

// Color schemes for different deal categories
const dealColors: Record<string, { gradient: string; bg: string; border: string }> = {
  wine: {
    gradient: "from-red-500 to-rose-600",
    bg: "bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30",
    border: "border-red-200 dark:border-red-800"
  },
  spirits: {
    gradient: "from-amber-500 to-orange-600",
    bg: "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30",
    border: "border-amber-200 dark:border-amber-800"
  },
  beer: {
    gradient: "from-yellow-500 to-amber-600",
    bg: "bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30",
    border: "border-yellow-200 dark:border-yellow-800"
  },
  default: {
    gradient: "from-purple-500 to-pink-600",
    bg: "bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30",
    border: "border-purple-200 dark:border-purple-800"
  }
}

function getDealColor(category: string | null) {
  if (!category) return dealColors.default
  const lowerCategory = category.toLowerCase()
  if (lowerCategory.includes('wine')) return dealColors.wine
  if (lowerCategory.includes('spirit') || lowerCategory.includes('liquor')) return dealColors.spirits
  if (lowerCategory.includes('beer')) return dealColors.beer
  return dealColors.default
}

export default function HomeMixMatch() {
  const { t } = useLanguage()
  const [data, setData] = useState<MixMatchData | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch mix & match data
  useEffect(() => {
    async function fetchMixMatch() {
      try {
        const response = await fetch('/api/homepage/mix-match')
        const result = await response.json()
        setData(result)
      } catch (error) {
        console.error('Error fetching mix & match deals:', error)
        setData({ deals: [], hasMore: false, count: 0 })
      } finally {
        setLoading(false)
      }
    }

    fetchMixMatch()
  }, [])

  // Don't render if loading
  if (loading) {
    return (
      <section className="py-16 px-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
        <div className="container mx-auto">
          <div className="text-center mb-10">
            <Skeleton className="h-10 w-64 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-0">
                  <Skeleton className="h-24 w-full" />
                  <div className="p-4">
                    <Skeleton className="h-16 w-full mb-4" />
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

  // Don't render if no deals
  if (!data || data.deals.length === 0) {
    return null
  }

  return (
    <section className="py-16 px-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Shuffle className="h-8 w-8 text-purple-500" />
            <h2 className="text-3xl md:text-4xl font-bold text-purple-600 dark:text-purple-400">
              {t("mixMatch.title")}
            </h2>
          </div>
          <p className="text-muted-foreground">{t("mixMatch.subtitle")}</p>
        </div>

        {/* Deals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data.deals.map((deal) => {
            const colors = getDealColor(deal.category)

            return (
              <Card
                key={deal.id}
                className={`group cursor-pointer transition-all duration-300 hover:shadow-xl ${colors.border} overflow-hidden`}
              >
                <CardContent className="p-0">
                  {/* Header with gradient */}
                  <div className={`bg-gradient-to-r ${colors.gradient} p-4`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                          <Shuffle className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-white">{deal.title}</h3>
                          <p className="text-sm text-white/80 line-clamp-1">{deal.description}</p>
                        </div>
                      </div>
                      <Badge className="bg-white text-gray-900 hover:bg-white/90">
                        {deal.discountType === 'percentage' ? `-${deal.discount}%` : `-$${deal.discount}`}
                      </Badge>
                    </div>
                  </div>

                  {/* Product Preview */}
                  <div className={`${colors.bg} p-4`}>
                    <div className="flex items-center justify-center space-x-2 mb-4">
                      {deal.products.slice(0, 3).map((product, idx) => (
                        <div key={product.id} className="relative">
                          <Image
                            src={product.image}
                            alt={product.name}
                            width={60}
                            height={60}
                            className="rounded-lg border-2 border-white shadow-md object-cover"
                          />
                          {idx < Math.min(deal.products.length, 3) - 1 && (
                            <span className="absolute -right-2 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground">
                              +
                            </span>
                          )}
                        </div>
                      ))}
                      {deal.products.length > 3 && (
                        <span className="text-xl font-bold text-muted-foreground ml-2">...</span>
                      )}
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">
                        {deal.storeName}
                      </p>
                      <p className="text-sm text-muted-foreground mb-3">
                        Select {deal.minItems}{deal.maxItems > deal.minItems ? `-${deal.maxItems}` : ''} items to unlock
                      </p>
                      <Link href="/mix-and-match">
                        <Button className={`w-full bg-gradient-to-r ${colors.gradient} hover:opacity-90 text-white`}>
                          Start Building
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
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
            <Link href="/mix-and-match">
              <Button variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white">
                {t("mixMatch.viewAll")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
