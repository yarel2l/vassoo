"use client"

import { useState, useEffect } from "react"
import { Clock, Flame, ShoppingCart, ArrowLeft } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useCart } from "@/contexts/cart-context"
import { useLanguage } from "@/components/language-provider"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import Image from "next/image"
import Link from "next/link"

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
  // Location info for fulfillment
  inventoryId: string
  locationId: string | null
  locationName: string | null
}

interface FlashSalesData {
  products: FlashSaleProduct[]
  hasMore: boolean
  timeRemaining: number
  count: number
}

export default function FlashSalesPage() {
  const { t } = useLanguage()
  const { addToCart } = useCart()
  const [data, setData] = useState<FlashSalesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  // Fetch flash sales data with all products
  useEffect(() => {
    async function fetchFlashSales() {
      try {
        const response = await fetch('/api/homepage/flash-sales?limit=50')
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

  const handleAddToCart = (product: FlashSaleProduct) => {
    addToCart({
      productId: product.productId,
      productName: product.name,
      productImage: product.image,
      storeId: product.storeId,
      storeName: product.storeName,
      price: product.salePrice,
      taxes: 0,
      shippingCost: 0,
      quantity: 1,
      maxStock: product.stock,
      estimatedDelivery: {
        min: 1,
        max: 3,
        unit: "days"
      },
      // Location info for fulfillment
      locationId: product.locationId || null,
      locationName: product.locationName || null,
      inventoryId: product.inventoryId || null,
    })
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
            <div className="container mx-auto px-4 py-12">
              <Skeleton className="h-10 w-64 bg-white/20 mb-4" />
              <Skeleton className="h-6 w-96 bg-white/20" />
            </div>
          </div>
          <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="w-full h-48 rounded-lg mb-4" />
                    <Skeleton className="h-6 w-full mb-2" />
                    <Skeleton className="h-4 w-24 mb-3" />
                    <Skeleton className="h-8 w-32 mb-3" />
                    <Skeleton className="h-10 w-full" />
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

  // No products available
  if (!data || data.products.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
            <div className="container mx-auto px-4 py-12">
              <div className="flex items-center space-x-3 mb-4">
                <Flame className="h-8 w-8" />
                <h1 className="text-3xl font-bold">{t("flash.title")}</h1>
              </div>
              <p className="text-orange-100 text-lg">{t("flash.subtitle")}</p>
            </div>
          </div>
          <div className="container mx-auto px-4 py-16 text-center">
            <Flame className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No Flash Sales Available</h2>
            <p className="text-muted-foreground mb-6">
              Check back soon for exciting deals and discounts!
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
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
          <div className="container mx-auto px-4 py-12">
            <div className="flex items-center space-x-3 mb-4">
              <Flame className="h-8 w-8" />
              <h1 className="text-3xl font-bold">{t("flash.title")}</h1>
              <Flame className="h-8 w-8" />
            </div>
            <p className="text-orange-100 text-lg mb-6">{t("flash.subtitle")}</p>

            {/* Countdown Timer */}
            <div className="flex items-center space-x-4">
              <Clock className="h-5 w-5" />
              <span className="text-sm font-medium">Ends in:</span>
              <div className="flex space-x-2">
                <div className="bg-white/20 backdrop-blur px-3 py-2 rounded-lg font-bold">
                  {String(timeLeft.hours).padStart(2, "0")}
                </div>
                <span className="text-2xl font-bold">:</span>
                <div className="bg-white/20 backdrop-blur px-3 py-2 rounded-lg font-bold">
                  {String(timeLeft.minutes).padStart(2, "0")}
                </div>
                <span className="text-2xl font-bold">:</span>
                <div className="bg-white/20 backdrop-blur px-3 py-2 rounded-lg font-bold">
                  {String(timeLeft.seconds).padStart(2, "0")}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <p className="text-muted-foreground">
              {data.count} {data.count === 1 ? 'product' : 'products'} on sale
            </p>
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {data.products.map((product) => (
              <Card
                key={product.id}
                className="group cursor-pointer transition-all duration-300 hover:shadow-xl border-orange-200 dark:border-orange-800"
              >
                <CardContent className="p-4">
                  <Link href={`/product/${product.productId}`}>
                    <div className="relative mb-4">
                      <Image
                        src={product.image}
                        alt={product.name}
                        width={300}
                        height={300}
                        className="w-full h-48 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                      />
                      <Badge className="absolute top-2 left-2 bg-red-600 hover:bg-red-700">
                        -{product.discount}%
                      </Badge>
                      <Badge variant="secondary" className="absolute top-2 right-2">
                        {product.stock} {t("flash.left")}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-orange-600 transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">{product.storeName}</p>

                      <div className="flex items-center space-x-2">
                        <span className="text-2xl font-bold text-orange-600">
                          ${product.salePrice.toFixed(2)}
                        </span>
                        <span className="text-lg text-muted-foreground line-through">
                          ${product.originalPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </Link>

                  <Button
                    onClick={() => handleAddToCart(product)}
                    className="w-full mt-4 bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    {t("flash.buyNow")}
                  </Button>
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
