'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog'
import {
    Mail,
    Loader2,
    Check,
    AlertCircle,
    Eye,
    EyeOff,
    Send,
    Server,
    RefreshCw
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface EmailConfig {
    provider: 'resend' | 'smtp'
    fromAddress: string
    fromName: string
    smtpHost?: string
    smtpPort?: number
    smtpSecure?: boolean
    smtpUser?: string
}

interface EmailSettingsData {
    config: EmailConfig
    isConfigured: boolean
    hasApiKey: boolean
    hasSmtpPassword: boolean
}

export function EmailSettingsCard() {
    const [data, setData] = useState<EmailSettingsData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isTesting, setIsTesting] = useState(false)
    const [showSecrets, setShowSecrets] = useState(false)
    const [testDialogOpen, setTestDialogOpen] = useState(false)
    const [testEmail, setTestEmail] = useState('')

    // Form state
    const [config, setConfig] = useState<EmailConfig>({
        provider: 'resend',
        fromAddress: 'noreply@vassoo.com',
        fromName: 'Vassoo'
    })

    // Secret fields
    const [apiKey, setApiKey] = useState('')
    const [smtpPassword, setSmtpPassword] = useState('')

    const { toast } = useToast()

    useEffect(() => {
        fetchSettings()
    }, [])

    const [loadError, setLoadError] = useState<string | null>(null)

    const fetchSettings = async () => {
        setIsLoading(true)
        setLoadError(null)
        try {
            const response = await fetch('/api/platform/settings?category=email')
            const result = await response.json()

            if (response.ok) {
                setData(result)
                setConfig(result.config)
            } else {
                setLoadError(result.error || 'Failed to load settings')
                if (response.status !== 403) {
                    toast({
                        title: 'Error loading email settings',
                        description: result.error,
                        variant: 'destructive'
                    })
                }
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error'
            setLoadError(errorMsg)
            toast({
                title: 'Error loading email settings',
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
                    category: 'email',
                    config,
                    secrets: {
                        apiKey: config.provider === 'resend' ? apiKey || undefined : undefined,
                        smtpPassword: config.provider === 'smtp' ? smtpPassword || undefined : undefined
                    }
                })
            })

            const result = await response.json()

            if (response.ok) {
                toast({
                    title: 'Email settings saved',
                    description: 'Configuration has been updated successfully.'
                })
                setApiKey('')
                setSmtpPassword('')
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

    const handleSendTest = async () => {
        if (!testEmail) return

        setIsTesting(true)
        try {
            const response = await fetch('/api/platform/settings/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service: 'email',
                    testEmail
                })
            })

            const result = await response.json()

            if (result.success) {
                toast({
                    title: 'Test email sent',
                    description: `Email sent successfully to ${testEmail}`
                })
                setTestDialogOpen(false)
                setTestEmail('')
            } else {
                toast({
                    title: 'Test failed',
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
                        <Mail className="h-5 w-5 text-indigo-400" />
                        <CardTitle className="text-white">Email Configuration</CardTitle>
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
                        <Mail className="h-5 w-5 text-indigo-400" />
                        <CardTitle className="text-white">Email Configuration</CardTitle>
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
                <CardDescription>Configure email service for notifications and transactional emails</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Provider Selection */}
                <Tabs
                    value={config.provider}
                    onValueChange={(value) => setConfig(prev => ({
                        ...prev,
                        provider: value as 'resend' | 'smtp'
                    }))}
                >
                    <TabsList className="bg-neutral-950 border border-neutral-800">
                        <TabsTrigger
                            value="resend"
                            className="data-[state=active]:bg-indigo-600"
                        >
                            <Send className="h-4 w-4 mr-2" />
                            Resend
                        </TabsTrigger>
                        <TabsTrigger
                            value="smtp"
                            className="data-[state=active]:bg-indigo-600"
                        >
                            <Server className="h-4 w-4 mr-2" />
                            SMTP
                        </TabsTrigger>
                    </TabsList>

                    {/* Resend Configuration */}
                    <TabsContent value="resend" className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label className="text-neutral-400 text-sm">
                                API Key
                                {data?.hasApiKey && (
                                    <Badge variant="outline" className="ml-2 text-xs">Configured</Badge>
                                )}
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    type={showSecrets ? 'text' : 'password'}
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder={data?.hasApiKey ? '••••••••••••' : 're_...'}
                                    className="bg-neutral-950 border-neutral-800 text-white font-mono text-sm"
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowSecrets(!showSecrets)}
                                    className="text-neutral-500 hover:text-white"
                                >
                                    {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                            <p className="text-xs text-neutral-500">
                                Get your API key from <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">resend.com</a>
                            </p>
                        </div>
                    </TabsContent>

                    {/* SMTP Configuration */}
                    <TabsContent value="smtp" className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-neutral-400 text-sm">SMTP Host</Label>
                                <Input
                                    value={config.smtpHost || ''}
                                    onChange={(e) => setConfig(prev => ({ ...prev, smtpHost: e.target.value }))}
                                    placeholder="smtp.example.com"
                                    className="bg-neutral-950 border-neutral-800 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-neutral-400 text-sm">Port</Label>
                                <Input
                                    type="number"
                                    value={config.smtpPort || 587}
                                    onChange={(e) => setConfig(prev => ({ ...prev, smtpPort: parseInt(e.target.value) }))}
                                    className="bg-neutral-950 border-neutral-800 text-white"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-neutral-950 rounded border border-neutral-800">
                            <div>
                                <Label className="text-white text-sm">Use TLS/SSL</Label>
                                <p className="text-xs text-neutral-500">Encrypt connection to SMTP server</p>
                            </div>
                            <Switch
                                checked={config.smtpSecure ?? true}
                                onCheckedChange={(checked) =>
                                    setConfig(prev => ({ ...prev, smtpSecure: checked }))
                                }
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-neutral-400 text-sm">Username</Label>
                                <Input
                                    value={config.smtpUser || ''}
                                    onChange={(e) => setConfig(prev => ({ ...prev, smtpUser: e.target.value }))}
                                    placeholder="user@example.com"
                                    className="bg-neutral-950 border-neutral-800 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-neutral-400 text-sm">
                                    Password
                                    {data?.hasSmtpPassword && (
                                        <Badge variant="outline" className="ml-2 text-xs">Configured</Badge>
                                    )}
                                </Label>
                                <Input
                                    type="password"
                                    value={smtpPassword}
                                    onChange={(e) => setSmtpPassword(e.target.value)}
                                    placeholder={data?.hasSmtpPassword ? '••••••••' : 'Password'}
                                    className="bg-neutral-950 border-neutral-800 text-white"
                                />
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                <Separator className="bg-neutral-800" />

                {/* Common Settings */}
                <div className="space-y-4">
                    <Label className="text-neutral-400">Sender Information</Label>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-neutral-400 text-sm">From Name</Label>
                            <Input
                                value={config.fromName}
                                onChange={(e) => setConfig(prev => ({ ...prev, fromName: e.target.value }))}
                                placeholder="Vassoo"
                                className="bg-neutral-950 border-neutral-800 text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-neutral-400 text-sm">From Address</Label>
                            <Input
                                value={config.fromAddress}
                                onChange={(e) => setConfig(prev => ({ ...prev, fromAddress: e.target.value }))}
                                placeholder="noreply@vassoo.com"
                                className="bg-neutral-950 border-neutral-800 text-white"
                            />
                        </div>
                    </div>
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

                    <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                disabled={!data?.isConfigured}
                                className="border-neutral-700"
                            >
                                <Send className="h-4 w-4 mr-2" />
                                Send Test Email
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-neutral-900 border-neutral-800">
                            <DialogHeader>
                                <DialogTitle className="text-white">Send Test Email</DialogTitle>
                                <DialogDescription>
                                    Enter an email address to receive a test email from your configured provider.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                                <Label className="text-neutral-400">Email Address</Label>
                                <Input
                                    type="email"
                                    value={testEmail}
                                    onChange={(e) => setTestEmail(e.target.value)}
                                    placeholder="test@example.com"
                                    className="mt-2 bg-neutral-950 border-neutral-800 text-white"
                                />
                            </div>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setTestDialogOpen(false)}
                                    className="border-neutral-700"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSendTest}
                                    disabled={isTesting || !testEmail}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                >
                                    {isTesting ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4 mr-2" />
                                    )}
                                    Send
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardContent>
        </Card>
    )
}
