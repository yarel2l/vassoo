'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Store, Truck, ArrowRight, CheckCircle, ArrowLeft } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { VassooLogoIcon } from '@/components/vassoo-logo'

type TenantType = 'owner_store' | 'delivery_company'

const steps = [
    { id: 1, title: 'Business Type', description: 'Choose your business type' },
    { id: 2, title: 'Business Info', description: 'Tell us about your business' },
    { id: 3, title: 'Payment Setup', description: 'Connect with Stripe' },
]

export default function OnboardingPage() {
    const searchParams = useSearchParams()
    const typeParam = searchParams.get('type') as TenantType | null

    // If type is provided via URL, skip step 1 and go directly to step 2
    const initialStep = typeParam && ['owner_store', 'delivery_company'].includes(typeParam) ? 2 : 1
    const initialType = typeParam && ['owner_store', 'delivery_company'].includes(typeParam) ? typeParam : null

    const [currentStep, setCurrentStep] = useState(initialStep)
    const [tenantType, setTenantType] = useState<TenantType | null>(initialType)
    const [businessName, setBusinessName] = useState('')
    const [businessEmail, setBusinessEmail] = useState('')
    const [businessPhone, setBusinessPhone] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [tenantId, setTenantId] = useState<string | null>(null)

    const { user, refreshTenants } = useAuth()
    const router = useRouter()
    const supabase = getSupabaseClient()

    const handleSelectType = (type: TenantType) => {
        setTenantType(type)
        setCurrentStep(2)
    }

    const handleBusinessInfoSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            // Create slug from business name
            const slug = businessName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '')
                + '-' + Date.now().toString(36)

            // Create tenant
            const { data: tenant, error: tenantError } = await supabase
                .from('tenants')
                .insert({
                    name: businessName,
                    slug,
                    type: tenantType!,
                    email: businessEmail,
                    phone: businessPhone,
                    status: 'pending',
                })
                .select()
                .single()

            if (tenantError) throw tenantError

            // Create membership (owner)
            const { error: membershipError } = await supabase
                .from('tenant_memberships')
                .insert({
                    user_id: user!.id,
                    tenant_id: tenant.id,
                    role: 'owner',
                    is_active: true,
                    accepted_at: new Date().toISOString(),
                })

            if (membershipError) throw membershipError

            // If store, create store record
            if (tenantType === 'owner_store') {
                const { error: storeError } = await supabase
                    .from('stores')
                    .insert({
                        tenant_id: tenant.id,
                        name: businessName,
                        slug,
                        email: businessEmail,
                        phone: businessPhone,
                        is_active: false, // Will be activated after Stripe onboarding
                    })

                if (storeError) throw storeError
            }

            // If delivery company, create record
            if (tenantType === 'delivery_company') {
                const { error: deliveryError } = await supabase
                    .from('delivery_companies')
                    .insert({
                        tenant_id: tenant.id,
                        name: businessName,
                        slug,
                        email: businessEmail,
                        phone: businessPhone,
                        is_active: false,
                    })

                if (deliveryError) throw deliveryError
            }

            setTenantId(tenant.id)
            setCurrentStep(3)
            await refreshTenants()

        } catch (err: any) {
            setError(err.message || 'Failed to create business')
        } finally {
            setIsLoading(false)
        }
    }

    const handleStripeConnect = async () => {
        if (!tenantId) return

        setIsLoading(true)
        setError('')

        try {
            // Call our API to create Stripe Connect account and get onboarding URL
            const response = await fetch('/api/stripe/connect/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenant_id: tenantId }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to start Stripe onboarding')
            }

            // Redirect to Stripe onboarding
            window.location.href = data.url

        } catch (err: any) {
            setError(err.message)
            setIsLoading(false)
        }
    }

    const handleSkipStripe = () => {
        const dashboardPath = tenantType === 'owner_store'
            ? '/dashboard/store'
            : '/dashboard/delivery'
        router.push(dashboardPath)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black px-4 py-8">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-20 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
            </div>

            <div className="max-w-2xl mx-auto relative z-10">
                {/* Back to home */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to store
                </Link>

                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <VassooLogoIcon size="lg" />
                </div>

                {/* Progress Steps */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        {steps.map((step, index) => (
                            <div key={step.id} className="flex items-center">
                                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2
                  ${currentStep > step.id
                                        ? 'bg-green-600 border-green-600 text-white'
                                        : currentStep === step.id
                                            ? 'bg-gradient-to-r from-orange-500 to-amber-500 border-orange-500 text-white'
                                            : 'border-gray-600 text-gray-500'
                                    }
                `}>
                                    {currentStep > step.id ? (
                                        <CheckCircle className="h-5 w-5" />
                                    ) : (
                                        step.id
                                    )}
                                </div>
                                {index < steps.length - 1 && (
                                    <div className={`
                    w-24 h-0.5 mx-2
                    ${currentStep > step.id ? 'bg-green-600' : 'bg-gray-600'}
                  `} />
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-2">
                        {steps.map((step) => (
                            <div key={step.id} className="text-center" style={{ width: '120px' }}>
                                <p className={`text-sm ${currentStep >= step.id ? 'text-white' : 'text-gray-500'}`}>
                                    {step.title}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Step 1: Choose Business Type */}
                {currentStep === 1 && (
                    <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-xl">
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl font-bold text-white">
                                What type of business are you?
                            </CardTitle>
                            <CardDescription className="text-gray-400">
                                Choose the option that best describes your business
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <button
                                onClick={() => handleSelectType('owner_store')}
                                className="p-6 rounded-xl border-2 border-gray-700 hover:border-orange-500 bg-gray-800/50 hover:bg-gray-800 transition-all group text-left"
                            >
                                <Store className="h-12 w-12 text-orange-400 mb-4 group-hover:scale-110 transition-transform" />
                                <h3 className="text-lg font-semibold text-white mb-2">Liquor Store</h3>
                                <p className="text-gray-400 text-sm">
                                    I own a liquor store and want to sell products on Vassoo
                                </p>
                            </button>
                            <button
                                onClick={() => handleSelectType('delivery_company')}
                                className="p-6 rounded-xl border-2 border-gray-700 hover:border-amber-500 bg-gray-800/50 hover:bg-gray-800 transition-all group text-left"
                            >
                                <Truck className="h-12 w-12 text-amber-400 mb-4 group-hover:scale-110 transition-transform" />
                                <h3 className="text-lg font-semibold text-white mb-2">Delivery Company</h3>
                                <p className="text-gray-400 text-sm">
                                    I provide delivery services and want to partner with stores
                                </p>
                            </button>
                        </CardContent>
                    </Card>
                )}

                {/* Step 2: Business Info */}
                {currentStep === 2 && (
                    <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle className="text-2xl font-bold text-white">
                                Tell us about your {tenantType === 'owner_store' ? 'store' : 'delivery company'}
                            </CardTitle>
                            <CardDescription className="text-gray-400">
                                This information will be displayed to customers
                            </CardDescription>
                        </CardHeader>
                        <form onSubmit={handleBusinessInfoSubmit}>
                            <CardContent className="space-y-4">
                                {error && (
                                    <Alert variant="destructive">
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}
                                <div className="space-y-2">
                                    <Label htmlFor="businessName" className="text-gray-300">Business Name</Label>
                                    <Input
                                        id="businessName"
                                        placeholder={tenantType === 'owner_store' ? 'My Liquor Store' : 'Quick Delivery Co'}
                                        value={businessName}
                                        onChange={(e) => setBusinessName(e.target.value)}
                                        required
                                        className="bg-gray-800/50 border-gray-700 text-white focus:border-orange-500 focus:ring-orange-500/20"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="businessEmail" className="text-gray-300">Business Email</Label>
                                    <Input
                                        id="businessEmail"
                                        type="email"
                                        placeholder="business@example.com"
                                        value={businessEmail}
                                        onChange={(e) => setBusinessEmail(e.target.value)}
                                        required
                                        className="bg-gray-800/50 border-gray-700 text-white focus:border-orange-500 focus:ring-orange-500/20"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="businessPhone" className="text-gray-300">Business Phone</Label>
                                    <Input
                                        id="businessPhone"
                                        type="tel"
                                        placeholder="+1 (555) 123-4567"
                                        value={businessPhone}
                                        onChange={(e) => setBusinessPhone(e.target.value)}
                                        className="bg-gray-800/50 border-gray-700 text-white focus:border-orange-500 focus:ring-orange-500/20"
                                    />
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setCurrentStep(1)}
                                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                                >
                                    Back
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            Continue
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </>
                                    )}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                )}

                {/* Step 3: Stripe Connect */}
                {currentStep === 3 && (
                    <Card className="bg-gray-900/80 border-gray-800 backdrop-blur-xl">
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl font-bold text-white">
                                Connect your payment account
                            </CardTitle>
                            <CardDescription className="text-gray-400">
                                We use Stripe to securely process payments and send you your earnings
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {error && (
                                <Alert variant="destructive">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}
                            <div className="bg-gray-800 rounded-xl p-6 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-500/20 rounded-lg">
                                        <CheckCircle className="h-5 w-5 text-orange-400" />
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">Secure payments</p>
                                        <p className="text-gray-400 text-sm">All transactions are encrypted</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-500/20 rounded-lg">
                                        <CheckCircle className="h-5 w-5 text-orange-400" />
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">Fast payouts</p>
                                        <p className="text-gray-400 text-sm">Receive payments within 2-3 business days</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-500/20 rounded-lg">
                                        <CheckCircle className="h-5 w-5 text-orange-400" />
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">Easy setup</p>
                                        <p className="text-gray-400 text-sm">Takes only 5 minutes to complete</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-4">
                            <Button
                                onClick={handleStripeConnect}
                                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/25"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Connecting to Stripe...
                                    </>
                                ) : (
                                    'Connect with Stripe'
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={handleSkipStripe}
                                className="text-gray-400 hover:text-white"
                            >
                                Skip for now (you can set this up later)
                            </Button>
                        </CardFooter>
                    </Card>
                )}
            </div>
        </div>
    )
}
