"use client"

import { useState } from "react"
import { Gift, Percent, Tag, Calendar, Users, Trophy, Star, Clock, Cake, PartyPopper } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const activePromotions = [
  {
    id: 1,
    title: "Welcome Bonus",
    description: "Get 20% off your first order",
    code: "WELCOME20",
    discount: 20,
    type: "percentage",
    minOrder: 50,
    validUntil: "2024-12-31",
    category: "new-customer",
    icon: Gift,
    color: "bg-green-100 text-green-700",
  },
  {
    id: 2,
    title: "Free Shipping Weekend",
    description: "Free delivery on orders over $75",
    code: "FREESHIP",
    discount: 0,
    type: "shipping",
    minOrder: 75,
    validUntil: "2024-02-15",
    category: "shipping",
    icon: Calendar,
    color: "bg-blue-100 text-blue-700",
  },
  {
    id: 3,
    title: "Bulk Buy Discount",
    description: "Buy 3 bottles, get 15% off",
    code: "BULK15",
    discount: 15,
    type: "quantity",
    minOrder: 0,
    validUntil: "2024-03-01",
    category: "bulk",
    icon: Trophy,
    color: "bg-purple-100 text-purple-700",
  },
]

const seasonalPromotions = [
  {
    id: 4,
    title: "Valentine's Special",
    description: "25% off wine and champagne",
    code: "LOVE25",
    discount: 25,
    type: "category",
    minOrder: 100,
    validUntil: "2024-02-14",
    category: "seasonal",
    icon: Star,
    color: "bg-red-100 text-red-700",
  },
  {
    id: 5,
    title: "Spring Collection",
    description: "30% off selected spirits",
    code: "SPRING30",
    discount: 30,
    type: "category",
    minOrder: 80,
    validUntil: "2024-03-31",
    category: "seasonal",
    icon: Gift,
    color: "bg-yellow-100 text-yellow-700",
  },
]

const loyaltyPromotions = [
  {
    id: 6,
    title: "VIP Member Exclusive",
    description: "Extra 10% off for premium members",
    code: "VIP10",
    discount: 10,
    type: "membership",
    minOrder: 0,
    validUntil: "2024-12-31",
    category: "loyalty",
    icon: Users,
    color: "bg-indigo-100 text-indigo-700",
  },
]

const birthdayOffers = [
  {
    id: "birthday-month",
    title: "Birthday Month Special",
    description: "Celebrate your special month with 25% off your entire order",
    code: "BIRTHDAY25",
    discount: 25,
    validDays: 30,
    icon: Cake,
    color: "bg-pink-100 text-pink-700",
    features: ["Valid for entire birthday month", "No minimum order", "Stackable with other offers"],
  },
  {
    id: "birthday-surprise",
    title: "Birthday Surprise Box",
    description: "Get a curated selection of premium bottles delivered",
    code: "SURPRISE",
    discount: 0,
    validDays: 7,
    icon: PartyPopper,
    color: "bg-orange-100 text-orange-700",
    features: ["3 premium bottles", "Personalized selection", "Free gift wrapping"],
  },
  {
    id: "birthday-party",
    title: "Party Package Deal",
    description: "Buy 6 bottles, get 2 free mixers and party accessories",
    code: "PARTY6",
    discount: 0,
    validDays: 14,
    icon: PartyPopper,
    color: "bg-purple-100 text-purple-700",
    features: ["Free mixers included", "Party decorations", "Recipe cards"],
  },
]

const rewardProgram = {
  currentPoints: 1250,
  nextReward: 2000,
  rewards: [
    { points: 500, reward: "$5 off your order" },
    { points: 1000, reward: "$12 off your order" },
    { points: 2000, reward: "$25 off your order" },
    { points: 5000, reward: "Free premium bottle" },
  ],
}

