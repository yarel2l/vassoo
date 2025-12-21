export interface Store {
  id: string
  name: string
  logo: string
  rating: number
  reviewCount: number
  verified: boolean
  location: string
}

export interface ProductOffer {
  storeId: string
  store: Store
  price: number
  originalPrice?: number
  discount?: number
  stock: number
  taxes: number
  shippingCost: number
  freeShippingThreshold?: number
  estimatedDelivery: {
    min: number
    max: number
    unit: "hours" | "days"
  }
  features: string[]
  conditions?: string[]
}

export interface ProductReview {
  id: string
  userId: string
  userName: string
  rating: number
  comment: string
  date: string
  verified: boolean
  helpful: number
}

export interface Product {
  id: string
  name: string
  brand: string
  category: string
  subcategory: string
  images: string[]
  description: string
  specifications: Record<string, string>
  averageRating: number
  totalReviews: number
  offers: ProductOffer[]
  reviews: ProductReview[]
  relatedProducts: string[]
  tags: string[]
}
