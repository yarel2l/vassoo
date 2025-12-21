"use client"

import { useState } from "react"
import { Shuffle, Plus, Minus, ShoppingCart, Check, X, Package, Gift } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useCart } from "@/contexts/cart-context"

const mixAndMatchDeals = [
  {
    id: "wine-trio",
    title: "Wine Trio Deal",
    description: "Pick any 3 wines and save 20%",
    minItems: 3,
    maxItems: 3,
    discount: 20,
    type: "percentage",
    category: "Wine",
    icon: "🍷",
    color: "bg-red-100 text-red-700",
    products: [
      {
        id: 1,
        name: "Cabernet Sauvignon 2020",
        price: 24.99,
        image: "/placeholder.svg?height=200&width=200",
        rating: 4.5,
        origin: "Napa Valley",
      },
      {
        id: 2,
        name: "Chardonnay Reserve 2021",
        price: 28.99,
        image: "/placeholder.svg?height=200&width=200",
        rating: 4.7,
        origin: "Sonoma County",
      },
      {
        id: 3,
        name: "Pinot Noir 2019",
        price: 32.99,
        image: "/placeholder.svg?height=200&width=200",
        rating: 4.6,
        origin: "Oregon",
      },
      {
        id: 4,
        name: "Sauvignon Blanc 2022",
        price: 22.99,
        image: "/placeholder.svg?height=200&width=200",
        rating: 4.4,
        origin: "New Zealand",
      },
      {
        id: 5,
        name: "Merlot 2020",
        price: 26.99,
        image: "/placeholder.svg?height=200&width=200",
        rating: 4.3,
        origin: "Washington",
      },
      {
        id: 6,
        name: "Rosé 2022",
        price: 19.99,
        image: "/placeholder.svg?height=200&width=200",
        rating: 4.2,
        origin: "Provence",
      },
    ],
  },
  {
    id: "spirit-sampler",
    title: "Spirit Sampler",
    description: "Choose 4 mini bottles, get 25% off",
    minItems: 4,
    maxItems: 4,
    discount: 25,
    type: "percentage",
    category: "Spirits",
    icon: "🥃",
    color: "bg-amber-100 text-amber-700",
    products: [
      {
        id: 7,
        name: "Bourbon Whiskey Mini",
        price: 12.99,
        image: "/placeholder.svg?height=200&width=200",
        rating: 4.8,
        origin: "Kentucky",
      },
      {
        id: 8,
        name: "Vodka Premium Mini",
        price: 10.99,
        image: "/placeholder.svg?height=200&width=200",
        rating: 4.6,
        origin: "Russia",
      },
      {
        id: 9,
        name: "Gin Artisan Mini",
        price: 11.99,
        image: "/placeholder.svg?height=200&width=200",
        rating: 4.7,
        origin: "London",
      },
      {
        id: 10,
        name: "Rum Aged Mini",
        price: 13.99,
        image: "/placeholder.svg?height=200&width=200",
        rating: 4.5,
        origin: "Caribbean",
      },
      {
        id: 11,
        name: "Tequila Silver Mini",
        price: 14.99,
        image: "/placeholder.svg?height=200&width=200",
        rating: 4.4,
        origin: "Mexico",
      },
      {
        id: 12,
        name: "Scotch Single Malt Mini",
        price: 16.99,
        image: "/placeholder.svg?height=200&width=200",
        rating: 4.9,
        origin: "Scotland",
      },
    ],
  },
  {
    id: "beer-mixer",
    title: "Beer Mixer Pack",
    description: "Mix 6 different beers, save $10",
    minItems: 6,
    maxItems: 6,
    discount: 10,
    type: "fixed",
    category: "Beer",
    icon: "🍺",
    color: "bg-yellow-100 text-yellow-700",
    products: [
      {
        id: 13,
        name: "IPA Craft Beer",
        price: 4.99,
        image: "/placeholder.svg?height=200&width=200",
        rating: 4.6,
        origin: "Local Brewery",
      },
      {
        id: 14,
        name: "Wheat Beer",
        price: 4.49,
        image: "/placeholder.svg?height=200&width=200",
        rating: 4.3,
        origin: "Germany",
      },
      {
        id: 15,
        name: "Stout Dark Beer",
        price: 5.49,
        image: "/placeholder.svg?height=200&width=200",
        rating: 4.7,
        origin: "Ireland",
      },
      {
        id: 16,
        name: "Lager Premium",
        price: 3.99,
        image: "/placeholder.svg?height=200&width=200",
        rating: 4.2,
        origin: "Czech Republic",
      },
      {
        id: 17,
        name: "Pale Ale",
        price: 4.79,
        image: "/placeholder.svg?height=200&width=200",
        rating: 4.5,
        origin: "California",
      },
      {
        id: 18,
        name: "Pilsner Classic",
        price: 3.79,
        image: "/placeholder.svg?height=200&width=200",
        rating: 4.1,
        origin: "Germany",
      },
    ],
  },
]

