'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Settings, ShieldCheck, Globe, Save, Loader2, Activity, Share2, CreditCard, Mail, MapPin } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { StripeSettingsCard } from './components/stripe-settings-card'
import { EmailSettingsCard } from './components/email-settings-card'
import { ComplianceSettingsCard } from './components/compliance-settings-card'
import { GoogleApiSettingsCard } from './components/google-api-settings-card'

interface PlatformSettings {
    platform_name: string
    platform_tagline: string
    footer_description: string
    contact_info: {
        address: string
        phone: string
        email: string
    }
    social_links: {
        facebook: string
        twitter: string
        instagram: string
        youtube: string
    }
    maintenance_mode: boolean
}

type SettingsSection = 'identity' | 'social' | 'contact' | 'system'

export default function PlatformSettingsPage() {
    const [settings, setSettings] = useState<PlatformSettings | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [savingSection, setSavingSection] = useState<SettingsSection | null>(null)
    const { toast } = useToast()

    const fetchSettings = async () => {
        setIsLoading(true)
        const supabase = createClient()
        const { data, error } = await supabase
            .from('platform_settings')
            .select('*')

        if (error) {
            toast({
                title: 'Error fetching settings',
                description: error.message,
                variant: 'destructive'
            })
        } else {
            const settingsMap: any = {}
            data?.forEach(item => {
                settingsMap[item.key] = item.value
            })
            setSettings(settingsMap as PlatformSettings)
        }
        setIsLoading(false)
    }

    useEffect(() => {
        fetchSettings()
    }, [])

    const saveSection = useCallback(async (section: SettingsSection) => {
        if (!settings) return
        setSavingSection(section)
        const supabase = createClient()

        let keysToSave: string[] = []
        let isPublic = false
        let category = 'general'

        switch (section) {
            case 'identity':
                keysToSave = ['platform_name', 'platform_tagline', 'footer_description']
                isPublic = true
                category = 'branding'
                break
            case 'social':
                keysToSave = ['social_links']
                isPublic = true
                category = 'social'
                break
            case 'contact':
                keysToSave = ['contact_info']
                isPublic = true
                category = 'contact'
                break
            case 'system':
                keysToSave = ['maintenance_mode']
                isPublic = false
                category = 'system'
                break
        }

        const updates = keysToSave.map(key => ({
            key,
            value: (settings as any)[key],
            category,
            is_public: isPublic,
            updated_at: new Date().toISOString()
        }))

        const { error } = await supabase
            .from('platform_settings')
            .upsert(updates)

        if (error) {
            toast({
                title: 'Update failed',
                description: error.message,
                variant: 'destructive'
            })
        } else {
            toast({
                title: 'Settings saved',
                description: 'Configuration has been updated successfully.'
            })
        }
        setSavingSection(null)
    }, [settings, toast])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        )
    }

    return (
        <div className="space-y-6 pb-12">
            <div>
                <h1 className="text-2xl font-bold text-white">System Settings</h1>
                <p className="text-neutral-400">Global platform configuration and marketplace identity</p>
            </div>

            <Tabs defaultValue="identity" className="w-full">
                <TabsList className="bg-neutral-900 border border-neutral-800 p-1 h-auto flex-wrap">
                    <TabsTrigger
                        value="identity"
                        className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-neutral-400"
                    >
                        <Globe className="h-4 w-4 mr-2" />
                        Identity
                    </TabsTrigger>
                    <TabsTrigger
                        value="social"
                        className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-neutral-400"
                    >
                        <Share2 className="h-4 w-4 mr-2" />
                        Social Links
                    </TabsTrigger>
                    <TabsTrigger
                        value="contact"
                        className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-neutral-400"
                    >
                        <Activity className="h-4 w-4 mr-2" />
                        Contact
                    </TabsTrigger>
                    <TabsTrigger
                        value="system"
                        className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-neutral-400"
                    >
                        <ShieldCheck className="h-4 w-4 mr-2" />
                        System
                    </TabsTrigger>
                    <TabsTrigger
                        value="payments"
                        className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-neutral-400"
                    >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Payments
                    </TabsTrigger>
                    <TabsTrigger
                        value="email"
                        className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-neutral-400"
                    >
                        <Mail className="h-4 w-4 mr-2" />
                        Email
                    </TabsTrigger>
                    <TabsTrigger
                        value="google"
                        className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-neutral-400"
                    >
                        <MapPin className="h-4 w-4 mr-2" />
                        Google API
                    </TabsTrigger>
                </TabsList>

                {/* Marketplace Identity Tab */}
                <TabsContent value="identity" className="mt-6">
                    <Card className="bg-neutral-900 border-neutral-800">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Globe className="h-5 w-5 text-indigo-400" />
                                        Marketplace Identity
                                    </CardTitle>
                                    <CardDescription>Brand name, tagline and footer introduction</CardDescription>
                                </div>
                                <Button
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                    onClick={() => saveSection('identity')}
                                    disabled={savingSection === 'identity'}
                                >
                                    {savingSection === 'identity' ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4 mr-2" />
                                    )}
                                    Save
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-neutral-400">Platform Name</Label>
                                <Input
                                    value={settings?.platform_name || ''}
                                    onChange={(e) => setSettings(prev => prev ? { ...prev, platform_name: e.target.value } : null)}
                                    className="bg-neutral-950 border-neutral-800 text-white"
                                    placeholder="e.g., Vassoo"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-neutral-400">Platform Tagline</Label>
                                <Input
                                    value={settings?.platform_tagline || ''}
                                    onChange={(e) => setSettings(prev => prev ? { ...prev, platform_tagline: e.target.value } : null)}
                                    className="bg-neutral-950 border-neutral-800 text-white"
                                    placeholder="e.g., Your local marketplace"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-neutral-400">Footer Description</Label>
                                <Textarea
                                    value={settings?.footer_description || ''}
                                    onChange={(e) => setSettings(prev => prev ? { ...prev, footer_description: e.target.value } : null)}
                                    className="bg-neutral-950 border-neutral-800 text-white min-h-[100px]"
                                    placeholder="A brief description shown in the footer..."
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Social Links Tab */}
                <TabsContent value="social" className="mt-6">
                    <Card className="bg-neutral-900 border-neutral-800">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Share2 className="h-5 w-5 text-indigo-400" />
                                        Social Media Links
                                    </CardTitle>
                                    <CardDescription>Connect your social media presence</CardDescription>
                                </div>
                                <Button
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                    onClick={() => saveSection('social')}
                                    disabled={savingSection === 'social'}
                                >
                                    {savingSection === 'social' ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4 mr-2" />
                                    )}
                                    Save
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-neutral-400">Facebook URL</Label>
                                    <Input
                                        value={settings?.social_links?.facebook || ''}
                                        onChange={(e) => setSettings(prev => prev ? { ...prev, social_links: { ...prev.social_links, facebook: e.target.value } } : null)}
                                        className="bg-neutral-950 border-neutral-800 text-white"
                                        placeholder="https://facebook.com/yourpage"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-neutral-400">Twitter / X URL</Label>
                                    <Input
                                        value={settings?.social_links?.twitter || ''}
                                        onChange={(e) => setSettings(prev => prev ? { ...prev, social_links: { ...prev.social_links, twitter: e.target.value } } : null)}
                                        className="bg-neutral-950 border-neutral-800 text-white"
                                        placeholder="https://twitter.com/yourhandle"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-neutral-400">Instagram URL</Label>
                                    <Input
                                        value={settings?.social_links?.instagram || ''}
                                        onChange={(e) => setSettings(prev => prev ? { ...prev, social_links: { ...prev.social_links, instagram: e.target.value } } : null)}
                                        className="bg-neutral-950 border-neutral-800 text-white"
                                        placeholder="https://instagram.com/yourprofile"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-neutral-400">YouTube URL</Label>
                                    <Input
                                        value={settings?.social_links?.youtube || ''}
                                        onChange={(e) => setSettings(prev => prev ? { ...prev, social_links: { ...prev.social_links, youtube: e.target.value } } : null)}
                                        className="bg-neutral-950 border-neutral-800 text-white"
                                        placeholder="https://youtube.com/yourchannel"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Contact Info Tab */}
                <TabsContent value="contact" className="mt-6">
                    <Card className="bg-neutral-900 border-neutral-800">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Activity className="h-5 w-5 text-indigo-400" />
                                        Contact Information
                                    </CardTitle>
                                    <CardDescription>Global support and office contact details</CardDescription>
                                </div>
                                <Button
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                    onClick={() => saveSection('contact')}
                                    disabled={savingSection === 'contact'}
                                >
                                    {savingSection === 'contact' ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4 mr-2" />
                                    )}
                                    Save
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-neutral-400">Address</Label>
                                <Input
                                    value={settings?.contact_info?.address || ''}
                                    onChange={(e) => setSettings(prev => prev ? { ...prev, contact_info: { ...prev.contact_info, address: e.target.value } } : null)}
                                    className="bg-neutral-950 border-neutral-800 text-white"
                                    placeholder="123 Main Street, City, Country"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-neutral-400">Support Email</Label>
                                    <Input
                                        type="email"
                                        value={settings?.contact_info?.email || ''}
                                        onChange={(e) => setSettings(prev => prev ? { ...prev, contact_info: { ...prev.contact_info, email: e.target.value } } : null)}
                                        className="bg-neutral-950 border-neutral-800 text-white"
                                        placeholder="support@yourplatform.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-neutral-400">Support Phone</Label>
                                    <Input
                                        type="tel"
                                        value={settings?.contact_info?.phone || ''}
                                        onChange={(e) => setSettings(prev => prev ? { ...prev, contact_info: { ...prev.contact_info, phone: e.target.value } } : null)}
                                        className="bg-neutral-950 border-neutral-800 text-white"
                                        placeholder="+1 (555) 123-4567"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* System Controls Tab */}
                <TabsContent value="system" className="mt-6 space-y-6">
                    <Card className="bg-neutral-900 border-neutral-800">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <ShieldCheck className="h-5 w-5 text-indigo-400" />
                                        System Controls
                                    </CardTitle>
                                    <CardDescription>Platform availability and safety settings</CardDescription>
                                </div>
                                <Button
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                    onClick={() => saveSection('system')}
                                    disabled={savingSection === 'system'}
                                >
                                    {savingSection === 'system' ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4 mr-2" />
                                    )}
                                    Save
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-neutral-950 rounded border border-neutral-800">
                                <div className="space-y-0.5">
                                    <Label className="text-white">Maintenance Mode</Label>
                                    <p className="text-xs text-neutral-500">
                                        Temporarily disable marketplace access for all users
                                    </p>
                                </div>
                                <Switch
                                    checked={settings?.maintenance_mode || false}
                                    onCheckedChange={(v) => setSettings(prev => prev ? { ...prev, maintenance_mode: v } : null)}
                                />
                            </div>
                            <Separator className="bg-neutral-800" />
                            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                                <p className="text-yellow-400 text-sm font-medium">Warning</p>
                                <p className="text-yellow-400/80 text-xs mt-1">
                                    Enabling maintenance mode will prevent customers from accessing the marketplace.
                                    Only platform administrators will be able to log in.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Compliance & Age Verification */}
                    <ComplianceSettingsCard />
                </TabsContent>

                {/* Payments Tab (Stripe) */}
                <TabsContent value="payments" className="mt-6">
                    <StripeSettingsCard />
                </TabsContent>

                {/* Email Tab */}
                <TabsContent value="email" className="mt-6">
                    <EmailSettingsCard />
                </TabsContent>

                {/* Google API Tab */}
                <TabsContent value="google" className="mt-6">
                    <GoogleApiSettingsCard />
                </TabsContent>
            </Tabs>
        </div>
    )
}
