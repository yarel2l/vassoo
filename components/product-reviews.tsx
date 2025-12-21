"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThumbsUp, ThumbsDown, MessageSquare, Filter } from "lucide-react"
import DrinkGlassRating from "./drink-glass-rating"

interface Review {
  id: number
  author: string
  avatar?: string
  rating: number
  date: string
  title: string
  content: string
  helpful: number
  notHelpful: number
  verified: boolean
}

interface ProductReviewsProps {
  productId: number
  averageRating: number
  totalReviews: number
  drinkType?: string
}

export default function ProductReviews({
  productId,
  averageRating,
  totalReviews,
  drinkType = "whiskey",
}: ProductReviewsProps) {
  const [reviews] = useState<Review[]>([
    {
      id: 1,
      author: "Michael Chen",
      avatar: "/placeholder.svg?height=40&width=40",
      rating: 5.0,
      date: "2024-01-15",
      title: "Exceptional quality and smooth finish",
      content:
        "This is hands down one of the best whiskeys I've ever tasted. The complexity of flavors is remarkable - notes of vanilla, oak, and a hint of smoke. Perfect for special occasions or as a gift for whiskey enthusiasts.",
      helpful: 24,
      notHelpful: 2,
      verified: true,
    },
    {
      id: 2,
      author: "Sarah Johnson",
      avatar: "/placeholder.svg?height=40&width=40",
      rating: 4.5,
      date: "2024-01-10",
      title: "Great value for the price",
      content:
        "Really impressed with this purchase. The packaging was excellent and the product arrived quickly. The taste is smooth with a nice balance. Would definitely recommend to friends.",
      helpful: 18,
      notHelpful: 1,
      verified: true,
    },
    {
      id: 3,
      author: "David Rodriguez",
      avatar: "/placeholder.svg?height=40&width=40",
      rating: 4.0,
      date: "2024-01-08",
      title: "Good but not exceptional",
      content:
        "It's a solid choice for the price point. The flavor profile is decent, though I've had better. Good for mixing or casual drinking. Delivery was fast and packaging was secure.",
      helpful: 12,
      notHelpful: 3,
      verified: false,
    },
    {
      id: 4,
      author: "Emma Wilson",
      avatar: "/placeholder.svg?height=40&width=40",
      rating: 5.0,
      date: "2024-01-05",
      title: "Perfect for gifting",
      content:
        "Bought this as a gift for my father's birthday and he absolutely loved it. The presentation is beautiful and the quality is outstanding. Will definitely order again.",
      helpful: 15,
      notHelpful: 0,
      verified: true,
    },
    {
      id: 5,
      author: "James Thompson",
      avatar: "/placeholder.svg?height=40&width=40",
      rating: 3.5,
      date: "2024-01-02",
      title: "Decent but overpriced",
      content:
        "The quality is good but I think it's a bit overpriced for what you get. The taste is fine, nothing extraordinary. Shipping was quick though.",
      helpful: 8,
      notHelpful: 5,
      verified: true,
    },
  ])

  const [newReview, setNewReview] = useState("")
  const [newRating, setNewRating] = useState(5)

  // Calculate rating distribution
  const ratingDistribution = [
    { rating: 5, count: 45, percentage: 60 },
    { rating: 4, count: 20, percentage: 27 },
    { rating: 3, count: 8, percentage: 11 },
    { rating: 2, count: 1, percentage: 1 },
    { rating: 1, count: 1, percentage: 1 },
  ]

  const handleSubmitReview = () => {
    // Handle review submission
    console.log("Submitting review:", { rating: newRating, content: newReview })
    setNewReview("")
    setNewRating(5)
  }

  return (
    <div className="space-y-6">
      {/* Reviews Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Customer Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Overall Rating */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <DrinkGlassRating rating={averageRating} size="lg" showValue={true} />
              </div>
              <p className="text-2xl font-bold">{averageRating.toFixed(1)} out of 5</p>
              <p className="text-muted-foreground">{totalReviews} total reviews</p>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-3">
              {ratingDistribution.map((item) => (
                <div key={item.rating} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-12">
                    <span className="text-sm">{item.rating}</span>
                    <DrinkGlassRating rating={item.rating} maxRating={5} size="sm" showValue={false} />
                  </div>
                  <Progress value={item.percentage} className="flex-1 h-2" />
                  <span className="text-sm text-muted-foreground w-8">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Write Review */}
      <Card>
        <CardHeader>
          <CardTitle>Write a Review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Your Rating</label>
            <div className="flex items-center gap-2">
              <DrinkGlassRating rating={newRating} size="md" showValue={true} />
              <div className="flex gap-1 ml-4">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <Button
                    key={rating}
                    variant={newRating === rating ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNewRating(rating)}
                    className="w-8 h-8 p-0"
                  >
                    {rating}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Your Review</label>
            <Textarea
              placeholder="Share your experience with this product..."
              value={newReview}
              onChange={(e) => setNewReview(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <Button onClick={handleSubmitReview} className="bg-orange-600 hover:bg-orange-700">
            Submit Review
          </Button>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">All Reviews ({reviews.length})</h3>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>

        {reviews.map((review) => (
          <Card key={review.id}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={review.avatar || "/placeholder.svg"} alt={review.author} />
                  <AvatarFallback>
                    {review.author
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{review.author}</h4>
                        {review.verified && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                            Verified Purchase
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <DrinkGlassRating rating={review.rating} size="sm" showValue={true} />
                        <span className="text-sm text-muted-foreground">{review.date}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium mb-2">{review.title}</h5>
                    <p className="text-muted-foreground">{review.content}</p>
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      <ThumbsUp className="w-4 h-4 mr-1" />
                      Helpful ({review.helpful})
                    </Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      <ThumbsDown className="w-4 h-4 mr-1" />
                      Not Helpful ({review.notHelpful})
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