export default function MixAndMatchPage() {
  const [selectedItems, setSelectedItems] = useState<{ [dealId: string]: { [productId: number]: number } }>({})
  const { addToCart } = useCart()

  const updateQuantity = (dealId: string, productId: number, change: number) => {
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

  const getSelectedTotal = (deal: any) => {
    const dealItems = selectedItems[deal.id] || {}
    return Object.entries(dealItems).reduce((total, [productId, qty]) => {
      const product = deal.products.find((p: any) => p.id === Number.parseInt(productId))
      return total + (product ? product.price * qty : 0)
    }, 0)
  }

  const getDiscountAmount = (deal: any) => {
    const total = getSelectedTotal(deal)
    return deal.type === "percentage" ? (total * deal.discount) / 100 : deal.discount
  }

  const getFinalTotal = (deal: any) => {
    return getSelectedTotal(deal) - getDiscountAmount(deal)
  }

  const canAddToCart = (deal: any) => {
    const count = getSelectedCount(deal.id)
    return count >= deal.minItems && count <= deal.maxItems
  }

  const handleAddToCart = (deal: any) => {
    const dealItems = selectedItems[deal.id] || {}
    Object.entries(dealItems).forEach(([productId, qty]) => {
      const product = deal.products.find((p: any) => p.id === Number.parseInt(productId))
      if (product) {
        const discountedPrice =
          deal.type === "percentage"
            ? product.price * (1 - deal.discount / 100)
            : product.price - deal.discount / deal.maxItems

        addToCart({
          id: product.id,
          name: product.name,
          price: discountedPrice,
          image: product.image,
          category: deal.category,
          quantity: qty,
        })
      }
    })

    // Reset selection for this deal
    setSelectedItems((prev) => ({
      ...prev,
      [deal.id]: {},
    }))
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center space-x-3 mb-4">
            <Shuffle className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Mix and Match Deals</h1>
          </div>
          <p className="text-purple-100 text-lg">Create your perfect combination and save big!</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Deals */}
        <div className="space-y-12">
          {mixAndMatchDeals.map((deal) => {
            const selectedCount = getSelectedCount(deal.id)
            const total = getSelectedTotal(deal)
            const discount = getDiscountAmount(deal)
            const finalTotal = getFinalTotal(deal)
            const isValid = canAddToCart(deal)

            return (
              <Card key={deal.id} className="overflow-hidden">
                <CardHeader className={`${deal.color} p-6`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{deal.icon}</span>
                      <div>
                        <CardTitle className="text-2xl">{deal.title}</CardTitle>
                        <p className="opacity-80">{deal.description}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {deal.type === "percentage" ? `${deal.discount}% OFF` : `$${deal.discount} OFF`}
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
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(selectedCount / deal.maxItems) * 100}%` }}
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
                              <img
                                src={product.image || "/placeholder.svg"}
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>

                            <h4 className="font-semibold mb-1 line-clamp-2">{product.name}</h4>
                            <p className="text-sm text-muted-foreground mb-2">{product.origin}</p>
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-bold text-lg">${product.price}</span>
                              <div className="flex items-center space-x-1">
                                <span className="text-sm">⭐ {product.rating}</span>
                              </div>
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
                                <Badge variant="secondary" className="bg-orange-100 text-orange-700">
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
                              Discount ({deal.type === "percentage" ? `${deal.discount}%` : `$${deal.discount}`})
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
        <Card className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardContent className="p-8 text-center">
            <Gift className="h-12 w-12 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">How Mix & Match Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="text-center">
                <div className="text-3xl mb-2">1️⃣</div>
                <h3 className="font-semibold mb-2">Choose Your Deal</h3>
                <p className="text-blue-100 text-sm">Select from our curated mix and match packages</p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">2️⃣</div>
                <h3 className="font-semibold mb-2">Pick Your Items</h3>
                <p className="text-blue-100 text-sm">Choose the exact products you want from each category</p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">3️⃣</div>
                <h3 className="font-semibold mb-2">Save Automatically</h3>
                <p className="text-blue-100 text-sm">Discounts are applied automatically at checkout</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
