"use client"

import React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Star, Shield, MapPin, CheckCircle, AlertCircle, Package, ShoppingCart, Clock } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import type { ProductOffer } from "@/types/product"

interface StoreOffersProps {
  offers: ProductOffer[]
  selectedOffer: string | null
  onSelectOffer: (storeId: string) => void
  userLocation: any
}

export default function StoreOffers({ offers, selectedOffer, onSelectOffer, userLocation }: StoreOffersProps) {
  const { t } = useLanguage()
  const [viewMode, setViewMode] = useState<"list" | "comparison">("list")

  const sortedOffers = [...offers].sort((a, b) => {
    const totalA = a.price + a.taxes + a.shippingCost
    const totalB = b.price + b.taxes + b.shippingCost
    return totalA - totalB
  })

  const formatDeliveryTime = (delivery: ProductOffer["estimatedDelivery"]) => {
    // Convert to same-day delivery format
    if (delivery.unit === "hours") {
      if (delivery.min === delivery.max) {
        return `${delivery.min} ${delivery.min === 1 ? "hour" : "hours"}`
      }
      return `${delivery.min}-${delivery.max} hours`
    }

    // For same-day delivery, show in minutes
    const minMinutes = delivery.min * 60
    const maxMinutes = delivery.max * 60

    if (minMinutes === maxMinutes) {
      return `${minMinutes} minutes`
    }
    return `${minMinutes}-${maxMinutes} minutes`
  }

  const OfferCard = ({
    offer,
    isSelected,
    isBestPrice,
  }: { offer: ProductOffer; isSelected: boolean; isBestPrice: boolean }) => (
    <Card
      className={`cursor-pointer transition-all duration-200 ${
        isSelected ? "ring-2 ring-primary border-primary" : "hover:shadow-md"
      }`}
      onClick={() => onSelectOffer(offer.storeId)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={offer.store.logo || "/placeholder.svg"}
              alt={offer.store.name}
              className="w-10 h-10 rounded-lg object-cover"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{offer.store.name}</h3>
                {offer.store.verified && <Shield className="h-4 w-4 text-green-600" />}
                {isBestPrice && <Badge className="bg-green-600 text-xs">Best Price</Badge>}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span>{offer.store.rating}</span>
                <span>({offer.store.reviewCount})</span>
                <span>•</span>
                <MapPin className="h-3 w-3" />
                <span>{offer.store.location}</span>
              </div>
            </div>
          </div>
          {isSelected && <CheckCircle className="h-5 w-5 text-primary" />}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Pricing */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-primary">${offer.price}</span>
            {offer.originalPrice && (
              <>
                <span className="text-lg text-muted-foreground line-through">${offer.originalPrice}</span>
                <Badge variant="destructive" className="text-xs">
                  -{offer.discount}%
                </Badge>
              </>
            )}
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxes:</span>
              <span>${offer.taxes.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery:</span>
              <span>
                {offer.shippingCost === 0 ? (
                  <span className="text-green-600 font-medium">Free</span>
                ) : (
                  `$${offer.shippingCost.toFixed(2)}`
                )}
              </span>
            </div>
            {offer.freeShippingThreshold && offer.shippingCost > 0 && (
              <div className="text-xs text-green-600">Free delivery over ${offer.freeShippingThreshold}</div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total:</span>
              <span className="text-primary">${(offer.price + offer.taxes + offer.shippingCost).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Delivery & Stock */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-green-600" />
            <div>
              <div className="font-medium text-green-600">Same-day delivery</div>
              <div className="text-muted-foreground">{formatDeliveryTime(offer.estimatedDelivery)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">Stock</div>
              <div className={`${offer.stock < 5 ? "text-red-600" : "text-green-600"}`}>{offer.stock} available</div>
            </div>
          </div>
        </div>

        {/* Features */}
        {offer.features.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2">Features:</h4>
            <div className="space-y-1">
              {offer.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conditions */}
        {offer.conditions && offer.conditions.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2">Conditions:</h4>
            <div className="space-y-1">
              {offer.conditions.map((condition, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-3 w-3 text-amber-600" />
                  <span>{condition}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button className="w-full" variant={isSelected ? "default" : "outline"}>
          <ShoppingCart className="mr-2 h-4 w-4" />
          {isSelected ? "Selected Store" : "Select This Store"}
        </Button>
      </CardContent>
    </Card>
  )

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Available at {offers.length} stores</h2>
          <p className="text-muted-foreground">Same-day delivery • Compare prices and delivery times</p>
        </div>
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "list" | "comparison")}>
          <TabsList>
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="comparison">Compare</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Tabs value={viewMode} className="w-full">
        <TabsContent value="list" className="space-y-4">
          {sortedOffers.map((offer, index) => (
            <OfferCard
              key={offer.storeId}
              offer={offer}
              isSelected={selectedOffer === offer.storeId}
              isBestPrice={index === 0}
            />
          ))}
        </TabsContent>

        <TabsContent value="comparison">
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-4 gap-4">
                {/* Header Row */}
                <div className="font-semibold p-4 bg-muted rounded-t-lg">Store</div>
                <div className="font-semibold p-4 bg-muted rounded-t-lg">Price</div>
                <div className="font-semibold p-4 bg-muted rounded-t-lg">Delivery</div>
                <div className="font-semibold p-4 bg-muted rounded-t-lg">Features</div>

                {/* Data Rows */}
                {sortedOffers.map((offer, index) => (
                  <React.Fragment key={offer.storeId}>
                    {/* Store Info */}
                    <div
                      className={`p-4 border cursor-pointer transition-colors ${
                        selectedOffer === offer.storeId ? "bg-primary/5 border-primary" : "hover:bg-muted/50"
                      }`}
                      onClick={() => onSelectOffer(offer.storeId)}
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={offer.store.logo || "/placeholder.svg"}
                          alt={offer.store.name}
                          className="w-8 h-8 rounded"
                        />
                        <div>
                          <div className="font-medium flex items-center gap-1">
                            {offer.store.name}
                            {offer.store.verified && <Shield className="h-3 w-3 text-green-600" />}
                            {index === 0 && <Badge className="bg-green-600 text-xs">Best</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Star className="h-2 w-2 fill-yellow-400 text-yellow-400" />
                            {offer.store.rating} ({offer.store.reviewCount})
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Price Info */}
                    <div
                      className={`p-4 border cursor-pointer transition-colors ${
                        selectedOffer === offer.storeId ? "bg-primary/5 border-primary" : "hover:bg-muted/50"
                      }`}
                      onClick={() => onSelectOffer(offer.storeId)}
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-primary">${offer.price}</div>
                        <div className="text-xs text-muted-foreground">
                          +${offer.taxes.toFixed(2)} tax
                          <br />
                          +${offer.shippingCost.toFixed(2)} delivery
                        </div>
                        <div className="text-sm font-medium">
                          ${(offer.price + offer.taxes + offer.shippingCost).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Delivery Info */}
                    <div
                      className={`p-4 border cursor-pointer transition-colors ${
                        selectedOffer === offer.storeId ? "bg-primary/5 border-primary" : "hover:bg-muted/50"
                      }`}
                      onClick={() => onSelectOffer(offer.storeId)}
                    >
                      <div className="space-y-1">
                        <div className="font-medium text-green-600">Same-day</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDeliveryTime(offer.estimatedDelivery)}
                        </div>
                        <div className="text-xs text-muted-foreground">{offer.stock} in stock</div>
                      </div>
                    </div>

                    {/* Features */}
                    <div
                      className={`p-4 border cursor-pointer transition-colors ${
                        selectedOffer === offer.storeId ? "bg-primary/5 border-primary" : "hover:bg-muted/50"
                      }`}
                      onClick={() => onSelectOffer(offer.storeId)}
                    >
                      <div className="space-y-1">
                        {offer.features.slice(0, 2).map((feature, idx) => (
                          <div key={idx} className="text-xs text-muted-foreground flex items-center gap-1">
                            <CheckCircle className="h-2 w-2 text-green-600" />
                            {feature}
                          </div>
                        ))}
                        {offer.features.length > 2 && (
                          <div className="text-xs text-muted-foreground">+{offer.features.length - 2} more</div>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  )
}