export default function PromotionsPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const PromotionCard = ({ promotion }: { promotion: any }) => {
    const IconComponent = promotion.icon
    return (
      <Card className="group hover:shadow-lg transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-lg ${promotion.color}`}>
              <IconComponent className="h-6 w-6" />
            </div>
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Until {formatDate(promotion.validUntil)}
            </Badge>
          </div>

          <h3 className="text-xl font-semibold mb-2">{promotion.title}</h3>
          <p className="text-muted-foreground mb-4">{promotion.description}</p>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <code className="font-mono font-bold text-primary">{promotion.code}</code>
              <Button size="sm" variant="outline" onClick={() => copyCode(promotion.code)} className="text-xs">
                {copiedCode === promotion.code ? "Copied!" : "Copy"}
              </Button>
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              {promotion.minOrder > 0 && <div>• Minimum order: ${promotion.minOrder}</div>}
              {promotion.type === "percentage" && <div>• {promotion.discount}% discount</div>}
              {promotion.type === "shipping" && <div>• Free shipping included</div>}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const BirthdayCard = ({ offer }: { offer: any }) => {
    const IconComponent = offer.icon
    return (
      <Card className="group hover:shadow-lg transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-lg ${offer.color}`}>
              <IconComponent className="h-6 w-6" />
            </div>
            <Badge variant="outline" className="text-xs">
              Valid {offer.validDays} days
            </Badge>
          </div>

          <h3 className="text-xl font-semibold mb-2">{offer.title}</h3>
          <p className="text-muted-foreground mb-4">{offer.description}</p>

          {offer.code && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg mb-4">
              <code className="font-mono font-bold text-primary">{offer.code}</code>
              <Button size="sm" variant="outline" onClick={() => copyCode(offer.code)} className="text-xs">
                {copiedCode === offer.code ? "Copied!" : "Copy"}
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Includes:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {offer.features.map((feature: string, index: number) => (
                <li key={index}>• {feature}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center space-x-3 mb-4">
            <Gift className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Promotions & Rewards</h1>
          </div>
          <p className="text-green-100 text-lg">Save more with our exclusive deals and loyalty program</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Rewards Program */}
        <Card className="mb-12 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-6 w-6" />
              <span>Your Rewards Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-3xl font-bold mb-2">{rewardProgram.currentPoints} Points</div>
                <div className="text-purple-100 mb-4">
                  {rewardProgram.nextReward - rewardProgram.currentPoints} points to next reward
                </div>
                <div className="w-full bg-purple-400 rounded-full h-2">
                  <div
                    className="bg-white h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(rewardProgram.currentPoints / rewardProgram.nextReward) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold mb-3">Available Rewards:</h4>
                {rewardProgram.rewards.map((reward, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span>{reward.points} pts</span>
                    <span className="text-purple-100">{reward.reward}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Deals Section */}
        <section className="mb-12">
          <div className="flex items-center space-x-2 mb-6">
            <Percent className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Active Deals</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activePromotions.map((promotion) => (
              <PromotionCard key={promotion.id} promotion={promotion} />
            ))}
          </div>
        </section>

        {/* Seasonal Promotions Section */}
        <section className="mb-12">
          <div className="flex items-center space-x-2 mb-6">
            <Calendar className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Seasonal Offers</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {seasonalPromotions.map((promotion) => (
              <PromotionCard key={promotion.id} promotion={promotion} />
            ))}
          </div>
        </section>

        {/* Loyalty Program Section */}
        <section className="mb-12">
          <div className="flex items-center space-x-2 mb-6">
            <Users className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Loyalty Benefits</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {loyaltyPromotions.map((promotion) => (
              <PromotionCard key={promotion.id} promotion={promotion} />
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>How to Earn Points</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4">
                  <div className="text-2xl font-bold text-primary mb-2">1 Point</div>
                  <div className="text-sm text-muted-foreground">per $1 spent</div>
                </div>
                <div className="text-center p-4">
                  <div className="text-2xl font-bold text-primary mb-2">50 Points</div>
                  <div className="text-sm text-muted-foreground">for product reviews</div>
                </div>
                <div className="text-center p-4">
                  <div className="text-2xl font-bold text-primary mb-2">100 Points</div>
                  <div className="text-sm text-muted-foreground">for referrals</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Happy Birthday Celebrations Section */}
        <section className="mb-12">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Cake className="h-8 w-8 text-pink-600" />
              <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Happy Birthday Celebrations
              </h2>
              <PartyPopper className="h-8 w-8 text-purple-600" />
            </div>
            <p className="text-muted-foreground text-lg">
              Make your special day even more memorable with our exclusive birthday offers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {birthdayOffers.map((offer) => (
              <BirthdayCard key={offer.id} offer={offer} />
            ))}
          </div>

          {/* Birthday Registration CTA */}
          <Card className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
            <CardContent className="p-8 text-center">
              <Cake className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Register Your Birthday</h3>
              <p className="text-pink-100 mb-6">
                Don't miss out on exclusive birthday treats! Add your birthday to your profile and we'll make sure to
                celebrate with you.
              </p>
              <div className="flex justify-center space-x-4">
                <Button variant="secondary" size="lg">
                  Add Birthday to Profile
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="text-white border-white hover:bg-white hover:text-purple-600 bg-transparent"
                >
                  Learn More
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Newsletter */}
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardContent className="p-8 text-center">
            <Tag className="h-12 w-12 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Stay Updated on Deals</h2>
            <p className="text-blue-100 mb-6">Be the first to know about new promotions and exclusive offers</p>
            <div className="flex max-w-md mx-auto space-x-2">
              <input type="email" placeholder="Enter your email" className="flex-1 px-4 py-2 rounded-lg text-black" />
              <Button variant="secondary">Subscribe</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
