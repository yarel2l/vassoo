'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
    Settings,
    Truck,
    Building,
    Phone,
    Globe,
    CreditCard,
    Save,
    Loader2,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export default function SettingsPage() {
    const { tenants } = useAuth()
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [companyData, setCompanyData] = useState({
        name: '',
        phone: '',
        website: '',
        is_active: true,
        allows_express: true,
        contact_email: '',
    })

    const deliveryTenant = tenants.find(t => t.tenant.type === 'delivery_company')
    const tenantId = deliveryTenant?.tenant.id

    const fetchSettings = useCallback(async () => {
        if (!tenantId) return

        try {
            setIsLoading(true)
            const supabase = createClient()

            const { data, error } = await supabase
                .from('delivery_companies')
                .select('*')
                .eq('tenant_id', tenantId)
                .single()

            if (error) throw error

            setCompanyData({
                name: data.name || '',
                phone: data.phone || '',
                website: data.website || '',
                is_active: data.is_active,
                allows_express: data.allows_express !== false,
                contact_email: data.contact_email || '',
            })
        } catch (err) {
            console.error('Error fetching settings:', err)
        } finally {
            setIsLoading(false)
        }
    }, [tenantId])

    useEffect(() => {
        fetchSettings()
    }, [fetchSettings])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!tenantId) return

        setIsSaving(true)
        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('delivery_companies')
                .update({
                    name: companyData.name,
                    phone: companyData.phone,
                    website: companyData.website,
                    is_active: companyData.is_active,
                    allows_express: companyData.allows_express,
                })
                .eq('tenant_id', tenantId)

            if (error) throw error

            toast({
                title: 'Settings saved',
                description: 'Company information updated successfully',
            })
        } catch (err) {
            console.error('Error saving settings:', err)
            toast({
                title: 'Error',
                description: 'Failed to update settings',
                variant: 'destructive',
            })
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Company Settings</h1>
                <p className="text-gray-400 mt-1">Manage your delivery company profile and preferences</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Building className="h-5 w-5 text-blue-400" />
                            General Information
                        </CardTitle>
                        <CardDescription className="text-gray-500">
                            Basic details about your delivery business
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-gray-300">Company Name</Label>
                                <Input
                                    id="name"
                                    value={companyData.name}
                                    onChange={e => setCompanyData({ ...companyData, name: e.target.value })}
                                    className="bg-gray-800 border-gray-700 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-gray-300">Support Phone</Label>
                                <Input
                                    id="phone"
                                    value={companyData.phone}
                                    onChange={e => setCompanyData({ ...companyData, phone: e.target.value })}
                                    className="bg-gray-800 border-gray-700 text-white"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="website" className="text-gray-300">Website</Label>
                            <Input
                                id="website"
                                value={companyData.website}
                                onChange={e => setCompanyData({ ...companyData, website: e.target.value })}
                                className="bg-gray-800 border-gray-700 text-white"
                                placeholder="https://example.com"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Settings className="h-5 w-5 text-blue-400" />
                            Operational Preferences
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-white">Active Status</Label>
                                <p className="text-sm text-gray-500">When inactive, you won't receive new delivery assignments</p>
                            </div>
                            <Switch
                                checked={companyData.is_active}
                                onCheckedChange={checked => setCompanyData({ ...companyData, is_active: checked })}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-white">Express Delivery</Label>
                                <p className="text-sm text-gray-500">Offer 1-hour or same-day delivery services</p>
                            </div>
                            <Switch
                                checked={companyData.allows_express}
                                onCheckedChange={checked => setCompanyData({ ...companyData, allows_express: checked })}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gray-900 border-gray-800 border-dashed">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2 text-lg">
                            <CreditCard className="h-5 w-5 text-blue-400" />
                            Stripe Connect
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-lg">
                            <p className="text-sm text-blue-300">
                                Your Stripe Connect account is <strong>verified</strong>. Payouts will be processed automatically to your bank account.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end pt-4">
                    <Button
                        type="submit"
                        disabled={isSaving}
                        className="bg-blue-600 hover:bg-blue-700 font-bold px-8"
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save All Changes
                    </Button>
                </div>
            </form>
        </div>
    )
}
