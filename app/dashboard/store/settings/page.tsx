'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Store,
    CreditCard,
    Bell,
    Save,
    Upload,
    Loader2,
    ImagePlus,
    CheckCircle,
    AlertCircle,
    ExternalLink,
    RefreshCw,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useStoreDashboard } from '@/contexts/store-dashboard-context'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/hooks/use-toast'

interface StoreSettings {
    id: string
    name: string
    slug: string
    description: string
    email: string
    phone: string
    logo_url: string
    banner_url: string
    license_number: string
    license_state: string
    license_expiry: string
    is_active: boolean
}

interface NotificationSettings {
    new_orders: boolean
    order_updates: boolean
    low_stock_alerts: boolean
    new_reviews: boolean
    daily_summary: boolean
    weekly_report: boolean
}

interface StripeStatus {
    connected: boolean
    status: string
    stripeConfigured: boolean
    canReceivePayments: boolean
    canReceivePayouts?: boolean
    detailsSubmitted?: boolean
    message: string
    hasStripeAccount?: boolean
    needsReconnection?: boolean
    errorDetails?: string
}

const defaultNotifications: NotificationSettings = {
    new_orders: true,
    order_updates: true,
    low_stock_alerts: true,
    new_reviews: true,
    daily_summary: false,
    weekly_report: true,
}

