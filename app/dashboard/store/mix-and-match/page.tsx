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
import { Checkbox } from '@/components/ui/checkbox'
import {
    Shuffle,
    Plus,
    Pencil,
    Trash2,
    Loader2,
    Percent,
    DollarSign,
    Package,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { DatePicker, parseLocalDate, formatDateForDB } from '@/components/ui/date-picker'

interface MixMatchDeal {
    id: string
    name: string
    description: string
    minItems: number
    maxItems: number | null
    discountType: 'percentage' | 'fixed'
    discountValue: number
    categories: string[]
    startDate: string
    endDate: string
    isActive: boolean
    usageCount: number
}

// Common liquor store categories
const AVAILABLE_CATEGORIES = [
    { value: 'wine', label: 'Wine' },
    { value: 'red_wine', label: 'Red Wine' },
    { value: 'white_wine', label: 'White Wine' },
    { value: 'rose_wine', label: 'Rosé Wine' },
    { value: 'sparkling', label: 'Sparkling & Champagne' },
    { value: 'spirits', label: 'Spirits' },
    { value: 'vodka', label: 'Vodka' },
    { value: 'whiskey', label: 'Whiskey' },
    { value: 'rum', label: 'Rum' },
    { value: 'tequila', label: 'Tequila' },
    { value: 'gin', label: 'Gin' },
    { value: 'brandy', label: 'Brandy & Cognac' },
    { value: 'beer', label: 'Beer' },
    { value: 'craft_beer', label: 'Craft Beer' },
    { value: 'imported_beer', label: 'Imported Beer' },
    { value: 'cider', label: 'Cider' },
    { value: 'seltzer', label: 'Hard Seltzer' },
    { value: 'liqueur', label: 'Liqueur' },
    { value: 'mixers', label: 'Mixers' },
    { value: 'mini_bottles', label: 'Mini Bottles' },
]

export default function MixAndMatchPage() {
    const { isLoading: authLoading } = useAuth()
    const { currentStore, isLoading: storeLoading } = useStoreDashboard()
    const [deals, setDeals] = useState<MixMatchDeal[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingDeal, setEditingDeal] = useState<MixMatchDeal | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [storeId, setStoreId] = useState<string | null>(null)

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        minItems: 3,
        maxItems: '' as string | number,
        discountType: 'percentage' as 'percentage' | 'fixed',
        discountValue: 15,
        isActive: true,
    })
    const [startDate, setStartDate] = useState<Date | undefined>(new Date())
    const [endDate, setEndDate] = useState<Date | undefined>(undefined)
    const [selectedCategories, setSelectedCategories] = useState<string[]>([])

    const tenantId = currentStore?.id

    // Fetch mix & match deals
    const fetchDeals = useCallback(async () => {
        if (!tenantId) {
            setIsLoading(false)
            return
        }

        try {
            setIsLoading(true)
            const supabase = createClient()

            // Get store ID
            const { data: stores } = await supabase
                .from('stores')
                .select('id')
                .eq('tenant_id', tenantId)
                .limit(1)

            if (!stores || stores.length === 0) {
                setDeals([])
                return
            }

            setStoreId(stores[0].id)

            // Fetch mix & match promotions
            const { data: promotionsData, error } = await supabase
                .from('promotions')
                .select('*')
                .eq('store_id', stores[0].id)
                .eq('type', 'mix_match')
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Error fetching mix & match deals:', error)
                return
            }

            const transformedDeals: MixMatchDeal[] = (promotionsData || []).map((promo: any) => {
                const config = promo.config || {}
                return {
                    id: promo.id,
                    name: promo.name,
                    description: promo.description || '',
                    minItems: config.min_items || 2,
                    maxItems: config.max_items || null,
                    discountType: config.discount_type || 'percentage',
                    discountValue: Number(config.discount_percentage || config.discount_amount || config.discount_value || 0),
                    categories: config.categories || promo.eligible_categories || [],
                    startDate: promo.start_date,
                    endDate: promo.end_date,
                    isActive: promo.is_active,
                    usageCount: promo.usage_count || 0,
                }
            })

            setDeals(transformedDeals)
        } catch (err) {
            console.error('Error in fetchDeals:', err)
        } finally {
            setIsLoading(false)
        }
    }, [tenantId])

    useEffect(() => {
        fetchDeals()
    }, [fetchDeals])

    const openEditDialog = (deal: MixMatchDeal) => {
        setEditingDeal(deal)
        setFormData({
            name: deal.name,
            description: deal.description,
            minItems: deal.minItems,
            maxItems: deal.maxItems || '',
            discountType: deal.discountType,
            discountValue: deal.discountValue,
            isActive: deal.isActive,
        })
        setStartDate(parseLocalDate(deal.startDate))
        setEndDate(deal.endDate ? parseLocalDate(deal.endDate) : undefined)
        setSelectedCategories(deal.categories)
        setIsDialogOpen(true)
    }

    const openCreateDialog = () => {
        setEditingDeal(null)
        setFormData({
            name: '',
            description: '',
            minItems: 3,
            maxItems: '',
            discountType: 'percentage',
            discountValue: 15,
            isActive: true,
        })
        setStartDate(new Date())
        setEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
        setSelectedCategories([])
        setIsDialogOpen(true)
    }

    const handleSubmit = async () => {
        if (!storeId || !formData.name || selectedCategories.length === 0) {
            toast({
                title: 'Error',
                description: 'Please fill in all required fields and select at least one category',
                variant: 'destructive',
            })
            return
        }

        if (formData.minItems < 2) {
            toast({
                title: 'Error',
                description: 'Minimum items must be at least 2',
                variant: 'destructive',
            })
            return
        }

        setIsSubmitting(true)

        try {
            const supabase = createClient()

            const config = {
                min_items: formData.minItems,
                max_items: formData.maxItems ? Number(formData.maxItems) : null,
                discount_type: formData.discountType,
                discount_value: formData.discountValue,
                ...(formData.discountType === 'percentage'
                    ? { discount_percentage: formData.discountValue }
                    : { discount_amount: formData.discountValue }
                ),
                categories: selectedCategories,
            }

            const promotionData = {
                store_id: storeId,
                name: formData.name,
                description: formData.description,
                type: 'mix_match' as const,
                config,
                eligible_categories: selectedCategories,
                start_date: formatDateForDB(startDate),
                end_date: endDate ? formatDateForDB(endDate) : null,
                is_active: formData.isActive,
            }

            if (editingDeal) {
                const { error } = await supabase
                    .from('promotions')
                    .update(promotionData as any)
                    .eq('id', editingDeal.id)

                if (error) throw error
                toast({ title: 'Mix & Match deal updated successfully' })
            } else {
                const { error } = await supabase
                    .from('promotions')
                    .insert(promotionData as any)

                if (error) throw error
                toast({ title: 'Mix & Match deal created successfully' })
            }

            fetchDeals()
            setIsDialogOpen(false)
        } catch (err) {
            console.error('Error saving deal:', err)
            toast({
                title: 'Error',
                description: 'Failed to save mix & match deal',
                variant: 'destructive',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (dealId: string) => {
        if (!confirm('Are you sure you want to delete this mix & match deal?')) return

        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('promotions')
                .delete()
                .eq('id', dealId)

            if (error) throw error

            toast({ title: 'Mix & Match deal deleted' })
            fetchDeals()
        } catch (err) {
            console.error('Error deleting deal:', err)
            toast({
                title: 'Error',
                description: 'Failed to delete deal',
                variant: 'destructive',
            })
        }
    }

    const formatDiscount = (deal: MixMatchDeal) => {
        if (deal.discountType === 'percentage') {
            return `${deal.discountValue}% off`
        }
        return `$${deal.discountValue} off`
    }

    const formatRule = (deal: MixMatchDeal) => {
        const categoryNames = deal.categories
            .map(c => AVAILABLE_CATEGORIES.find(ac => ac.value === c)?.label || c)
            .slice(0, 2)
            .join(', ')

        const moreCount = deal.categories.length > 2 ? ` +${deal.categories.length - 2}` : ''

        if (deal.maxItems) {
            return `${deal.minItems}-${deal.maxItems} items from ${categoryNames}${moreCount}`
        }
        return `${deal.minItems}+ items from ${categoryNames}${moreCount}`
    }

    const getStatus = (deal: MixMatchDeal) => {
        const now = new Date()
        const start = new Date(deal.startDate)
        const end = deal.endDate ? new Date(deal.endDate) : null

        if (!deal.isActive) return { label: 'Inactive', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' }
        if (now < start) return { label: 'Scheduled', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' }
        if (end && now > end) return { label: 'Expired', color: 'bg-red-500/20 text-red-400 border-red-500/30' }
        return { label: 'Active', color: 'bg-green-500/20 text-green-400 border-green-500/30' }
    }

    const toggleCategorySelection = (category: string) => {
        setSelectedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        )
    }

    if (authLoading || storeLoading || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-500" />
                    <p className="text-gray-400">Loading mix & match deals...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Shuffle className="h-6 w-6 text-purple-400" />
                        Mix & Match Deals
                    </h1>
                    <p className="text-gray-400 mt-1">
                        Create bundle deals where customers mix products for discounts
                    </p>
                </div>
                <Button onClick={openCreateDialog} className="bg-orange-600 hover:bg-orange-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Deal
                </Button>
            </div>

            {/* Deals List */}
            {deals.length === 0 ? (
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Shuffle className="h-12 w-12 text-gray-600 mb-4" />
                        <h3 className="text-lg font-medium text-white mb-1">No mix & match deals yet</h3>
                        <p className="text-gray-400 mb-4 text-center max-w-md">
                            Create deals where customers can mix items from categories to unlock discounts.
                        </p>
                        <Button onClick={openCreateDialog} className="bg-orange-600 hover:bg-orange-700">
                            <Plus className="h-4 w-4 mr-2" />
                            Create Deal
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-gray-800 hover:bg-transparent">
                                    <TableHead className="text-gray-400">Deal</TableHead>
                                    <TableHead className="text-gray-400">Rule</TableHead>
                                    <TableHead className="text-gray-400">Discount</TableHead>
                                    <TableHead className="text-gray-400">Uses</TableHead>
                                    <TableHead className="text-gray-400">Status</TableHead>
                                    <TableHead className="text-gray-400 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {deals.map((deal) => {
                                    const status = getStatus(deal)
                                    return (
                                        <TableRow key={deal.id} className="border-gray-800 hover:bg-gray-800/50">
                                            <TableCell>
                                                <div>
                                                    <span className="font-medium text-white">{deal.name}</span>
                                                    {deal.description && (
                                                        <p className="text-sm text-gray-400 truncate max-w-xs">
                                                            {deal.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Package className="h-4 w-4 text-purple-400" />
                                                    <span className="text-gray-300 text-sm">
                                                        {formatRule(deal)}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                                                    {formatDiscount(deal)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-gray-400">
                                                {deal.usageCount}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={status.color}>{status.label}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openEditDialog(deal)}
                                                        className="text-gray-400 hover:text-white"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(deal.id)}
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
                <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <Shuffle className="h-5 w-5 text-purple-400" />
                            {editingDeal ? 'Edit Mix & Match Deal' : 'Create Mix & Match Deal'}
                        </DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Set up a deal where customers mix items from selected categories
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Basic Info */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-gray-300">Deal Name *</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Wine Trio Special"
                                    className="bg-gray-800 border-gray-700 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-300">Description</Label>
                                <Textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Pick any 3 wines and save 20%!"
                                    className="bg-gray-800 border-gray-700 text-white"
                                />
                            </div>
                        </div>

                        {/* Item Requirements */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-gray-300">Minimum Items *</Label>
                                <Input
                                    type="number"
                                    value={formData.minItems}
                                    onChange={(e) => setFormData({ ...formData, minItems: Number(e.target.value) })}
                                    className="bg-gray-800 border-gray-700 text-white"
                                    min={2}
                                />
                                <p className="text-xs text-gray-500">At least 2 required</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-300">Maximum Items (optional)</Label>
                                <Input
                                    type="number"
                                    value={formData.maxItems}
                                    onChange={(e) => setFormData({ ...formData, maxItems: e.target.value ? Number(e.target.value) : '' })}
                                    placeholder="No limit"
                                    className="bg-gray-800 border-gray-700 text-white"
                                    min={formData.minItems}
                                />
                            </div>
                        </div>

                        {/* Discount Settings */}
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
                                        <SelectItem value="percentage" className="text-white">
                                            <div className="flex items-center gap-2">
                                                <Percent className="h-4 w-4" />
                                                Percentage
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="fixed" className="text-white">
                                            <div className="flex items-center gap-2">
                                                <DollarSign className="h-4 w-4" />
                                                Fixed Amount
                                            </div>
                                        </SelectItem>
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
                                    min={1}
                                    max={formData.discountType === 'percentage' ? 100 : undefined}
                                />
                            </div>
                        </div>

                        {/* Category Selection */}
                        <div className="space-y-3">
                            <Label className="text-gray-300">
                                Eligible Categories * ({selectedCategories.length} selected)
                            </Label>
                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-700 rounded-lg p-3">
                                {AVAILABLE_CATEGORIES.map((category) => (
                                    <label
                                        key={category.value}
                                        className="flex items-center gap-2 p-2 hover:bg-gray-800 rounded cursor-pointer"
                                    >
                                        <Checkbox
                                            checked={selectedCategories.includes(category.value)}
                                            onCheckedChange={() => toggleCategorySelection(category.value)}
                                        />
                                        <span className="text-white text-sm">{category.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Date Settings */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-gray-300">Start Date</Label>
                                <DatePicker
                                    date={startDate}
                                    onDateChange={setStartDate}
                                    placeholder="Select start"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-300">End Date (optional)</Label>
                                <DatePicker
                                    date={endDate}
                                    onDateChange={setEndDate}
                                    placeholder="No end date"
                                />
                            </div>
                        </div>

                        {/* Active Toggle */}
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
                            disabled={isSubmitting || !formData.name || selectedCategories.length === 0}
                            className="bg-orange-600 hover:bg-orange-700"
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : editingDeal ? (
                                'Update Deal'
                            ) : (
                                'Create Deal'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
