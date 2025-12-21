"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Mail, Gift, Zap, Users, CheckCircle, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface NewsletterDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function NewsletterDialog({ isOpen, onClose }: NewsletterDialogProps) {
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

    // Close dialog after 2 seconds
    setTimeout(() => {
      onClose()
      setIsSubscribed(false)
      setEmail("")
    }, 2000)
  }

  if (isSubscribed) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center p-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Welcome to the Club!</h2>
            <p className="text-muted-foreground mb-4">
              You're now subscribed to our newsletter. Check your email for a special 25% discount code!
            </p>
            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Subscription Confirmed</Badge>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Mail className="w-6 h-6 text-orange-600" />
            Join Our Premium Club
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <p className="text-muted-foreground">
            Get exclusive access to rare spirits, special discounts, and be the first to know about new arrivals
          </p>

          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 w-8 h-8 rounded-full flex items-center justify-center">
                <Gift className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h4 className="font-medium">Exclusive Discounts</h4>
                <p className="text-sm text-muted-foreground">Up to 25% off premium spirits</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 w-8 h-8 rounded-full flex items-center justify-center">
                <Zap className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h4 className="font-medium">Early Access</h4>
                <p className="text-sm text-muted-foreground">First to shop new arrivals</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 w-8 h-8 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h4 className="font-medium">VIP Events</h4>
                <p className="text-sm text-muted-foreground">Exclusive tastings and events</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full"
              disabled={isLoading}
            />

            <Button type="submit" disabled={isLoading} className="w-full bg-orange-600 hover:bg-orange-700 text-white">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Subscribing...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Subscribe & Save 25%
                </>
              )}
            </Button>
          </form>

          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              10K+ Members
            </Badge>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              25% Avg. Savings
            </Badge>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            No spam, unsubscribe anytime. We respect your privacy.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
