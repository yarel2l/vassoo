"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mail, Gift, Zap, Users, CheckCircle, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function NewsletterSubscription() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !email.includes("@")) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setIsSubscribed(true)
    setIsLoading(false)

    toast({
      title: "Successfully subscribed!",
      description: "Welcome to our community! Check your email for a special discount code.",
    })

    // Reset form after 3 seconds
    setTimeout(() => {
      setIsSubscribed(false)
      setEmail("")
    }, 3000)
  }

  if (isSubscribed) {
    return (
      <section className="py-16 px-4 bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="container mx-auto max-w-4xl">
          <Card className="border-0 shadow-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white">
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-16 h-16 mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-4">Welcome to the Family!</h2>
              <p className="text-lg opacity-90 mb-4">
                You're now part of our exclusive community of liquor enthusiasts.
              </p>
              <p className="text-sm opacity-80">
                Check your email for a special 25% discount code on your first order!
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 px-4 bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="container mx-auto max-w-4xl">
        <Card className="border-0 shadow-xl overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-8">
              <div className="text-center mb-8">
                <Mail className="w-12 h-12 mx-auto mb-4" />
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Join Our Premium Club</h2>
                <p className="text-lg opacity-90 max-w-2xl mx-auto">
                  Get exclusive access to rare spirits, special discounts, and be the first to know about new arrivals
                </p>
              </div>

              <form onSubmit={handleSubmit} className="max-w-md mx-auto">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/70 focus:bg-white/20"
                    disabled={isLoading}
                  />
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="bg-white text-orange-600 hover:bg-gray-100 font-semibold px-6"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Subscribe"}
                  </Button>
                </div>
              </form>
            </div>

            <div className="p-8 bg-white">
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="text-center">
                  <div className="bg-orange-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Gift className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Exclusive Discounts</h3>
                  <p className="text-sm text-muted-foreground">Up to 25% off on premium spirits and limited editions</p>
                </div>
                <div className="text-center">
                  <div className="bg-orange-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Zap className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Early Access</h3>
                  <p className="text-sm text-muted-foreground">Be first to shop new arrivals and flash sales</p>
                </div>
                <div className="text-center">
                  <div className="bg-orange-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="font-semibold mb-2">VIP Events</h3>
                  <p className="text-sm text-muted-foreground">Invitations to tastings and exclusive events</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    10K+ Members
                  </Badge>
                  <span>Active community</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    25% Avg. Savings
                  </Badge>
                  <span>Member benefits</span>
                </div>
              </div>

              <p className="text-xs text-center text-muted-foreground mt-4">
                No spam, unsubscribe anytime. We respect your privacy.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