export default function SettingsPage() {
    const { isLoading: authLoading } = useAuth()
    const { currentStore, isLoading: storeLoading } = useStoreDashboard()
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [storeId, setStoreId] = useState<string | null>(null)

    // Stripe Connect state
    const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null)
    const [isLoadingStripe, setIsLoadingStripe] = useState(false)
    const [isConnectingStripe, setIsConnectingStripe] = useState(false)
    const [isResettingStripe, setIsResettingStripe] = useState(false)
    const [showResetConfirmModal, setShowResetConfirmModal] = useState(false)
    const [deleteTestOrders, setDeleteTestOrders] = useState(false)

    // Form state
    const [settings, setSettings] = useState<StoreSettings>({
        id: '',
        name: '',
        slug: '',
        description: '',
        email: '',
        phone: '',
        logo_url: '',
        banner_url: '',
        license_number: '',
        license_state: '',
        license_expiry: '',
        is_active: true,
    })
    const [notifications, setNotifications] = useState<NotificationSettings>(defaultNotifications)
    const [isUploadingLogo, setIsUploadingLogo] = useState(false)
    const [isUploadingBanner, setIsUploadingBanner] = useState(false)

    const tenantId = currentStore?.id

    const fetchSettings = useCallback(async () => {
        if (!tenantId) {
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        try {
            const supabase = createClient()

            // Get store for this tenant
            const { data: storeData, error } = await supabase
                .from('stores')
                .select('*')
                .eq('tenant_id', tenantId)
                .single()

            if (error) {
                console.error('Error fetching store:', error)
                setIsLoading(false)
                return
            }

            if (storeData) {
                setStoreId(storeData.id)
                setSettings({
                    id: storeData.id,
                    name: storeData.name || '',
                    slug: storeData.slug || '',
                    description: storeData.description || '',
                    email: storeData.email || '',
                    phone: storeData.phone || '',
                    logo_url: storeData.logo_url || '',
                    banner_url: storeData.banner_url || '',
                    license_number: storeData.license_number || '',
                    license_state: storeData.license_state || '',
                    license_expiry: storeData.license_expiry || '',
                    is_active: storeData.is_active ?? true,
                })

                // Load notification settings from store settings JSONB
                const storeSettings = storeData.settings as Record<string, unknown> | null
                if (storeSettings?.notifications) {
                    const notifSettings = storeSettings.notifications as Partial<NotificationSettings>
                    setNotifications(prev => ({
                        ...prev,
                        ...notifSettings,
                    }))
                }
            }
        } catch (err) {
            console.error('Error:', err)
        } finally {
            setIsLoading(false)
        }
    }, [tenantId])

    useEffect(() => {
        fetchSettings()
    }, [fetchSettings])

    // Fetch Stripe Connect status
    const fetchStripeStatus = useCallback(async () => {
        if (!tenantId) return

        setIsLoadingStripe(true)
        try {
            const response = await fetch(`/api/stripe/connect/status?tenant_id=${tenantId}`)
            const data = await response.json()

            if (response.ok) {
                setStripeStatus(data)
            } else {
                console.error('Error fetching Stripe status:', data.error)
            }
        } catch (err) {
            console.error('Error fetching Stripe status:', err)
        } finally {
            setIsLoadingStripe(false)
        }
    }, [tenantId])

    useEffect(() => {
        fetchStripeStatus()
    }, [fetchStripeStatus])

    // Handle Stripe Connect onboarding
    const handleStripeConnect = async () => {
        if (!tenantId) return

        setIsConnectingStripe(true)
        try {
            const response = await fetch('/api/stripe/connect/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenant_id: tenantId }),
            })

            const data = await response.json()

            if (response.ok && data.url) {
                window.location.href = data.url
            } else {
                toast({
                    title: 'Error',
                    description: data.error || 'Failed to start Stripe onboarding',
                    variant: 'destructive',
                })
            }
        } catch (err) {
            console.error('Error connecting Stripe:', err)
            toast({
                title: 'Error',
                description: 'Failed to connect to Stripe',
                variant: 'destructive',
            })
        } finally {
            setIsConnectingStripe(false)
        }
    }

    // Open Stripe Dashboard
    const handleOpenStripeDashboard = async () => {
        if (!tenantId) return

        setIsConnectingStripe(true)
        try {
            const response = await fetch('/api/stripe/connect/dashboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenant_id: tenantId }),
            })

            const data = await response.json()

            if (response.ok && data.url) {
                window.open(data.url, '_blank')
            } else {
                toast({
                    title: 'Error',
                    description: data.error || 'Failed to open Stripe dashboard',
                    variant: 'destructive',
                })
            }
        } catch (err) {
            console.error('Error opening Stripe dashboard:', err)
            toast({
                title: 'Error',
                description: 'Failed to open Stripe dashboard',
                variant: 'destructive',
            })
        } finally {
            setIsConnectingStripe(false)
        }
    }

    // Open reset confirmation modal
    const handleResetStripeConnection = () => {
        setDeleteTestOrders(false) // Reset checkbox state
        setShowResetConfirmModal(true)
    }

    // Confirm and execute Stripe reset
    const confirmResetStripeConnection = async () => {
        if (!tenantId) return

        setShowResetConfirmModal(false)
        setIsResettingStripe(true)
        try {
            const response = await fetch('/api/stripe/connect/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenant_id: tenantId,
                    deleteTestOrders: deleteTestOrders
                }),
            })

            const data = await response.json()

            if (response.ok) {
                toast({
                    title: 'Connection Reset',
                    description: deleteTestOrders
                        ? 'Test orders deleted and Stripe connection reset. You can now reconnect your account.'
                        : data.message || 'You can now reconnect your Stripe account.',
                })
                // Refresh status to show disconnected state
                await fetchStripeStatus()
            } else {
                toast({
                    title: 'Cannot Reset Connection',
                    description: data.error || 'Failed to reset Stripe connection',
                    variant: 'destructive',
                })
            }
        } catch (err) {
            console.error('Error resetting Stripe connection:', err)
            toast({
                title: 'Error',
                description: 'Failed to reset Stripe connection',
                variant: 'destructive',
            })
        } finally {
            setIsResettingStripe(false)
        }
    }

    const handleSave = async () => {
        if (!storeId) {
            toast({
                title: 'Error',
                description: 'No store found to update',
                variant: 'destructive',
            })
            return
        }

        setIsSaving(true)
        try {
            const supabase = createClient()

            // Get current store settings to merge with notifications
            const { data: currentStore } = await supabase
                .from('stores')
                .select('settings')
                .eq('id', storeId)
                .single()

            const currentSettings = (currentStore?.settings || {}) as { [key: string]: unknown }
            const updatedSettings = {
                ...currentSettings,
                notifications: { ...notifications } as { [key: string]: boolean },
            }

            // Update store basic info and notification settings
            const { error: storeError } = await supabase
                .from('stores')
                .update({
                    name: settings.name,
                    slug: settings.slug,
                    description: settings.description,
                    email: settings.email,
                    phone: settings.phone,
                    license_number: settings.license_number,
                    license_state: settings.license_state,
                    license_expiry: settings.license_expiry || null,
                    settings: updatedSettings,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', storeId)

            if (storeError) {
                toast({
                    title: 'Error',
                    description: storeError.message || 'Failed to save store settings',
                    variant: 'destructive',
                })
                return
            }

            toast({
                title: 'Settings saved',
                description: 'Your store settings have been updated successfully.',
            })
        } catch (err) {
            console.error('Error saving settings:', err)
            toast({
                title: 'Error',
                description: 'An unexpected error occurred',
                variant: 'destructive',
            })
        } finally {
            setIsSaving(false)
        }
    }

    if (authLoading || storeLoading || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-500" />
                    <p className="text-gray-400">Loading settings...</p>
                </div>
            </div>
        )
    }

    if (!currentStore) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Store className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-lg font-medium text-white mb-2">No store selected</h3>
                    <p className="text-gray-400">Please select a store from the sidebar</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Settings</h1>
                    <p className="text-gray-400 mt-1">
                        Manage settings for {currentStore.name}
                    </p>
                </div>
                <Button
                    className="bg-orange-600 hover:bg-orange-700"
                    onClick={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                        </>
                    )}
                </Button>
            </div>

            <Tabs defaultValue="general" className="space-y-6">
                <TabsList className="bg-gray-900 border border-gray-800 p-1">
                    <TabsTrigger value="general" className="data-[state=active]:bg-orange-600">
                        <Store className="h-4 w-4 mr-2" />
                        General
                    </TabsTrigger>
                    <TabsTrigger value="payments" className="data-[state=active]:bg-orange-600">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Payments
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="data-[state=active]:bg-orange-600">
                        <Bell className="h-4 w-4 mr-2" />
                        Notifications
                    </TabsTrigger>
                </TabsList>

                {/* General Settings */}
                <TabsContent value="general" className="space-y-6">
                    <Card className="bg-gray-900 border-gray-800">
                        <CardHeader>
                            <CardTitle className="text-white">Store Information</CardTitle>
                            <CardDescription className="text-gray-400">
                                Basic information about your store
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Logo */}
                            <div className="flex items-start gap-6">
                                <div className="h-24 w-24 bg-gray-800 rounded-xl flex items-center justify-center overflow-hidden">
                                    {settings.logo_url ? (
                                        <img src={settings.logo_url} alt="Store logo" className="h-full w-full object-cover" />
                                    ) : (
                                        <Store className="h-10 w-10 text-gray-500" />
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-gray-300">Store Logo</Label>
                                    <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
                                        <Upload className="h-4 w-4 mr-2" />
                                        Upload Logo
                                    </Button>
                                    <p className="text-xs text-gray-500">PNG, JPG up to 2MB. Recommended: 512x512px</p>
                                </div>
                            </div>

                            {/* Banner */}
                            <div className="space-y-2">
                                <Label className="text-gray-300">Store Banner</Label>
                                <div className="h-40 bg-gray-800 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-700 cursor-pointer hover:border-gray-600 transition-colors overflow-hidden">
                                    {settings.banner_url ? (
                                        <img src={settings.banner_url} alt="Store banner" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="text-center">
                                            <ImagePlus className="h-8 w-8 mx-auto text-gray-500" />
                                            <p className="mt-2 text-sm text-gray-400">Click to upload banner</p>
                                            <p className="text-xs text-gray-500">1200x400px recommended</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="storeName" className="text-gray-300">Store Name</Label>
                                    <Input
                                        id="storeName"
                                        value={settings.name}
                                        onChange={(e) => setSettings(prev => ({ ...prev, name: e.target.value }))}
                                        className="bg-gray-800 border-gray-700 text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="slug" className="text-gray-300">Store URL</Label>
                                    <div className="flex">
                                        <span className="inline-flex items-center px-3 bg-gray-800 border border-r-0 border-gray-700 rounded-l-md text-gray-400 text-sm">
                                            vassoo.com/store/
                                        </span>
                                        <Input
                                            id="slug"
                                            value={settings.slug}
                                            onChange={(e) => setSettings(prev => ({ ...prev, slug: e.target.value }))}
                                            className="bg-gray-800 border-gray-700 text-white rounded-l-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-gray-300">Description</Label>
                                <Textarea
                                    id="description"
                                    value={settings.description}
                                    onChange={(e) => setSettings(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Tell customers about your store..."
                                    className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                                />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-gray-300">Contact Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={settings.email}
                                        onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                                        placeholder="store@example.com"
                                        className="bg-gray-800 border-gray-700 text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="text-gray-300">Phone Number</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        value={settings.phone}
                                        onChange={(e) => setSettings(prev => ({ ...prev, phone: e.target.value }))}
                                        placeholder="+1 (555) 123-4567"
                                        className="bg-gray-800 border-gray-700 text-white"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gray-900 border-gray-800">
                        <CardHeader>
                            <CardTitle className="text-white">License Information</CardTitle>
                            <CardDescription className="text-gray-400">
                                Your liquor license details
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="space-y-2">
                                    <Label htmlFor="licenseNumber" className="text-gray-300">License Number</Label>
                                    <Input
                                        id="licenseNumber"
                                        value={settings.license_number}
                                        onChange={(e) => setSettings(prev => ({ ...prev, license_number: e.target.value }))}
                                        placeholder="ABC-123456"
                                        className="bg-gray-800 border-gray-700 text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="licenseState" className="text-gray-300">State</Label>
                                    <Input
                                        id="licenseState"
                                        value={settings.license_state}
                                        onChange={(e) => setSettings(prev => ({ ...prev, license_state: e.target.value }))}
                                        placeholder="NY"
                                        className="bg-gray-800 border-gray-700 text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="licenseExpiry" className="text-gray-300">Expiry Date</Label>
                                    <Input
                                        id="licenseExpiry"
                                        type="date"
                                        value={settings.license_expiry}
                                        onChange={(e) => setSettings(prev => ({ ...prev, license_expiry: e.target.value }))}
                                        className="bg-gray-800 border-gray-700 text-white"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Payments */}
                <TabsContent value="payments" className="space-y-6">
                    <Card className="bg-gray-900 border-gray-800">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <CreditCard className="h-5 w-5" />
                                Stripe Connect
                            </CardTitle>
                            <CardDescription className="text-gray-400">
                                Connect your Stripe account to receive payments from customers
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Loading state */}
                            {isLoadingStripe && (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                                </div>
                            )}

                            {/* Status display */}
                            {!isLoadingStripe && stripeStatus && (
                                <>
                                    {/* Connection Status Card */}
                                    <div className={`p-4 rounded-lg border ${
                                        stripeStatus.status === 'active'
                                            ? 'bg-green-500/10 border-green-500/30'
                                            : stripeStatus.status === 'pending_verification'
                                            ? 'bg-yellow-500/10 border-yellow-500/30'
                                            : stripeStatus.status === 'onboarding_incomplete'
                                            ? 'bg-orange-500/10 border-orange-500/30'
                                            : stripeStatus.status === 'account_error'
                                            ? 'bg-red-500/10 border-red-500/30'
                                            : 'bg-gray-800/50 border-gray-700'
                                    }`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-lg ${
                                                    stripeStatus.status === 'active'
                                                        ? 'bg-green-500/20'
                                                        : stripeStatus.status === 'pending_verification'
                                                        ? 'bg-yellow-500/20'
                                                        : stripeStatus.status === 'onboarding_incomplete'
                                                        ? 'bg-orange-500/20'
                                                        : stripeStatus.status === 'account_error'
                                                        ? 'bg-red-500/20'
                                                        : 'bg-gray-700'
                                                }`}>
                                                    {stripeStatus.status === 'active' ? (
                                                        <CheckCircle className="h-6 w-6 text-green-400" />
                                                    ) : stripeStatus.status === 'pending_verification' ? (
                                                        <Loader2 className="h-6 w-6 text-yellow-400" />
                                                    ) : stripeStatus.status === 'account_error' ? (
                                                        <AlertCircle className="h-6 w-6 text-red-400" />
                                                    ) : stripeStatus.connected ? (
                                                        <AlertCircle className="h-6 w-6 text-orange-400" />
                                                    ) : (
                                                        <CreditCard className="h-6 w-6 text-gray-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium">
                                                        {stripeStatus.status === 'active'
                                                            ? 'Connected & Active'
                                                            : stripeStatus.status === 'pending_verification'
                                                            ? 'Pending Verification'
                                                            : stripeStatus.status === 'onboarding_incomplete'
                                                            ? 'Setup Incomplete'
                                                            : stripeStatus.status === 'account_error'
                                                            ? 'Connection Error'
                                                            : 'Not Connected'}
                                                    </p>
                                                    <p className="text-sm text-gray-400">
                                                        {stripeStatus.message}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-gray-400 hover:text-white"
                                                    onClick={fetchStripeStatus}
                                                    disabled={isLoadingStripe}
                                                >
                                                    <RefreshCw className={`h-4 w-4 ${isLoadingStripe ? 'animate-spin' : ''}`} />
                                                </Button>

                                                {stripeStatus.status === 'active' ? (
                                                    <Button
                                                        variant="outline"
                                                        className="border-gray-700 text-gray-300 hover:bg-gray-800"
                                                        onClick={handleOpenStripeDashboard}
                                                        disabled={isConnectingStripe}
                                                    >
                                                        {isConnectingStripe ? (
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        ) : (
                                                            <ExternalLink className="h-4 w-4 mr-2" />
                                                        )}
                                                        Open Stripe Dashboard
                                                    </Button>
                                                ) : stripeStatus.status === 'account_error' ? (
                                                    <Button
                                                        className="bg-red-600 hover:bg-red-700"
                                                        onClick={handleResetStripeConnection}
                                                        disabled={isResettingStripe}
                                                    >
                                                        {isResettingStripe ? (
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        ) : (
                                                            <RefreshCw className="h-4 w-4 mr-2" />
                                                        )}
                                                        Reconnect Account
                                                    </Button>
                                                ) : stripeStatus.connected ? (
                                                    <Button
                                                        className="bg-orange-600 hover:bg-orange-700"
                                                        onClick={handleStripeConnect}
                                                        disabled={isConnectingStripe}
                                                    >
                                                        {isConnectingStripe ? (
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        ) : null}
                                                        Complete Setup
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        className="bg-orange-600 hover:bg-orange-700"
                                                        onClick={handleStripeConnect}
                                                        disabled={isConnectingStripe || !stripeStatus.stripeConfigured}
                                                    >
                                                        {isConnectingStripe ? (
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        ) : null}
                                                        Connect with Stripe
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Account Error Details */}
                                    {stripeStatus.status === 'account_error' && stripeStatus.errorDetails && (
                                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                                            <div className="flex items-start gap-3">
                                                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                                                <div>
                                                    <p className="text-red-400 font-medium">Why is this happening?</p>
                                                    <p className="text-sm text-gray-400 mt-1">
                                                        {stripeStatus.errorDetails}
                                                    </p>
                                                    <p className="text-sm text-gray-400 mt-2">
                                                        Click &quot;Reconnect Account&quot; to set up a new Stripe connection. This will not affect any completed transactions.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Platform not configured warning */}
                                    {!stripeStatus.stripeConfigured && (
                                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <AlertCircle className="h-5 w-5 text-red-400" />
                                                <div>
                                                    <p className="text-red-400 font-medium">Payment Processing Unavailable</p>
                                                    <p className="text-sm text-gray-400">
                                                        The platform administrator has not configured payment processing yet.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Status details for connected accounts */}
                                    {stripeStatus.connected && stripeStatus.status === 'active' && (
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="p-4 bg-gray-800/50 rounded-lg">
                                                <div className="flex items-center gap-2 mb-2">
                                                    {stripeStatus.canReceivePayments ? (
                                                        <CheckCircle className="h-4 w-4 text-green-400" />
                                                    ) : (
                                                        <AlertCircle className="h-4 w-4 text-yellow-400" />
                                                    )}
                                                    <span className="text-gray-400 text-sm">Payments</span>
                                                </div>
                                                <p className="text-white font-medium">
                                                    {stripeStatus.canReceivePayments ? 'Enabled' : 'Pending'}
                                                </p>
                                            </div>
                                            <div className="p-4 bg-gray-800/50 rounded-lg">
                                                <div className="flex items-center gap-2 mb-2">
                                                    {stripeStatus.canReceivePayouts ? (
                                                        <CheckCircle className="h-4 w-4 text-green-400" />
                                                    ) : (
                                                        <AlertCircle className="h-4 w-4 text-yellow-400" />
                                                    )}
                                                    <span className="text-gray-400 text-sm">Payouts</span>
                                                </div>
                                                <p className="text-white font-medium">
                                                    {stripeStatus.canReceivePayouts ? 'Enabled' : 'Pending'}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Info about platform fees */}
                                    <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                                        <h4 className="text-white font-medium mb-2">How it works</h4>
                                        <ul className="text-sm text-gray-400 space-y-2">
                                            <li className="flex items-start gap-2">
                                                <span className="text-orange-400">1.</span>
                                                Customers pay for orders through the platform
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-orange-400">2.</span>
                                                A platform fee is deducted from each sale (shown in your order details)
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-orange-400">3.</span>
                                                Your earnings are transferred to your connected Stripe account
                                            </li>
                                        </ul>
                                    </div>
                                </>
                            )}

                            {/* Not loaded yet and not loading */}
                            {!isLoadingStripe && !stripeStatus && (
                                <div className="text-center py-8">
                                    <AlertCircle className="h-8 w-8 mx-auto text-gray-500 mb-3" />
                                    <p className="text-gray-400">Unable to load payment status</p>
                                    <Button
                                        variant="outline"
                                        className="mt-4 border-gray-700"
                                        onClick={fetchStripeStatus}
                                    >
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Retry
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Payment Methods Info */}
                    <Card className="bg-gray-900 border-gray-800">
                        <CardHeader>
                            <CardTitle className="text-white">Accepted Payment Methods</CardTitle>
                            <CardDescription className="text-gray-400">
                                Payment methods are managed through your Stripe account
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2">
                                {[
                                    { name: 'Credit & Debit Cards', description: 'Visa, Mastercard, Amex', enabled: true },
                                    { name: 'Apple Pay', description: 'For iOS and Safari users', enabled: true },
                                    { name: 'Google Pay', description: 'For Android and Chrome users', enabled: true },
                                    { name: 'Link by Stripe', description: 'Fast checkout for returning customers', enabled: true },
                                ].map((method) => (
                                    <div
                                        key={method.name}
                                        className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg"
                                    >
                                        <div>
                                            <span className="text-white">{method.name}</span>
                                            <p className="text-xs text-gray-500">{method.description}</p>
                                        </div>
                                        <CheckCircle className="h-5 w-5 text-green-400" />
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-4">
                                Additional payment methods can be enabled in your Stripe Dashboard.
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Notifications */}
                <TabsContent value="notifications" className="space-y-6">
                    <Card className="bg-gray-900 border-gray-800">
                        <CardHeader>
                            <CardTitle className="text-white">Notification Preferences</CardTitle>
                            <CardDescription className="text-gray-400">
                                Choose what notifications you want to receive
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {[
                                { name: 'New Orders', description: 'Get notified when you receive a new order', enabled: true },
                                { name: 'Order Updates', description: 'Status changes for orders', enabled: true },
                                { name: 'Low Stock Alerts', description: 'When products fall below threshold', enabled: true },
                                { name: 'New Reviews', description: 'Customer reviews and ratings', enabled: true },
                                { name: 'Daily Summary', description: 'Daily recap of sales and activity', enabled: false },
                                { name: 'Weekly Report', description: 'Weekly performance report', enabled: true },
                            ].map((notification) => (
                                <div
                                    key={notification.name}
                                    className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg"
                                >
                                    <div>
                                        <p className="text-white font-medium">{notification.name}</p>
                                        <p className="text-sm text-gray-400">{notification.description}</p>
                                    </div>
                                    <Switch defaultChecked={notification.enabled} />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Reset Stripe Connection Confirmation Modal */}
            <Dialog open={showResetConfirmModal} onOpenChange={setShowResetConfirmModal}>
                <DialogContent className="bg-gray-900 border-gray-800 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-red-400" />
                            Reset Stripe Connection
                        </DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Are you sure you want to reset your Stripe connection?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <p className="text-sm text-gray-300">
                                This action will:
                            </p>
                            <ul className="mt-2 text-sm text-gray-400 space-y-1 list-disc list-inside">
                                <li>Disconnect your current Stripe account</li>
                                <li>Require you to complete the onboarding process again</li>
                                <li>Temporarily prevent you from receiving payments</li>
                            </ul>
                            <p className="mt-3 text-sm text-gray-400">
                                Completed transactions will not be affected.
                            </p>
                        </div>

                        {/* Delete test orders option */}
                        <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={deleteTestOrders}
                                    onChange={(e) => setDeleteTestOrders(e.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-800 text-orange-500 focus:ring-orange-500"
                                />
                                <div>
                                    <p className="text-sm font-medium text-orange-400">
                                        Also delete all test orders
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Check this option to remove all orders associated with this store.
                                        Use this if you have test/demo orders that are blocking the reset.
                                    </p>
                                </div>
                            </label>
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            className="border-gray-700 text-gray-300 hover:bg-gray-800"
                            onClick={() => setShowResetConfirmModal(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700"
                            onClick={confirmResetStripeConnection}
                            disabled={isResettingStripe}
                        >
                            {isResettingStripe ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4 mr-2" />
                            )}
                            {deleteTestOrders ? 'Delete Orders & Reset' : 'Yes, Reset Connection'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
