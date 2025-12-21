"use client"

import { useState, useEffect } from "react"
import { Zap, Clock, Star, ShoppingCart, Timer, TrendingUp, FlameIcon as Fire, Flame } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useCart } from "@/contexts/cart-context"
import { useLanguage } from "@/components/language-provider"
import Image from "next/image"

const flashSales = [
  {
    id: 1,
    name: "Premium Whiskey Collection",
    originalPrice: 159.99,
    salePrice: 99.99,
    discount: 38,
    image: "/placeholder.svg?height=300&width=300",
    rating: 4.8,
    reviews: 124,
    sold: 67,
    total: 100,
    timeLeft: 3600, // seconds
    category: "Spirits",
    description: "Aged 12 years, smooth finish with notes of vanilla and oak",
  },
  {
    id: 2,
    name: "Craft Beer Variety Pack",
    originalPrice: 49.99,
    salePrice: 34.99,
    discount: 30,
    image: "/placeholder.svg?height=300&width=300",
    rating: 4.6,
    reviews: 89,
    sold: 43,
    total: 75,
    timeLeft: 7200, // seconds
    category: "Beer",
    description: "12 bottles of artisanal craft beers from local breweries",
  },
  {
    id: 3,
    name: "French Champagne Duo",
    originalPrice: 199.99,
    salePrice: 149.99,
    discount: 25,
    image: "/placeholder.svg?height=300&width=300",
    rating: 4.9,
    reviews: 156,
    sold: 28,
    total: 50,
    timeLeft: 5400, // seconds
    category: "Champagne",
    description: "Two bottles of authentic French champagne, perfect for celebrations",
  },
  {
    id: 4,
    name: "Premium Vodka Set",
    originalPrice: 89.99,
    salePrice: 64.99,
    discount: 28,
    image: "/placeholder.svg?height=300&width=300",
    rating: 4.7,
    reviews: 92,
    sold: 51,
    total: 80,
    timeLeft: 9000, // seconds
    category: "Spirits",
    description: "Ultra-smooth premium vodka with elegant packaging",
  },
]

const flashProducts = [
  {
    id: 1,
    name: "Grey Goose Vodka",
    originalPrice: 89.99,
    salePrice: 59.99,
    discount: 33,
    image: "/placeholder.svg?height=200&width=200",
    stock: 12,
  },
  {
    id: 2,
    name: "Johnnie Walker Blue",
    originalPrice: 199.99,
    salePrice: 149.99,
    discount: 25,
    image: "/placeholder.svg?height=200&width=200",
    stock: 8,
  },
  {
    id: 3,
    name: "Moët & Chandon",
    originalPrice: 79.99,
    salePrice: 54.99,
    discount: 31,
    image: "/placeholder.svg?height=200&width=200",
    stock: 15,
  },
  {
    id: 4,
    name: "Patron Silver Tequila",
    originalPrice: 69.99,
    salePrice: 49.99,
    discount: 29,
    image: "/placeholder.svg?height=200&width=200",
    stock: 6,
  },
]

