"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import MobileBottomNav from "@/components/mobile-bottom-nav"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  Heart,
  Share2,
  ShoppingCart,
  Shield,
  Award,
  Mail,
  MessageCircle,
  Twitter,
  Facebook,
  MapPin,
  Truck,
  Package,
  Tag,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Expand,
  Store,
  Percent,
  AlertCircle,
  MessageSquare,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCart } from "@/contexts/cart-context"
import { useFavorites } from "@/contexts/favorites-context"
import { useShare } from "@/hooks/use-share"
import { toast } from "@/hooks/use-toast"
import QuantitySelector from "@/components/quantity-selector"
import GlassRating, { GlassRatingCompact } from "@/components/glass-rating"
import { getProduct, type ProductWithPrices, type StorePrice } from "@/lib/services/marketplace"

export default function ProductPage() {
  const params = useParams()
  const [product, setProduct] = useState<ProductWithPrices | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)

  const { addToCart, getItemQuantity } = useCart()
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites()
  const { canShare, isSharing, shareProduct, shareViaEmail, shareViaWhatsApp, shareViaTwitter, shareViaFacebook } = useShare()

  useEffect(() => {
    async function loadProduct() {
      if (!params.id) return

      setLoading(true)
      setError(null)

      try {
        const idOrSlug = Array.isArray(params.id) ? params.id[0] : params.id
        const productData = await getProduct(idOrSlug)

        if (!productData) {
          setError("Product not found")
          return
        }

        setProduct(productData)

        // Select the first store (best price) by default
        if (productData.prices.length > 0) {
          setSelectedStoreId(productData.prices[0].store_id)
        }
      } catch (err) {
        console.error("Error loading product:", err)
        setError("Failed to load product. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    loadProduct()
  }, [params.id])

  const selectedStore = product?.prices.find(p => p.store_id === selectedStoreId)
  const currentCartQuantity = selectedStore ? getItemQuantity(product!.id, selectedStore.store_id) : 0
  const maxAvailable = selectedStore ? selectedStore.quantity - currentCartQuantity : 0
  const isProductFavorite = product ? isFavorite(product.id) : false
  const images = product?.images?.length ? product.images : [product?.thumbnail_url || "/placeholder.svg"]
  const isSingleStore = product?.prices.length === 1
  const hasMultipleStores = (product?.prices.length || 0) > 1

  // Auto-adjust quantity when switching stores
  useEffect(() => {
    if (selectedStore && quantity > maxAvailable && maxAvailable > 0) {
      setQuantity(maxAvailable)
    } else if (selectedStore && maxAvailable > 0 && quantity === 0) {
      setQuantity(1)
    }
  }, [selectedStoreId, maxAvailable, quantity, selectedStore])

  const handleAddToCart = () => {
    if (!product || !selectedStore) return

    // Estimated tax rate (~8%) - actual taxes will be calculated at checkout
    // based on the shipping address using the tax_rates table
    const estimatedTaxRate = 0.08
    const estimatedTaxes = selectedStore.price * estimatedTaxRate

    addToCart({
      productId: product.id,
      productName: product.name,
      productImage: images[0],
      storeId: selectedStore.store_id,
      storeName: selectedStore.store_name,
      price: selectedStore.price,
      taxes: estimatedTaxes, // Estimate - recalculated at checkout based on address
      shippingCost: selectedStore.delivery_fee,
      quantity,
      maxStock: selectedStore.quantity,
      estimatedDelivery: {
        min: 30,
        max: 60,
        unit: "hours" as const,
      },
      // Location info for fulfillment
      locationId: selectedStore.location_id || null,
      locationName: selectedStore.location_name || null,
      inventoryId: selectedStore.inventory_id || null,
    })

    toast({
      title: "Added to cart",
      description: `${quantity} x ${product.name} from ${selectedStore.store_name}`,
    })

    setQuantity(1)
  }

  const handleToggleFavorite = () => {
    if (!product) return

    if (isProductFavorite) {
      removeFromFavorites(product.id)
      toast({ title: "Removed from favorites" })
    } else {
      addToFavorites({
        id: product.id,
        name: product.name,
        brand: product.brand || "",
        category: product.category,
        image: images[0],
        price: product.lowest_price,
        rating: 0,
        dateAdded: new Date().toISOString(),
      })
      toast({ title: "Added to favorites" })
    }
  }

  const handleShare = () => {
    if (!product) return
    shareProduct({
      title: `${product.name} - ${product.brand || ""}`,
      text: `Check out ${product.name}${product.description ? `: ${product.description.substring(0, 100)}...` : ""}`,
      url: `${window.location.origin}/product/${product.slug || product.id}`,
    })
  }

  const handleShareVia = (method: string) => {
    if (!product) return
    const shareData = {
      title: `${product.name} - ${product.brand || ""}`,
      text: `Check out ${product.name}`,
      url: `${window.location.origin}/product/${product.slug || product.id}`,
    }
    switch (method) {
      case "email": shareViaEmail(shareData); break
      case "whatsapp": shareViaWhatsApp(shareData); break
      case "twitter": shareViaTwitter(shareData); break
      case "facebook": shareViaFacebook(shareData); break
    }
  }

  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % images.length)
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-48 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="aspect-square bg-muted rounded-lg"></div>
              <div className="space-y-4">
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-20 bg-muted rounded"></div>
                <div className="h-12 bg-muted rounded w-32"></div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
        <MobileBottomNav />
      </main>
    )
  }

  // Error state
  if (error || !product) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Product Not Found</h2>
            <p className="text-muted-foreground mb-6">{error || "The product you're looking for doesn't exist."}</p>
            <Link href="/">
              <Button className="bg-orange-600 hover:bg-orange-700">
                Go back to home
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
        <MobileBottomNav />
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="container mx-auto px-4 py-6 pb-24 md:pb-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span className="mx-2">/</span>
          <Link href={`/search?category=${product.category}`} className="hover:text-foreground">{product.category}</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        {/* Main Product Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Product Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square bg-muted rounded-lg overflow-hidden group">
              <Image
                src={images[currentImageIndex] || "/placeholder.svg"}
                alt={`${product.name} - Image ${currentImageIndex + 1}`}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                priority
              />

              {images.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={nextImage}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}

              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Expand className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <div className="relative aspect-square">
                    <Image
                      src={images[currentImageIndex] || "/placeholder.svg"}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                </DialogContent>
              </Dialog>

              {images.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                  {currentImageIndex + 1} / {images.length}
                </div>
              )}
            </div>

            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                      currentImageIndex === index ? "border-orange-500" : "border-transparent hover:border-muted-foreground"
                    }`}
                  >
                    <Image src={image || "/placeholder.svg"} alt={`Thumbnail ${index + 1}`} fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">{product.category}</Badge>
                {product.brand && <Badge variant="outline">{product.brand}</Badge>}
                {product.age_restriction && (
                  <Badge variant="destructive">{product.age_restriction}+</Badge>
                )}
              </div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
                  {hasMultipleStores && (
                    <p className="text-muted-foreground">
                      Available at {product.prices.length} stores - Compare prices below
                    </p>
                  )}
                </div>
                {/* Action Buttons - Favorite & Share */}
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleToggleFavorite}
                    className={`h-10 w-10 rounded-full ${isProductFavorite ? "border-red-500 bg-red-50 dark:bg-red-950/20" : ""}`}
                  >
                    <Heart className={`h-5 w-5 ${isProductFavorite ? "fill-red-500 text-red-500" : ""}`} />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" disabled={isSharing} className="h-10 w-10 rounded-full">
                        <Share2 className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canShare && (
                        <DropdownMenuItem onClick={handleShare}>
                          <Share2 className="mr-2 h-4 w-4" /> Share
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleShareVia("email")}>
                        <Mail className="mr-2 h-4 w-4" /> Email
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShareVia("whatsapp")}>
                        <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShareVia("twitter")}>
                        <Twitter className="mr-2 h-4 w-4" /> Twitter
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShareVia("facebook")}>
                        <Facebook className="mr-2 h-4 w-4" /> Facebook
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Single Store View - Show all details inline */}
            {isSingleStore && selectedStore && (
              <SingleStoreDetails
                store={selectedStore}
                quantity={quantity}
                setQuantity={setQuantity}
                maxAvailable={maxAvailable}
                currentCartQuantity={currentCartQuantity}
                onAddToCart={handleAddToCart}
              />
            )}

            {/* Multiple Stores - Show selected store summary */}
            {hasMultipleStores && selectedStore && (
              <div className="bg-muted/30 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">Selected store:</span>
                  <Link href={`/store/${selectedStore.store_slug}`} className="flex items-center gap-2 hover:text-orange-600">
                    {selectedStore.store_logo ? (
                      <Image
                        src={selectedStore.store_logo}
                        alt={selectedStore.store_name}
                        width={24}
                        height={24}
                        className="rounded"
                      />
                    ) : (
                      <Store className="h-5 w-5" />
                    )}
                    <span className="font-medium">{selectedStore.store_name}</span>
                  </Link>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl font-bold text-primary">${selectedStore.price.toFixed(2)}</span>
                  {selectedStore.original_price && selectedStore.original_price > selectedStore.price && (
                    <>
                      <span className="text-lg text-muted-foreground line-through">
                        ${selectedStore.original_price.toFixed(2)}
                      </span>
                      <Badge className="bg-red-600">
                        -{Math.round(((selectedStore.original_price - selectedStore.price) / selectedStore.original_price) * 100)}%
                      </Badge>
                    </>
                  )}
                </div>

                {/* Delivery Info Summary */}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                  {selectedStore.is_delivery_available && (
                    <div className="flex items-center gap-1">
                      <Truck className="h-4 w-4 text-green-600" />
                      <span>${selectedStore.delivery_fee.toFixed(2)} delivery</span>
                      {selectedStore.free_delivery_threshold && (
                        <span className="text-green-600">(Free over ${selectedStore.free_delivery_threshold})</span>
                      )}
                    </div>
                  )}
                  {selectedStore.is_pickup_available && (
                    <div className="flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      <span>Pickup: {selectedStore.estimated_pickup}</span>
                    </div>
                  )}
                </div>

                {/* Quantity and Add to Cart */}
                <div className="flex items-center gap-4">
                  <div>
                    <label className="text-sm font-medium">Qty:</label>
                    <div className="text-xs text-muted-foreground">
                      {maxAvailable} available
                    </div>
                  </div>
                  <QuantitySelector
                    min={1}
                    max={Math.max(1, maxAvailable)}
                    value={quantity}
                    onChange={setQuantity}
                    disabled={maxAvailable === 0}
                  />
                  <Button
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                    onClick={handleAddToCart}
                    disabled={maxAvailable === 0}
                  >
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Add to Cart
                  </Button>
                </div>
              </div>
            )}

            {/* Description & Specs */}
            <Tabs defaultValue="description" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="description">Description</TabsTrigger>
                <TabsTrigger value="specifications">Details</TabsTrigger>
              </TabsList>
              <TabsContent value="description" className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  {product.description || `Premium ${product.category} from ${product.brand || "our collection"}.`}
                </p>
              </TabsContent>
              <TabsContent value="specifications" className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="font-medium">Category:</span>
                    <span className="text-muted-foreground">{product.category}</span>
                  </div>
                  {product.brand && (
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="font-medium">Brand:</span>
                      <span className="text-muted-foreground">{product.brand}</span>
                    </div>
                  )}
                  {product.subcategory && (
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="font-medium">Subcategory:</span>
                      <span className="text-muted-foreground">{product.subcategory}</span>
                    </div>
                  )}
                  {product.age_restriction && (
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="font-medium">Age Restriction:</span>
                      <span className="text-muted-foreground">{product.age_restriction}+</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="font-medium">Available Stores:</span>
                    <span className="text-muted-foreground">{product.prices.length}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="font-medium">Price Range:</span>
                    <span className="text-muted-foreground">{product.price_range_text}</span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Trust Indicators */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Shield className="h-4 w-4 text-green-600" />
                <span>Secure Payment</span>
              </div>
              <div className="flex items-center gap-1">
                <Award className="h-4 w-4 text-blue-600" />
                <span>Authenticity Guaranteed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Store Comparison Section - Only for multiple stores */}
        {hasMultipleStores && (
          <StoreComparisonSection
            stores={product.prices}
            selectedStoreId={selectedStoreId}
            onSelectStore={setSelectedStoreId}
          />
        )}

        {/* Store Reviews Section */}
        {selectedStore && (
          <StoreReviewsSection
            store={selectedStore}
          />
        )}
      </div>

      <Footer />
      <MobileBottomNav />
    </main>
  )
}

