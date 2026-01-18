'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useStoreDashboard } from '@/contexts/store-dashboard-context'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
    Tag,
    Plus,
    Pencil,
    Trash2,
    Copy,
    Loader2,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { DatePicker, parseLocalDate, formatDateForDB, formatDateDisplay } from '@/components/ui/date-picker'

interface Coupon {
    id: string
    code: string
    discountType: 'percentage' | 'fixed'
    discountValue: number
    minPurchase: number
    maxUses: number | null
    usageCount: number
    expiresAt: string | null
    isActive: boolean
}

export default function CouponsPage() {
    const { isLoading: authLoading } = useAuth()
    const { currentStore, isLoading: storeLoading } = useStoreDashboard()
    const [coupons, setCoupons] = useState<Coupon[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [storeId, setStoreId] = useState<string | null>(null)

    // Form state
    const [formData, setFormData] = useState({
        code: '',
        discountType: 'percentage' as 'percentage' | 'fixed',
        discountValue: 10,
        minPurchase: 0,
        usageLimit: '',
        isActive: true,
    })
    const [endDate, setEndDate] = useState<Date | undefined>(undefined)

    const tenantId = currentStore?.id

    const fetchCoupons = useCallback(async () => {
        if (!tenantId) {
            setIsLoading(false)
            return
        }

        try {
            setIsLoading(true)
            const supabase = createClient()

            const { data: stores } = await supabase
                .from('stores')
                .select('id')
                .eq('tenant_id', tenantId)
                .limit(1)

            if (!stores || stores.length === 0) {
                setCoupons([])
                return
            }

            setStoreId(stores[0].id)

            const { data: couponsData, error } = await supabase
                .from('coupons')
                .select('*')
                .eq('store_id', stores[0].id)
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Error fetching coupons:', error)
                return
            }

            const transformedCoupons: Coupon[] = (couponsData || []).map((coupon: any) => ({
                id: coupon.id,
                code: coupon.code,
                discountType: coupon.type,
                discountValue: Number(coupon.value),
                minPurchase: Number(coupon.minimum_order_amount) || 0,
                maxUses: coupon.usage_limit,
                usageCount: coupon.usage_count || 0,
                expiresAt: coupon.end_date,
                isActive: coupon.is_active,
            }))

            setCoupons(transformedCoupons)
        } catch (err) {
            console.error('Error in fetchCoupons:', err)
        } finally {
            setIsLoading(false)
        }
    }, [tenantId])

    useEffect(() => {
        fetchCoupons()
    }, [fetchCoupons])

    const generateCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let code = ''
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        setFormData({ ...formData, code })
    }

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code)
        toast({ title: 'Code copied to clipboard' })
    }

    const openEditDialog = (coupon: Coupon) => {
        setEditingCoupon(coupon)
        setFormData({
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            minPurchase: coupon.minPurchase,
            usageLimit: coupon.maxUses?.toString() || '',
            isActive: coupon.isActive,
        })
        setEndDate(parseLocalDate(coupon.expiresAt))
        setIsDialogOpen(true)
    }

    const openCreateDialog = () => {
        setEditingCoupon(null)
        setFormData({
            code: '',
            discountType: 'percentage',
            discountValue: 10,
            minPurchase: 0,
            usageLimit: '',
            isActive: true,
        })
        setEndDate(undefined)
        setIsDialogOpen(true)
    }

    const handleSubmit = async () => {
        if (!storeId || !formData.code) return
        setIsSubmitting(true)

        try {
            const supabase = createClient()

            const couponData = {
                store_id: storeId,
                code: formData.code.toUpperCase(),
                type: formData.discountType,
                value: formData.discountValue,
                minimum_order_amount: formData.minPurchase,
                usage_limit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
                start_date: new Date().toISOString(),
                end_date: formatDateForDB(endDate),
                is_active: formData.isActive,
            }

            if (editingCoupon) {
                const { error } = await supabase
                    .from('coupons')
                    .update(couponData as any)
                    .eq('id', editingCoupon.id)

                if (error) throw error
                toast({ title: 'Coupon updated successfully' })
            } else {
                const { error } = await supabase
                    .from('coupons')
                    .insert(couponData as any)

                if (error) throw error
                toast({ title: 'Coupon created successfully' })
            }

            fetchCoupons()
            setIsDialogOpen(false)
        } catch (err: any) {
            console.error('Error saving coupon:', err)
            toast({
                title: 'Error',
                description: err.message?.includes('unique') ? 'This coupon code already exists' : 'Failed to save coupon',
                variant: 'destructive',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (couponId: string) => {
        if (!confirm('Are you sure you want to delete this coupon?')) return

        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('coupons')
                .delete()
                .eq('id', couponId)

            if (error) throw error

            toast({ title: 'Coupon deleted' })
            fetchCoupons()
        } catch (err) {
            console.error('Error deleting coupon:', err)
            toast({
                title: 'Error',
                description: 'Failed to delete coupon',
                variant: 'destructive',
            })
        }
    }

    const getStatus = (coupon: Coupon) => {
        if (!coupon.isActive) return { label: 'Inactive', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' }
        if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
            return { label: 'Expired', color: 'bg-red-500/20 text-red-400 border-red-500/30' }
        }
        if (coupon.maxUses && coupon.usageCount >= coupon.maxUses) {
            return { label: 'Exhausted', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' }
        }
        return { label: 'Active', color: 'bg-green-500/20 text-green-400 border-green-500/30' }
    }

    if (authLoading || storeLoading || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-500" />
                    <p className="text-gray-400">Loading coupons...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Coupons</h1>
                    <p className="text-gray-400 mt-1">
                        Create and manage discount codes
                    </p>
                </div>
                <Button onClick={openCreateDialog} className="bg-orange-600 hover:bg-orange-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Coupon
                </Button>
            </div>

            {/* Coupons List */}
            {coupons.length === 0 ? (
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Tag className="h-12 w-12 text-gray-600 mb-4" />
                        <h3 className="text-lg font-medium text-white mb-1">No coupons yet</h3>
                        <p className="text-gray-400 mb-4">Create discount codes for your customers.</p>
                        <Button onClick={openCreateDialog} className="bg-orange-600 hover:bg-orange-700">
                            <Plus className="h-4 w-4 mr-2" />
                            Create Coupon
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-gray-800 hover:bg-transparent">
                                    <TableHead className="text-gray-400">Code</TableHead>
                                    <TableHead className="text-gray-400">Discount</TableHead>
                                    <TableHead className="text-gray-400">Min. Purchase</TableHead>
                                    <TableHead className="text-gray-400">Uses</TableHead>
                                    <TableHead className="text-gray-400">Expires</TableHead>
                                    <TableHead className="text-gray-400">Status</TableHead>
                                    <TableHead className="text-gray-400 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {coupons.map((coupon) => {
                                    const status = getStatus(coupon)
                                    return (
                                        <TableRow key={coupon.id} className="border-gray-800 hover:bg-gray-800/50">
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <code className="px-2 py-1 bg-gray-800 rounded text-orange-400 font-mono">
                                                        {coupon.code}
                                                    </code>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => copyCode(coupon.code)}
                                                        className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                                                    >
                                                        <Copy className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-white">
                                                {coupon.discountType === 'percentage'
                                                    ? `${coupon.discountValue}%`
                                                    : `$${coupon.discountValue}`}
                                            </TableCell>
                                            <TableCell className="text-gray-400">
                                                {coupon.minPurchase > 0 ? `$${coupon.minPurchase}` : '-'}
                                            </TableCell>
                                            <TableCell className="text-gray-400">
                                                {coupon.usageCount}{coupon.maxUses ? ` / ${coupon.maxUses}` : ''}
                                            </TableCell>
                                            <TableCell className="text-gray-400">
                                                {coupon.expiresAt
                                                    ? formatDateDisplay(coupon.expiresAt)
                                                    : 'Never'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={status.color}>{status.label}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openEditDialog(coupon)}
                                                        className="text-gray-400 hover:text-white"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(coupon.id)}
                                                        className="text-red-400 hover:text-red-300"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-white">
                            {editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-gray-300">Coupon Code *</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    placeholder="SUMMER20"
                                    className="bg-gray-800 border-gray-700 text-white font-mono"
                                />
                                {!editingCoupon && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={generateCode}
                                        className="border-gray-700 text-gray-300 hover:bg-gray-800"
                                    >
                                        Generate
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-gray-300">Discount Type</Label>
                                <Select
                                    value={formData.discountType}
                                    onValueChange={(v) => setFormData({ ...formData, discountType: v as 'percentage' | 'fixed' })}
                                >
                                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-900 border-gray-800">
                                        <SelectItem value="percentage" className="text-white">Percentage</SelectItem>
                                        <SelectItem value="fixed" className="text-white">Fixed Amount</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-300">
                                    {formData.discountType === 'percentage' ? 'Discount %' : 'Discount $'}
                                </Label>
                                <Input
                                    type="number"
                                    value={formData.discountValue}
                                    onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                                    className="bg-gray-800 border-gray-700 text-white"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-gray-300">Min. Purchase ($)</Label>
                                <Input
                                    type="number"
                                    value={formData.minPurchase}
                                    onChange={(e) => setFormData({ ...formData, minPurchase: Number(e.target.value) })}
                                    className="bg-gray-800 border-gray-700 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-300">Max Uses</Label>
                                <Input
                                    type="number"
                                    value={formData.usageLimit}
                                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                                    placeholder="Unlimited"
                                    className="bg-gray-800 border-gray-700 text-white"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-300">Expiration Date</Label>
                            <DatePicker
                                date={endDate}
                                onDateChange={setEndDate}
                                placeholder="Select expiration date"
                            />
                        </div>
                        <div className="flex items-center justify-between pt-2">
                            <Label className="text-gray-300">Active</Label>
                            <Switch
                                checked={formData.isActive}
                                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                            className="border-gray-700 text-gray-300 hover:bg-gray-800"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !formData.code}
                            className="bg-orange-600 hover:bg-orange-700"
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : editingCoupon ? (
                                'Update Coupon'
                            ) : (
                                'Create Coupon'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
