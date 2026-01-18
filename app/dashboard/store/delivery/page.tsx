'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useStoreDashboard } from '@/contexts/store-dashboard-context'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
    Truck,
    DollarSign,
    Loader2,
    Save,
    CheckCircle,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface DeliverySettings {
    delivery_fee: number
    free_delivery_threshold: number
    estimated_delivery_minutes: number
    estimated_pickup_minutes: number
    minimum_order: number
}

const DEFAULT_SETTINGS: DeliverySettings = {
    delivery_fee: 4.99,
    free_delivery_threshold: 50,
    estimated_delivery_minutes: 45,
    estimated_pickup_minutes: 15,
    minimum_order: 15,
}

export default function DeliveryPage() {
    const { isLoading: authLoading } = useAuth()
    const { currentStore, isLoading: storeLoading } = useStoreDashboard()
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [storeId, setStoreId] = useState<string | null>(null)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

    const [settings, setSettings] = useState<DeliverySettings>(DEFAULT_SETTINGS)

    const tenantId = currentStore?.id

    const fetchSettings = useCallback(async () => {
        if (!tenantId) {
            setIsLoading(false)
            return
        }

        try {
            setIsLoading(true)
            const supabase = createClient()

            // First get the store ID
            const { data: stores, error } = await supabase
                .from('stores')
                .select('id')
                .eq('tenant_id', tenantId)
                .limit(1)

            if (error) {
                console.error('Error fetching store:', error)
                setIsLoading(false)
                return
            }

            if (!stores || stores.length === 0) {
                setIsLoading(false)
                return
            }

            const fetchedStoreId = stores[0].id
            setStoreId(fetchedStoreId)

            // Try to load delivery_settings (column may not exist if migration not applied)
            try {
                const { data: storeWithSettings } = await supabase
                    .from('stores')
                    .select('delivery_settings')
                    .eq('id', fetchedStoreId)
                    .single()

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const dbSettings = (storeWithSettings as any)?.delivery_settings as DeliverySettings | null
                if (dbSettings) {
                    setSettings({
                        delivery_fee: dbSettings.delivery_fee ?? DEFAULT_SETTINGS.delivery_fee,
                        free_delivery_threshold: dbSettings.free_delivery_threshold ?? DEFAULT_SETTINGS.free_delivery_threshold,
                        estimated_delivery_minutes: dbSettings.estimated_delivery_minutes ?? DEFAULT_SETTINGS.estimated_delivery_minutes,
                        estimated_pickup_minutes: dbSettings.estimated_pickup_minutes ?? DEFAULT_SETTINGS.estimated_pickup_minutes,
                        minimum_order: dbSettings.minimum_order ?? DEFAULT_SETTINGS.minimum_order,
                    })
                }
            } catch {
                // Column doesn't exist yet - use defaults
                console.log('delivery_settings column not found, using defaults')
            }
        } catch (err) {
            console.error('Error fetching settings:', err)
        } finally {
            setIsLoading(false)
        }
    }, [tenantId])

    useEffect(() => {
        fetchSettings()
    }, [fetchSettings])

    const updateSettings = (updates: Partial<DeliverySettings>) => {
        setSettings(prev => ({ ...prev, ...updates }))
        setHasUnsavedChanges(true)
    }

    const handleSave = async () => {
        if (!storeId) return
        setIsSaving(true)

        try {
            const supabase = createClient()

            // Use RPC or raw update to handle the JSONB column
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await supabase
                .from('stores')
                .update({
                    delivery_settings: settings
                } as any)
                .eq('id', storeId)

            if (error) {
                throw error
            }

            setHasUnsavedChanges(false)
            toast({
                title: 'Settings saved',
                description: 'Delivery settings have been updated successfully',
            })
        } catch (err) {
            console.error('Error saving settings:', err)
            toast({
                title: 'Error',
                description: 'Failed to save delivery settings. Please try again.',
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
                    <p className="text-gray-400">Loading delivery settings...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Delivery Settings</h1>
                    <p className="text-gray-400 mt-1">
                        Configure delivery fees, minimums, and estimated times
                    </p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={isSaving || !hasUnsavedChanges}
                    className={hasUnsavedChanges ? "bg-orange-600 hover:bg-orange-700" : "bg-gray-700"}
                >
                    {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : hasUnsavedChanges ? (
                        <Save className="h-4 w-4 mr-2" />
                    ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    {hasUnsavedChanges ? 'Save Changes' : 'Saved'}
                </Button>
            </div>

            {/* Info Banner */}
            <Card className="bg-blue-900/20 border-blue-800/50">
                <CardContent className="py-4">
                    <p className="text-sm text-blue-300">
                        <strong>Note:</strong> To enable/disable delivery or pickup at specific locations, and to set coverage radius per location, 
                        go to <a href="/dashboard/store/locations" className="text-orange-400 hover:text-orange-300 underline">Locations</a> and edit each location&apos;s Fulfillment Options.
                    </p>
                </CardContent>
            </Card>

            {/* Delivery Fees */}
            <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-orange-400" />
                        Delivery Fees & Minimums
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label className="text-gray-300">Delivery Fee ($)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={settings.delivery_fee}
                                onChange={(e) => updateSettings({ delivery_fee: Number(e.target.value) })}
                                className="bg-gray-800 border-gray-700 text-white"
                            />
                            <p className="text-xs text-gray-500">Standard delivery fee charged to customers</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-300">Free Delivery Threshold ($)</Label>
                            <Input
                                type="number"
                                min="0"
                                value={settings.free_delivery_threshold}
                                onChange={(e) => updateSettings({ free_delivery_threshold: Number(e.target.value) })}
                                className="bg-gray-800 border-gray-700 text-white"
                            />
                            <p className="text-xs text-gray-500">Orders above this amount get free delivery (0 to disable)</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-300">Minimum Order ($)</Label>
                            <Input
                                type="number"
                                min="0"
                                value={settings.minimum_order}
                                onChange={(e) => updateSettings({ minimum_order: Number(e.target.value) })}
                                className="bg-gray-800 border-gray-700 text-white"
                            />
                            <p className="text-xs text-gray-500">Minimum order amount for delivery</p>
                        </div>
                    </div>

                    {/* Fee Preview */}
                    <div className="p-4 bg-gray-800/50 rounded-lg">
                        <p className="text-sm text-gray-300 mb-2">Customer will see:</p>
                        <div className="flex flex-wrap gap-3">
                            <span className="text-white">
                                Delivery: <span className="text-orange-400 font-semibold">${settings.delivery_fee.toFixed(2)}</span>
                            </span>
                            {settings.free_delivery_threshold > 0 && (
                                <span className="text-gray-400">|</span>
                            )}
                            {settings.free_delivery_threshold > 0 && (
                                <span className="text-white">
                                    Free delivery on orders over <span className="text-green-400 font-semibold">${settings.free_delivery_threshold.toFixed(2)}</span>
                                </span>
                            )}
                            {settings.minimum_order > 0 && (
                                <>
                                    <span className="text-gray-400">|</span>
                                    <span className="text-white">
                                        Minimum: <span className="text-yellow-400 font-semibold">${settings.minimum_order.toFixed(2)}</span>
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Estimated Times */}
            <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Truck className="h-5 w-5 text-orange-400" />
                        Estimated Times
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label className="text-gray-300">Estimated Delivery Time (minutes)</Label>
                            <Input
                                type="number"
                                min="10"
                                max="180"
                                value={settings.estimated_delivery_minutes}
                                onChange={(e) => updateSettings({ estimated_delivery_minutes: Number(e.target.value) })}
                                className="bg-gray-800 border-gray-700 text-white"
                            />
                            <p className="text-xs text-gray-500">Average delivery time shown to customers</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-300">Estimated Pickup Time (minutes)</Label>
                            <Input
                                type="number"
                                min="5"
                                max="120"
                                value={settings.estimated_pickup_minutes}
                                onChange={(e) => updateSettings({ estimated_pickup_minutes: Number(e.target.value) })}
                                className="bg-gray-800 border-gray-700 text-white"
                            />
                            <p className="text-xs text-gray-500">Average time for order to be ready for pickup</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
