"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/components/language-provider"
import { useFavorites } from "@/contexts/favorites-context"
import { useLocation } from "@/contexts/location-context"
import { Heart, Loader2, Eye, Zap, Gift, Shuffle, Store } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"
import { searchProducts, getFeaturedProducts, type ProductWithPrices } from "@/lib/services/marketplace"

export default function FeaturedProducts() {
  const { t } = useLanguage()
  const { favorites, addToFavorites, removeFromFavorites } = useFavorites()
  const { location } = useLocation()
  const [products, setProducts] = useState<ProductWithPrices[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)

  // Load initial products
  const loadProducts = useCallback(async (pageNum: number = 1) => {
    try {
      if (pageNum === 1) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

      // Try to get products based on user location, or get all products
      let fetchedProducts: ProductWithPrices[] = []

      if (location?.latitude && location?.longitude) {
        // Search products near user location
        fetchedProducts = await searchProducts({
          latitude: location.latitude,
          longitude: location.longitude,
          radius_miles: 50,
          page: pageNum,
          limit: 12,
        })
      } else {
        // Get featured products without location
        fetchedProducts = await getFeaturedProducts(12)
      }

      if (pageNum === 1) {
        setProducts(fetchedProducts)
      } else {
        setProducts(prev => [...prev, ...fetchedProducts])
      }

      // Check if there are more products
      setHasMore(fetchedProducts.length >= 12)
      setPage(pageNum)
    } catch (error) {
      console.error('Error loading products:', error)
      toast({
        title: "Error",
        description: "Failed to load products. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [location?.latitude, location?.longitude])

  // Load initial products
  useEffect(() => {
    loadProducts(1)
  }, [loadProducts])

  // Infinite scroll logic
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight

      if (windowHeight + scrollPosition >= documentHeight - 1000) {
        if (hasMore && !loadingMore && !loading) {
          loadProducts(page + 1)
        }
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [hasMore, loadingMore, loading, page, loadProducts])

  const handleToggleFavorite = (product: ProductWithPrices) => {
    const isFavorite = favorites.some((fav) => fav.id === product.id)

    if (isFavorite) {
      removeFromFavorites(product.id)
      toast({
        title: "Removed from favorites",
        description: `${product.name} has been removed from your favorites`,
      })
    } else {
      addToFavorites({
        id: product.id,
        name: product.name,
        price: product.lowest_price,
        image: product.thumbnail_url || "/placeholder.svg",
        rating: 0,
        category: product.category,
        brand: product.brand || '',
        dateAdded: new Date().toISOString(),
      })
      toast({
        title: "Added to favorites",
        description: `${product.name} has been added to your favorites`,
      })
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Featured Products</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover our handpicked selection of premium spirits and wines
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-0">
                  <Skeleton className="w-full h-64" />
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-8 w-24" />
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

  // No products found
  if (!loading && products.length === 0) {
    return (
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Featured Products</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover our handpicked selection of premium spirits and wines
            </p>
          </div>

          <div className="text-center py-16">
            <Store className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No products available</h3>
            <p className="text-muted-foreground mb-6">
              {location ? "No stores found in your area. Try expanding your search." : "Enable location to see products near you."}
            </p>
            <Link href="/">
              <Button className="bg-orange-600 hover:bg-orange-700">
                Explore All Stores
              </Button>
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 px-4">
        <div className="container mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Featured Products</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover our handpicked selection of premium spirits and wines
            </p>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => {
              const isFavorite = favorites.some((fav) => fav.id === product.id)
              const hasDiscount = product.prices.some(p => p.original_price && p.original_price > p.price)
              const lowestOriginalPrice = product.prices
                .filter(p => p.original_price)
                .sort((a, b) => (a.original_price || 0) - (b.original_price || 0))[0]?.original_price

              return (
                <Card
                  key={product.id}
                  className="group cursor-pointer transition-all duration-300 hover:shadow-lg border-gray-200 dark:border-gray-800 overflow-hidden"
                >
                  <CardContent className="p-0">
                    <div className="relative">
                      <Image
                        src={product.thumbnail_url || "/placeholder.svg"}
                        alt={product.name}
                        width={300}
                        height={300}
                        className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                      />

                      {/* Feature Icons */}
                      <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                        {hasDiscount && (
                          <div className="group/icon relative">
                            <div className="bg-red-500 text-white p-1.5 rounded-full">
                              <Zap className="w-3 h-3" />
                            </div>
                          </div>
                        )}
                        {product.prices.length > 1 && (
                          <div className="group/icon relative">
                            <div className="bg-blue-500 text-white p-1.5 rounded-full">
                              <Shuffle className="w-3 h-3" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Favorite Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`absolute top-3 right-3 h-8 w-8 rounded-full ${
                          isFavorite
                            ? "bg-red-500 text-white hover:bg-red-600"
                            : "bg-white/80 text-gray-600 hover:bg-white"
                        }`}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleToggleFavorite(product)
                        }}
                      >
                        <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
                      </Button>
                    </div>

                    <div className="p-4 space-y-3">
                      <div>
                        <Badge variant="secondary" className="text-xs mb-2">
                          {product.category}
                        </Badge>
                        <h3 className="font-semibold text-lg line-clamp-2">{product.name}</h3>
                        {product.brand && (
                          <p className="text-sm text-muted-foreground">{product.brand}</p>
                        )}
                      </div>

                      {/* Age Restriction */}
                      {product.age_restriction && (
                        <div className="text-sm text-muted-foreground">
                          {product.age_restriction}+ only
                        </div>
                      )}

                      {/* Price Range */}
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-primary">
                              {product.price_range_text}
                            </span>
                            {lowestOriginalPrice && (
                              <span className="text-sm text-muted-foreground line-through">
                                ${lowestOriginalPrice.toFixed(2)}
                              </span>
                            )}
                          </div>
                          {product.prices.length > 1 && (
                            <span className="text-xs text-muted-foreground">
                              from {product.prices.length} store{product.prices.length > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* View Details Button */}
                      <Link href={`/product/${product.slug || product.id}`}>
                        <Button
                          variant="outline"
                          className="w-full border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Loading More State */}
          {loadingMore && (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
              <span className="ml-2 text-muted-foreground">Loading more products...</span>
            </div>
          )}

          {/* End Message */}
          {!hasMore && products.length > 8 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">You've seen all our featured products!</p>
              <Link href="/categories">
                <Button variant="outline" className="mt-4 bg-transparent">
                  Browse All Categories
                </Button>
              </Link>
            </div>
          )}
        </div>
    </section>
  )
}
