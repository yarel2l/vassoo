'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
    CreditCard,
    Loader2,
    Check,
    AlertCircle,
    Eye,
    EyeOff,
    RefreshCw
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface StripeConnectConfig {
    enabled: boolean
    accountType: 'express' | 'standard'
    platformFeePercent: number
    capabilities: {
        card_payments: boolean
        transfers: boolean
    }
}

interface StripeConfig {
    publishableKey: string
    mode: 'test' | 'live'
    webhookEndpoint: string
    connect: StripeConnectConfig
}

interface StripeSettingsData {
    config: StripeConfig
    isConfigured: boolean
    hasSecretKey: boolean
    hasWebhookSecret: boolean
}

export function StripeSettingsCard() {
    const [data, setData] = useState<StripeSettingsData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isTesting, setIsTesting] = useState(false)

    // Form state
    const [config, setConfig] = useState<StripeConfig>({
        publishableKey: '',
        mode: 'test',
        webhookEndpoint: '/api/stripe/webhooks',
        connect: {
            enabled: true,
            accountType: 'express',
            platformFeePercent: 10,
            capabilities: {
                card_payments: true,
                transfers: true
            }
        }
    })

    // Secret fields - only shown when explicitly updating
    const [secretKey, setSecretKey] = useState('')
    const [webhookSecret, setWebhookSecret] = useState('')
    const [showSecrets, setShowSecrets] = useState(false)

    const { toast } = useToast()

    // Fetch current settings
    useEffect(() => {
        fetchSettings()
    }, [])

    const [loadError, setLoadError] = useState<string | null>(null)

    const fetchSettings = async () => {
        setIsLoading(true)
        setLoadError(null)
        try {
            const response = await fetch('/api/platform/settings?category=stripe')
            const result = await response.json()

            if (response.ok) {
                setData(result)
                setConfig(result.config)
            } else {
                setLoadError(result.error || 'Failed to load settings')
                if (response.status !== 403) {
                    toast({
                        title: 'Error loading Stripe settings',
                        description: result.error,
                        variant: 'destructive'
                    })
                }
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error'
            setLoadError(errorMsg)
            toast({
                title: 'Error loading Stripe settings',
                description: errorMsg,
                variant: 'destructive'
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const response = await fetch('/api/platform/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category: 'stripe',
                    config,
                    secrets: {
                        secretKey: secretKey || undefined,
                        webhookSecret: webhookSecret || undefined
                    }
                })
            })

            const result = await response.json()

            if (response.ok) {
                toast({
                    title: 'Stripe settings saved',
                    description: 'Configuration has been updated successfully.'
                })
                // Clear secret fields after save
                setSecretKey('')
                setWebhookSecret('')
                // Refresh data
                fetchSettings()
            } else {
                throw new Error(result.error)
            }
        } catch (error) {
            toast({
                title: 'Error saving settings',
                description: error instanceof Error ? error.message : 'Unknown error',
                variant: 'destructive'
            })
        } finally {
            setIsSaving(false)
        }
    }

    const handleTestConnection = async () => {
        setIsTesting(true)
        try {
            const response = await fetch('/api/platform/settings/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ service: 'stripe' })
            })

            const result = await response.json()

            if (result.success) {
                toast({
                    title: 'Connection successful',
                    description: `Connected to Stripe account: ${result.details?.accountId}`
                })
            } else {
                toast({
                    title: 'Connection failed',
                    description: result.error,
                    variant: 'destructive'
                })
            }
        } catch (error) {
            toast({
                title: 'Test failed',
                description: error instanceof Error ? error.message : 'Unknown error',
                variant: 'destructive'
            })
        } finally {
            setIsTesting(false)
        }
    }

    if (isLoading) {
        return (
            <Card className="bg-neutral-900 border-neutral-800">
                <CardContent className="flex items-center justify-center min-h-[200px]">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                </CardContent>
            </Card>
        )
    }

    if (loadError) {
        return (
            <Card className="bg-neutral-900 border-neutral-800">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-indigo-400" />
                        <CardTitle className="text-white">Stripe Configuration</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center min-h-[150px] text-center">
                        <AlertCircle className="h-8 w-8 text-red-400 mb-3" />
                        <p className="text-red-400 font-medium">{loadError}</p>
                        <p className="text-neutral-500 text-sm mt-2">
                            Make sure you have platform admin permissions.
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchSettings}
                            className="mt-4 border-neutral-700"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Retry
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="bg-neutral-900 border-neutral-800">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-indigo-400" />
                        <CardTitle className="text-white">Stripe Configuration</CardTitle>
                    </div>
                    <Badge
                        variant={data?.isConfigured ? 'default' : 'secondary'}
                        className={data?.isConfigured ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}
                    >
                        {data?.isConfigured ? (
                            <><Check className="h-3 w-3 mr-1" /> Configured</>
                        ) : (
                            <><AlertCircle className="h-3 w-3 mr-1" /> Not Configured</>
                        )}
                    </Badge>
                </div>
                <CardDescription>Payment processing credentials and Stripe Connect settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Mode Toggle */}
                <div className="flex items-center justify-between p-4 bg-neutral-950 rounded border border-neutral-800">
                    <div className="space-y-0.5">
                        <Label className="text-white">Live Mode</Label>
                        <p className="text-xs text-neutral-500">
                            {config.mode === 'live' ? 'Processing real payments' : 'Using test mode for development'}
                        </p>
                    </div>
                    <Switch
                        checked={config.mode === 'live'}
                        onCheckedChange={(checked) =>
                            setConfig(prev => ({ ...prev, mode: checked ? 'live' : 'test' }))
                        }
                    />
                </div>

                <Separator className="bg-neutral-800" />

                {/* API Keys */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label className="text-neutral-400">API Credentials</Label>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowSecrets(!showSecrets)}
                            className="text-neutral-500 hover:text-white"
                        >
                            {showSecrets ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                            {showSecrets ? 'Hide' : 'Show'}
                        </Button>
                    </div>

                    <div className="space-y-3">
                        <div className="space-y-2">
                            <Label className="text-neutral-400 text-sm">Publishable Key</Label>
                            <Input
                                value={config.publishableKey}
                                onChange={(e) => setConfig(prev => ({ ...prev, publishableKey: e.target.value }))}
                                placeholder="pk_test_..."
                                className="bg-neutral-950 border-neutral-800 text-white font-mono text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-neutral-400 text-sm">
                                Secret Key
                                {data?.hasSecretKey && (
                                    <Badge variant="outline" className="ml-2 text-xs">Configured</Badge>
                                )}
                            </Label>
                            <Input
                                type={showSecrets ? 'text' : 'password'}
                                value={secretKey}
                                onChange={(e) => setSecretKey(e.target.value)}
                                placeholder={data?.hasSecretKey ? '••••••••••••' : 'sk_test_...'}
                                className="bg-neutral-950 border-neutral-800 text-white font-mono text-sm"
                            />
                            <p className="text-xs text-neutral-500">Leave empty to keep existing key</p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-neutral-400 text-sm">
                                Webhook Secret
                                {data?.hasWebhookSecret && (
                                    <Badge variant="outline" className="ml-2 text-xs">Configured</Badge>
                                )}
                            </Label>
                            <Input
                                type={showSecrets ? 'text' : 'password'}
                                value={webhookSecret}
                                onChange={(e) => setWebhookSecret(e.target.value)}
                                placeholder={data?.hasWebhookSecret ? '••••••••••••' : 'whsec_...'}
                                className="bg-neutral-950 border-neutral-800 text-white font-mono text-sm"
                            />
                            <p className="text-xs text-neutral-500">Used for validating webhook events</p>
                        </div>
                    </div>
                </div>

                <Separator className="bg-neutral-800" />

                {/* Stripe Connect Settings */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label className="text-neutral-400">Stripe Connect (for Stores & Delivery)</Label>
                        <Switch
                            checked={config.connect.enabled}
                            onCheckedChange={(checked) =>
                                setConfig(prev => ({
                                    ...prev,
                                    connect: { ...prev.connect, enabled: checked }
                                }))
                            }
                        />
                    </div>

                    {config.connect.enabled && (
                        <div className="space-y-4 pl-4 border-l-2 border-neutral-800">
                            <div className="space-y-2">
                                <Label className="text-neutral-400 text-sm">Account Type</Label>
                                <div className="flex gap-2">
                                    <Button
                                        variant={config.connect.accountType === 'express' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setConfig(prev => ({
                                            ...prev,
                                            connect: { ...prev.connect, accountType: 'express' }
                                        }))}
                                        className={config.connect.accountType === 'express'
                                            ? 'bg-indigo-600'
                                            : 'border-neutral-700 text-neutral-400'}
                                    >
                                        Express
                                    </Button>
                                    <Button
                                        variant={config.connect.accountType === 'standard' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setConfig(prev => ({
                                            ...prev,
                                            connect: { ...prev.connect, accountType: 'standard' }
                                        }))}
                                        className={config.connect.accountType === 'standard'
                                            ? 'bg-indigo-600'
                                            : 'border-neutral-700 text-neutral-400'}
                                    >
                                        Standard
                                    </Button>
                                </div>
                                <p className="text-xs text-neutral-500">
                                    Express: Simplified onboarding, Stripe-hosted dashboard<br />
                                    Standard: Full dashboard access, more control
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-neutral-400 text-sm">Platform Fees</Label>
                                    <a
                                        href="/dashboard/platform/fees"
                                        className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
                                    >
                                        Manage Fees →
                                    </a>
                                </div>
                                <div className="p-3 bg-neutral-950 rounded border border-neutral-800">
                                    <p className="text-xs text-neutral-400">
                                        Platform fees are now configured in the <strong className="text-white">Platform Fees</strong> section.
                                        This allows for more granular control including percentage-based, fixed, and tiered fee structures.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-neutral-400 text-sm">Capabilities</Label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <Switch
                                            checked={config.connect.capabilities.card_payments}
                                            onCheckedChange={(checked) => setConfig(prev => ({
                                                ...prev,
                                                connect: {
                                                    ...prev.connect,
                                                    capabilities: {
                                                        ...prev.connect.capabilities,
                                                        card_payments: checked
                                                    }
                                                }
                                            }))}
                                        />
                                        <span className="text-sm text-neutral-300">Card Payments</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <Switch
                                            checked={config.connect.capabilities.transfers}
                                            onCheckedChange={(checked) => setConfig(prev => ({
                                                ...prev,
                                                connect: {
                                                    ...prev.connect,
                                                    capabilities: {
                                                        ...prev.connect.capabilities,
                                                        transfers: checked
                                                    }
                                                }
                                            }))}
                                        />
                                        <span className="text-sm text-neutral-300">Transfers</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <Separator className="bg-neutral-800" />

                {/* Actions */}
                <div className="flex gap-3">
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-indigo-600 hover:bg-indigo-700"
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                        Save Configuration
                    </Button>

                    <Button
                        variant="outline"
                        onClick={handleTestConnection}
                        disabled={isTesting || !data?.hasSecretKey}
                        className="border-neutral-700"
                    >
                        {isTesting ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Test Connection
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
