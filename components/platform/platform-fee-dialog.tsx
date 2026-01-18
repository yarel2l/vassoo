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

interface PlatformFee {
    id?: string
    scope: 'global' | 'state'
    name: string
    fee_type: string
    calculation_type: 'percentage' | 'fixed' | 'tiered'
    value: number
    is_active: boolean | null
    state_id: string | null
    effective_date: string
}

interface PlatformFeeDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: () => void
    fee?: PlatformFee | null
}

export function PlatformFeeDialog({ open, onOpenChange, onSave, fee }: PlatformFeeDialogProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [states, setStates] = useState<{ id: string, name: string }[]>([])
    const [formData, setFormData] = useState<PlatformFee>({
        scope: 'global',
        name: '',
        fee_type: 'marketplace_commission',
        calculation_type: 'percentage',
        value: 0,
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
        if (fee) {
            setFormData({
                ...fee,
                value: fee.calculation_type === 'percentage' ? fee.value * 100 : fee.value
            })
        } else {
            setFormData({
                scope: 'global',
                name: '',
                fee_type: 'marketplace_commission',
                calculation_type: 'percentage',
                value: 0,
                is_active: true,
                state_id: null,
                effective_date: new Date().toISOString().split('T')[0]
            })
        }
    }, [fee, open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        const supabase = createClient()

        const payload = {
            ...formData,
            value: formData.calculation_type === 'percentage' ? formData.value / 100 : formData.value,
        }

        let error
        if (fee?.id) {
            const { error: updateError } = await supabase
                .from('platform_fees')
                .update(payload)
                .eq('id', fee.id)
            error = updateError
        } else {
            const { error: insertError } = await supabase
                .from('platform_fees')
                .insert([payload])
            error = insertError
        }

        if (error) {
            toast({
                title: 'Error saving fee',
                description: error.message,
                variant: 'destructive'
            })
        } else {
            toast({
                title: fee?.id ? 'Fee updated' : 'Fee created',
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
                    <DialogTitle>{fee?.id ? 'Edit Platform Fee' : 'Add New Fee Rule'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Fee Name</Label>
                        <Input
                            id="name"
                            placeholder="e.g. Standard Commission"
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
                                onValueChange={(value: any) => setFormData({
                                    ...formData,
                                    scope: value,
                                    state_id: value === 'global' ? null : formData.state_id
                                })}
                            >
                                <SelectTrigger className="bg-neutral-950 border-neutral-800">
                                    <SelectValue placeholder="Select scope" />
                                </SelectTrigger>
                                <SelectContent className="bg-neutral-900 border-neutral-800 text-white">
                                    <SelectItem value="global">Global</SelectItem>
                                    <SelectItem value="state">State Specific</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="state">State (if applicable)</Label>
                            <Select
                                value={formData.state_id || ''}
                                onValueChange={(value) => setFormData({ ...formData, state_id: value })}
                                disabled={formData.scope === 'global'}
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
                            <Label htmlFor="calculation_type">Calc Type</Label>
                            <Select
                                value={formData.calculation_type}
                                onValueChange={(value: any) => setFormData({ ...formData, calculation_type: value })}
                            >
                                <SelectTrigger className="bg-neutral-950 border-neutral-800">
                                    <SelectValue placeholder="Calc Type" />
                                </SelectTrigger>
                                <SelectContent className="bg-neutral-900 border-neutral-800 text-white">
                                    <SelectItem value="percentage">Percentage</SelectItem>
                                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="value">{formData.calculation_type === 'percentage' ? 'Rate (%)' : 'Amount ($)'}</Label>
                            <Input
                                id="value"
                                type="number"
                                step="0.01"
                                className="bg-neutral-950 border-neutral-800"
                                value={formData.value}
                                onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) })}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="fee_type">Fee Category</Label>
                        <Select
                            value={formData.fee_type}
                            onValueChange={(value) => setFormData({ ...formData, fee_type: value })}
                        >
                            <SelectTrigger className="bg-neutral-950 border-neutral-800">
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-900 border-neutral-800 text-white">
                                <SelectItem value="marketplace_commission">Marketplace Commission</SelectItem>
                                <SelectItem value="processing_fee">Processing Fee</SelectItem>
                                <SelectItem value="delivery_platform_fee">Delivery Platform Fee</SelectItem>
                                <SelectItem value="service_fee">Other Service Fee</SelectItem>
                            </SelectContent>
                        </Select>
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
                            checked={formData.is_active || false}
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
                            {isLoading ? 'Saving...' : 'Save Fee Rule'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
