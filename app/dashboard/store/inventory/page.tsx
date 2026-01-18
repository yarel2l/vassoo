'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useStoreDashboard } from '@/contexts/store-dashboard-context'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
    Search,
    Plus,
    Minus,
    ArrowRightLeft,
    AlertTriangle,
    Package,
    Warehouse,
    TrendingUp,
    TrendingDown,
    Loader2,
    RefreshCw,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import Image from 'next/image'

interface InventoryItem {
    id: string
    productId: string
    productName: string
    productImage?: string
    sku: string
    quantity: number
    minStock: number
    maxStock: number
    price: number
    locationId: string
    locationName: string
    updatedAt: string
}

interface StoreLocation {
    id: string
    name: string
    address?: string
}

type ModalType = 'add' | 'remove' | 'transfer' | 'catalog' | null

interface CatalogProduct {
    id: string
    name: string
    sku: string
    thumbnail_url?: string
    category?: string
}

export default function InventoryPage() {
    const { isLoading: authLoading } = useAuth()
    const { currentStore, isLoading: storeLoading } = useStoreDashboard()
    const [inventory, setInventory] = useState<InventoryItem[]>([])
    const [locations, setLocations] = useState<StoreLocation[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedLocation, setSelectedLocation] = useState('all')
    const [modalType, setModalType] = useState<ModalType>(null)
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
    const [adjustQuantity, setAdjustQuantity] = useState(0)
    const [transferDestination, setTransferDestination] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [storeId, setStoreId] = useState<string | null>(null)

    // Catalog modal state
    const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([])
    const [catalogSearch, setCatalogSearch] = useState('')
    const [selectedCatalogProducts, setSelectedCatalogProducts] = useState<string[]>([])
    const [catalogPrices, setCatalogPrices] = useState<Record<string, number>>({})
    const [catalogQuantities, setCatalogQuantities] = useState<Record<string, number>>({})
    const [isFetchingCatalog, setIsFetchingCatalog] = useState(false)

    // New product form state
    const [showNewProductForm, setShowNewProductForm] = useState(false)
    const [newProductName, setNewProductName] = useState('')
    const [newProductSku, setNewProductSku] = useState('')
    const [newProductPrice, setNewProductPrice] = useState('')
    const [newProductQuantity, setNewProductQuantity] = useState('')
    const [isCreatingProduct, setIsCreatingProduct] = useState(false)

    // Get the current store tenant ID from context
    const tenantId = currentStore?.id

    const fetchInventory = useCallback(async () => {
        if (!tenantId) {
            setIsLoading(false)
            return
        }

        try {
            setIsLoading(true)
            const supabase = createClient()

            // Get store for this tenant
            const { data: stores } = await supabase
                .from('stores')
                .select('id')
                .eq('tenant_id', tenantId)
                .limit(1)

            if (!stores || stores.length === 0) {
                setInventory([])
                setLocations([])
                return
            }

            const currentStoreId = stores[0].id
            setStoreId(currentStoreId)

            // Fetch locations
            const { data: locationsData } = await supabase
                .from('store_locations')
                .select('id, name')
                .eq('store_id', currentStoreId)
                .eq('is_active', true)

            setLocations((locationsData || []).map((l: any) => ({ id: l.id, name: l.name })))


            // Fetch inventory - simplified query to avoid 400 errors
            const { data: inventoryData, error } = await supabase
                .from('store_inventories')
                .select('*')
                .eq('store_id', currentStoreId)
                .order('updated_at', { ascending: false })

            if (error) {
                console.error('Error fetching inventory:', error)
                toast({
                    title: 'Error',
                    description: 'Failed to load inventory',
                    variant: 'destructive',
                })
                return
            }

            // Fetch product details separately if we have inventory
            let productsMap: Record<string, any> = {}
            const productIds = [...new Set((inventoryData || []).map((item: any) => item.product_id).filter(Boolean))]

            if (productIds.length > 0) {
                const { data: productsData } = await supabase
                    .from('master_products')
                    .select('id, name, sku, thumbnail_url')
                    .in('id', productIds)

                productsMap = (productsData || []).reduce((acc: Record<string, any>, p: any) => {
                    acc[p.id] = p
                    return acc
                }, {})
            }

            // Transform inventory data
            const transformedInventory: InventoryItem[] = (inventoryData || []).map((item: any) => {
                const product = productsMap[item.product_id] || {}
                const location = (locationsData || []).find((l: any) => l.id === item.location_id)

                return {
                    id: item.id,
                    productId: item.product_id,
                    productName: product.name || 'Unknown Product',
                    productImage: product.thumbnail_url,
                    sku: product.sku || 'N/A',
                    quantity: item.quantity || 0,
                    minStock: item.min_stock || 5,
                    maxStock: item.max_stock || 100,
                    price: Number(item.price) || Number(item.retail_price) || 0,
                    locationId: item.location_id || '',
                    locationName: location?.name || 'Main Store',
                    updatedAt: item.updated_at,
                }
            })

            setInventory(transformedInventory)
        } catch (err) {
            console.error('Error in fetchInventory:', err)
            toast({
                title: 'Error',
                description: 'An unexpected error occurred',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }, [tenantId])

    useEffect(() => {
        fetchInventory()
    }, [fetchInventory])

    // Fetch products from master catalog that aren't in inventory
    const fetchCatalogProducts = useCallback(async () => {
        if (!storeId) return

        setIsFetchingCatalog(true)
        try {
            const supabase = createClient()

            // Get existing product IDs in inventory
            const existingProductIds = inventory.map(item => item.productId)

            // Fetch master products not in inventory
            let query = supabase
                .from('master_products')
                .select('id, name, sku, thumbnail_url, category')
                .order('name')
                .limit(100)

            if (existingProductIds.length > 0) {
                query = query.not('id', 'in', `(${existingProductIds.join(',')})`)
            }

            const { data, error } = await query

            if (error) {
                console.error('Error fetching catalog:', error)
                toast({
                    title: 'Error',
                    description: 'Failed to load catalog products',
                    variant: 'destructive',
                })
                return
            }

            setCatalogProducts((data || []).map(p => ({
                ...p,
                thumbnail_url: p.thumbnail_url ?? undefined
            })))
        } catch (err) {
            console.error('Error in fetchCatalogProducts:', err)
        } finally {
            setIsFetchingCatalog(false)
        }
    }, [storeId, inventory])

    // Add selected products to inventory
    const addProductsToInventory = async () => {
        if (!storeId || selectedCatalogProducts.length === 0) return

        // Validate prices
        const missingPrices = selectedCatalogProducts.filter(id => !catalogPrices[id] || catalogPrices[id] <= 0)
        if (missingPrices.length > 0) {
            toast({
                title: 'Missing Prices',
                description: 'Please set a price greater than 0 for all selected products',
                variant: 'destructive',
            })
            return
        }

        setIsSubmitting(true)
        try {
            const supabase = createClient()

            // Prepare inventory records - store_location_id is null for main store
            const inventoryRecords = selectedCatalogProducts.map(productId => ({
                store_id: storeId,
                store_location_id: locations.length > 0 ? locations[0].id : null, // Use first location or null
                product_id: productId,
                price: catalogPrices[productId] || 0,
                quantity: catalogQuantities[productId] || 0,
                low_stock_threshold: 10,
                is_available: true,
            }))

            const { error } = await supabase
                .from('store_inventories')
                .insert(inventoryRecords as any)

            if (error) {
                console.error('Error adding to inventory:', error)
                toast({
                    title: 'Error',
                    description: error.message || 'Failed to add products to inventory',
                    variant: 'destructive',
                })
                return
            }

            toast({
                title: 'Products Added',
                description: `Added ${selectedCatalogProducts.length} product(s) to inventory`,
            })

            // Reset and close modal
            setSelectedCatalogProducts([])
            setCatalogPrices({})
            setCatalogQuantities({})
            setModalType(null)
            fetchInventory()
        } catch (err) {
            console.error('Error in addProductsToInventory:', err)
            toast({
                title: 'Error',
                description: 'An unexpected error occurred',
                variant: 'destructive',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    // Open catalog modal
    const openCatalogModal = () => {
        setModalType('catalog')
        setCatalogSearch('')
        setSelectedCatalogProducts([])
        setCatalogPrices({})
        setCatalogQuantities({})
        setShowNewProductForm(false)
        setNewProductName('')
        setNewProductSku('')
        setNewProductPrice('')
        setNewProductQuantity('')
        fetchCatalogProducts()
    }

    // Toggle product selection
    const toggleProductSelection = (productId: string) => {
        setSelectedCatalogProducts(prev =>
            prev.includes(productId)
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        )
    }

    // Create new product in master catalog and add to inventory
    const createNewProduct = async () => {
        if (!storeId || !newProductName.trim() || !newProductSku.trim()) {
            toast({
                title: 'Missing Information',
                description: 'Please enter product name and SKU',
                variant: 'destructive',
            })
            return
        }

        const price = parseFloat(newProductPrice) || 0
        const quantity = parseInt(newProductQuantity) || 0

        if (price <= 0) {
            toast({
                title: 'Invalid Price',
                description: 'Please enter a valid price greater than 0',
                variant: 'destructive',
            })
            return
        }

        setIsCreatingProduct(true)
        try {
            const supabase = createClient()

            // 1. Create product in master_products
            const { data: newProduct, error: productError } = await supabase
                .from('master_products')
                .insert({
                    name: newProductName.trim(),
                    sku: newProductSku.trim(),
                    status: 'active',
                } as any)
                .select()
                .single()

            if (productError) {
                console.error('Error creating product:', productError)
                toast({
                    title: 'Error',
                    description: productError.message || 'Failed to create product',
                    variant: 'destructive',
                })
                return
            }

            // 2. Add to inventory
            const { error: inventoryError } = await supabase
                .from('store_inventories')
                .insert({
                    store_id: storeId,
                    store_location_id: locations.length > 0 ? locations[0].id : null,
                    product_id: newProduct.id,
                    price: price,
                    quantity: quantity,
                    low_stock_threshold: 10,
                    is_available: true,
                } as any)

            if (inventoryError) {
                console.error('Error adding to inventory:', inventoryError)
                toast({
                    title: 'Product Created',
                    description: 'Product created but failed to add to inventory: ' + inventoryError.message,
                    variant: 'destructive',
                })
                return
            }

            toast({
                title: 'Success!',
                description: `${newProductName} created and added to inventory`,
            })

            // Reset and close
            setShowNewProductForm(false)
            setNewProductName('')
            setNewProductSku('')
            setNewProductPrice('')
            setNewProductQuantity('')
            setModalType(null)
            fetchInventory()

        } catch (err) {
            console.error('Error in createNewProduct:', err)
            toast({
                title: 'Error',
                description: 'An unexpected error occurred',
                variant: 'destructive',
            })
        } finally {
            setIsCreatingProduct(false)
        }
    }

    const filteredInventory = inventory.filter(item => {
        const matchesSearch = item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.sku.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesLocation = selectedLocation === 'all' || item.locationId === selectedLocation
        return matchesSearch && matchesLocation
    })

    const getStockStatus = (quantity: number, minStock: number) => {
        if (quantity === 0) return { label: 'Out of Stock', color: 'bg-red-500/20 text-red-400 border-red-500/30' }
        if (quantity <= minStock) return { label: 'Low Stock', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' }
        return { label: 'In Stock', color: 'bg-green-500/20 text-green-400 border-green-500/30' }
    }

    const handleAdjustStock = async (type: 'add' | 'remove') => {
        if (!selectedItem || adjustQuantity <= 0) return
        setIsSubmitting(true)

        try {
            const supabase = createClient()
            const newQuantity = type === 'add'
                ? selectedItem.quantity + adjustQuantity
                : Math.max(0, selectedItem.quantity - adjustQuantity)

            const { error } = await supabase
                .from('store_inventories')
                .update({
                    quantity: newQuantity,
                    updated_at: new Date().toISOString()
                })
                .eq('id', selectedItem.id)

            if (error) throw error

            toast({
                title: 'Stock Updated',
                description: `${type === 'add' ? 'Added' : 'Removed'} ${adjustQuantity} units`,
            })

            fetchInventory()
            setModalType(null)
            setSelectedItem(null)
            setAdjustQuantity(0)
        } catch (err) {
            console.error('Error adjusting stock:', err)
            toast({
                title: 'Error',
                description: 'Failed to update stock',
                variant: 'destructive',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleTransfer = async () => {
        if (!selectedItem || adjustQuantity <= 0 || !transferDestination) return
        setIsSubmitting(true)

        try {
            const supabase = createClient()

            // Reduce from source
            const { error: reduceError } = await supabase
                .from('store_inventories')
                .update({
                    quantity: selectedItem.quantity - adjustQuantity,
                    updated_at: new Date().toISOString()
                })
                .eq('id', selectedItem.id)

            if (reduceError) throw reduceError

            // Check if destination inventory exists
            const { data: destInventory } = await supabase
                .from('store_inventories')
                .select('id, quantity')
                .eq('product_id', selectedItem.productId)
                .eq('location_id', transferDestination)
                .single()

            if (destInventory) {
                // Update existing
                await supabase
                    .from('store_inventories')
                    .update({
                        quantity: destInventory.quantity + adjustQuantity,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', destInventory.id)
            } else {
                // Create new inventory record
                await supabase
                    .from('store_inventories')
                    .insert({
                        product_id: selectedItem.productId,
                        location_id: transferDestination,
                        quantity: adjustQuantity,
                        min_stock: selectedItem.minStock,
                        max_stock: selectedItem.maxStock,
                        price: selectedItem.price,
                    } as any)
            }


            toast({
                title: 'Stock Transferred',
                description: `Transferred ${adjustQuantity} units`,
            })

            fetchInventory()
            setModalType(null)
            setSelectedItem(null)
            setAdjustQuantity(0)
            setTransferDestination('')
        } catch (err) {
            console.error('Error transferring stock:', err)
            toast({
                title: 'Error',
                description: 'Failed to transfer stock',
                variant: 'destructive',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const totalItems = filteredInventory.reduce((sum, item) => sum + item.quantity, 0)
    const lowStockItems = filteredInventory.filter(item => item.quantity > 0 && item.quantity <= item.minStock).length
    const outOfStockItems = filteredInventory.filter(item => item.quantity === 0).length

    if (authLoading || storeLoading || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-500" />
                    <p className="text-gray-400">Loading inventory...</p>
                </div>
            </div>
        )
    }

    // No store found
    if (!storeId) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-lg font-medium text-white mb-2">No store found</h3>
                    <p className="text-gray-400">Please select a store from the sidebar</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Inventory</h1>
                    <p className="text-gray-400 mt-1">
                        Track and manage stock levels across locations
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        className="border-gray-700 text-gray-300 hover:bg-gray-800"
                        onClick={() => fetchInventory()}
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button
                        className="bg-orange-600 hover:bg-orange-700"
                        onClick={openCatalogModal}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add from Catalog
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-600/20 rounded-lg">
                                <Package className="h-5 w-5 text-orange-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{totalItems}</p>
                                <p className="text-sm text-gray-400">Total Units</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-600/20 rounded-lg">
                                <Warehouse className="h-5 w-5 text-orange-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{locations.length || 1}</p>
                                <p className="text-sm text-gray-400">Locations</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-600/20 rounded-lg">
                                <AlertTriangle className="h-5 w-5 text-amber-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{lowStockItems}</p>
                                <p className="text-sm text-gray-400">Low Stock</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-600/20 rounded-lg">
                                <Package className="h-5 w-5 text-red-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{outOfStockItems}</p>
                                <p className="text-sm text-gray-400">Out of Stock</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search by product name or SKU..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-gray-800 border-gray-700 text-white"
                            />
                        </div>
                        {locations.length > 0 && (
                            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                                <SelectTrigger className="w-full sm:w-56 bg-gray-800 border-gray-700 text-white">
                                    <Warehouse className="h-4 w-4 mr-2 text-gray-400" />
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-900 border-gray-800">
                                    <SelectItem value="all" className="text-white">All Locations</SelectItem>
                                    {locations.map(loc => (
                                        <SelectItem key={loc.id} value={loc.id} className="text-white">
                                            {loc.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Inventory Table */}
            <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-0">
                    {filteredInventory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Package className="h-12 w-12 text-gray-600 mb-4" />
                            <h3 className="text-lg font-medium text-white mb-1">No inventory items</h3>
                            <p className="text-gray-400 max-w-sm">
                                {inventory.length === 0
                                    ? "Your inventory is empty. Add products from the catalog to get started."
                                    : "No items match your search criteria."}
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="border-gray-800 hover:bg-transparent">
                                    <TableHead className="text-gray-400">Product</TableHead>
                                    <TableHead className="text-gray-400">SKU</TableHead>
                                    <TableHead className="text-gray-400">Location</TableHead>
                                    <TableHead className="text-gray-400">Stock Level</TableHead>
                                    <TableHead className="text-gray-400">Price</TableHead>
                                    <TableHead className="text-gray-400">Status</TableHead>
                                    <TableHead className="text-gray-400 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredInventory.map((item) => {
                                    const status = getStockStatus(item.quantity, item.minStock)
                                    const stockPercentage = Math.min((item.quantity / item.maxStock) * 100, 100)

                                    return (
                                        <TableRow key={item.id} className="border-gray-800 hover:bg-gray-800/50">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    {item.productImage ? (
                                                        <Image
                                                            src={item.productImage}
                                                            alt={item.productName}
                                                            width={40}
                                                            height={40}
                                                            className="rounded-lg object-cover"
                                                        />
                                                    ) : (
                                                        <div className="h-10 w-10 bg-gray-800 rounded-lg flex items-center justify-center">
                                                            <Package className="h-5 w-5 text-gray-500" />
                                                        </div>
                                                    )}
                                                    <span className="font-medium text-white">{item.productName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-gray-400">{item.sku}</TableCell>
                                            <TableCell className="text-gray-400">{item.locationName}</TableCell>
                                            <TableCell>
                                                <div className="space-y-2 min-w-[120px]">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-white font-medium">{item.quantity}</span>
                                                        <span className="text-gray-400">/ {item.maxStock}</span>
                                                    </div>
                                                    <Progress
                                                        value={stockPercentage}
                                                        className="h-2 bg-gray-800"
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-white font-medium">
                                                ${item.price.toFixed(2)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={status.color}>{status.label}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="border-green-700 text-green-400 hover:bg-green-900/30"
                                                        onClick={() => {
                                                            setSelectedItem(item)
                                                            setModalType('add')
                                                        }}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="border-red-700 text-red-400 hover:bg-red-900/30"
                                                        onClick={() => {
                                                            setSelectedItem(item)
                                                            setModalType('remove')
                                                        }}
                                                        disabled={item.quantity === 0}
                                                    >
                                                        <Minus className="h-4 w-4" />
                                                    </Button>
                                                    {locations.length > 1 && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="border-orange-700 text-orange-400 hover:bg-orange-900/30"
                                                            onClick={() => {
                                                                setSelectedItem(item)
                                                                setModalType('transfer')
                                                            }}
                                                            disabled={item.quantity === 0}
                                                        >
                                                            <ArrowRightLeft className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Add/Remove Stock Dialog */}
            <Dialog open={modalType === 'add' || modalType === 'remove'} onOpenChange={() => setModalType(null)}>
                <DialogContent className="bg-gray-900 border-gray-800">
                    <DialogHeader>
                        <DialogTitle className="text-white">
                            {modalType === 'add' ? 'Add Stock' : 'Remove Stock'}
                        </DialogTitle>
                        <DialogDescription className="text-gray-400">
                            {selectedItem?.productName}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                            <span className="text-gray-400">Current Stock</span>
                            <span className="text-xl font-bold text-white">{selectedItem?.quantity}</span>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-300">Quantity to {modalType}</Label>
                            <Input
                                type="number"
                                min="1"
                                max={modalType === 'remove' ? selectedItem?.quantity : undefined}
                                value={adjustQuantity}
                                onChange={(e) => setAdjustQuantity(parseInt(e.target.value) || 0)}
                                className="bg-gray-800 border-gray-700 text-white"
                            />
                        </div>
                        {adjustQuantity > 0 && (
                            <div className="flex items-center justify-between p-4 bg-orange-600/20 rounded-lg">
                                <span className="text-gray-300">New Stock Level</span>
                                <div className="flex items-center gap-2">
                                    {modalType === 'add' ? (
                                        <TrendingUp className="h-4 w-4 text-green-400" />
                                    ) : (
                                        <TrendingDown className="h-4 w-4 text-red-400" />
                                    )}
                                    <span className="text-xl font-bold text-white">
                                        {modalType === 'add'
                                            ? (selectedItem?.quantity || 0) + adjustQuantity
                                            : Math.max(0, (selectedItem?.quantity || 0) - adjustQuantity)
                                        }
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setModalType(null)}
                            className="border-gray-700 text-gray-300 hover:bg-gray-800"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => handleAdjustStock(modalType as 'add' | 'remove')}
                            disabled={isSubmitting || adjustQuantity <= 0}
                            className={modalType === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : modalType === 'add' ? (
                                <>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Stock
                                </>
                            ) : (
                                <>
                                    <Minus className="h-4 w-4 mr-2" />
                                    Remove Stock
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Transfer Stock Dialog */}
            <Dialog open={modalType === 'transfer'} onOpenChange={() => setModalType(null)}>
                <DialogContent className="bg-gray-900 border-gray-800">
                    <DialogHeader>
                        <DialogTitle className="text-white">Transfer Stock</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            {selectedItem?.productName}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                            <span className="text-gray-400">Available at {selectedItem?.locationName}</span>
                            <span className="text-xl font-bold text-white">{selectedItem?.quantity}</span>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-300">Transfer to</Label>
                            <Select value={transferDestination} onValueChange={setTransferDestination}>
                                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                                    <SelectValue placeholder="Select destination" />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-900 border-gray-800">
                                    {locations
                                        .filter(l => l.id !== selectedItem?.locationId)
                                        .map(loc => (
                                            <SelectItem key={loc.id} value={loc.id} className="text-white">
                                                {loc.name}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-300">Quantity to transfer</Label>
                            <Input
                                type="number"
                                min="1"
                                max={selectedItem?.quantity}
                                value={adjustQuantity}
                                onChange={(e) => setAdjustQuantity(parseInt(e.target.value) || 0)}
                                className="bg-gray-800 border-gray-700 text-white"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setModalType(null)}
                            className="border-gray-700 text-gray-300 hover:bg-gray-800"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleTransfer}
                            disabled={isSubmitting || adjustQuantity <= 0 || !transferDestination}
                            className="bg-orange-600 hover:bg-orange-700"
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                                    Transfer
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add from Catalog Modal */}
            <Dialog open={modalType === 'catalog'} onOpenChange={() => setModalType(null)}>
                <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="text-xl text-white">Add Products from Catalog</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Select products from the master catalog to add to your inventory
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search products..."
                                value={catalogSearch}
                                onChange={(e) => setCatalogSearch(e.target.value)}
                                className="pl-9 bg-gray-800 border-gray-700 text-white"
                            />
                        </div>

                        {/* Products Grid */}
                        <div className="flex-1 overflow-y-auto">
                            {isFetchingCatalog ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                                </div>
                            ) : catalogProducts.length === 0 ? (
                                <div className="text-center py-12">
                                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                                    <p className="text-gray-400">No products available to add</p>
                                    <p className="text-gray-500 text-sm mt-1">
                                        All catalog products are already in your inventory
                                    </p>
                                </div>
                            ) : (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {catalogProducts
                                        .filter(p =>
                                            p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                                            p.sku.toLowerCase().includes(catalogSearch.toLowerCase())
                                        )
                                        .map(product => {
                                            const isSelected = selectedCatalogProducts.includes(product.id)
                                            return (
                                                <div
                                                    key={product.id}
                                                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${isSelected
                                                        ? 'border-orange-500 bg-orange-500/10'
                                                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                                                        }`}
                                                    onClick={() => toggleProductSelection(product.id)}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="relative w-12 h-12 rounded-md overflow-hidden bg-gray-700 flex-shrink-0">
                                                            {product.thumbnail_url ? (
                                                                <Image
                                                                    src={product.thumbnail_url}
                                                                    alt={product.name}
                                                                    fill
                                                                    className="object-cover"
                                                                />
                                                            ) : (
                                                                <div className="flex items-center justify-center h-full">
                                                                    <Package className="h-6 w-6 text-gray-500" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-white truncate">{product.name}</p>
                                                            <p className="text-sm text-gray-400">SKU: {product.sku}</p>
                                                        </div>
                                                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected
                                                            ? 'bg-orange-600 border-orange-600'
                                                            : 'border-gray-600'
                                                            }`}>
                                                            {isSelected && (
                                                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Price and Quantity inputs when selected */}
                                                    {isSelected && (
                                                        <div className="mt-3 pt-3 border-t border-gray-700 grid grid-cols-2 gap-2" onClick={e => e.stopPropagation()}>
                                                            <div>
                                                                <Label className="text-xs text-gray-400">Price</Label>
                                                                <Input
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.01"
                                                                    value={catalogPrices[product.id] || ''}
                                                                    onChange={(e) => setCatalogPrices(prev => ({
                                                                        ...prev,
                                                                        [product.id]: parseFloat(e.target.value) || 0
                                                                    }))}
                                                                    placeholder="0.00"
                                                                    className="h-8 bg-gray-900 border-gray-600 text-white text-sm"
                                                                />
                                                            </div>
                                                            <div>
                                                                <Label className="text-xs text-gray-400">Quantity</Label>
                                                                <Input
                                                                    type="number"
                                                                    min="0"
                                                                    value={catalogQuantities[product.id] || ''}
                                                                    onChange={(e) => setCatalogQuantities(prev => ({
                                                                        ...prev,
                                                                        [product.id]: parseInt(e.target.value) || 0
                                                                    }))}
                                                                    placeholder="0"
                                                                    className="h-8 bg-gray-900 border-gray-600 text-white text-sm"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                </div>
                            )}
                        </div>

                        {/* Toggle to New Product Form */}
                        {!showNewProductForm ? (
                            <div className="pt-3 border-t border-gray-800">
                                <Button
                                    variant="ghost"
                                    className="w-full text-orange-400 hover:text-orange-300 hover:bg-gray-800"
                                    onClick={() => setShowNewProductForm(true)}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Can't find product? Create new one
                                </Button>
                            </div>
                        ) : (
                            <div className="pt-3 border-t border-gray-800 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-white">Create New Product</h3>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-gray-400"
                                        onClick={() => setShowNewProductForm(false)}
                                    >
                                        Back to Catalog
                                    </Button>
                                </div>
                                <div className="grid gap-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label className="text-sm text-gray-400">Product Name *</Label>
                                            <Input
                                                value={newProductName}
                                                onChange={(e) => setNewProductName(e.target.value)}
                                                placeholder="Product name"
                                                className="bg-gray-800 border-gray-700 text-white"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-sm text-gray-400">SKU *</Label>
                                            <Input
                                                value={newProductSku}
                                                onChange={(e) => setNewProductSku(e.target.value)}
                                                placeholder="SKU-001"
                                                className="bg-gray-800 border-gray-700 text-white"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label className="text-sm text-gray-400">Price *</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={newProductPrice}
                                                onChange={(e) => setNewProductPrice(e.target.value)}
                                                placeholder="0.00"
                                                className="bg-gray-800 border-gray-700 text-white"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-sm text-gray-400">Initial Quantity</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={newProductQuantity}
                                                onChange={(e) => setNewProductQuantity(e.target.value)}
                                                placeholder="0"
                                                className="bg-gray-800 border-gray-700 text-white"
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        onClick={createNewProduct}
                                        disabled={isCreatingProduct || !newProductName.trim() || !newProductSku.trim()}
                                        className="w-full bg-orange-600 hover:bg-orange-700"
                                    >
                                        {isCreatingProduct ? (
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        ) : (
                                            <Plus className="h-4 w-4 mr-2" />
                                        )}
                                        Create Product & Add to Inventory
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="border-t border-gray-800 pt-4">
                        <div className="flex items-center justify-between w-full">
                            <span className="text-sm text-gray-400">
                                {selectedCatalogProducts.length} product(s) selected
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setModalType(null)}
                                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={addProductsToInventory}
                                    disabled={isSubmitting || selectedCatalogProducts.length === 0}
                                    className="bg-orange-600 hover:bg-orange-700"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add to Inventory
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
