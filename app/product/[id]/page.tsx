"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Head from "next/head"
import Navbar from "@/components/navbar"
import MobileBottomNav from "@/components/mobile-bottom-nav"
import ProductGallery from "@/components/product-gallery"
import ProductInfo from "@/components/product-info"
import StoreOffers from "@/components/store-offers"
import ProductReviews from "@/components/product-reviews"
import RelatedProducts from "@/components/related-products"
import { useGeolocation } from "@/hooks/use-geolocation"
import type { Product } from "@/types/product"

// Mock product data
const mockProduct: Product = {
  id: "1",
  name: "Dom Pérignon Vintage 2013",
  brand: "Dom Pérignon",
  category: "Champagne",
  subcategory: "Vintage Champagne",
  images: [
    "/placeholder.svg?height=600&width=600",
    "/placeholder.svg?height=600&width=600",
    "/placeholder.svg?height=600&width=600",
    "/placeholder.svg?height=600&width=600",
  ],
  description:
    "Dom Pérignon Vintage 2013 is a testament to the House's commitment to excellence. This exceptional champagne showcases the perfect harmony between Chardonnay and Pinot Noir, creating a wine of remarkable depth and complexity. With its golden hue and persistent bubbles, this vintage offers an unforgettable tasting experience.",
  specifications: {
    "Alcohol Content": "12.5%",
    Volume: "750ml",
    Region: "Champagne, France",
    "Grape Variety": "Chardonnay, Pinot Noir",
    "Serving Temperature": "6-8°C",
    "Aging Process": "7 years on lees",
  },
  averageRating: 4.8,
  totalReviews: 247,
  offers: [
    {
      storeId: "store1",
      store: {
        id: "store1",
        name: "Premium Wine Co.",
        logo: "/placeholder.svg?height=40&width=40",
        rating: 4.9,
        reviewCount: 1250,
        verified: true,
        location: "New York, NY",
      },
      price: 299.99,
      originalPrice: 349.99,
      discount: 14,
      stock: 12,
      taxes: 24.75,
      shippingCost: 15.99,
      freeShippingThreshold: 200,
      estimatedDelivery: { min: 1, max: 3, unit: "days" },
      features: ["Free gift wrapping", "Expert packaging", "Insurance included"],
      conditions: ["Must be 21+ to purchase"],
    },
    {
      storeId: "store2",
      store: {
        id: "store2",
        name: "Luxury Spirits",
        logo: "/placeholder.svg?height=40&width=40",
        rating: 4.7,
        reviewCount: 890,
        verified: true,
        location: "Los Angeles, CA",
      },
      price: 319.99,
      stock: 8,
      taxes: 28.8,
      shippingCost: 0,
      estimatedDelivery: { min: 2, max: 5, unit: "days" },
      features: ["Free shipping", "Temperature controlled delivery", "24/7 support"],
    },
    {
      storeId: "store3",
      store: {
        id: "store3",
        name: "Elite Wine Cellar",
        logo: "/placeholder.svg?height=40&width=40",
        rating: 4.6,
        reviewCount: 650,
        verified: false,
        location: "Miami, FL",
      },
      price: 289.99,
      originalPrice: 329.99,
      discount: 12,
      stock: 5,
      taxes: 20.3,
      shippingCost: 12.5,
      freeShippingThreshold: 300,
      estimatedDelivery: { min: 3, max: 7, unit: "days" },
      features: ["Authenticity guarantee", "Secure packaging"],
      conditions: ["Limited stock", "Age verification required"],
    },
  ],
  reviews: [],
  relatedProducts: [],
  tags: ["premium", "vintage", "champagne", "luxury", "celebration"],
}

export default function ProductPage() {
  const params = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [selectedOffer, setSelectedOffer] = useState<string | null>(null)
  const { location } = useGeolocation()

  useEffect(() => {
    // In a real app, fetch product data based on params.id
    setProduct(mockProduct)
    if (mockProduct.offers.length > 0) {
      setSelectedOffer(mockProduct.offers[0].storeId)
    }
  }, [params.id])

  if (!product) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-96 bg-muted rounded"></div>
              <div className="space-y-4">
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-20 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        </div>
        <MobileBottomNav />
      </div>
    )
  }

  const bestPrice = Math.min(...product.offers.map((offer) => offer.price))
  const productUrl = `${typeof window !== "undefined" ? window.location.origin : "https://liquorhub.com"}/product/${product.id}`

  return (
    <>
      <Head>
        <title>{`${product.name} - ${product.brand} | Compare Prices | LiquorHub`}</title>
        <meta
          name="description"
          content={`${product.description.substring(0, 155)}... Compare prices from ${product.offers.length} stores. Starting at $${bestPrice}. Free shipping available.`}
        />
        <meta
          name="keywords"
          content={`${product.name}, ${product.brand}, ${product.category}, ${product.tags.join(", ")}, buy online, compare prices`}
        />

        {/* Open Graph */}
        <meta property="og:title" content={`${product.name} - ${product.brand} | LiquorHub`} />
        <meta
          property="og:description"
          content={`${product.description.substring(0, 155)}... Starting at $${bestPrice}`}
        />
        <meta property="og:image" content={product.images[0]} />
        <meta property="og:url" content={productUrl} />
        <meta property="og:type" content="product" />
        <meta property="product:price:amount" content={bestPrice.toString()} />
        <meta property="product:price:currency" content="USD" />
        <meta property="product:availability" content="in stock" />
        <meta property="product:condition" content="new" />
        <meta property="product:retailer_item_id" content={product.id} />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${product.name} - ${product.brand}`} />
        <meta
          name="twitter:description"
          content={`${product.description.substring(0, 155)}... Starting at $${bestPrice}`}
        />
        <meta name="twitter:image" content={product.images[0]} />

        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: product.name,
              brand: {
                "@type": "Brand",
                name: product.brand,
              },
              description: product.description,
              image: product.images,
              category: product.category,
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: product.averageRating,
                reviewCount: product.totalReviews,
                bestRating: 5,
                worstRating: 1,
              },
              offers: product.offers.map((offer) => ({
                "@type": "Offer",
                price: offer.price,
                priceCurrency: "USD",
                availability: offer.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                seller: {
                  "@type": "Organization",
                  name: offer.store.name,
                },
                priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
              })),
              additionalProperty: Object.entries(product.specifications).map(([key, value]) => ({
                "@type": "PropertyValue",
                name: key,
                value: value,
              })),
            }),
          }}
        />
      </Head>

      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-6">
          {/* Breadcrumb */}
          <nav className="text-sm text-muted-foreground mb-6">
            <span>Home</span> / <span>{product.category}</span> /{" "}
            <span className="text-foreground">{product.name}</span>
          </nav>

          {/* Main Product Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <ProductGallery images={product.images} productName={product.name} />
            <ProductInfo product={product} selectedOffer={selectedOffer} />
          </div>

          {/* Store Offers Comparison */}
          <StoreOffers
            offers={product.offers}
            selectedOffer={selectedOffer}
            onSelectOffer={setSelectedOffer}
            userLocation={location}
          />

          {/* Product Reviews */}
          <ProductReviews
            reviews={product.reviews}
            averageRating={product.averageRating}
            totalReviews={product.totalReviews}
          />

          {/* Related Products */}
          <RelatedProducts productIds={product.relatedProducts} />
        </div>
        <MobileBottomNav />
      </div>
    </>
  )
}
