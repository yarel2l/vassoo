"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/components/language-provider"
import { Clock, Flame, ShoppingCart } from "lucide-react"
import Image from "next/image"
import { useState, useEffect } from "react"

export default function FlashSales() {
  const { t } = useLanguage()
  const [timeLeft, setTimeLeft] = useState({
    hours: 23,
    minutes: 45,
    seconds: 30,
  })

  useEffect(() => {
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
  }, [])

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
  )
}
