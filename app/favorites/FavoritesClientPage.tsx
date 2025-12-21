"use client"

import { useState } from "react"
import Navbar from "@/components/navbar"
import MobileBottomNav from "@/components/mobile-bottom-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Heart, ShoppingCart, Trash2, ArrowLeft, Star } from "lucide-react"
import { useFavorites } from "@/contexts/favorites-context"
import { useCart } from "@/contexts/cart-context"
import { useLanguage } from "@/components/language-provider"
import Image from "next/image"
import Link from "next/link"

export default function FavoritesClientPage() {
  const { favorites, removeFromFavorites, clearFavorites } = useFavorites()
  const { addToCart } = useCart()
  const { t } = useLanguage()
  const [sortBy, setSortBy] = useState<"date" | "name" | "price">("date")

  const sortedFavorites = [...favorites].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name)
      case "price":
        return b.price - a.price
      case "date":
      default:
        return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
    }
  })

  const handleAddToCart = (favorite: any) => {
    // This would need to be enhanced to select a store and get proper offer data
    // For now, we'll show a message that the user needs to visit the product page
    window.location.href = `/product/${favorite.id}`
  }

  if (favorites.length === 0) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <Heart className="h-24 w-24 mx-auto text-muted-foreground mb-6" />
            <h1 className="text-3xl font-bold mb-4">No favorites yet</h1>
            <p className="text-muted-foreground mb-8">Start adding products to your favorites to see them here</p>
            <Link href="/">
              <Button size="lg">
                <ArrowLeft className="mr-2 h-5 w-5" />
                Discover Products
              </Button>
            </Link>
          </div>
        </div>
        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">My Favorites</h1>
            <p className="text-muted-foreground">{favorites.length} favorite products</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Sort Options */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "date" | "name" | "price")}
              className="px-3 py-2 border rounded-lg bg-background"
            >
              <option value="date">Sort by Date Added</option>
              <option value="name">Sort by Name</option>
              <option value="price">Sort by Price</option>
            </select>
            <Button
              variant="outline"
              onClick={clearFavorites}
              className="text-red-600 hover:text-red-700 bg-transparent"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All
            </Button>
          </div>
        </div>

        {/* Favorites Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedFavorites.map((favorite) => (
            <Card key={favorite.id} className="group cursor-pointer transition-all duration-300 hover:shadow-lg">
              <CardContent className="p-4">
                <div className="relative mb-4">
                  <Link href={`/product/${favorite.id}`}>
                    <Image
                      src={favorite.image || "/placeholder.svg"}
                      alt={favorite.name}
                      width={300}
                      height={300}
                      className="w-full h-48 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                    />
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-white/80 hover:bg-white text-red-500 hover:text-red-600"
                    onClick={() => removeFromFavorites(favorite.id)}
                  >
                    <Heart className="h-4 w-4 fill-current" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div>
                    <Badge variant="secondary" className="mb-2">
                      {favorite.category}
                    </Badge>
                    <Link href={`/product/${favorite.id}`}>
                      <h3 className="font-semibold text-lg line-clamp-2 hover:text-primary transition-colors">
                        {favorite.name}
                      </h3>
                    </Link>
                    <p className="text-sm text-muted-foreground">{favorite.brand}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{favorite.rating}</span>
                  </div>

                  <div className="text-xl font-bold text-primary">${favorite.price}</div>

                  <div className="text-xs text-muted-foreground">
                    Added {new Date(favorite.dateAdded).toLocaleDateString()}
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={() => handleAddToCart(favorite)} className="flex-1" size="sm">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      View Product
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <MobileBottomNav />
    </div>
  )
}
