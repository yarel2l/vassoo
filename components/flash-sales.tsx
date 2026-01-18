"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/components/language-provider"
import { Clock, Flame, ShoppingCart, ArrowRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState, useEffect } from "react"

interface FlashSaleProduct {
  id: string
  productId: string
  name: string
  image: string
  originalPrice: number
  salePrice: number
  discount: number
  stock: number
  storeId: string
  storeName: string
  endDate: string
}

interface FlashSalesData {
  products: FlashSaleProduct[]
  hasMore: boolean
  timeRemaining: number
  count: number
}

export default function FlashSales() {
  const { t } = useLanguage()
  const [data, setData] = useState<FlashSalesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  // Fetch flash sales data
  useEffect(() => {
    async function fetchFlashSales() {
      try {
        const response = await fetch('/api/homepage/flash-sales')
        const result = await response.json()
        setData(result)

        // Initialize countdown from API
        if (result.timeRemaining > 0) {
          const hours = Math.floor(result.timeRemaining / 3600)
          const minutes = Math.floor((result.timeRemaining % 3600) / 60)
          const seconds = result.timeRemaining % 60
          setTimeLeft({ hours, minutes, seconds })
        }
      } catch (error) {
        console.error('Error fetching flash sales:', error)
        setData({ products: [], hasMore: false, timeRemaining: 0, count: 0 })
      } finally {
        setLoading(false)
      }
    }

    fetchFlashSales()
  }, [])

  // Countdown timer
  useEffect(() => {
    if (!data || data.products.length === 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 }
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 }
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 }
        }
        return prev
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [data])

  // Don't render if loading
  if (loading) {
    return (
      <section className="py-16 px-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20">
        <div className="container mx-auto">
          <div className="text-center mb-8">
            <Skeleton className="h-10 w-64 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-red-200 dark:border-red-800">
                <CardContent className="p-4">
                  <Skeleton className="w-full h-40 rounded-lg mb-4" />
                  <Skeleton className="h-6 w-full mb-2" />
                  <Skeleton className="h-8 w-24 mb-3" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    )
  }

  // Don't render if no products
  if (!data || data.products.length === 0) {
    return null
  }

  return (
    <section className="py-16 px-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Flame className="h-8 w-8 text-red-500" />
            <h2 className="text-3xl md:text-4xl font-bold text-red-600 dark:text-red-400">{t("flash.title")}</h2>
            <Flame className="h-8 w-8 text-red-500" />
          </div>
          <p className="text-muted-foreground mb-6">{t("flash.subtitle")}</p>

          {/* Countdown Timer */}
          <div className="flex items-center justify-center space-x-4 mb-8">
            <Clock className="h-5 w-5 text-red-500" />
            <div className="flex space-x-2">
              <div className="bg-red-600 text-white px-3 py-2 rounded-lg font-bold">
                {String(timeLeft.hours).padStart(2, "0")}
              </div>
              <span className="text-2xl font-bold text-red-600">:</span>
              <div className="bg-red-600 text-white px-3 py-2 rounded-lg font-bold">
                {String(timeLeft.minutes).padStart(2, "0")}
              </div>
              <span className="text-2xl font-bold text-red-600">:</span>
              <div className="bg-red-600 text-white px-3 py-2 rounded-lg font-bold">
                {String(timeLeft.seconds).padStart(2, "0")}
              </div>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {data.products.map((product) => (
            <Link key={product.id} href={`/product/${product.productId}`}>
              <Card className="group cursor-pointer transition-all duration-300 hover:shadow-xl border-red-200 dark:border-red-800">
                <CardContent className="p-4">
                  <div className="relative mb-4">
                    <Image
                      src={product.image}
                      alt={product.name}
                      width={200}
                      height={200}
                      className="w-full h-40 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                    />
                    <Badge className="absolute top-2 left-2 bg-red-600 hover:bg-red-700">-{product.discount}%</Badge>
                    <Badge variant="secondary" className="absolute top-2 right-2">
                      {product.stock} {t("flash.left")}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg line-clamp-1">{product.name}</h3>
                    <p className="text-xs text-muted-foreground">{product.storeName}</p>

                    <div className="flex items-center space-x-2">
                      <span className="text-2xl font-bold text-red-600">${product.salePrice.toFixed(2)}</span>
                      <span className="text-lg text-muted-foreground line-through">${product.originalPrice.toFixed(2)}</span>
                    </div>

                    <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      {t("flash.buyNow")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* View All Link */}
        {data.hasMore && (
          <div className="text-center mt-8">
            <Link href="/flash-sales">
              <Button variant="outline" className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white">
                {t("flash.viewAll")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
