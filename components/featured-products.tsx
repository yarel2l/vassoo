"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/components/language-provider"
import { useFavorites } from "@/contexts/favorites-context"
import { Heart, Loader2, Eye, Zap, Gift, Shuffle } from "lucide-react"
import Image from "next/image"
import { toast } from "@/hooks/use-toast"
import NewsletterDialog from "./newsletter-dialog"

interface StoreOffer {
  storeId: string
  storeName: string
  price: number
  originalPrice?: number
  stock: number
}

interface Product {
  id: number
  name: string
  image: string
  rating: number
  category: string
  alcoholPercentage: number
  volume: string
  offers: StoreOffer[]
  features: {
    flashSale?: boolean
    promotion?: boolean
    mixAndMatch?: boolean
  }
}

export default function FeaturedProducts() {
  const { t } = useLanguage()
  const { favorites, addToFavorites, removeFromFavorites } = useFavorites()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [showNewsletterDialog, setShowNewsletterDialog] = useState(false)
  const [hasShownDialog, setHasShownDialog] = useState(false)

  // Initial products with alcohol percentage and volume
  const initialProducts: Product[] = [
    {
      id: 1,
      name: "Dom Pérignon Vintage 2013",
      image: "/placeholder.svg?height=300&width=300&text=Dom+Pérignon",
      rating: 4.9,
      category: "Champagne",
      alcoholPercentage: 12.5,
      volume: "750ml",
      offers: [
        { storeId: "1", storeName: "Premium Wine Co.", price: 299.99, originalPrice: 349.99, stock: 12 },
        { storeId: "2", storeName: "Luxury Spirits", price: 319.99, originalPrice: 359.99, stock: 8 },
        { storeId: "3", storeName: "Elite Collection", price: 289.99, originalPrice: 329.99, stock: 15 },
      ],
      features: {
        flashSale: true,
        promotion: true,
      },
    },
    {
      id: 2,
      name: "Macallan 18 Year Single Malt",
      image: "/placeholder.svg?height=300&width=300&text=Macallan+18",
      rating: 4.8,
      category: "Whiskey",
      alcoholPercentage: 43.0,
      volume: "700ml",
      offers: [
        { storeId: "1", storeName: "Whiskey World", price: 599.99, stock: 5 },
        { storeId: "2", storeName: "Premium Spirits", price: 629.99, stock: 3 },
      ],
      features: {
        promotion: true,
        mixAndMatch: true,
      },
    },
    {
      id: 3,
      name: "Hennessy XO Cognac",
      image: "/placeholder.svg?height=300&width=300&text=Hennessy+XO",
      rating: 4.7,
      category: "Cognac",
      alcoholPercentage: 40.0,
      volume: "700ml",
      offers: [
        { storeId: "1", storeName: "Cognac House", price: 249.99, originalPrice: 289.99, stock: 20 },
        { storeId: "2", storeName: "Elite Spirits", price: 259.99, originalPrice: 299.99, stock: 12 },
        { storeId: "3", storeName: "Premium Collection", price: 239.99, originalPrice: 279.99, stock: 8 },
      ],
      features: {
        flashSale: true,
        mixAndMatch: true,
      },
    },
    {
      id: 4,
      name: "Clase Azul Reposado Tequila",
      image: "/placeholder.svg?height=300&width=300&text=Clase+Azul",
      rating: 4.6,
      category: "Tequila",
      alcoholPercentage: 38.0,
      volume: "750ml",
      offers: [{ storeId: "1", storeName: "Agave Masters", price: 149.99, stock: 10 }],
      features: {
        promotion: true,
      },
    },
    {
      id: 5,
      name: "Johnnie Walker Blue Label",
      image: "/placeholder.svg?height=300&width=300&text=Johnnie+Walker",
      rating: 4.5,
      category: "Whiskey",
      alcoholPercentage: 40.0,
      volume: "750ml",
      offers: [
        { storeId: "1", storeName: "Whiskey World", price: 189.99, originalPrice: 219.99, stock: 15 },
        { storeId: "2", storeName: "Premium Spirits", price: 199.99, originalPrice: 229.99, stock: 8 },
        { storeId: "3", storeName: "Elite Collection", price: 179.99, originalPrice: 209.99, stock: 12 },
      ],
      features: {
        flashSale: true,
        promotion: true,
        mixAndMatch: true,
      },
    },
    {
      id: 6,
      name: "Grey Goose Vodka",
      image: "/placeholder.svg?height=300&width=300&text=Grey+Goose",
      rating: 4.4,
      category: "Vodka",
      alcoholPercentage: 40.0,
      volume: "750ml",
      offers: [
        { storeId: "1", storeName: "Premium Spirits", price: 49.99, stock: 25 },
        { storeId: "2", storeName: "Vodka House", price: 52.99, stock: 18 },
      ],
      features: {
        mixAndMatch: true,
      },
    },
    {
      id: 7,
      name: "Rémy Martin XO",
      image: "/placeholder.svg?height=300&width=300&text=Rémy+Martin",
      rating: 4.8,
      category: "Cognac",
      alcoholPercentage: 40.0,
      volume: "700ml",
      offers: [
        { storeId: "1", storeName: "Cognac House", price: 199.99, originalPrice: 229.99, stock: 6 },
        { storeId: "2", storeName: "Elite Spirits", price: 209.99, originalPrice: 239.99, stock: 4 },
      ],
      features: {
        flashSale: true,
        promotion: true,
      },
    },
    {
      id: 8,
      name: "Patron Silver Tequila",
      image: "/placeholder.svg?height=300&width=300&text=Patron+Silver",
      rating: 4.3,
      category: "Tequila",
      alcoholPercentage: 40.0,
      volume: "750ml",
      offers: [
        { storeId: "1", storeName: "Agave Masters", price: 59.99, stock: 30 },
        { storeId: "2", storeName: "Premium Collection", price: 62.99, stock: 22 },
        { storeId: "3", storeName: "Tequila World", price: 57.99, stock: 15 },
      ],
      features: {
        mixAndMatch: true,
      },
    },
  ]

  // Generate additional products for infinite scroll
  const generateProducts = (startId: number, count: number): Product[] => {
    const categories = ["Whiskey", "Vodka", "Rum", "Gin", "Tequila", "Cognac", "Wine", "Beer"]
    const brands = ["Premium", "Royal", "Elite", "Classic", "Vintage", "Reserve", "Special", "Limited"]
    const types = ["Single Malt", "Aged", "Blended", "Pure", "Extra", "Gold", "Silver", "Black"]
    const stores = ["Premium Spirits", "Elite Collection", "Luxury Drinks", "Master Distillers", "Heritage Wines"]
    const volumes = ["375ml", "500ml", "700ml", "750ml", "1L"]

    return Array.from({ length: count }, (_, i) => {
      const id = startId + i
      const category = categories[i % categories.length]
      const brand = brands[i % brands.length]
      const type = types[i % types.length]

      // Generate alcohol percentage based on category
      let alcoholPercentage = 40.0
      switch (category.toLowerCase()) {
        case "wine":
          alcoholPercentage = Math.random() * 5 + 11 // 11-16%
          break
        case "beer":
          alcoholPercentage = Math.random() * 8 + 3 // 3-11%
          break
        case "whiskey":
        case "vodka":
        case "rum":
        case "gin":
        case "tequila":
          alcoholPercentage = Math.random() * 10 + 35 // 35-45%
          break
        case "cognac":
          alcoholPercentage = Math.random() * 5 + 38 // 38-43%
          break
      }

      // Generate random number of offers (1-3)
      const numOffers = Math.floor(Math.random() * 3) + 1
      const offers: StoreOffer[] = []

      for (let j = 0; j < numOffers; j++) {
        const basePrice = Math.floor(Math.random() * 400) + 50
        const hasDiscount = Math.random() > 0.6
        const originalPrice = hasDiscount ? basePrice + Math.floor(basePrice * 0.2) : undefined

        offers.push({
          storeId: `store-${j + 1}`,
          storeName: stores[j % stores.length],
          price: basePrice + j * 10,
          originalPrice,
          stock: Math.floor(Math.random() * 30) + 5,
        })
      }

      // Random features
      const features = {
        flashSale: Math.random() > 0.7,
        promotion: Math.random() > 0.6,
        mixAndMatch: Math.random() > 0.5,
      }

      return {
        id,
        name: `${brand} ${type} ${category}`,
        image: `/placeholder.svg?height=300&width=300&text=${brand}+${type}`,
        rating: Math.round((Math.random() * 1.5 + 3.5) * 10) / 10,
        category,
        alcoholPercentage: Math.round(alcoholPercentage * 10) / 10,
        volume: volumes[Math.floor(Math.random() * volumes.length)],
        offers,
        features,
      }
    })
  }

  // Load initial products
  useEffect(() => {
    setProducts(initialProducts)
  }, [])

  // Newsletter dialog scroll detection
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight

      // Show dialog when user scrolls 50% through the products section
      const scrollPercentage = scrollPosition / (documentHeight - windowHeight)

      if (scrollPercentage > 0.3 && !hasShownDialog && products.length > 0) {
        setShowNewsletterDialog(true)
        setHasShownDialog(true)
      }

      // Infinite scroll logic
      if (windowHeight + scrollPosition >= documentHeight - 1000) {
        if (hasMore && !loading) {
          loadMore()
        }
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [hasShownDialog, products.length, hasMore, loading])

  // Load more products
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return

    setLoading(true)

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const newProducts = generateProducts(products.length + 1, 8)
    setProducts((prev) => [...prev, ...newProducts])
    setPage((prev) => prev + 1)

    // Stop loading after 50 products for demo
    if (products.length >= 42) {
      setHasMore(false)
    }

    setLoading(false)
  }, [loading, hasMore, products.length])

  const handleToggleFavorite = (product: Product) => {
    const isFavorite = favorites.some((fav) => fav.id === product.id)
    const minPrice = Math.min(...product.offers.map((offer) => offer.price))

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
        price: minPrice,
        image: product.image,
        rating: product.rating,
        category: product.category,
      })
      toast({
        title: "Added to favorites",
        description: `${product.name} has been added to your favorites`,
      })
    }
  }

  const handleViewDetails = (product: Product) => {
    // Navigate to product details page
    window.location.href = `/product/${product.id}`
  }

  const getPriceRange = (offers: StoreOffer[]) => {
    const prices = offers.map((offer) => offer.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)

    if (minPrice === maxPrice) {
      return `$${minPrice.toFixed(2)}`
    }

    return `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`
  }

  const renderFeatureIcons = (features: Product["features"]) => {
    const icons = []

    if (features.flashSale) {
      icons.push(
        <div key="flash" className="group relative">
          <div className="bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-all duration-300 cursor-pointer">
            <Zap className="w-3 h-3" />
          </div>
          <div className="absolute left-8 top-0 bg-red-500 text-white px-2 py-1 rounded-md text-xs font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-1 group-hover:translate-x-0 whitespace-nowrap z-10 pointer-events-none">
            Flash Sale
          </div>
        </div>,
      )
    }

    if (features.promotion) {
      icons.push(
        <div key="promo" className="group relative">
          <div className="bg-green-500 text-white p-1.5 rounded-full hover:bg-green-600 transition-all duration-300 cursor-pointer">
            <Gift className="w-3 h-3" />
          </div>
          <div className="absolute left-8 top-0 bg-green-500 text-white px-2 py-1 rounded-md text-xs font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-1 group-hover:translate-x-0 whitespace-nowrap z-10 pointer-events-none">
            Promotion
          </div>
        </div>,
      )
    }

    if (features.mixAndMatch) {
      icons.push(
        <div key="mix" className="group relative">
          <div className="bg-blue-500 text-white p-1.5 rounded-full hover:bg-blue-600 transition-all duration-300 cursor-pointer">
            <Shuffle className="w-3 h-3" />
          </div>
          <div className="absolute left-8 top-0 bg-blue-500 text-white px-2 py-1 rounded-md text-xs font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-1 group-hover:translate-x-0 whitespace-nowrap z-10 pointer-events-none">
            Mix & Match
          </div>
        </div>,
      )
    }

    return icons
  }

  return (
    <>
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
              const priceRange = getPriceRange(product.offers)
              const featureIcons = renderFeatureIcons(product.features)

              return (
                <Card
                  key={product.id}
                  className="group cursor-pointer transition-all duration-300 hover:shadow-lg border-gray-200 dark:border-gray-800 overflow-hidden"
                >
                  <CardContent className="p-0">
                    <div className="relative">
                      <Image
                        src={product.image || "/placeholder.svg"}
                        alt={product.name}
                        width={300}
                        height={300}
                        className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                      />

                      {/* Feature Icons */}
                      {featureIcons.length > 0 && (
                        <div className="absolute top-3 left-3 flex flex-col gap-1.5">{featureIcons}</div>
                      )}

                      {/* Favorite Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`absolute top-3 right-3 h-8 w-8 rounded-full ${
                          isFavorite
                            ? "bg-red-500 text-white hover:bg-red-600"
                            : "bg-white/80 text-gray-600 hover:bg-white"
                        }`}
                        onClick={() => handleToggleFavorite(product)}
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
                      </div>

                      {/* Alcohol and Volume Info */}
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{product.alcoholPercentage}% ABV</span>
                        <span>Volume: {product.volume}</span>
                      </div>

                      {/* Price Range */}
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-xl font-bold text-primary">{priceRange}</span>
                          {product.offers.length > 1 && (
                            <span className="text-xs text-muted-foreground">
                              from {product.offers.length} store{product.offers.length > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* View Details Button */}
                      <Button
                        onClick={() => handleViewDetails(product)}
                        variant="outline"
                        className="w-full border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
              <span className="ml-2 text-muted-foreground">Loading more products...</span>
            </div>
          )}

          {/* End Message */}
          {!hasMore && products.length > 8 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">You've seen all our featured products!</p>
              <Button variant="outline" className="mt-4 bg-transparent">
                Browse All Categories
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Newsletter Dialog */}
      <NewsletterDialog isOpen={showNewsletterDialog} onClose={() => setShowNewsletterDialog(false)} />
    </>
  )
}
