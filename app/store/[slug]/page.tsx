"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  MapPin,
  Star,
  Clock,
  Truck,
  Store,
  Phone,
  Globe,
  Mail,
  Search,
  Package,
  Heart,
  ShoppingCart,
  Loader2,
  ChevronLeft,
  ExternalLink,
} from "lucide-react"
import Navbar from "@/components/navbar"
import MobileBottomNav from "@/components/mobile-bottom-nav"
import { useCart } from "@/contexts/cart-context"
import { useFavorites } from "@/contexts/favorites-context"
import { toast } from "@/hooks/use-toast"
import {
  getStoreDetails,
  getStoreProducts,
  type StoreDetails,
  type ProductWithPrices,
} from "@/lib/services/marketplace"

export default function StorePage() {
  const params = useParams()
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug

  const [store, setStore] = useState<StoreDetails | null>(null)
  const [products, setProducts] = useState<ProductWithPrices[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("name")

  const { addToCart } = useCart()
  const { favorites, addToFavorites, removeFromFavorites } = useFavorites()

  // Load store details
  useEffect(() => {
    async function loadStore() {
      if (!slug) return

      setLoading(true)
      setError(null)

      try {
        const storeData = await getStoreDetails(slug)

        if (!storeData) {
          setError("Store not found")
          return
        }

        setStore(storeData)

        // Load store products
        const productsData = await getStoreProducts(storeData.id)
        setProducts(productsData)
      } catch (err) {
        console.error("Error loading store:", err)
        setError("Failed to load store. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    loadStore()
  }, [slug])

  // Filter and sort products
  const filteredProducts = products
    .filter((product) => {
      const matchesSearch =
        !searchQuery ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.brand?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCategory =
        selectedCategory === "all" ||
        product.category.toLowerCase() === selectedCategory.toLowerCase()

      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      if (sortBy === "price-low") return a.lowest_price - b.lowest_price
      if (sortBy === "price-high") return b.lowest_price - a.lowest_price
      return a.name.localeCompare(b.name)
    })

  // Get unique categories from products
  const productCategories = [...new Set(products.map((p) => p.category))]

  const handleAddToCart = (product: ProductWithPrices) => {
    if (!store || product.prices.length === 0) return

    const price = product.prices[0]

    addToCart({
      productId: product.id,
      productName: product.name,
      productImage: product.thumbnail_url || "/placeholder.svg",
      storeId: store.id,
      storeName: store.name,
      price: price.price,
      taxes: price.price * 0.08, // Estimated 8% tax
      shippingCost: price.delivery_fee,
      quantity: 1,
      maxStock: price.quantity,
      estimatedDelivery: {
        min: 30,
        max: 60,
        unit: "hours" as const,
      },
      // Location info for fulfillment
      locationId: price.location_id || null,
      locationName: price.location_name || null,
      inventoryId: price.inventory_id || null,
    })

    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart`,
    })
  }

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
        brand: product.brand || "",
        dateAdded: new Date().toISOString(),
      })
      toast({
        title: "Added to favorites",
        description: `${product.name} has been added to your favorites`,
      })
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-64 w-full rounded-xl mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-0">
                  <Skeleton className="h-48 w-full" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-6 w-1/2" />
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

  // Error state
  if (error || !store) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <Store className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Store Not Found</h2>
            <p className="text-muted-foreground mb-6">
              {error || "The store you're looking for doesn't exist."}
            </p>
            <Link href="/">
              <Button>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Store Header */}
      <div className="relative">
        {/* Banner */}
        <div className="h-48 md:h-64 bg-gradient-to-r from-purple-600 to-blue-600 relative">
          {store.banner_url && (
            <Image
              src={store.banner_url}
              alt={store.name}
              fill
              className="object-cover"
            />
          )}
          <div className="absolute inset-0 bg-black/40" />
        </div>

        {/* Store Info Card */}
        <div className="container mx-auto px-4">
          <div className="relative -mt-16 md:-mt-20">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Logo */}
                  <div className="flex-shrink-0">
                    <div className="h-24 w-24 md:h-32 md:w-32 bg-muted rounded-xl flex items-center justify-center overflow-hidden border-4 border-background shadow-md">
                      {store.logo_url ? (
                        <Image
                          src={store.logo_url}
                          alt={store.name}
                          width={128}
                          height={128}
                          className="object-cover"
                        />
                      ) : (
                        <Store className="h-12 w-12 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Store Details */}
                  <div className="flex-1 space-y-4">
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl md:text-3xl font-bold">{store.name}</h1>
                        <Badge
                          className={
                            store.is_open
                              ? "bg-green-500/20 text-green-600 border-green-500/30"
                              : "bg-red-500/20 text-red-600 border-red-500/30"
                          }
                        >
                          {store.is_open ? "Open" : "Closed"}
                        </Badge>
                        {store.is_featured && (
                          <Badge className="bg-orange-500/20 text-orange-600 border-orange-500/30">
                            Featured
                          </Badge>
                        )}
                      </div>

                      {store.description && (
                        <p className="text-muted-foreground mt-2">{store.description}</p>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium">{store.rating.toFixed(1)}</span>
                        <span className="text-muted-foreground">
                          ({store.review_count} reviews)
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {store.address.street}, {store.address.city}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Truck className="h-4 w-4" />
                        <span>
                          ${store.delivery_info.delivery_fee} delivery
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{store.delivery_info.estimated_time}</span>
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="flex flex-wrap gap-3">
                      {store.phone && (
                        <a
                          href={`tel:${store.phone}`}
                          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                        >
                          <Phone className="h-4 w-4" />
                          {store.phone}
                        </a>
                      )}
                      {store.email && (
                        <a
                          href={`mailto:${store.email}`}
                          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                        >
                          <Mail className="h-4 w-4" />
                          {store.email}
                        </a>
                      )}
                      {store.website && (
                        <a
                          href={store.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                        >
                          <Globe className="h-4 w-4" />
                          Website
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {productCategories.map((cat) => (
                <SelectItem key={cat} value={cat.toLowerCase()}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? `No products match "${searchQuery}"`
                : "This store hasn't added any products yet."}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""} found
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => {
                const isFavorite = favorites.some((fav) => fav.id === product.id)
                const price = product.prices[0]
                const hasDiscount = price?.original_price && price.original_price > price.price

                return (
                  <Card
                    key={product.id}
                    className="group overflow-hidden transition-all duration-300 hover:shadow-lg"
                  >
                    <CardContent className="p-0">
                      <div className="relative">
                        <Link href={`/product/${product.slug || product.id}`}>
                          <div className="h-48 bg-muted flex items-center justify-center">
                            {product.thumbnail_url ? (
                              <Image
                                src={product.thumbnail_url}
                                alt={product.name}
                                width={200}
                                height={200}
                                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <Package className="h-16 w-16 text-muted-foreground" />
                            )}
                          </div>
                        </Link>

                        {/* Favorite Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`absolute top-2 right-2 h-8 w-8 rounded-full ${
                            isFavorite
                              ? "bg-red-500 text-white hover:bg-red-600"
                              : "bg-white/80 text-gray-600 hover:bg-white"
                          }`}
                          onClick={() => handleToggleFavorite(product)}
                        >
                          <Heart
                            className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`}
                          />
                        </Button>

                        {/* Discount Badge */}
                        {hasDiscount && (
                          <Badge className="absolute top-2 left-2 bg-red-500 text-white">
                            Sale
                          </Badge>
                        )}
                      </div>

                      <div className="p-4 space-y-3">
                        <div>
                          <Badge variant="secondary" className="text-xs mb-2">
                            {product.category}
                          </Badge>
                          <Link href={`/product/${product.slug || product.id}`}>
                            <h3 className="font-semibold line-clamp-2 hover:text-primary">
                              {product.name}
                            </h3>
                          </Link>
                          {product.brand && (
                            <p className="text-sm text-muted-foreground">{product.brand}</p>
                          )}
                        </div>

                        {/* Price */}
                        {price && (
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-primary">
                              ${price.price.toFixed(2)}
                            </span>
                            {hasDiscount && (
                              <span className="text-sm text-muted-foreground line-through">
                                ${price.original_price?.toFixed(2)}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Add to Cart */}
                        <Button
                          className="w-full"
                          onClick={() => handleAddToCart(product)}
                          disabled={!price || !price.in_stock}
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          {price?.in_stock ? "Add to Cart" : "Out of Stock"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </>
        )}
      </div>

      <MobileBottomNav />
    </div>
  )
}
