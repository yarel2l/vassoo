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
    MapPin,
    Loader2,
    Check,
    AlertCircle,
    Eye,
    EyeOff,
    RefreshCw,
    Map,
    Navigation,
    Search
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface GoogleApiConfig {
    enabled: boolean
    services: {
        places: boolean
        maps: boolean
        geocoding: boolean
    }
    restrictions?: {
        allowedDomains?: string[]
        allowedIps?: string[]
    }
}

interface GoogleApiSettingsData {
    config: GoogleApiConfig
    isConfigured: boolean
    hasApiKey: boolean
}

export function GoogleApiSettingsCard() {
    const [data, setData] = useState<GoogleApiSettingsData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isTesting, setIsTesting] = useState(false)
    const [loadError, setLoadError] = useState<string | null>(null)

    // Form state
    const [config, setConfig] = useState<GoogleApiConfig>({
        enabled: false,
        services: {
            places: true,
            maps: true,
            geocoding: true
        }
    })

    // API Key - only shown when explicitly updating
    const [apiKey, setApiKey] = useState('')
    const [showApiKey, setShowApiKey] = useState(false)

    const { toast } = useToast()

    // Fetch current settings
    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        setIsLoading(true)
        setLoadError(null)
        try {
            const response = await fetch('/api/platform/settings?category=google')
            const result = await response.json()

            if (response.ok) {
                setData(result)
                setConfig(result.config)
            } else {
                setLoadError(result.error || 'Failed to load settings')
                if (response.status !== 403) {
                    toast({
                        title: 'Error loading Google API settings',
                        description: result.error,
                        variant: 'destructive'
                    })
                }
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error'
            setLoadError(errorMsg)
            toast({
                title: 'Error loading Google API settings',
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
                    category: 'google',
                    config,
                    secrets: {
                        apiKey: apiKey || undefined
                    }
                })
            })

            const result = await response.json()

            if (response.ok) {
                toast({
                    title: 'Google API settings saved',
                    description: 'Configuration has been updated successfully.'
                })
                // Clear API key field after save
                setApiKey('')
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
                body: JSON.stringify({ service: 'google' })
            })

            const result = await response.json()

            if (result.success) {
                toast({
                    title: 'Connection successful',
                    description: 'Google API key is valid and working.'
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
                        <MapPin className="h-5 w-5 text-indigo-400" />
                        <CardTitle className="text-white">Google API Configuration</CardTitle>
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
                        <MapPin className="h-5 w-5 text-indigo-400" />
                        <CardTitle className="text-white">Google API Configuration</CardTitle>
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
                <CardDescription>
                    Configure Google API for address autocomplete, maps display, and geocoding services
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Enable Toggle */}
                <div className="flex items-center justify-between p-4 bg-neutral-950 rounded border border-neutral-800">
                    <div className="space-y-0.5">
                        <Label className="text-white">Enable Google API</Label>
                        <p className="text-xs text-neutral-500">
                            {config.enabled ? 'Google services are active' : 'Using fallback/mock data'}
                        </p>
                    </div>
                    <Switch
                        checked={config.enabled}
                        onCheckedChange={(checked) =>
                            setConfig(prev => ({ ...prev, enabled: checked }))
                        }
                    />
                </div>

                <Separator className="bg-neutral-800" />

                {/* API Key */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label className="text-neutral-400">API Credentials</Label>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="text-neutral-500 hover:text-white"
                        >
                            {showApiKey ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                            {showApiKey ? 'Hide' : 'Show'}
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-neutral-400 text-sm">
                            Google API Key
                            {data?.hasApiKey && (
                                <Badge variant="outline" className="ml-2 text-xs">Configured</Badge>
                            )}
                        </Label>
                        <Input
                            type={showApiKey ? 'text' : 'password'}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder={data?.hasApiKey ? '••••••••••••' : 'AIza...'}
                            className="bg-neutral-950 border-neutral-800 text-white font-mono text-sm"
                        />
                        <p className="text-xs text-neutral-500">
                            Leave empty to keep existing key. Get your API key from the{' '}
                            <a
                                href="https://console.cloud.google.com/apis/credentials"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-400 hover:underline"
                            >
                                Google Cloud Console
                            </a>
                        </p>
                    </div>
                </div>

                <Separator className="bg-neutral-800" />

                {/* Services */}
                <div className="space-y-4">
                    <Label className="text-neutral-400">Enabled Services</Label>
                    <p className="text-xs text-neutral-500">
                        Select which Google services to enable. Each service may require specific API enablement in Google Cloud Console.
                    </p>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-neutral-950 rounded border border-neutral-800">
                            <div className="flex items-center gap-3">
                                <Search className="h-4 w-4 text-blue-400" />
                                <div>
                                    <Label className="text-white text-sm">Places Autocomplete</Label>
                                    <p className="text-xs text-neutral-500">
                                        Address autocomplete in onboarding and forms
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={config.services.places}
                                onCheckedChange={(checked) =>
                                    setConfig(prev => ({
                                        ...prev,
                                        services: { ...prev.services, places: checked }
                                    }))
                                }
                            />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-neutral-950 rounded border border-neutral-800">
                            <div className="flex items-center gap-3">
                                <Map className="h-4 w-4 text-green-400" />
                                <div>
                                    <Label className="text-white text-sm">Maps Display</Label>
                                    <p className="text-xs text-neutral-500">
                                        Show maps for store locations and delivery tracking
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={config.services.maps}
                                onCheckedChange={(checked) =>
                                    setConfig(prev => ({
                                        ...prev,
                                        services: { ...prev.services, maps: checked }
                                    }))
                                }
                            />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-neutral-950 rounded border border-neutral-800">
                            <div className="flex items-center gap-3">
                                <Navigation className="h-4 w-4 text-orange-400" />
                                <div>
                                    <Label className="text-white text-sm">Geocoding</Label>
                                    <p className="text-xs text-neutral-500">
                                        Convert addresses to coordinates for distance calculations
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={config.services.geocoding}
                                onCheckedChange={(checked) =>
                                    setConfig(prev => ({
                                        ...prev,
                                        services: { ...prev.services, geocoding: checked }
                                    }))
                                }
                            />
                        </div>
                    </div>
                </div>

                <Separator className="bg-neutral-800" />

                {/* Info Box */}
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-blue-400 text-sm font-medium">Setup Requirements</p>
                    <ul className="text-blue-400/80 text-xs mt-2 space-y-1 list-disc list-inside">
                        <li>Enable &quot;Places API&quot; in Google Cloud Console for autocomplete</li>
                        <li>Enable &quot;Maps JavaScript API&quot; for map displays</li>
                        <li>Enable &quot;Geocoding API&quot; for address-to-coordinates conversion</li>
                        <li>Add your domain to the API key restrictions for security</li>
                    </ul>
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
                        disabled={isTesting || !data?.hasApiKey}
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
