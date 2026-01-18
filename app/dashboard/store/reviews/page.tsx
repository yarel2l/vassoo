'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useStoreDashboard } from '@/contexts/store-dashboard-context'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
    Star,
    Search,
    MessageSquare,
    ThumbsUp,
    ThumbsDown,
    Loader2,
    Filter,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface Review {
    id: string
    productId: string
    productName: string
    productImage?: string
    customerId: string
    customerName: string
    customerAvatar?: string
    rating: number
    title?: string
    comment: string
    response?: string
    createdAt: string
    isVerified: boolean
}

export default function ReviewsPage() {
    const { isLoading: authLoading } = useAuth()
    const { currentStore, isLoading: storeLoading } = useStoreDashboard()
    const [reviews, setReviews] = useState<Review[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [ratingFilter, setRatingFilter] = useState('all')
    const [respondingTo, setRespondingTo] = useState<string | null>(null)
    const [responseText, setResponseText] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const tenantId = currentStore?.id

    const fetchReviews = useCallback(async () => {
        if (!tenantId) {
            setIsLoading(false)
            return
        }

        try {
            setIsLoading(true)

            // Note: product_reviews table doesn't exist yet in the database
            // When the table is created, uncomment the fetch logic below
            // For now, just show empty state without making network requests

            /*
            const supabase = createClient()
            const { data: stores } = await supabase
                .from('stores')
                .select('id')
                .eq('tenant_id', tenantId)
                .limit(1)

            if (!stores || stores.length === 0) {
                setReviews([])
                return
            }

            const { data: reviewsData, error } = await (supabase as any)
                .from('product_reviews')
                .select('*')
                .eq('store_id', stores[0].id)
                .order('created_at', { ascending: false })

            if (error) {
                setReviews([])
                return
            }

            const transformedReviews: Review[] = (reviewsData || []).map((review: any) => ({
                id: review.id,
                productId: review.product_id,
                productName: review.product_name || 'Product',
                productImage: review.product_image,
                customerId: review.user_id,
                customerName: review.customer_name || 'Customer',
                customerAvatar: review.customer_avatar,
                rating: review.rating,
                title: review.title,
                comment: review.comment || review.content || '',
                response: review.store_response,
                createdAt: review.created_at,
                isVerified: review.is_verified_purchase || false,
            }))

            setReviews(transformedReviews)
            */

            setReviews([])
        } catch (err) {
            setReviews([])
        } finally {
            setIsLoading(false)
        }
    }, [tenantId])

    useEffect(() => {
        fetchReviews()
    }, [fetchReviews])

    const filteredReviews = reviews.filter(review => {
        const matchesSearch = review.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            review.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            review.comment.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesRating = ratingFilter === 'all' || review.rating === parseInt(ratingFilter)
        return matchesSearch && matchesRating
    })

    const handleSubmitResponse = async (reviewId: string) => {
        if (!responseText.trim()) return
        setIsSubmitting(true)

        try {
            const supabase = createClient()
            const { error } = await (supabase as any)
                .from('product_reviews')
                .update({
                    store_response: responseText,
                    responded_at: new Date().toISOString(),
                })
                .eq('id', reviewId)

            if (error) throw error

            toast({ title: 'Response submitted successfully' })
            setRespondingTo(null)
            setResponseText('')
            fetchReviews()
        } catch (err) {
            console.error('Error submitting response:', err)
            toast({
                title: 'Error',
                description: 'Failed to submit response',
                variant: 'destructive',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const averageRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0

    const ratingCounts = [5, 4, 3, 2, 1].map(rating => ({
        rating,
        count: reviews.filter(r => r.rating === rating).length,
        percentage: reviews.length > 0
            ? (reviews.filter(r => r.rating === rating).length / reviews.length) * 100
            : 0,
    }))

    const renderStars = (rating: number) => {
        return (
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={`h-4 w-4 ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-600'
                            }`}
                    />
                ))}
            </div>
        )
    }

    if (authLoading || storeLoading || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-500" />
                    <p className="text-gray-400">Loading reviews...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Reviews</h1>
                    <p className="text-gray-400 mt-1">
                        View and respond to customer reviews
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-6">
                            <div className="text-center">
                                <p className="text-4xl font-bold text-white">{averageRating.toFixed(1)}</p>
                                <div className="flex items-center justify-center mt-2">
                                    {renderStars(Math.round(averageRating))}
                                </div>
                                <p className="text-sm text-gray-400 mt-1">{reviews.length} reviews</p>
                            </div>
                            <div className="flex-1 space-y-2">
                                {ratingCounts.map(({ rating, count, percentage }) => (
                                    <div key={rating} className="flex items-center gap-2">
                                        <span className="text-sm text-gray-400 w-6">{rating}</span>
                                        <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                                        <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-amber-500 rounded-full"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <span className="text-sm text-gray-500 w-8">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-4 bg-green-600/10 rounded-lg">
                                <ThumbsUp className="h-6 w-6 text-green-400 mx-auto mb-2" />
                                <p className="text-2xl font-bold text-white">
                                    {reviews.filter(r => r.rating >= 4).length}
                                </p>
                                <p className="text-sm text-gray-400">Positive</p>
                            </div>
                            <div className="text-center p-4 bg-red-600/10 rounded-lg">
                                <ThumbsDown className="h-6 w-6 text-red-400 mx-auto mb-2" />
                                <p className="text-2xl font-bold text-white">
                                    {reviews.filter(r => r.rating <= 2).length}
                                </p>
                                <p className="text-sm text-gray-400">Negative</p>
                            </div>
                            <div className="text-center p-4 bg-orange-600/10 rounded-lg">
                                <MessageSquare className="h-6 w-6 text-orange-400 mx-auto mb-2" />
                                <p className="text-2xl font-bold text-white">
                                    {reviews.filter(r => r.response).length}
                                </p>
                                <p className="text-sm text-gray-400">Responded</p>
                            </div>
                            <div className="text-center p-4 bg-blue-600/10 rounded-lg">
                                <Star className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                                <p className="text-2xl font-bold text-white">
                                    {reviews.filter(r => !r.response).length}
                                </p>
                                <p className="text-sm text-gray-400">Pending</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search reviews..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-gray-800 border-gray-700 text-white"
                            />
                        </div>
                        <Tabs value={ratingFilter} onValueChange={setRatingFilter}>
                            <TabsList className="bg-gray-800 border border-gray-700">
                                <TabsTrigger value="all" className="data-[state=active]:bg-orange-600">All</TabsTrigger>
                                <TabsTrigger value="5" className="data-[state=active]:bg-orange-600">5★</TabsTrigger>
                                <TabsTrigger value="4" className="data-[state=active]:bg-orange-600">4★</TabsTrigger>
                                <TabsTrigger value="3" className="data-[state=active]:bg-orange-600">3★</TabsTrigger>
                                <TabsTrigger value="2" className="data-[state=active]:bg-orange-600">2★</TabsTrigger>
                                <TabsTrigger value="1" className="data-[state=active]:bg-orange-600">1★</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </CardContent>
            </Card>

            {/* Reviews List */}
            {filteredReviews.length === 0 ? (
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Star className="h-12 w-12 text-gray-600 mb-4" />
                        <h3 className="text-lg font-medium text-white mb-1">No reviews yet</h3>
                        <p className="text-gray-400">Reviews will appear here when customers leave feedback.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {filteredReviews.map((review) => (
                        <Card key={review.id} className="bg-gray-900 border-gray-800">
                            <CardContent className="p-6">
                                <div className="flex gap-4">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={review.customerAvatar} />
                                        <AvatarFallback className="bg-orange-600 text-white">
                                            {review.customerName.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-white">{review.customerName}</span>
                                            {review.isVerified && (
                                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                                                    Verified Purchase
                                                </Badge>
                                            )}
                                            <span className="text-sm text-gray-500">
                                                {new Date(review.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            {renderStars(review.rating)}
                                            <span className="text-sm text-gray-400">for {review.productName}</span>
                                        </div>
                                        {review.title && (
                                            <p className="font-medium text-white mt-2">{review.title}</p>
                                        )}
                                        <p className="text-gray-300 mt-1">{review.comment}</p>

                                        {review.response ? (
                                            <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border-l-2 border-orange-500">
                                                <p className="text-sm text-orange-400 font-medium mb-1">Store Response</p>
                                                <p className="text-gray-300">{review.response}</p>
                                            </div>
                                        ) : respondingTo === review.id ? (
                                            <div className="mt-4 space-y-3">
                                                <Textarea
                                                    value={responseText}
                                                    onChange={(e) => setResponseText(e.target.value)}
                                                    placeholder="Write your response..."
                                                    className="bg-gray-800 border-gray-700 text-white"
                                                />
                                                <div className="flex gap-2">
                                                    <Button
                                                        onClick={() => handleSubmitResponse(review.id)}
                                                        disabled={isSubmitting || !responseText.trim()}
                                                        className="bg-orange-600 hover:bg-orange-700"
                                                    >
                                                        {isSubmitting ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            'Submit Response'
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => {
                                                            setRespondingTo(null)
                                                            setResponseText('')
                                                        }}
                                                        className="border-gray-700 text-gray-300"
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setRespondingTo(review.id)}
                                                className="mt-3 text-orange-400 hover:text-orange-300"
                                            >
                                                <MessageSquare className="h-4 w-4 mr-2" />
                                                Respond
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
