'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'

interface TaxRate {
    id?: string
    scope: 'state' | 'county' | 'city'
    name: string
    rate: number
    tax_type: string | null
    applies_to: string | null
    is_active: boolean | null
    state_id: string | null
    effective_date: string
}

interface TaxRateDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: () => void
    taxRate?: TaxRate | null
}

export function TaxRateDialog({ open, onOpenChange, onSave, taxRate }: TaxRateDialogProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [states, setStates] = useState<{ id: string, name: string }[]>([])
    const [formData, setFormData] = useState<TaxRate>({
        scope: 'state',
        name: '',
        rate: 0,
        tax_type: 'sales',
        applies_to: 'all',
        is_active: true,
        state_id: null,
        effective_date: new Date().toISOString().split('T')[0]
    })
    const { toast } = useToast()

    useEffect(() => {
        async function fetchStates() {
            const supabase = createClient()
            const { data } = await supabase.from('us_states').select('id, name').order('name')
            setStates(data || [])
        }
        fetchStates()
    }, [])

    useEffect(() => {
        if (taxRate) {
            setFormData({
                ...taxRate,
                rate: taxRate.rate * 100 // Display as percentage
            })
        } else {
            setFormData({
                scope: 'state',
                name: '',
                rate: 0,
                tax_type: 'sales',
                applies_to: 'all',
                is_active: true,
                state_id: null,
                effective_date: new Date().toISOString().split('T')[0]
            })
        }
    }, [taxRate, open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        const supabase = createClient()

        const payload = {
            ...formData,
            rate: formData.rate / 100, // Store as decimal
        }

        let error
        if (taxRate?.id) {
            const { error: updateError } = await supabase
                .from('tax_rates')
                .update(payload)
                .eq('id', taxRate.id)
            error = updateError
        } else {
            const { error: insertError } = await supabase
                .from('tax_rates')
                .insert([payload])
            error = insertError
        }

        if (error) {
            toast({
                title: 'Error saving tax rate',
                description: error.message,
                variant: 'destructive'
            })
        } else {
            toast({
                title: taxRate?.id ? 'Tax rate updated' : 'Tax rate created',
                description: 'Changes have been saved successfully.'
            })
            onSave()
            onOpenChange(false)
        }
        setIsLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-neutral-900 border-neutral-800 text-white">
                <DialogHeader>
                    <DialogTitle>{taxRate?.id ? 'Edit Tax Rate' : 'Add New Tax Rate'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Tax Name</Label>
                        <Input
                            id="name"
                            placeholder="e.g. State Sales Tax"
                            className="bg-neutral-950 border-neutral-800"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="scope">Scope</Label>
                            <Select
                                value={formData.scope}
                                onValueChange={(value: any) => setFormData({ ...formData, scope: value })}
                            >
                                <SelectTrigger className="bg-neutral-950 border-neutral-800">
                                    <SelectValue placeholder="Select scope" />
                                </SelectTrigger>
                                <SelectContent className="bg-neutral-900 border-neutral-800 text-white">
                                    <SelectItem value="state">State</SelectItem>
                                    <SelectItem value="county">County</SelectItem>
                                    <SelectItem value="city">City</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="state">Jurisdiction (State)</Label>
                            <Select
                                value={formData.state_id || ''}
                                onValueChange={(value) => setFormData({ ...formData, state_id: value })}
                            >
                                <SelectTrigger className="bg-neutral-950 border-neutral-800">
                                    <SelectValue placeholder="Select state" />
                                </SelectTrigger>
                                <SelectContent className="bg-neutral-900 border-neutral-800 text-white">
                                    {states.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="rate">Rate (%)</Label>
                            <Input
                                id="rate"
                                type="number"
                                step="0.01"
                                placeholder="8.25"
                                className="bg-neutral-950 border-neutral-800"
                                value={formData.rate}
                                onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tax_type">Tax Type</Label>
                            <Input
                                id="tax_type"
                                placeholder="sales"
                                className="bg-neutral-950 border-neutral-800"
                                value={formData.tax_type || ''}
                                onChange={(e) => setFormData({ ...formData, tax_type: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="effective_date">Effective Date</Label>
                        <Input
                            id="effective_date"
                            type="date"
                            className="bg-neutral-950 border-neutral-800"
                            value={formData.effective_date}
                            onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                            required
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <Label htmlFor="active">Active Status</Label>
                        <Switch
                            id="active"
                            checked={formData.is_active ?? false}
                            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="text-neutral-400"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {isLoading ? 'Saving...' : 'Save Tax Rate'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