// Single Store Details Component
function SingleStoreDetails({
  store,
  quantity,
  setQuantity,
  maxAvailable,
  currentCartQuantity,
  onAddToCart,
}: {
  store: StorePrice
  quantity: number
  setQuantity: (qty: number) => void
  maxAvailable: number
  currentCartQuantity: number
  onAddToCart: () => void
}) {
  const hasDiscount = store.original_price && store.original_price > store.price
  const discountPercent = hasDiscount
    ? Math.round(((store.original_price! - store.price) / store.original_price!) * 100)
    : 0

  return (
    <div className="space-y-4">
      {/* Store Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Link href={`/store/${store.store_slug}`} className="flex items-center gap-3 hover:text-orange-600">
              {store.store_logo ? (
                <Image
                  src={store.store_logo}
                  alt={store.store_name}
                  width={48}
                  height={48}
                  className="rounded-lg"
                />
              ) : (
                <div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center">
                  <Store className="h-6 w-6" />
                </div>
              )}
              <div>
                <h3 className="font-semibold">{store.store_name}</h3>
                <GlassRatingCompact
                  rating={store.store_rating}
                  reviewCount={store.store_review_count}
                  className="text-muted-foreground"
                />
              </div>
            </Link>
            <Badge variant="outline" className="text-green-600 border-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          </div>

          {/* Price */}
          <div className="mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-primary">${store.price.toFixed(2)}</span>
              {hasDiscount && (
                <>
                  <span className="text-lg text-muted-foreground line-through">
                    ${store.original_price!.toFixed(2)}
                  </span>
                  <Badge className="bg-red-600">-{discountPercent}%</Badge>
                </>
              )}
            </div>
          </div>

          {/* Delivery & Pickup Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {store.is_delivery_available && (
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Truck className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <div className="font-medium">Delivery</div>
                  <div className="text-sm text-muted-foreground">
                    {store.delivery_fee > 0 ? `$${store.delivery_fee.toFixed(2)}` : "Free"}
                    {store.free_delivery_threshold && store.delivery_fee > 0 && (
                      <span className="text-green-600 ml-1">(Free over ${store.free_delivery_threshold})</span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">{store.estimated_delivery}</div>
                  {store.minimum_order_amount > 0 && (
                    <div className="text-xs text-amber-600">Min. order: ${store.minimum_order_amount}</div>
                  )}
                </div>
              </div>
            )}
            {store.is_pickup_available && (
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Package className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <div className="font-medium">Store Pickup</div>
                  <div className="text-sm text-muted-foreground">Free</div>
                  <div className="text-sm text-muted-foreground">{store.estimated_pickup}</div>
                </div>
              </div>
            )}
          </div>

          {/* Available Coupons */}
          {store.coupons.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Tag className="h-4 w-4 text-orange-600" />
                Available Coupons
              </h4>
              <div className="space-y-2">
                {store.coupons.map((coupon) => (
                  <div
                    key={coupon.id}
                    className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4 text-orange-600" />
                      <div>
                        <code className="font-mono font-bold text-orange-600">{coupon.code}</code>
                        {coupon.description && (
                          <p className="text-xs text-muted-foreground">{coupon.description}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-orange-600 border-orange-600">
                      {coupon.type === "percentage" ? `${coupon.value}% OFF` : `$${coupon.value} OFF`}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stock Info */}
          <div className="mb-4">
            <div className={`text-sm ${store.quantity < 5 ? "text-red-600" : "text-green-600"}`}>
              {store.quantity > 0 ? (
                <>
                  <CheckCircle className="h-4 w-4 inline mr-1" />
                  {store.quantity} in stock
                  {currentCartQuantity > 0 && (
                    <span className="text-muted-foreground ml-2">({currentCartQuantity} in cart)</span>
                  )}
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  Out of stock
                </>
              )}
            </div>
          </div>

          <Separator className="my-4" />

          {/* Quantity & Add to Cart */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Quantity:</label>
              <QuantitySelector
                min={1}
                max={Math.max(1, maxAvailable)}
                value={quantity}
                onChange={setQuantity}
                disabled={maxAvailable === 0}
              />
            </div>
            <Button
              className="flex-1 bg-orange-600 hover:bg-orange-700"
              size="lg"
              onClick={onAddToCart}
              disabled={maxAvailable === 0}
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              Add to Cart
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Store Comparison Section Component
function StoreComparisonSection({
  stores,
  selectedStoreId,
  onSelectStore,
}: {
  stores: StorePrice[]
  selectedStoreId: string | null
  onSelectStore: (storeId: string) => void
}) {
  const sortedStores = [...stores].sort((a, b) => a.price - b.price)

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Compare {stores.length} Stores</h2>
        <p className="text-muted-foreground">Select a store to purchase from - Sorted by price</p>
      </div>

      <div className="grid gap-4">
        {sortedStores.map((store, index) => {
          const isSelected = store.store_id === selectedStoreId
          const isBestPrice = index === 0
          const hasDiscount = store.original_price && store.original_price > store.price
          const discountPercent = hasDiscount
            ? Math.round(((store.original_price! - store.price) / store.original_price!) * 100)
            : 0

          return (
            <Card
              key={store.store_id}
              className={`cursor-pointer transition-all duration-200 ${
                isSelected ? "ring-2 ring-orange-500 border-orange-500" : "hover:shadow-md"
              }`}
              onClick={() => onSelectStore(store.store_id)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Store Info */}
                  <div className="flex items-center gap-3 flex-1">
                    {store.store_logo ? (
                      <Image
                        src={store.store_logo}
                        alt={store.store_name}
                        width={48}
                        height={48}
                        className="rounded-lg"
                      />
                    ) : (
                      <div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center">
                        <Store className="h-6 w-6" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{store.store_name}</h3>
                        {isBestPrice && (
                          <Badge className="bg-green-600 text-xs">Best Price</Badge>
                        )}
                        {isSelected && (
                          <CheckCircle className="h-5 w-5 text-orange-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <GlassRatingCompact
                          rating={store.store_rating}
                          reviewCount={store.store_review_count}
                        />
                        {store.distance_miles > 0 && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {store.distance_miles.toFixed(1)} mi
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-primary">${store.price.toFixed(2)}</span>
                        {hasDiscount && (
                          <Badge className="bg-red-600 text-xs">-{discountPercent}%</Badge>
                        )}
                      </div>
                      {hasDiscount && (
                        <span className="text-sm text-muted-foreground line-through">
                          ${store.original_price!.toFixed(2)}
                        </span>
                      )}
                    </div>

                    {/* Delivery/Pickup Info */}
                    <div className="hidden md:flex flex-col gap-1 text-sm text-muted-foreground min-w-[120px]">
                      {store.is_delivery_available && (
                        <div className="flex items-center gap-1">
                          <Truck className="h-3 w-3" />
                          <span>
                            {store.delivery_fee > 0 ? `$${store.delivery_fee.toFixed(2)}` : "Free"} delivery
                          </span>
                        </div>
                      )}
                      {store.is_pickup_available && (
                        <div className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          <span>Pickup: {store.estimated_pickup}</span>
                        </div>
                      )}
                    </div>

                    {/* Coupons indicator */}
                    {store.coupons.length > 0 && (
                      <Badge variant="outline" className="text-orange-600 border-orange-600 hidden sm:flex">
                        <Tag className="h-3 w-3 mr-1" />
                        {store.coupons.length} coupon{store.coupons.length > 1 ? "s" : ""}
                      </Badge>
                    )}

                    {/* Stock */}
                    <div className={`text-sm ${store.quantity < 5 ? "text-red-600" : "text-green-600"} min-w-[80px] text-right`}>
                      {store.quantity > 0 ? `${store.quantity} in stock` : "Out of stock"}
                    </div>
                  </div>
                </div>

                {/* Mobile: Delivery info & Coupons */}
                <div className="md:hidden mt-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
                  {store.is_delivery_available && (
                    <span className="flex items-center gap-1">
                      <Truck className="h-3 w-3" />
                      {store.delivery_fee > 0 ? `$${store.delivery_fee.toFixed(2)}` : "Free"} delivery
                    </span>
                  )}
                  {store.is_pickup_available && (
                    <span className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      Pickup available
                    </span>
                  )}
                  {store.coupons.length > 0 && (
                    <Badge variant="outline" className="text-orange-600 border-orange-600">
                      <Tag className="h-3 w-3 mr-1" />
                      {store.coupons.length} coupon{store.coupons.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>

                {/* Expanded Coupons - show when selected */}
                {isSelected && store.coupons.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Tag className="h-4 w-4 text-orange-600" />
                      Available Coupons
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {store.coupons.map((coupon) => (
                        <div
                          key={coupon.id}
                          className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg"
                        >
                          <code className="font-mono font-bold text-orange-600">{coupon.code}</code>
                          <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs">
                            {coupon.type === "percentage" ? `${coupon.value}% OFF` : `$${coupon.value} OFF`}
                          </Badge>
                          {coupon.minimum_order_amount && (
                            <span className="text-xs text-muted-foreground">
                              (Min. ${coupon.minimum_order_amount})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}

// Store Reviews Section Component
function StoreReviewsSection({
  store,
}: {
  store: StorePrice
}) {
  return (
    <section className="space-y-6 mt-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Store Reviews</h2>
          <p className="text-muted-foreground">
            Reviews for {store.store_name}
          </p>
        </div>
        <Link href={`/store/${store.store_slug}#reviews`}>
          <Button variant="outline">
            View All Reviews
          </Button>
        </Link>
      </div>

      {/* Rating Summary */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Overall Rating with Glass */}
            <div className="flex flex-col items-center text-center">
              <div className="text-5xl font-bold text-primary mb-2">
                {store.store_rating.toFixed(1)}
              </div>
              <GlassRating
                rating={store.store_rating}
                size="lg"
                className="mb-2"
              />
              <p className="text-sm text-muted-foreground">
                Based on {store.store_review_count} reviews
              </p>
            </div>

            <Separator orientation="vertical" className="hidden md:block h-24" />
            <Separator className="md:hidden" />

            {/* Rating Breakdown */}
            <div className="flex-1 space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                // Simulated distribution - in real app, fetch from DB
                const percentage = rating === 5 ? 65 :
                                   rating === 4 ? 20 :
                                   rating === 3 ? 10 :
                                   rating === 2 ? 3 : 2
                return (
                  <div key={rating} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-16">
                      <GlassRating rating={rating} maxRating={1} size="sm" />
                      <span className="text-sm text-muted-foreground">{rating}</span>
                    </div>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-10 text-right">
                      {percentage}%
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Reviews or Empty State */}
      {store.store_review_count > 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4 inline mr-1" />
            Recent reviews from customers who purchased from this store
          </p>

          {/* Placeholder for reviews - would be loaded from DB */}
          <div className="grid gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-medium">JD</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">John D.</span>
                      <span className="text-xs text-muted-foreground">2 days ago</span>
                    </div>
                    <GlassRating rating={5} size="sm" className="mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Great service and fast delivery! The product arrived in perfect condition.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-medium">SM</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">Sarah M.</span>
                      <span className="text-xs text-muted-foreground">1 week ago</span>
                    </div>
                    <GlassRating rating={4} size="sm" className="mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Good selection and competitive prices. Would order again.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <Link href={`/store/${store.store_slug}#reviews`}>
              <Button variant="link" className="text-orange-600">
                See all {store.store_review_count} reviews
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No Reviews Yet</h3>
            <p className="text-muted-foreground">
              Be the first to review this store after making a purchase!
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  )
}
