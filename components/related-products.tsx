"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Star, ShoppingCart } from "lucide-react"
import Image from "next/image"

interface RelatedProductsProps {
  productIds: string[]
}

export default function RelatedProducts({ productIds }: RelatedProductsProps) {
  // Mock related products
  const relatedProducts = [
    {
      id: "2",
      name: "Krug Grande Cuvée",
      price: 189.99,
      rating: 4.7,
      image: "/placeholder.svg?height=200&width=200",
    },
    {
      id: "3",
      name: "Veuve Clicquot Brut",
      price: 79.99,
      rating: 4.5,
      image: "/placeholder.svg?height=200&width=200",
    },
    {
      id: "4",
      name: "Louis Roederer Cristal",
      price: 399.99,
      rating: 4.9,
      image: "/placeholder.svg?height=200&width=200",
    },
    {
      id: "5",
      name: "Perrier-Jouët Belle Epoque",
      price: 149.99,
      rating: 4.6,
      image: "/placeholder.svg?height=200&width=200",
    },
  ]

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">You might also like</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {relatedProducts.map((product) => (
          <Card key={product.id} className="group cursor-pointer transition-all duration-300 hover:shadow-lg">
            <CardContent className="p-4">
              <div className="relative mb-4">
                <Image
                  src={product.image || "/placeholder.svg"}
                  alt={product.name}
                  width={200}
                  height={200}
                  className="w-full h-40 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold line-clamp-2">{product.name}</h3>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm">{product.rating}</span>
                </div>
                <div className="text-xl font-bold text-primary">${product.price}</div>
                <Button className="w-full" size="sm">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
