'use client'

import { useState, useEffect } from 'react'
import {
    Elements,
    PaymentElement,
    useStripe,
    useElements,
} from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Loader2, Lock, CreditCard, AlertCircle, Info } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useStripeConfig } from '@/hooks/use-stripe-config'

interface TaxBreakdown {
    type: string
    rate: number
    amount: number
    jurisdiction?: string
}

interface CheckoutTotals {
    subtotal: number
    taxes: number
    taxRate: number
    taxBreakdown: TaxBreakdown[]
    shipping: number
    totalAmount: number
}

interface CartItem {
    id: string
    productId: string
    productName: string
    storeId: string
    storeName: string
    price: number
    taxes: number
    shippingCost: number
    quantity: number
}

interface ShippingAddress {
    name: string
    email: string
    phone: string
    street: string
    city: string
    state: string
    zipCode: string
    country: string
    deliveryNotes?: string
}

interface StripeCheckoutFormProps {
    items: CartItem[]
    shippingAddress: ShippingAddress
    customerId?: string
    onSuccess: (orders: Array<{ id: string; orderNumber: string }>) => void
    onError: (error: string) => void
}

function CheckoutForm({
    items,
    shippingAddress,
    customerId,
    onSuccess,
    onError,
    clientSecret,
    paymentIntentId,
    totalAmount,
}: StripeCheckoutFormProps & {
    clientSecret: string
    paymentIntentId: string
    totalAmount: number
}) {
    const stripe = useStripe()
    const elements = useElements()
    const [isProcessing, setIsProcessing] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!stripe || !elements) {
            return
        }

        setIsProcessing(true)

        try {
            // Confirm the payment
            const { error: paymentError, paymentIntent } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: `${window.location.origin}/checkout/success`,
                    receipt_email: shippingAddress.email,
                },
                redirect: 'if_required',
            })

            if (paymentError) {
                onError(paymentError.message || 'Payment failed')
                setIsProcessing(false)
                return
            }

            if (paymentIntent?.status === 'succeeded') {
                // Create orders in database
                const response = await fetch('/api/stripe/confirm-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        paymentIntentId: paymentIntent.id,
                        customerId,
                        shippingAddress,
                        items,
                    }),
                })

                const result = await response.json()

                if (!response.ok) {
                    onError(result.error || 'Failed to create order')
                    setIsProcessing(false)
                    return
                }

                toast({
                    title: 'Payment successful!',
                    description: `Order${result.orders.length > 1 ? 's' : ''} created successfully`,
                })

                onSuccess(result.orders)
            } else {
                onError('Payment was not completed')
            }
        } catch (error) {
            console.error('Payment error:', error)
            onError('An unexpected error occurred')
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                <PaymentElement
                    options={{
                        layout: 'accordion',
                    }}
                />
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <Lock className="h-4 w-4" />
                <span>Your payment is secure and encrypted</span>
            </div>

            <Button
                type="submit"
                disabled={!stripe || !elements || isProcessing}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold h-12 text-lg"
            >
                {isProcessing ? (
                    <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Processing...
                    </>
                ) : (
                    <>
                        <CreditCard className="h-5 w-5 mr-2" />
                        Pay ${totalAmount.toFixed(2)}
                    </>
                )}
            </Button>
        </form>
    )
}

export function StripeCheckoutForm({
    items,
    shippingAddress,
    customerId,
    onSuccess,
    onError,
}: StripeCheckoutFormProps) {
    // Get Stripe publishable key from Platform Settings
    const {
        stripePromise,
        isConfigured: isStripeConfigured,
        isLoading: isStripeLoading
    } = useStripeConfig()

    const [clientSecret, setClientSecret] = useState<string | null>(null)
    const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
    const [totals, setTotals] = useState<CheckoutTotals | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        // Wait for Stripe config to load
        if (isStripeLoading) return

        // Check if Stripe is configured
        if (!isStripeConfigured) {
            setError('Payment processing is not available. Please contact support.')
            setIsLoading(false)
            return
        }

        const createPaymentIntent = async () => {
            try {
                const response = await fetch('/api/stripe/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        items,
                        customerId,
                        customerEmail: shippingAddress.email,
                        shippingAddress,
                    }),
                })

                const data = await response.json()

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to create payment intent')
                }

                setClientSecret(data.clientSecret)
                setPaymentIntentId(data.paymentIntentId)
                setTotals({
                    subtotal: data.subtotal,
                    taxes: data.taxes,
                    taxRate: data.taxRate,
                    taxBreakdown: data.taxBreakdown || [],
                    shipping: data.shipping,
                    totalAmount: data.totalAmount,
                })
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to initialize payment'
                setError(message)
                onError(message)
            } finally {
                setIsLoading(false)
            }
        }

        if (items.length > 0 && shippingAddress.email) {
            createPaymentIntent()
        }
    }, [items, shippingAddress, customerId, onError, isStripeConfigured, isStripeLoading])

    // Loading state
    if (isLoading || isStripeLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-500" />
                    <p className="text-gray-400">Initializing payment...</p>
                </div>
            </div>
        )
    }

    // Stripe not configured
    if (!isStripeConfigured) {
        return (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6 text-center">
                <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-3" />
                <p className="text-yellow-400 font-medium">Payment Not Available</p>
                <p className="text-gray-400 text-sm mt-2">
                    Payment processing is currently not configured. Please contact support.
                </p>
            </div>
        )
    }

    // Error state
    if (error || !clientSecret) {
        return (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
                <p className="text-red-400">{error || 'Failed to load payment form'}</p>
                <Button
                    variant="outline"
                    onClick={() => window.location.reload()}
                    className="mt-4"
                >
                    Retry
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Server-calculated totals breakdown */}
            {totals && (
                <div className="bg-gray-800/30 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                        <Info className="h-4 w-4" />
                        <span>Final pricing based on your delivery address</span>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Subtotal</span>
                            <span className="text-white">${totals.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">
                                Taxes ({(totals.taxRate * 100).toFixed(2)}%)
                            </span>
                            <span className="text-white">${totals.taxes.toFixed(2)}</span>
                        </div>
                        {totals.taxBreakdown.length > 0 && (
                            <div className="pl-4 space-y-1">
                                {totals.taxBreakdown.map((tax, index) => (
                                    <div key={index} className="flex justify-between text-xs text-gray-500">
                                        <span>{tax.jurisdiction || tax.type} ({(tax.rate * 100).toFixed(2)}%)</span>
                                        <span>${tax.amount.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Delivery</span>
                            <span className="text-white">${totals.shipping.toFixed(2)}</span>
                        </div>
                        <Separator className="my-2 bg-gray-700" />
                        <div className="flex justify-between font-semibold">
                            <span className="text-white">Total</span>
                            <span className="text-orange-400 text-lg">${totals.totalAmount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            )}

            <Elements
                stripe={stripePromise}
                options={{
                    clientSecret,
                    appearance: {
                        theme: 'night',
                        variables: {
                            colorPrimary: '#f97316',
                            colorBackground: '#1f2937',
                            colorText: '#ffffff',
                            colorDanger: '#ef4444',
                            fontFamily: 'Inter, system-ui, sans-serif',
                            borderRadius: '8px',
                        },
                    },
                }}
            >
                <CheckoutForm
                    items={items}
                    shippingAddress={shippingAddress}
                    customerId={customerId}
                    onSuccess={onSuccess}
                    onError={onError}
                    clientSecret={clientSecret}
                    paymentIntentId={paymentIntentId!}
                    totalAmount={totals?.totalAmount || 0}
                />
            </Elements>
        </div>
    )
}

export default StripeCheckoutForm
