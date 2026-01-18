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
import { Textarea } from '@/components/ui/textarea'
import {
    Megaphone,
    Plus,
    Pencil,
    Trash2,
    CalendarIcon,
    Loader2,
    Percent,
    DollarSign,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { DatePicker, parseLocalDate, formatDateForDB, formatDateDisplay } from '@/components/ui/date-picker'

interface Promotion {
    id: string
    name: string
    description: string
    discountType: 'percentage' | 'fixed'
    discountValue: number
    minPurchase: number
    startDate: string
    endDate: string
    isActive: boolean
    usageCount: number
}

export default function PromotionsPage() {
    const { isLoading: authLoading } = useAuth()
    const { currentStore, isLoading: storeLoading } = useStoreDashboard()
    const [promotions, setPromotions] = useState<Promotion[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [storeId, setStoreId] = useState<string | null>(null)

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        discountType: 'percentage' as 'percentage' | 'fixed',
        discountValue: 0,
        minPurchase: 0,
        isActive: true,
    })
    const [startDate, setStartDate] = useState<Date | undefined>(new Date())
    const [endDate, setEndDate] = useState<Date | undefined>(undefined)

    const tenantId = currentStore?.id

    const fetchPromotions = useCallback(async () => {
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
                setPromotions([])
                return
            }

            setStoreId(stores[0].id)

            const { data: promotionsData, error } = await supabase
                .from('promotions')
                .select('*')
                .eq('store_id', stores[0].id)
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Error fetching promotions:', error)
                return
            }

            const transformedPromotions: Promotion[] = (promotionsData || []).map((promo: any) => ({
                id: promo.id,
                name: promo.name,
                description: promo.description || '',
                discountType: promo.discount_type,
                discountValue: Number(promo.discount_value),
                minPurchase: Number(promo.min_purchase) || 0,
                startDate: promo.start_date,
                endDate: promo.end_date,
                isActive: promo.is_active,
                usageCount: promo.usage_count || 0,
            }))

            setPromotions(transformedPromotions)
        } catch (err) {
            console.error('Error in fetchPromotions:', err)
        } finally {
            setIsLoading(false)
        }
    }, [tenantId])

    useEffect(() => {
        fetchPromotions()
    }, [fetchPromotions])

    const openEditDialog = (promotion: Promotion) => {
        setEditingPromotion(promotion)
        setFormData({
            name: promotion.name,
            description: promotion.description,
            discountType: promotion.discountType,
            discountValue: promotion.discountValue,
            minPurchase: promotion.minPurchase,
            isActive: promotion.isActive,
        })
        setStartDate(parseLocalDate(promotion.startDate))
        setEndDate(parseLocalDate(promotion.endDate))
        setIsDialogOpen(true)
    }

    const openCreateDialog = () => {
        setEditingPromotion(null)
        setFormData({
            name: '',
            description: '',
            discountType: 'percentage',
            discountValue: 10,
            minPurchase: 0,
            isActive: true,
        })
        setStartDate(new Date())
        setEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
        setIsDialogOpen(true)
    }

    const handleSubmit = async () => {
        if (!storeId || !formData.name) return
        setIsSubmitting(true)

        try {
            const supabase = createClient()

            const promotionData = {
                store_id: storeId,
                name: formData.name,
                description: formData.description,
                discount_type: formData.discountType,
                discount_value: formData.discountValue,
                min_purchase: formData.minPurchase,
                start_date: formatDateForDB(startDate),
                end_date: formatDateForDB(endDate),
                is_active: formData.isActive,
            }

            if (editingPromotion) {
                const { error } = await supabase
                    .from('promotions')
                    .update(promotionData as any)
                    .eq('id', editingPromotion.id)

                if (error) throw error
                toast({ title: 'Promotion updated successfully' })
            } else {
                const { error } = await supabase
                    .from('promotions')
                    .insert(promotionData as any)

                if (error) throw error
                toast({ title: 'Promotion created successfully' })
            }

            fetchPromotions()
            setIsDialogOpen(false)
        } catch (err) {
            console.error('Error saving promotion:', err)
            toast({
                title: 'Error',
                description: 'Failed to save promotion',
                variant: 'destructive',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (promotionId: string) => {
        if (!confirm('Are you sure you want to delete this promotion?')) return

        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('promotions')
                .delete()
                .eq('id', promotionId)

            if (error) throw error

            toast({ title: 'Promotion deleted' })
            fetchPromotions()
        } catch (err) {
            console.error('Error deleting promotion:', err)
            toast({
                title: 'Error',
                description: 'Failed to delete promotion',
                variant: 'destructive',
            })
        }
    }

    const formatDiscount = (promo: Promotion) => {
        if (promo.discountType === 'percentage') {
            return `${promo.discountValue}% off`
        }
        return `$${promo.discountValue} off`
    }

    const getStatus = (promo: Promotion) => {
        const now = new Date()
        const start = new Date(promo.startDate)
        const end = new Date(promo.endDate)

        if (!promo.isActive) return { label: 'Inactive', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' }
        if (now < start) return { label: 'Scheduled', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' }
        if (now > end) return { label: 'Expired', color: 'bg-red-500/20 text-red-400 border-red-500/30' }
        return { label: 'Active', color: 'bg-green-500/20 text-green-400 border-green-500/30' }
    }

    if (authLoading || storeLoading || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-500" />
                    <p className="text-gray-400">Loading promotions...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Promotions</h1>
                    <p className="text-gray-400 mt-1">
                        Create and manage promotional campaigns
                    </p>
                </div>
                <Button onClick={openCreateDialog} className="bg-orange-600 hover:bg-orange-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Promotion
                </Button>
            </div>

            {/* Promotions List */}
            {promotions.length === 0 ? (
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Megaphone className="h-12 w-12 text-gray-600 mb-4" />
                        <h3 className="text-lg font-medium text-white mb-1">No promotions yet</h3>
                        <p className="text-gray-400 mb-4">Create your first promotion to boost sales.</p>
                        <Button onClick={openCreateDialog} className="bg-orange-600 hover:bg-orange-700">
                            <Plus className="h-4 w-4 mr-2" />
                            Create Promotion
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-gray-800 hover:bg-transparent">
                                    <TableHead className="text-gray-400">Promotion</TableHead>
                                    <TableHead className="text-gray-400">Discount</TableHead>
                                    <TableHead className="text-gray-400">Duration</TableHead>
                                    <TableHead className="text-gray-400">Uses</TableHead>
                                    <TableHead className="text-gray-400">Status</TableHead>
                                    <TableHead className="text-gray-400 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {promotions.map((promo) => {
                                    const status = getStatus(promo)
                                    return (
                                        <TableRow key={promo.id} className="border-gray-800 hover:bg-gray-800/50">
                                            <TableCell>
                                                <div>
                                                    <span className="font-medium text-white">{promo.name}</span>
                                                    {promo.description && (
                                                        <p className="text-sm text-gray-400 truncate max-w-xs">
                                                            {promo.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                                                    {formatDiscount(promo)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-gray-400">
                                                {new Date(promo.startDate).toLocaleDateString()} - {new Date(promo.endDate).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-gray-400">
                                                {promo.usageCount}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={status.color}>{status.label}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openEditDialog(promo)}
                                                        className="text-gray-400 hover:text-white"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(promo.id)}
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
                            {editingPromotion ? 'Edit Promotion' : 'Create Promotion'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-gray-300">Promotion Name *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Summer Sale"
                                className="bg-gray-800 border-gray-700 text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-300">Description</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Get amazing discounts this summer!"
                                className="bg-gray-800 border-gray-700 text-white"
                            />
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
                                <Label className="text-gray-300">Start Date</Label>
                                <DatePicker
                                    date={startDate}
                                    onDateChange={setStartDate}
                                    placeholder="Select start date"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-300">End Date</Label>
                                <DatePicker
                                    date={endDate}
                                    onDateChange={setEndDate}
                                    placeholder="Select end date"
                                />
                            </div>
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
                            disabled={isSubmitting || !formData.name}
                            className="bg-orange-600 hover:bg-orange-700"
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : editingPromotion ? (
                                'Update Promotion'
                            ) : (
                                'Create Promotion'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
