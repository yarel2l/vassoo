"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Star, Heart, Share2, ShoppingCart, Shield, Award, Mail, MessageCircle, Twitter, Facebook } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { useCart } from "@/contexts/cart-context"
import { useFavorites } from "@/contexts/favorites-context"
import { useShare } from "@/hooks/use-share"
import QuantitySelector from "@/components/quantity-selector"
import type { Product } from "@/types/product"

interface ProductInfoProps {
  product: Product
  selectedOffer: string | null
}

export default function ProductInfo({ product, selectedOffer }: ProductInfoProps) {
  const { t } = useLanguage()
  const { addToCart, getItemQuantity } = useCart()
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites()
  const { canShare, isSharing, shareProduct, shareViaEmail, shareViaWhatsApp, shareViaTwitter, shareViaFacebook } =
    useShare()
  const [quantity, setQuantity] = useState(1)

  const selectedOfferData = product.offers.find((offer) => offer.storeId === selectedOffer)
  const currentCartQuantity = selectedOfferData ? getItemQuantity(product.id, selectedOfferData.storeId) : 0
  const maxAvailable = selectedOfferData ? selectedOfferData.stock - currentCartQuantity : 0
  const isProductFavorite = isFavorite(product.id)

  // Auto-adjust quantity when switching stores if current quantity exceeds available stock
  useEffect(() => {
    if (selectedOfferData && quantity > maxAvailable && maxAvailable > 0) {
      setQuantity(maxAvailable)
    } else if (selectedOfferData && maxAvailable > 0 && quantity === 0) {
      setQuantity(1)
    }
  }, [selectedOffer, maxAvailable, quantity, selectedOfferData])

  const handleAddToCart = () => {
    if (!selectedOfferData) return

    addToCart({
      productId: product.id,
      productName: product.name,
      productImage: product.images[0],
      storeId: selectedOfferData.storeId,
      storeName: selectedOfferData.store.name,
      price: selectedOfferData.price,
      taxes: selectedOfferData.taxes,
      shippingCost: selectedOfferData.shippingCost,
      quantity,
      maxStock: selectedOfferData.stock,
      estimatedDelivery: selectedOfferData.estimatedDelivery,
      // Location info for fulfillment
      locationId: selectedOfferData.locationId || null,
      locationName: selectedOfferData.locationName || null,
      inventoryId: selectedOfferData.inventoryId || null,
    })

    // Reset quantity after adding to cart
    setQuantity(1)
  }

  const handleToggleFavorite = () => {
    if (isProductFavorite) {
      removeFromFavorites(product.id)
    } else {
      addToFavorites({
        id: product.id,
        name: product.name,
        brand: product.brand,
        category: product.category,
        image: product.images[0],
        price: selectedOfferData?.price || 0,
        rating: product.averageRating,
        dateAdded: new Date().toISOString(),
      })
    }
  }

  const handleShare = () => {
    const shareData = {
      title: `${product.name} - ${product.brand}`,
      text: `Check out this ${product.category.toLowerCase()} from ${product.brand}. ${product.description.substring(0, 100)}...`,
      url: `${window.location.origin}/product/${product.id}`,
    }

    shareProduct(shareData)
  }

  const handleShareVia = (method: string) => {
    const shareData = {
      title: `${product.name} - ${product.brand}`,
      text: `Check out this ${product.category.toLowerCase()} from ${product.brand}. ${product.description.substring(0, 100)}...`,
      url: `${window.location.origin}/product/${product.id}`,
    }

    switch (method) {
      case "email":
        shareViaEmail(shareData)
        break
      case "whatsapp":
        shareViaWhatsApp(shareData)
        break
      case "twitter":
        shareViaTwitter(shareData)
        break
      case "facebook":
        shareViaFacebook(shareData)
        break
    }
  }

  return (
    <div className="space-y-6">
      {/* Product Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary">{product.category}</Badge>
          <Badge variant="outline">{product.brand}</Badge>
        </div>
        <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{product.averageRating}</span>
            <span>({product.totalReviews} reviews)</span>
          </div>
          <span>•</span>
          <span>{product.offers.length} stores available</span>
        </div>
      </div>

      {/* Price Section */}
      {selectedOfferData && (
        <div className="bg-muted/30 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Best offer from:</span>
            <div className="flex items-center gap-2">
              <img
                src={selectedOfferData.store.logo || "/placeholder.svg"}
                alt={selectedOfferData.store.name}
                className="w-6 h-6 rounded"
              />
              <span className="font-medium">{selectedOfferData.store.name}</span>
              {selectedOfferData.store.verified && <Shield className="h-4 w-4 text-green-600" />}
            </div>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl font-bold text-primary">${selectedOfferData.price}</span>
            {selectedOfferData.originalPrice && (
              <>
                <span className="text-lg text-muted-foreground line-through">${selectedOfferData.originalPrice}</span>
                <Badge className="bg-red-600">-{selectedOfferData.discount}%</Badge>
              </>
            )}
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>+ ${selectedOfferData.taxes.toFixed(2)} taxes</div>
            <div>
              + ${selectedOfferData.shippingCost.toFixed(2)} shipping
              {selectedOfferData.freeShippingThreshold && (
                <span className="text-green-600 ml-1">(Free over ${selectedOfferData.freeShippingThreshold})</span>
              )}
            </div>
            <div className="font-medium text-foreground">
              Total: $
              {(
                (selectedOfferData.price + selectedOfferData.taxes + selectedOfferData.shippingCost) *
                quantity
              ).toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Quantity and Stock Info */}
      {selectedOfferData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Quantity:</label>
              <div className="text-xs text-muted-foreground mt-1">
                {currentCartQuantity > 0 && (
                  <span className="text-primary">{currentCartQuantity} already in cart • </span>
                )}
                {maxAvailable} available from this store
              </div>
            </div>
            <QuantitySelector
              min={1}
              max={Math.max(1, maxAvailable)}
              value={quantity}
              onChange={setQuantity}
              disabled={maxAvailable === 0}
            />
          </div>

          {maxAvailable === 0 && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-red-600 dark:text-red-400 text-sm font-medium">
                Out of stock from this store. Try selecting a different store.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          size="lg"
          className="flex-1"
          onClick={handleAddToCart}
          disabled={!selectedOfferData || maxAvailable === 0}
        >
          <ShoppingCart className="mr-2 h-5 w-5" />
          Add {quantity > 1 ? `${quantity} ` : ""}to Cart
        </Button>
        <Button variant="outline" size="lg" onClick={handleToggleFavorite}>
          <Heart className={`h-5 w-5 ${isProductFavorite ? "fill-red-500 text-red-500" : ""}`} />
        </Button>

        {/* Share Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="lg" disabled={isSharing}>
              <Share2 className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canShare && (
              <DropdownMenuItem onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => handleShareVia("email")}>
              <Mail className="mr-2 h-4 w-4" />
              Email
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleShareVia("whatsapp")}>
              <MessageCircle className="mr-2 h-4 w-4" />
              WhatsApp
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleShareVia("twitter")}>
              <Twitter className="mr-2 h-4 w-4" />
              Twitter
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleShareVia("facebook")}>
              <Facebook className="mr-2 h-4 w-4" />
              Facebook
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Product Details Tabs */}
      <Tabs defaultValue="description" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="specifications">Specifications</TabsTrigger>
        </TabsList>
        <TabsContent value="description" className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">{product.description}</p>
          {product.tags.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Tags:</h4>
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
        <TabsContent value="specifications" className="space-y-4">
          <div className="grid gap-3">
            {Object.entries(product.specifications).map(([key, value]) => (
              <div key={key} className="flex justify-between py-2 border-b border-border/50">
                <span className="font-medium">{key}:</span>
                <span className="text-muted-foreground">{value}</span>
              </div>
            ))}
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
  )
}
