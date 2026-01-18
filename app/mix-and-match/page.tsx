"use client"

import { useState, useEffect } from "react"
import { Shuffle, Plus, Minus, ShoppingCart, Check, X, Package, Gift, ArrowLeft } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useCart } from "@/contexts/cart-context"
import { useLanguage } from "@/components/language-provider"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import Image from "next/image"
import Link from "next/link"

interface MixMatchProduct {
  id: string
  name: string
  price: number
  image: string
  // Location info for fulfillment
  inventoryId: string
  locationId: string | null
  locationName: string | null
}

interface MixMatchDeal {
  id: string
  title: string
  description: string
  discount: number
  discountType: 'percentage' | 'fixed'
  minItems: number
  maxItems: number
  storeId: string
  storeName: string
  category: string | null
  products: MixMatchProduct[]
}

interface MixMatchData {
  deals: MixMatchDeal[]
  hasMore: boolean
  count: number
}

export default function MixAndMatchPage() {
  const { t } = useLanguage()
  const { addToCart } = useCart()
  const [data, setData] = useState<MixMatchData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState<{ [dealId: string]: { [productId: string]: number } }>({})

  // Fetch mix & match data
  useEffect(() => {
    async function fetchMixMatch() {
      try {
        const response = await fetch('/api/homepage/mix-match?limit=50')
        const result = await response.json()
        setData(result)
      } catch (error) {
        console.error('Error fetching mix & match deals:', error)
        setData({ deals: [], hasMore: false, count: 0 })
      } finally {
        setLoading(false)
      }
    }

    fetchMixMatch()
  }, [])

  const updateQuantity = (dealId: string, productId: string, change: number) => {
    setSelectedItems((prev) => {
      const newSelected = { ...prev }
      if (!newSelected[dealId]) newSelected[dealId] = {}

      const currentQty = newSelected[dealId][productId] || 0
      const newQty = Math.max(0, currentQty + change)

      if (newQty === 0) {
        delete newSelected[dealId][productId]
      } else {
        newSelected[dealId][productId] = newQty
      }

      return newSelected
    })
  }

  const getSelectedCount = (dealId: string) => {
    const dealItems = selectedItems[dealId] || {}
    return Object.values(dealItems).reduce((sum, qty) => sum + qty, 0)
  }

  const getSelectedTotal = (deal: MixMatchDeal) => {
    const dealItems = selectedItems[deal.id] || {}
    return Object.entries(dealItems).reduce((total, [productId, qty]) => {
      const product = deal.products.find((p) => p.id === productId)
      return total + (product ? product.price * qty : 0)
    }, 0)
  }

  const getDiscountAmount = (deal: MixMatchDeal) => {
    const total = getSelectedTotal(deal)
    return deal.discountType === 'percentage' ? (total * deal.discount) / 100 : deal.discount
  }

  const getFinalTotal = (deal: MixMatchDeal) => {
    return getSelectedTotal(deal) - getDiscountAmount(deal)
  }

  const canAddToCart = (deal: MixMatchDeal) => {
    const count = getSelectedCount(deal.id)
    return count >= deal.minItems && count <= deal.maxItems
  }

  const handleAddToCart = (deal: MixMatchDeal) => {
    const dealItems = selectedItems[deal.id] || {}
    Object.entries(dealItems).forEach(([productId, qty]) => {
      const product = deal.products.find((p) => p.id === productId)
      if (product) {
        const discountedPrice =
          deal.discountType === 'percentage'
            ? product.price * (1 - deal.discount / 100)
            : product.price - deal.discount / deal.maxItems

        addToCart({
          productId: product.id,
          productName: product.name,
          productImage: product.image,
          storeId: deal.storeId,
          storeName: deal.storeName,
          price: discountedPrice,
          taxes: 0,
          shippingCost: 0,
          quantity: qty,
          maxStock: 100,
          estimatedDelivery: {
            min: 1,
            max: 3,
            unit: "days"
          },
          // Location info for fulfillment
          locationId: product.locationId || null,
          locationName: product.locationName || null,
          inventoryId: product.inventoryId || null,
        })
      }
    })

    // Reset selection for this deal
    setSelectedItems((prev) => ({
      ...prev,
      [deal.id]: {},
    }))
  }

  const getDealColor = (category: string | null) => {
    switch (category?.toLowerCase()) {
      case 'wine':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
      case 'spirits':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
      case 'beer':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
      default:
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1">
          <div className="bg-gradient-to-r from-orange-500 to-purple-500 text-white">
            <div className="container mx-auto px-4 py-12">
              <Skeleton className="h-10 w-64 bg-white/20 mb-4" />
              <Skeleton className="h-6 w-96 bg-white/20" />
            </div>
          </div>
          <div className="container mx-auto px-4 py-8">
            <div className="space-y-8">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-8 w-48 mb-4" />
                    <Skeleton className="h-4 w-64 mb-6" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[1, 2, 3].map((j) => (
                        <Skeleton key={j} className="h-48 w-full rounded-lg" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // No deals available
  if (!data || data.deals.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1">
          <div className="bg-gradient-to-r from-orange-500 to-purple-500 text-white">
            <div className="container mx-auto px-4 py-12">
              <div className="flex items-center space-x-3 mb-4">
                <Shuffle className="h-8 w-8" />
                <h1 className="text-3xl font-bold">{t("mixMatch.title")}</h1>
              </div>
              <p className="text-orange-100 text-lg">{t("mixMatch.subtitle")}</p>
            </div>
          </div>
          <div className="container mx-auto px-4 py-16 text-center">
            <Shuffle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No Mix & Match Deals Available</h2>
            <p className="text-muted-foreground mb-6">
              Check back soon for exciting bundle deals and combinations!
            </p>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-purple-500 text-white">
          <div className="container mx-auto px-4 py-12">
            <div className="flex items-center space-x-3 mb-4">
              <Shuffle className="h-8 w-8" />
              <h1 className="text-3xl font-bold">{t("mixMatch.title")}</h1>
            </div>
            <p className="text-orange-100 text-lg">{t("mixMatch.subtitle")}</p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <p className="text-muted-foreground">
              {data.count} {data.count === 1 ? 'deal' : 'deals'} available
            </p>
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>

          {/* Deals */}
          <div className="space-y-12">
            {data.deals.map((deal) => {
              const selectedCount = getSelectedCount(deal.id)
              const total = getSelectedTotal(deal)
              const discount = getDiscountAmount(deal)
              const finalTotal = getFinalTotal(deal)
              const isValid = canAddToCart(deal)
              const colorClass = getDealColor(deal.category)

              return (
                <Card key={deal.id} className="overflow-hidden">
                  <CardHeader className={`${colorClass} p-6`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Shuffle className="h-6 w-6" />
                        <div>
                          <CardTitle className="text-2xl">{deal.title}</CardTitle>
                          <p className="opacity-80">{deal.description}</p>
                          <p className="text-sm opacity-70 mt-1">From: {deal.storeName}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-lg px-3 py-1">
                        {deal.discountType === 'percentage' ? `${deal.discount}% OFF` : `$${deal.discount} OFF`}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6">
                    {/* Selection Status */}
                    <div className="mb-6 p-4 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">
                          Selected: {selectedCount} / {deal.maxItems} items
                        </span>
                        <div className="flex items-center space-x-2">
                          {selectedCount >= deal.minItems ? (
                            <Check className="h-5 w-5 text-green-600" />
                          ) : (
                            <X className="h-5 w-5 text-red-600" />
                          )}
                          <span className={selectedCount >= deal.minItems ? "text-green-600" : "text-red-600"}>
                            {selectedCount >= deal.minItems
                              ? "Ready to add"
                              : `Need ${deal.minItems - selectedCount} more`}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min((selectedCount / deal.maxItems) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Products Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                      {deal.products.map((product) => {
                        const quantity = selectedItems[deal.id]?.[product.id] || 0
                        return (
                          <Card key={product.id} className="group hover:shadow-md transition-all duration-300">
                            <CardContent className="p-4">
                              <div className="aspect-square mb-4 overflow-hidden rounded-lg">
                                <Image
                                  src={product.image || "/placeholder.svg"}
                                  alt={product.name}
                                  width={200}
                                  height={200}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>

                              <h4 className="font-semibold mb-1 line-clamp-2">{product.name}</h4>
                              <div className="flex items-center justify-between mb-3">
                                <span className="font-bold text-lg text-orange-600">${product.price.toFixed(2)}</span>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateQuantity(deal.id, product.id, -1)}
                                    disabled={quantity === 0}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <span className="w-8 text-center font-medium">{quantity}</span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateQuantity(deal.id, product.id, 1)}
                                    disabled={selectedCount >= deal.maxItems && quantity === 0}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                                {quantity > 0 && (
                                  <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                    Selected
                                  </Badge>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>

                    {/* Order Summary */}
                    {selectedCount > 0 && (
                      <Card className="bg-muted/50">
                        <CardContent className="p-6">
                          <h4 className="font-semibold mb-4 flex items-center">
                            <Package className="h-5 w-5 mr-2" />
                            Order Summary
                          </h4>

                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between">
                              <span>Subtotal ({selectedCount} items)</span>
                              <span>${total.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-green-600">
                              <span>
                                Discount ({deal.discountType === 'percentage' ? `${deal.discount}%` : `$${deal.discount}`})
                              </span>
                              <span>-${discount.toFixed(2)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between font-bold text-lg">
                              <span>Total</span>
                              <span>${finalTotal.toFixed(2)}</span>
                            </div>
                            <div className="text-sm text-green-600 font-medium">You save ${discount.toFixed(2)}!</div>
                          </div>

                          <Button
                            onClick={() => handleAddToCart(deal)}
                            disabled={!isValid}
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                          >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            {isValid ? "Add to Cart" : `Select ${deal.minItems - selectedCount} more items`}
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Info Section */}
          <Card className="mt-12 bg-gradient-to-r from-orange-500 to-purple-500 text-white">
            <CardContent className="p-8 text-center">
              <Gift className="h-12 w-12 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">How Mix & Match Works</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <div className="text-center">
                  <div className="text-3xl mb-2">1</div>
                  <h3 className="font-semibold mb-2">Choose Your Deal</h3>
                  <p className="text-orange-100 text-sm">Select from our curated mix and match packages</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">2</div>
                  <h3 className="font-semibold mb-2">Pick Your Items</h3>
                  <p className="text-orange-100 text-sm">Choose the exact products you want from each category</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">3</div>
                  <h3 className="font-semibold mb-2">Save Automatically</h3>
                  <p className="text-orange-100 text-sm">Discounts are applied automatically at checkout</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}