export default function FlashSalesPage() {
  const [timeLeft, setTimeLeft] = useState<{ [key: number]: number }>({})
  const [flashTimeLeft, setFlashTimeLeft] = useState({
    hours: 23,
    minutes: 45,
    seconds: 30,
  })
  const { addToCart } = useCart()
  const { t } = useLanguage()

  useEffect(() => {
    const initialTimes: { [key: number]: number } = {}
    flashSales.forEach((sale) => {
      initialTimes[sale.id] = sale.timeLeft
    })
    setTimeLeft(initialTimes)

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const newTimes = { ...prev }
        Object.keys(newTimes).forEach((key) => {
          const numKey = Number.parseInt(key)
          if (newTimes[numKey] > 0) {
            newTimes[numKey] -= 1
          }
        })
        return newTimes
      })

      setFlashTimeLeft((prev) => {
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
  }, [])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleAddToCart = (product: any) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.salePrice,
      image: product.image,
      category: product.category,
      quantity: 1,
    })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center space-x-3 mb-4">
            <Zap className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Flash Sales</h1>
            <Fire className="h-8 w-8 animate-pulse" />
          </div>
          <p className="text-orange-100 text-lg">Limited time offers - grab them before they're gone!</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Flash Sales Section from Home */}
        <section className="py-16 px-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 rounded-lg mb-16">
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
                    {String(flashTimeLeft.hours).padStart(2, "0")}
                  </div>
                  <span className="text-2xl font-bold text-red-600">:</span>
                  <div className="bg-red-600 text-white px-3 py-2 rounded-lg font-bold">
                    {String(flashTimeLeft.minutes).padStart(2, "0")}
                  </div>
                  <span className="text-2xl font-bold text-red-600">:</span>
                  <div className="bg-red-600 text-white px-3 py-2 rounded-lg font-bold">
                    {String(flashTimeLeft.seconds).padStart(2, "0")}
                  </div>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {flashProducts.map((product) => (
                <Card
                  key={product.id}
                  className="group cursor-pointer transition-all duration-300 hover:shadow-xl border-red-200 dark:border-red-800"
                >
                  <CardContent className="p-4">
                    <div className="relative mb-4">
                      <Image
                        src={product.image || "/placeholder.svg"}
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

                      <div className="flex items-center space-x-2">
                        <span className="text-2xl font-bold text-red-600">${product.salePrice}</span>
                        <span className="text-lg text-muted-foreground line-through">${product.originalPrice}</span>
                      </div>

                      <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        {t("flash.buyNow")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-red-500 to-pink-500 text-white">
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2" />
              <div className="text-2xl font-bold">Up to 38%</div>
              <div className="text-red-100">Maximum Savings</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white">
            <CardContent className="p-6 text-center">
              <Timer className="h-8 w-8 mx-auto mb-2" />
              <div className="text-2xl font-bold">24 Hours</div>
              <div className="text-orange-100">Sale Duration</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
            <CardContent className="p-6 text-center">
              <Fire className="h-8 w-8 mx-auto mb-2" />
              <div className="text-2xl font-bold">189</div>
              <div className="text-purple-100">Items Sold Today</div>
            </CardContent>
          </Card>
        </div>

        {/* Flash Sales Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
          {flashSales.map((product) => {
            const progressPercentage = (product.sold / product.total) * 100
            const currentTimeLeft = timeLeft[product.id] || 0

            return (
              <Card key={product.id} className="group hover:shadow-xl transition-all duration-300 overflow-hidden">
                <div className="relative">
                  {/* Sale Badge */}
                  <div className="absolute top-4 left-4 z-10">
                    <Badge className="bg-red-500 text-white font-bold px-3 py-1">-{product.discount}%</Badge>
                  </div>

                  {/* Timer Badge */}
                  <div className="absolute top-4 right-4 z-10">
                    <Badge variant="secondary" className="bg-black/70 text-white font-mono">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatTime(currentTimeLeft)}
                    </Badge>
                  </div>

                  {/* Product Image */}
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </div>

                <CardContent className="p-6">
                  {/* Category */}
                  <Badge variant="outline" className="mb-3">
                    {product.category}
                  </Badge>

                  {/* Product Name */}
                  <h3 className="text-xl font-bold mb-2 group-hover:text-orange-600 transition-colors">
                    {product.name}
                  </h3>

                  {/* Description */}
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{product.description}</p>

                  {/* Rating */}
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="ml-1 text-sm font-medium">{product.rating}</span>
                    </div>
                    <span className="text-muted-foreground text-sm">({product.reviews} reviews)</span>
                  </div>

                  {/* Price */}
                  <div className="flex items-center space-x-3 mb-4">
                    <span className="text-2xl font-bold text-orange-600">${product.salePrice}</span>
                    <span className="text-lg text-muted-foreground line-through">${product.originalPrice}</span>
                  </div>

                  {/* Stock Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">
                        Sold: {product.sold}/{product.total}
                      </span>
                      <span className="font-medium">{Math.round(progressPercentage)}% sold</span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                  </div>

                  {/* Add to Cart Button */}
                  <Button
                    onClick={() => handleAddToCart(product)}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                    disabled={currentTimeLeft === 0}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {currentTimeLeft === 0 ? "Sale Ended" : "Add to Cart"}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Newsletter Signup */}
        <Card className="mt-12 bg-gradient-to-r from-orange-600 to-red-600 text-white">
          <CardContent className="p-8 text-center">
            <Zap className="h-12 w-12 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Never Miss a Flash Sale</h2>
            <p className="text-orange-100 mb-6">
              Get notified instantly when new flash sales go live. Be the first to grab the best deals!
            </p>
            <div className="flex max-w-md mx-auto space-x-2">
              <input type="email" placeholder="Enter your email" className="flex-1 px-4 py-2 rounded-lg text-black" />
              <Button variant="secondary" className="bg-white text-orange-600 hover:bg-gray-100">
                Notify Me
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
