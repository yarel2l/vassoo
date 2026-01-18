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
    Zap,
    Plus,
    Pencil,
    Trash2,
    Loader2,
    Percent,
    DollarSign,
    Clock,
    Package,
    Search,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { DatePicker, parseLocalDate, formatDateForDB } from '@/components/ui/date-picker'

interface FlashSale {
    id: string
    name: string
    description: string
    discountType: 'percentage' | 'fixed'
    discountValue: number
    startDate: string
    endDate: string
    isActive: boolean
    usageCount: number
    productIds: string[]
    productNames: string[]
}

interface StoreProduct {
    id: string
    name: string
    sku: string
    price: number
}

export default function FlashSalesPage() {
    const { isLoading: authLoading } = useAuth()
    const { currentStore, isLoading: storeLoading } = useStoreDashboard()
    const [flashSales, setFlashSales] = useState<FlashSale[]>([])
    const [products, setProducts] = useState<StoreProduct[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingSale, setEditingSale] = useState<FlashSale | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [storeId, setStoreId] = useState<string | null>(null)
    const [productSearch, setProductSearch] = useState('')

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        discountType: 'percentage' as 'percentage' | 'fixed',
        discountValue: 20,
        isActive: true,
    })
    const [startDate, setStartDate] = useState<Date | undefined>(new Date())
    const [endDate, setEndDate] = useState<Date | undefined>(undefined)
    const [selectedProducts, setSelectedProducts] = useState<string[]>([])

    const tenantId = currentStore?.id

    // Fetch flash sales
    const fetchFlashSales = useCallback(async () => {
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
                setFlashSales([])
                return
            }

            setStoreId(stores[0].id)

            // Fetch flash sales (promotions with is_flash_sale flag in config)
            const { data: promotionsData, error } = await supabase
                .from('promotions')
                .select('*')
                .eq('store_id', stores[0].id)
                .filter('config->>is_flash_sale', 'eq', 'true')
                .order('start_date', { ascending: false })

            if (error) {
                console.error('Error fetching flash sales:', error)
                return
            }

            // Get product names for each flash sale
            const allProductIds = (promotionsData || [])
                .flatMap((p: any) => p.eligible_product_ids || [])
                .filter((id: string) => id)

            let productMap: Record<string, string> = {}
            if (allProductIds.length > 0) {
                const { data: productsData } = await supabase
                    .from('master_products')
                    .select('id, name')
                    .in('id', allProductIds)

                productMap = (productsData || []).reduce((acc: Record<string, string>, p: any) => {
                    acc[p.id] = p.name
                    return acc
                }, {})
            }

            const transformedSales: FlashSale[] = (promotionsData || []).map((promo: any) => {
                const config = promo.config || {}
                const productIds = promo.eligible_product_ids || []
                return {
                    id: promo.id,
                    name: promo.name,
                    description: promo.description || '',
                    discountType: config.discount_type || promo.type || 'percentage',
                    discountValue: Number(config.discount_value || config.discount_percentage || config.discount_amount || 0),
                    startDate: promo.start_date,
                    endDate: promo.end_date,
                    isActive: promo.is_active,
                    usageCount: promo.usage_count || 0,
                    productIds,
                    productNames: productIds.map((id: string) => productMap[id] || 'Unknown'),
                }
            })

            setFlashSales(transformedSales)
        } catch (err) {
            console.error('Error in fetchFlashSales:', err)
        } finally {
            setIsLoading(false)
        }
    }, [tenantId])

    // Fetch store products
    const fetchProducts = useCallback(async () => {
        if (!storeId) return

        try {
            const supabase = createClient()

            // Get products from store inventory
            const { data: inventoryData } = await supabase
                .from('store_inventories')
                .select(`
                    id,
                    price,
                    product:master_products(id, name, sku)
                `)
                .eq('store_id', storeId)
                .eq('is_available', true)
                .limit(100)

            const storeProducts: StoreProduct[] = (inventoryData || [])
                .filter((item: any) => item.product)
                .map((item: any) => ({
                    id: item.product.id,
                    name: item.product.name,
                    sku: item.product.sku || '',
                    price: Number(item.price) || 0,
                }))

            setProducts(storeProducts)
        } catch (err) {
            console.error('Error fetching products:', err)
        }
    }, [storeId])

    useEffect(() => {
        fetchFlashSales()
    }, [fetchFlashSales])

    useEffect(() => {
        if (storeId) {
            fetchProducts()
        }
    }, [storeId, fetchProducts])

    const openEditDialog = (sale: FlashSale) => {
        setEditingSale(sale)
        setFormData({
            name: sale.name,
            description: sale.description,
            discountType: sale.discountType,
            discountValue: sale.discountValue,
            isActive: sale.isActive,
        })
        setStartDate(parseLocalDate(sale.startDate))
        setEndDate(parseLocalDate(sale.endDate))
        setSelectedProducts(sale.productIds)
        setIsDialogOpen(true)
    }

    const openCreateDialog = () => {
        setEditingSale(null)
        setFormData({
            name: '',
            description: '',
            discountType: 'percentage',
            discountValue: 20,
            isActive: true,
        })
        // Default: starts now, ends in 24 hours
        const now = new Date()
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
        setStartDate(now)
        setEndDate(tomorrow)
        setSelectedProducts([])
        setIsDialogOpen(true)
    }

    const handleSubmit = async () => {
        if (!storeId || !formData.name || selectedProducts.length === 0) {
            toast({
                title: 'Error',
                description: 'Please fill in all required fields and select at least one product',
                variant: 'destructive',
            })
            return
        }

        setIsSubmitting(true)

        try {
            const supabase = createClient()

            const config = {
                is_flash_sale: true,
                discount_type: formData.discountType,
                discount_value: formData.discountValue,
                ...(formData.discountType === 'percentage'
                    ? { discount_percentage: formData.discountValue }
                    : { discount_amount: formData.discountValue }
                ),
            }

            const promotionData = {
                store_id: storeId,
                name: formData.name,
                description: formData.description,
                type: formData.discountType,
                config,
                eligible_product_ids: selectedProducts,
                start_date: formatDateForDB(startDate),
                end_date: formatDateForDB(endDate),
                is_active: formData.isActive,
            }

            if (editingSale) {
                const { error } = await supabase
                    .from('promotions')
                    .update(promotionData as any)
                    .eq('id', editingSale.id)

                if (error) throw error
                toast({ title: 'Flash sale updated successfully' })
            } else {
                const { error } = await supabase
                    .from('promotions')
                    .insert(promotionData as any)

                if (error) throw error
                toast({ title: 'Flash sale created successfully' })
            }

            fetchFlashSales()
            setIsDialogOpen(false)
        } catch (err) {
            console.error('Error saving flash sale:', err)
            toast({
                title: 'Error',
                description: 'Failed to save flash sale',
                variant: 'destructive',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (saleId: string) => {
        if (!confirm('Are you sure you want to delete this flash sale?')) return

        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('promotions')
                .delete()
                .eq('id', saleId)

            if (error) throw error

            toast({ title: 'Flash sale deleted' })
            fetchFlashSales()
        } catch (err) {
            console.error('Error deleting flash sale:', err)
            toast({
                title: 'Error',
                description: 'Failed to delete flash sale',
                variant: 'destructive',
            })
        }
    }

    const formatDiscount = (sale: FlashSale) => {
        if (sale.discountType === 'percentage') {
            return `${sale.discountValue}% off`
        }
        return `$${sale.discountValue} off`
    }

    const getTimeRemaining = (endDateStr: string) => {
        const now = new Date()
        const end = new Date(endDateStr)
        const diff = end.getTime() - now.getTime()

        if (diff <= 0) return 'Ended'

        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

        if (hours > 24) {
            const days = Math.floor(hours / 24)
            return `${days}d ${hours % 24}h`
        }
        return `${hours}h ${minutes}m`
    }

    const getStatus = (sale: FlashSale) => {
        const now = new Date()
        const start = new Date(sale.startDate)
        const end = new Date(sale.endDate)

        if (!sale.isActive) return { label: 'Inactive', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' }
        if (now < start) return { label: 'Scheduled', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' }
        if (now > end) return { label: 'Ended', color: 'bg-red-500/20 text-red-400 border-red-500/30' }
        return { label: 'Live', color: 'bg-green-500/20 text-green-400 border-green-500/30' }
    }

    const toggleProductSelection = (productId: string) => {
        setSelectedProducts(prev =>
            prev.includes(productId)
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        )
    }

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(productSearch.toLowerCase())
    )

    if (authLoading || storeLoading || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-500" />
                    <p className="text-gray-400">Loading flash sales...</p>
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
                        <Zap className="h-6 w-6 text-amber-400" />
                        Flash Sales
                    </h1>
                    <p className="text-gray-400 mt-1">
                        Create limited-time deals with countdown timers
                    </p>
                </div>
                <Button onClick={openCreateDialog} className="bg-orange-600 hover:bg-orange-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Flash Sale
                </Button>
            </div>

            {/* Flash Sales List */}
            {flashSales.length === 0 ? (
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Zap className="h-12 w-12 text-gray-600 mb-4" />
                        <h3 className="text-lg font-medium text-white mb-1">No flash sales yet</h3>
                        <p className="text-gray-400 mb-4">Create your first flash sale to boost sales.</p>
                        <Button onClick={openCreateDialog} className="bg-orange-600 hover:bg-orange-700">
                            <Plus className="h-4 w-4 mr-2" />
                            Create Flash Sale
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-gray-800 hover:bg-transparent">
                                    <TableHead className="text-gray-400">Flash Sale</TableHead>
                                    <TableHead className="text-gray-400">Products</TableHead>
                                    <TableHead className="text-gray-400">Discount</TableHead>
                                    <TableHead className="text-gray-400">Time Left</TableHead>
                                    <TableHead className="text-gray-400">Status</TableHead>
                                    <TableHead className="text-gray-400 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {flashSales.map((sale) => {
                                    const status = getStatus(sale)
                                    return (
                                        <TableRow key={sale.id} className="border-gray-800 hover:bg-gray-800/50">
                                            <TableCell>
                                                <div>
                                                    <span className="font-medium text-white">{sale.name}</span>
                                                    {sale.description && (
                                                        <p className="text-sm text-gray-400 truncate max-w-xs">
                                                            {sale.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Package className="h-4 w-4 text-gray-400" />
                                                    <span className="text-gray-300">
                                                        {sale.productIds.length} product{sale.productIds.length !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                                                    {formatDiscount(sale)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-gray-300">
                                                    <Clock className="h-4 w-4" />
                                                    {getTimeRemaining(sale.endDate)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={status.color}>{status.label}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openEditDialog(sale)}
                                                        className="text-gray-400 hover:text-white"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(sale.id)}
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
                            <Zap className="h-5 w-5 text-amber-400" />
                            {editingSale ? 'Edit Flash Sale' : 'Create Flash Sale'}
                        </DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Set up a limited-time deal with selected products
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Basic Info */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-gray-300">Sale Name *</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Weekend Flash Sale"
                                    className="bg-gray-800 border-gray-700 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-300">Description</Label>
                                <Textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Limited time offers on selected items!"
                                    className="bg-gray-800 border-gray-700 text-white"
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

                        {/* Date/Time Settings */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-gray-300">Start Date/Time</Label>
                                <DatePicker
                                    date={startDate}
                                    onDateChange={setStartDate}
                                    placeholder="Select start"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-300">End Date/Time</Label>
                                <DatePicker
                                    date={endDate}
                                    onDateChange={setEndDate}
                                    placeholder="Select end"
                                />
                            </div>
                        </div>

                        {/* Product Selection */}
                        <div className="space-y-3">
                            <Label className="text-gray-300">Select Products * ({selectedProducts.length} selected)</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                    placeholder="Search products..."
                                    className="bg-gray-800 border-gray-700 text-white pl-10"
                                />
                            </div>
                            <div className="max-h-48 overflow-y-auto border border-gray-700 rounded-lg">
                                {filteredProducts.length === 0 ? (
                                    <div className="p-4 text-center text-gray-400">
                                        No products found in your inventory
                                    </div>
                                ) : (
                                    filteredProducts.map((product) => (
                                        <label
                                            key={product.id}
                                            className="flex items-center gap-3 p-3 hover:bg-gray-800 cursor-pointer border-b border-gray-800 last:border-0"
                                        >
                                            <Checkbox
                                                checked={selectedProducts.includes(product.id)}
                                                onCheckedChange={() => toggleProductSelection(product.id)}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white truncate">{product.name}</p>
                                                <p className="text-sm text-gray-400">{product.sku} - ${product.price.toFixed(2)}</p>
                                            </div>
                                        </label>
                                    ))
                                )}
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
                            disabled={isSubmitting || !formData.name || selectedProducts.length === 0}
                            className="bg-orange-600 hover:bg-orange-700"
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : editingSale ? (
                                'Update Flash Sale'
                            ) : (
                                'Create Flash Sale'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
