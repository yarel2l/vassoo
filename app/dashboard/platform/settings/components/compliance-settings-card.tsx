'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Shield, Save, Loader2, AlertTriangle, Calendar } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'

interface ComplianceSettings {
    age_verification_required: boolean
    min_age_for_alcohol: number
}

export function ComplianceSettingsCard() {
    const [settings, setSettings] = useState<ComplianceSettings>({
        age_verification_required: true,
        min_age_for_alcohol: 21
    })
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const { toast } = useToast()

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        setIsLoading(true)
        const supabase = createClient()

        const { data, error } = await supabase
            .from('platform_settings')
            .select('key, value')
            .in('key', ['age_verification_required', 'min_age_for_alcohol'])

        if (error) {
            toast({
                title: 'Error fetching compliance settings',
                description: error.message,
                variant: 'destructive'
            })
        } else if (data) {
            const settingsMap: Partial<ComplianceSettings> = {}
            data.forEach(item => {
                if (item.key === 'age_verification_required') {
                    settingsMap.age_verification_required = item.value === true || item.value === 'true'
                } else if (item.key === 'min_age_for_alcohol') {
                    settingsMap.min_age_for_alcohol = typeof item.value === 'number'
                        ? item.value
                        : parseInt(String(item.value || '21'), 10)
                }
            })
            setSettings(prev => ({ ...prev, ...settingsMap }))
        }
        setIsLoading(false)
    }

    const saveSettings = async () => {
        setIsSaving(true)
        const supabase = createClient()

        const updates = [
            {
                key: 'age_verification_required',
                value: settings.age_verification_required,
                category: 'compliance',
                is_public: true,
                updated_at: new Date().toISOString()
            },
            {
                key: 'min_age_for_alcohol',
                value: settings.min_age_for_alcohol,
                category: 'compliance',
                is_public: true,
                updated_at: new Date().toISOString()
            }
        ]

        const { error } = await supabase
            .from('platform_settings')
            .upsert(updates, { onConflict: 'key' })

        if (error) {
            toast({
                title: 'Failed to save settings',
                description: error.message,
                variant: 'destructive'
            })
        } else {
            toast({
                title: 'Compliance settings saved',
                description: 'Age verification settings have been updated successfully.'
            })
        }
        setIsSaving(false)
    }

    const handleAgeChange = (value: string) => {
        const age = parseInt(value, 10)
        if (!isNaN(age) && age >= 0 && age <= 100) {
            setSettings(prev => ({ ...prev, min_age_for_alcohol: age }))
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

    return (
        <Card className="bg-neutral-900 border-neutral-800">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Shield className="h-5 w-5 text-amber-400" />
                            Compliance & Age Verification
                        </CardTitle>
                        <CardDescription>
                            Configure age verification requirements for alcohol sales
                        </CardDescription>
                    </div>
                    <Button
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        onClick={saveSettings}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        Save
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Age Verification Toggle */}
                <div className="flex items-center justify-between p-4 bg-neutral-950 rounded border border-neutral-800">
                    <div className="space-y-0.5">
                        <Label className="text-white flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-amber-400" />
                            Age Verification Required
                        </Label>
                        <p className="text-xs text-neutral-500">
                            Users must confirm their age before accessing the store
                        </p>
                    </div>
                    <Switch
                        checked={settings.age_verification_required}
                        onCheckedChange={(checked) =>
                            setSettings(prev => ({ ...prev, age_verification_required: checked }))
                        }
                    />
                </div>

                {/* Minimum Age Input */}
                <div className="p-4 bg-neutral-950 rounded border border-neutral-800 space-y-4">
                    <div className="space-y-2">
                        <Label className="text-white">Minimum Age for Alcohol Purchase</Label>
                        <p className="text-xs text-neutral-500">
                            The minimum legal age required to purchase alcoholic beverages
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Input
                            type="number"
                            min="0"
                            max="100"
                            value={settings.min_age_for_alcohol}
                            onChange={(e) => handleAgeChange(e.target.value)}
                            className="bg-neutral-900 border-neutral-700 text-white w-24"
                        />
                        <span className="text-neutral-400">years old</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                        {[18, 19, 21].map((age) => (
                            <Button
                                key={age}
                                variant="outline"
                                size="sm"
                                className={`border-neutral-700 ${
                                    settings.min_age_for_alcohol === age
                                        ? 'bg-amber-600/20 border-amber-500 text-amber-400'
                                        : 'text-neutral-400 hover:text-white'
                                }`}
                                onClick={() => setSettings(prev => ({ ...prev, min_age_for_alcohol: age }))}
                            >
                                {age}
                            </Button>
                        ))}
                    </div>
                </div>

                <Separator className="bg-neutral-800" />

                {/* Info Notice */}
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-amber-400 text-sm font-medium">Legal Compliance</p>
                            <p className="text-amber-400/80 text-xs mt-1">
                                Ensure the minimum age setting complies with local laws and regulations.
                                In most US states, the legal drinking age is 21. In many other countries,
                                it is 18 or 19. Always verify the requirements for your target market.
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
