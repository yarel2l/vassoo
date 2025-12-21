"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/components/language-provider"
import { Gift, PartyPopper, ShoppingCart, Star } from "lucide-react"
import Image from "next/image"

export default function BirthdaySection() {
  const { t } = useLanguage()

  const birthdayProducts = [
    {
      id: 1,
      name: "Dom Pérignon Vintage 2013",
      price: 299.99,
      originalPrice: 349.99,
      image: "/placeholder.svg?height=250&width=250",
      rating: 4.9,
      occasion: "Luxury Celebration",
    },
    {
      id: 2,
      name: "Hennessy XO Cognac",
      price: 249.99,
      originalPrice: 289.99,
      image: "/placeholder.svg?height=250&width=250",
      rating: 4.8,
      occasion: "Premium Gift",
    },
    {
      id: 3,
      name: "Macallan 18 Year",
      price: 599.99,
      originalPrice: 649.99,
      image: "/placeholder.svg?height=250&width=250",
      rating: 5.0,
      occasion: "Special Milestone",
    },
  ]

  return (
    <section className="py-16 px-4 bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 dark:from-purple-950/20 dark:via-pink-950/20 dark:to-yellow-950/20">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <PartyPopper className="h-8 w-8 text-purple-600" />
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-yellow-600 bg-clip-text text-transparent">
              {t("birthday.title")}
            </h2>
            <Gift className="h-8 w-8 text-pink-600" />
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t("birthday.subtitle")}</p>
        </div>

        {/* Special Offer Banner */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 mb-8 text-white text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Gift className="h-6 w-6" />
            <span className="text-xl font-bold">{t("birthday.offer")}</span>
          </div>
          <p className="text-purple-100">{t("birthday.offerDesc")}</p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {birthdayProducts.map((product) => (
            <Card
              key={product.id}
              className="group cursor-pointer transition-all duration-300 hover:shadow-2xl border-purple-200 dark:border-purple-800 overflow-hidden"
            >
              <CardContent className="p-0">
                <div className="relative">
                  <Image
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    width={250}
                    height={250}
                    className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                  <Badge className="absolute top-4 left-4 bg-gradient-to-r from-purple-600 to-pink-600">
                    {t("birthday.special")}
                  </Badge>
                  <div className="absolute bottom-4 left-4 text-white">
                    <div className="flex items-center space-x-1 mb-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{product.rating}</span>
                    </div>
                    <p className="text-xs text-purple-200">{product.occasion}</p>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <h3 className="font-bold text-xl line-clamp-2">{product.name}</h3>

                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-bold text-purple-600">${product.price}</span>
                    <span className="text-lg text-muted-foreground line-through">${product.originalPrice}</span>
                  </div>

                  <div className="space-y-2">
                    <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      {t("birthday.addToCart")}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full border-purple-200 text-purple-600 hover:bg-purple-50 bg-transparent"
                    >
                      <Gift className="w-4 h-4 mr-2" />
                      {t("birthday.giftWrap")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12">
          <Button
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3"
          >
            {t("birthday.viewAll")}
          </Button>
        </div>
      </div>
    </section>
  )
}
