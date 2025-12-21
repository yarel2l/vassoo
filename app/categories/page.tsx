"use client"

import { useState } from "react"
import {
  Search,
  Grid3X3,
  Wine,
  Beer,
  Martini,
  Coffee,
  Grape,
  Sparkles,
  WineIcon as Whisky,
  CoffeeIcon as Cocktail,
  Cherry,
  Cake,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useLanguage } from "@/components/language-provider"
import Link from "next/link"

const categories = [
  {
    id: "wine",
    name: "Wine",
    icon: Wine,
    count: 245,
    image: "/placeholder.svg?height=300&width=300",
    description: "Red, White, Rosé, Sparkling",
    size: "large", // Takes 2x2 grid space
    gradient: "wine-gradient",
    iconColor: "text-red-100",
  },
  {
    id: "beer",
    name: "Beer",
    icon: Beer,
    count: 189,
    image: "/placeholder.svg?height=300&width=300",
    description: "Craft, Import, Domestic",
    size: "medium", // Takes 1x2 grid space
    gradient: "beer-gradient",
    iconColor: "text-yellow-100",
  },
  {
    id: "spirits",
    name: "Spirits",
    icon: Martini,
    count: 156,
    image: "/placeholder.svg?height=300&width=300",
    description: "Whiskey, Vodka, Rum, Gin",
    size: "medium", // Takes 1x2 grid space
    gradient: "whiskey-gradient",
    iconColor: "text-amber-100",
  },
  {
    id: "whiskey",
    name: "Whiskey",
    icon: Whisky,
    count: 87,
    image: "/placeholder.svg?height=150&width=300",
    description: "Bourbon, Scotch, Irish",
    size: "small", // Takes 1x1 grid space
    gradient: "whiskey-gradient",
    iconColor: "text-amber-100",
  },
  {
    id: "cocktails",
    name: "Cocktails",
    icon: Cocktail,
    count: 124,
    image: "/placeholder.svg?height=150&width=300",
    description: "Mixers & Ingredients",
    size: "small", // Takes 1x1 grid space
    gradient: "cocktail-gradient",
    iconColor: "text-blue-100",
  },
  {
    id: "liqueurs",
    name: "Liqueurs",
    icon: Coffee,
    count: 98,
    image: "/placeholder.svg?height=150&width=300",
    description: "Sweet & Flavored",
    size: "small", // Takes 1x1 grid space
    gradient: "cocktail-gradient",
    iconColor: "text-blue-100",
  },
  {
    id: "champagne",
    name: "Champagne",
    icon: Sparkles,
    count: 67,
    image: "/placeholder.svg?height=150&width=300",
    description: "Premium Sparkling",
    size: "small", // Takes 1x1 grid space
    gradient: "wine-gradient",
    iconColor: "text-red-100",
  },
  {
    id: "sake",
    name: "Sake",
    icon: Grape,
    count: 34,
    image: "/placeholder.svg?height=150&width=300",
    description: "Japanese Rice Wine",
    size: "small", // Takes 1x1 grid space
    gradient: "wine-gradient",
    iconColor: "text-red-100",
  },
  {
    id: "fruit-wines",
    name: "Fruit Wines",
    icon: Cherry,
    count: 45,
    image: "/placeholder.svg?height=150&width=300",
    description: "Berry & Fruit Based",
    size: "small", // Takes 1x1 grid space
    gradient: "wine-gradient",
    iconColor: "text-red-100",
  },
  {
    id: "dessert-wines",
    name: "Dessert Wines",
    icon: Cake,
    count: 29,
    image: "/placeholder.svg?height=150&width=300",
    description: "Sweet & Fortified",
    size: "small", // Takes 1x1 grid space
    gradient: "wine-gradient",
    iconColor: "text-red-100",
  },
]

export default function CategoriesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const { t } = useLanguage()

  const filteredCategories = categories.filter(
    (category) =>
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center space-x-3 mb-4">
            <Grid3X3 className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Categories</h1>
          </div>
          <p className="text-blue-100 text-lg">Explore our extensive collection of premium beverages</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Shop by Category Section */}
        <section className="mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">{t("categories.title")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.slice(0, 4).map((category) => {
              const IconComponent = category.icon
              return (
                <Link key={category.id} href={`/search?category=${encodeURIComponent(category.name)}`}>
                  <Card className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl overflow-hidden">
                    <CardContent className="p-0">
                      <div className={`${category.gradient} p-8 text-center relative overflow-hidden`}>
                        <div className="absolute inset-0 bg-black/10"></div>
                        <div className="relative z-10">
                          <IconComponent className={`w-12 h-12 mx-auto mb-4 ${category.iconColor}`} />
                          <h3 className="text-xl font-bold text-white mb-2">{category.name}</h3>
                          <p className="text-white/90 text-sm">{category.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Instagram-style Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-12">
          {filteredCategories.map((category) => {
            const IconComponent = category.icon
            const gridClass =
              category.size === "large"
                ? "col-span-2 row-span-2"
                : category.size === "medium"
                  ? "col-span-1 row-span-2"
                  : "col-span-1 row-span-1"

            return (
              <Link
                key={category.id}
                href={`/search?category=${encodeURIComponent(category.name)}`}
                className={`group relative overflow-hidden rounded-lg bg-muted hover:shadow-lg transition-all duration-300 ${gridClass}`}
              >
                {/* Background Image */}
                <div className="absolute inset-0">
                  <img
                    src={category.image || "/placeholder.svg"}
                    alt={category.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors duration-300" />
                </div>

                {/* Content Overlay */}
                <div className="relative h-full flex flex-col justify-between p-4 text-white">
                  {/* Top: Icon and Count */}
                  <div className="flex items-start justify-between">
                    <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-xs bg-white/20 backdrop-blur-sm text-white border-white/30"
                    >
                      {category.count}
                    </Badge>
                  </div>

                  {/* Bottom: Title and Description */}
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg group-hover:text-orange-300 transition-colors">{category.name}</h3>
                    <p className="text-white/80 text-sm leading-tight">{category.description}</p>
                  </div>
                </div>

                {/* Hover Effect Border */}
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-orange-500 rounded-lg transition-colors duration-300" />
              </Link>
            )
          })}
        </div>

        {/* Quick Access Categories */}
        <div className="bg-muted/50 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-6">Quick Access</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              "Red Wine",
              "White Wine",
              "Craft Beer",
              "Whiskey",
              "Vodka",
              "Gin",
              "Rum",
              "Tequila",
              "Champagne",
              "Sake",
              "Liqueurs",
              "Mixers",
            ].map((category, index) => (
              <Link
                key={index}
                href={`/search?category=${encodeURIComponent(category)}`}
                className="text-center p-4 rounded-lg bg-background hover:bg-muted transition-colors group"
              >
                <div className="text-sm font-medium text-muted-foreground group-hover:text-orange-500 transition-colors">
                  {category}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
