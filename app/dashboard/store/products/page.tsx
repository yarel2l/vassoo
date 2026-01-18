'use client'

import { useState, useEffect, useCallback } from 'react'
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Plus,
    Search,
    Filter,
    MoreHorizontal,
    Edit,
    Trash2,
    Eye,
    Package,
    ImagePlus,
    Loader2,
    Download,
    FileText,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    ArrowUpCircle,
    Store,
    Globe,
    Send,
} from 'lucide-react'
import { useStoreDashboard } from '@/contexts/store-dashboard-context'
import { createClient } from '@/lib/supabase/client'
import {
    storeProductsService,
    UnifiedStoreProduct,
    MasterProduct,
    ProductApprovalStatus,
} from '@/lib/services/store-products'
import { taxonomyService, ProductCategory, ProductBrand } from '@/lib/services/taxonomy'
import { CreatableSelect, SelectOption } from '@/components/ui/creatable-select'

const getStatusBadge = (quantity: number, lowThreshold: number, isAvailable: boolean) => {
    if (!isAvailable) {
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Inactive</Badge>
    }
    if (quantity === 0) {
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Out of Stock</Badge>
    }
    if (quantity <= lowThreshold) {
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Low Stock</Badge>
    }
    return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">In Stock</Badge>
}

const getApprovalBadge = (status: ProductApprovalStatus, source: 'master' | 'custom') => {
    if (source === 'master') {
        return (
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                <Globe className="h-3 w-3 mr-1" />
                Catalog
            </Badge>
        )
    }

    switch (status) {
        case 'draft':
            return (
                <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                    <FileText className="h-3 w-3 mr-1" />
                    Draft
                </Badge>
            )
        case 'pending_review':
            return (
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                </Badge>
            )
        case 'approved':
            return (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Approved
                </Badge>
            )
        case 'rejected':
            return (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                    <XCircle className="h-3 w-3 mr-1" />
                    Rejected
                </Badge>
            )
        case 'promoted':
            return (
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                    <ArrowUpCircle className="h-3 w-3 mr-1" />
                    Promoted
                </Badge>
            )
        default:
            return (
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                    <Store className="h-3 w-3 mr-1" />
                    Custom
                </Badge>
            )
    }
}

export default function ProductsPage() {
    const { currentStore, isLoading: storeLoading } = useStoreDashboard()
    const [products, setProducts] = useState<UnifiedStoreProduct[]>([])
    const [masterCatalog, setMasterCatalog] = useState<MasterProduct[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('')
    const [catalogSearch, setCatalogSearch] = useState('')
    const [catalogCategory, setCatalogCategory] = useState('')
    const [storeId, setStoreId] = useState<string | null>(null)

    // Taxonomy data
    const [categories, setCategories] = useState<ProductCategory[]>([])
    const [brands, setBrands] = useState<ProductBrand[]>([])

    // Convert to select options
    const categoryOptions: SelectOption[] = categories.map(c => ({ value: c.id, label: c.name }))
    const brandOptions: SelectOption[] = brands.map(b => ({ value: b.id, label: b.name }))
    const categoryFilterOptions: SelectOption[] = [
        { value: '', label: 'All Categories' },
        ...categoryOptions
    ]

    // Dialog states
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [addMode, setAddMode] = useState<'catalog' | 'custom'>('catalog')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedMasterProduct, setSelectedMasterProduct] = useState<MasterProduct | null>(null)
    const [selectedProduct, setSelectedProduct] = useState<UnifiedStoreProduct | null>(null)

    // Edit form state for store inventory
    const [editInventoryForm, setEditInventoryForm] = useState({
        price: '',
        cost: '',
        quantity: '',
        low_stock_threshold: '',
        is_available: true,
    })

    // Custom product form
    const [customForm, setCustomForm] = useState({
        sku: '',
        name: '',
        brand: '',
        category: '',
        description: '',
        price: '',
        cost: '',
        quantity: '',
    })

    // Import form
    const [importForm, setImportForm] = useState({
        price: '',
        cost: '',
        quantity: '',
    })

    // Fetch store ID from tenant
    useEffect(() => {
        async function fetchStoreId() {
            if (!currentStore?.id) return

            const supabase = createClient()
            const { data } = await supabase
                .from('stores')
                .select('id')
                .eq('tenant_id', currentStore.id)
                .single()

            if (data) {
                setStoreId(data.id)
            }
        }

        fetchStoreId()
    }, [currentStore?.id])

    // Fetch products
    const fetchProducts = useCallback(async () => {
        if (!storeId) return

        setIsLoading(true)
        try {
            const data = await storeProductsService.getStoreProducts(storeId)
            setProducts(data)
        } catch (error) {
            console.error('Error fetching products:', error)
        } finally {
            setIsLoading(false)
        }
    }, [storeId])

    // Fetch master catalog
    const fetchMasterCatalog = useCallback(async () => {
        try {
            // Find category name from ID for filtering
            const categoryName = catalogCategory ? categories.find(c => c.id === catalogCategory)?.name : undefined
            const data = await storeProductsService.getMasterCatalog(catalogSearch || undefined, categoryName)
            setMasterCatalog(data)
        } catch (error) {
            console.error('Error fetching master catalog:', error)
        }
    }, [catalogSearch, catalogCategory, categories])

    // Fetch taxonomy (categories and brands)
    const fetchTaxonomy = useCallback(async () => {
        try {
            const [cats, brds] = await Promise.all([
                taxonomyService.getCategories(),
                taxonomyService.getBrands()
            ])
            setCategories(cats)
            setBrands(brds)
        } catch (error) {
            console.error('Error fetching taxonomy:', error)
        }
    }, [])

    useEffect(() => {
        fetchTaxonomy()
    }, [fetchTaxonomy])

    useEffect(() => {
        fetchProducts()
    }, [fetchProducts])

    useEffect(() => {
        if (isAddDialogOpen && addMode === 'catalog') {
            fetchMasterCatalog()
        }
    }, [isAddDialogOpen, addMode, fetchMasterCatalog])

    // Filter products
    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.sku.toLowerCase().includes(searchQuery.toLowerCase())
        // Find the category name from ID for comparison
        const selectedCategoryName = selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : undefined
        const matchesCategory = !selectedCategory || product.category === selectedCategoryName
        return matchesSearch && matchesCategory
    })

    // Stats
    const totalProducts = products.length
    const catalogProducts = products.filter(p => p.product_source === 'master').length
    const customProducts = products.filter(p => p.product_source === 'custom').length
    const pendingApproval = products.filter(p => p.approval_status === 'pending_review').length

    // Handle import from catalog
    const handleImportFromCatalog = async () => {
        if (!selectedMasterProduct || !storeId) return

        setIsSubmitting(true)
        try {
            await storeProductsService.importFromCatalog({
                store_id: storeId,
                product_id: selectedMasterProduct.id,
                price: parseFloat(importForm.price),
                cost: importForm.cost ? parseFloat(importForm.cost) : undefined,
                quantity: parseInt(importForm.quantity),
            })

            await fetchProducts()
            setIsAddDialogOpen(false)
            setSelectedMasterProduct(null)
            setImportForm({ price: '', cost: '', quantity: '' })
        } catch (error) {
            console.error('Error importing product:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Handle create custom product
    const handleCreateCustomProduct = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!storeId) return

        // Get category and brand names from IDs
        const categoryName = categories.find(c => c.id === customForm.category)?.name || customForm.category
        const brandName = brands.find(b => b.id === customForm.brand)?.name || customForm.brand

        setIsSubmitting(true)
        try {
            await storeProductsService.createCustomProduct({
                store_id: storeId,
                sku: customForm.sku,
                name: customForm.name,
                brand: brandName || undefined,
                category: categoryName,
                description: customForm.description || undefined,
                price: parseFloat(customForm.price),
                cost: customForm.cost ? parseFloat(customForm.cost) : undefined,
                quantity: parseInt(customForm.quantity),
            })

            await fetchProducts()
            setIsAddDialogOpen(false)
            setCustomForm({
                sku: '',
                name: '',
                brand: '',
                category: '',
                description: '',
                price: '',
                cost: '',
                quantity: '',
            })
        } catch (error) {
            console.error('Error creating custom product:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Handle submit for review
    const handleSubmitForReview = async (productId: string) => {
        try {
            await storeProductsService.submitForReview(productId)
            await fetchProducts()
        } catch (error) {
            console.error('Error submitting for review:', error)
        }
    }

    // Handle remove from store
    const handleRemoveFromStore = async (product: UnifiedStoreProduct) => {
        try {
            if (product.product_source === 'master') {
                await storeProductsService.removeFromStore(product.inventory_id)
            } else if (product.approval_status === 'draft') {
                await storeProductsService.deleteCustomProduct(product.inventory_id)
            }
            await fetchProducts()
        } catch (error) {
            console.error('Error removing product:', error)
        }
    }

    // Handle view product
    const handleViewProduct = (product: UnifiedStoreProduct) => {
        setSelectedProduct(product)
        setIsViewDialogOpen(true)
    }

    // Handle edit product - open dialog with inventory form
    const handleEditProduct = (product: UnifiedStoreProduct) => {
        setSelectedProduct(product)
        setEditInventoryForm({
            price: String(product.price),
            cost: product.cost ? String(product.cost) : '',
            quantity: String(product.quantity),
            low_stock_threshold: String(product.low_stock_threshold),
            is_available: product.is_available,
        })
        setIsEditDialogOpen(true)
    }

    // Handle save inventory edit
    const handleSaveInventoryEdit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedProduct) return

        setIsSubmitting(true)
        try {
            const updates = {
                price: parseFloat(editInventoryForm.price),
                cost: editInventoryForm.cost ? parseFloat(editInventoryForm.cost) : undefined,
                quantity: parseInt(editInventoryForm.quantity),
                low_stock_threshold: parseInt(editInventoryForm.low_stock_threshold),
                is_available: editInventoryForm.is_available,
            }

            const productSource = selectedProduct.product_source

            // Use different service method based on product source
            if (productSource === 'master') {
                // Master products use store_inventories table
                await storeProductsService.updateInventory(selectedProduct.inventory_id, updates)
            } else {
                // Custom products use store_custom_products table
                await storeProductsService.updateCustomProduct(selectedProduct.inventory_id, updates)
            }

            await fetchProducts()
            setIsEditDialogOpen(false)
            setSelectedProduct(null)
        } catch (error) {
            console.error('Error updating inventory:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (storeLoading || isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Products</h1>
                    <p className="text-gray-400 mt-1">
                        Manage your store's product catalog
                    </p>
                </div>
                <Button
                    className="bg-orange-600 hover:bg-orange-700"
                    onClick={() => setIsAddDialogOpen(true)}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                </Button>
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
                                <p className="text-2xl font-bold text-white">{totalProducts}</p>
                                <p className="text-sm text-gray-400">Total Products</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600/20 rounded-lg">
                                <Globe className="h-5 w-5 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{catalogProducts}</p>
                                <p className="text-sm text-gray-400">From Catalog</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-600/20 rounded-lg">
                                <Store className="h-5 w-5 text-purple-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{customProducts}</p>
                                <p className="text-sm text-gray-400">Custom Products</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-600/20 rounded-lg">
                                <Clock className="h-5 w-5 text-yellow-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{pendingApproval}</p>
                                <p className="text-sm text-gray-400">Pending Approval</p>
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
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-gray-800 border-gray-700 text-white"
                            />
                        </div>
                        <Select value={selectedCategory || "all"} onValueChange={(v) => setSelectedCategory(v === "all" ? "" : v)}>
                            <SelectTrigger className="w-full sm:w-48 bg-gray-800 border-gray-700 text-white">
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-gray-800">
                                <SelectItem value="all" className="text-white">All Categories</SelectItem>
                                {categories.map(cat => (
                                    <SelectItem key={cat.id} value={cat.id} className="text-white">
                                        {cat.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
                            <Filter className="h-4 w-4 mr-2" />
                            More Filters
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Products Table */}
            <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-gray-800 hover:bg-transparent">
                                <TableHead className="text-gray-400">Product</TableHead>
                                <TableHead className="text-gray-400">SKU</TableHead>
                                <TableHead className="text-gray-400">Source</TableHead>
                                <TableHead className="text-gray-400">Price</TableHead>
                                <TableHead className="text-gray-400">Stock</TableHead>
                                <TableHead className="text-gray-400">Status</TableHead>
                                <TableHead className="text-gray-400 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProducts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                                        No products found. Add products from the master catalog or create custom ones.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredProducts.map((product) => (
                                    <TableRow key={product.inventory_id} className="border-gray-800 hover:bg-gray-800/50">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-gray-800 rounded-lg flex items-center justify-center">
                                                    {product.thumbnail_url ? (
                                                        <img
                                                            src={product.thumbnail_url}
                                                            alt={product.name}
                                                            className="h-10 w-10 rounded-lg object-cover"
                                                        />
                                                    ) : (
                                                        <Package className="h-5 w-5 text-gray-500" />
                                                    )}
                                                </div>
                                                <div>
                                                    <span className="font-medium text-white">{product.name}</span>
                                                    {product.brand && (
                                                        <p className="text-xs text-gray-400">{product.brand}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-400">{product.sku}</TableCell>
                                        <TableCell>
                                            {getApprovalBadge(product.approval_status, product.product_source)}
                                        </TableCell>
                                        <TableCell className="text-white font-medium">
                                            ${product.price.toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-white">{product.quantity}</TableCell>
                                        <TableCell>
                                            {getStatusBadge(product.quantity, product.low_stock_threshold, product.is_available)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-gray-900 border-gray-800">
                                                    <DropdownMenuItem
                                                        className="text-white focus:bg-gray-800"
                                                        onClick={() => handleViewProduct(product)}
                                                    >
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        View
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-white focus:bg-gray-800"
                                                        onClick={() => handleEditProduct(product)}
                                                    >
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Edit
                                                    </DropdownMenuItem>

                                                    {/* Custom product actions */}
                                                    {product.product_source === 'custom' && (
                                                        <>
                                                            {(product.approval_status === 'draft' || product.approval_status === 'rejected') && (
                                                                <DropdownMenuItem
                                                                    className="text-yellow-400 focus:bg-gray-800"
                                                                    onClick={() => handleSubmitForReview(product.inventory_id)}
                                                                >
                                                                    <Send className="mr-2 h-4 w-4" />
                                                                    Submit for Review
                                                                </DropdownMenuItem>
                                                            )}
                                                            {product.approval_status === 'rejected' && (
                                                                <DropdownMenuItem className="text-red-400 focus:bg-gray-800">
                                                                    <AlertCircle className="mr-2 h-4 w-4" />
                                                                    View Rejection Reason
                                                                </DropdownMenuItem>
                                                            )}
                                                        </>
                                                    )}

                                                    <DropdownMenuSeparator className="bg-gray-800" />
                                                    <DropdownMenuItem
                                                        className="text-red-400 focus:bg-gray-800"
                                                        onClick={() => handleRemoveFromStore(product)}
                                                        disabled={
                                                            product.product_source === 'custom' &&
                                                            product.approval_status !== 'draft'
                                                        }
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        {product.product_source === 'master' ? 'Remove from Store' : 'Delete'}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Add Product Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="bg-gray-900 border-gray-800 max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-white">Add Product</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Import from the master catalog or create a custom product.
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs value={addMode} onValueChange={(v) => setAddMode(v as 'catalog' | 'custom')}>
                        <TabsList className="bg-gray-800 border-gray-700">
                            <TabsTrigger value="catalog" className="data-[state=active]:bg-orange-600">
                                <Download className="h-4 w-4 mr-2" />
                                Import from Catalog
                            </TabsTrigger>
                            <TabsTrigger value="custom" className="data-[state=active]:bg-orange-600">
                                <Plus className="h-4 w-4 mr-2" />
                                Create Custom
                            </TabsTrigger>
                        </TabsList>

                        {/* Import from Catalog Tab */}
                        <TabsContent value="catalog" className="mt-4">
                            {selectedMasterProduct ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg">
                                        <div className="h-16 w-16 bg-gray-700 rounded-lg flex items-center justify-center">
                                            {selectedMasterProduct.thumbnail_url ? (
                                                <img
                                                    src={selectedMasterProduct.thumbnail_url}
                                                    alt={selectedMasterProduct.name}
                                                    className="h-16 w-16 rounded-lg object-cover"
                                                />
                                            ) : (
                                                <Package className="h-8 w-8 text-gray-500" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-medium text-white">{selectedMasterProduct.name}</h3>
                                            <p className="text-sm text-gray-400">
                                                {selectedMasterProduct.brand} | {selectedMasterProduct.category}
                                            </p>
                                            <p className="text-xs text-gray-500">SKU: {selectedMasterProduct.sku}</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSelectedMasterProduct(null)}
                                            className="text-gray-400"
                                        >
                                            Change
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-gray-300">Your Price ($) *</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={importForm.price}
                                                onChange={(e) => setImportForm(f => ({ ...f, price: e.target.value }))}
                                                className="bg-gray-800 border-gray-700 text-white"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-gray-300">Cost ($)</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={importForm.cost}
                                                onChange={(e) => setImportForm(f => ({ ...f, cost: e.target.value }))}
                                                className="bg-gray-800 border-gray-700 text-white"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-gray-300">Initial Quantity *</Label>
                                            <Input
                                                type="number"
                                                value={importForm.quantity}
                                                onChange={(e) => setImportForm(f => ({ ...f, quantity: e.target.value }))}
                                                className="bg-gray-800 border-gray-700 text-white"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <DialogFooter>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setSelectedMasterProduct(null)
                                                setImportForm({ price: '', cost: '', quantity: '' })
                                            }}
                                            className="border-gray-700 text-gray-300"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleImportFromCatalog}
                                            className="bg-orange-600 hover:bg-orange-700"
                                            disabled={isSubmitting || !importForm.price || !importForm.quantity}
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Importing...
                                                </>
                                            ) : (
                                                <>
                                                    <Download className="h-4 w-4 mr-2" />
                                                    Import Product
                                                </>
                                            )}
                                        </Button>
                                    </DialogFooter>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <Input
                                                placeholder="Search catalog..."
                                                value={catalogSearch}
                                                onChange={(e) => setCatalogSearch(e.target.value)}
                                                className="pl-10 bg-gray-800 border-gray-700 text-white"
                                            />
                                        </div>
                                        <Select value={catalogCategory || "all"} onValueChange={(v) => setCatalogCategory(v === "all" ? "" : v)}>
                                            <SelectTrigger className="w-48 bg-gray-800 border-gray-700 text-white">
                                                <SelectValue placeholder="All Categories" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-gray-900 border-gray-800">
                                                <SelectItem value="all" className="text-white">All Categories</SelectItem>
                                                {categories.map(cat => (
                                                    <SelectItem key={cat.id} value={cat.id} className="text-white">
                                                        {cat.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="max-h-96 overflow-y-auto space-y-2">
                                        {masterCatalog.length === 0 ? (
                                            <p className="text-center py-8 text-gray-400">
                                                No products found in the master catalog.
                                            </p>
                                        ) : (
                                            masterCatalog.map((product) => {
                                                const alreadyImported = products.some(
                                                    p => p.product_id === product.id
                                                )
                                                return (
                                                    <div
                                                        key={product.id}
                                                        className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${alreadyImported
                                                            ? 'bg-gray-800/50 border-gray-700 opacity-50'
                                                            : 'bg-gray-800 border-gray-700 hover:border-orange-500 cursor-pointer'
                                                            }`}
                                                        onClick={() => !alreadyImported && setSelectedMasterProduct(product)}
                                                    >
                                                        <div className="h-12 w-12 bg-gray-700 rounded-lg flex items-center justify-center">
                                                            {product.thumbnail_url ? (
                                                                <img
                                                                    src={product.thumbnail_url}
                                                                    alt={product.name}
                                                                    className="h-12 w-12 rounded-lg object-cover"
                                                                />
                                                            ) : (
                                                                <Package className="h-6 w-6 text-gray-500" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="font-medium text-white">{product.name}</h4>
                                                            <p className="text-sm text-gray-400">
                                                                {product.brand} | {product.category}
                                                            </p>
                                                        </div>
                                                        {alreadyImported ? (
                                                            <Badge className="bg-green-500/20 text-green-400">
                                                                Already Added
                                                            </Badge>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="text-orange-400"
                                                            >
                                                                Select
                                                            </Button>
                                                        )}
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        {/* Create Custom Tab */}
                        <TabsContent value="custom" className="mt-4">
                            <form onSubmit={handleCreateCustomProduct} className="space-y-4">
                                <div className="p-4 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
                                    <div className="flex items-start gap-2">
                                        <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
                                        <div>
                                            <p className="text-sm text-yellow-400 font-medium">Custom products require approval</p>
                                            <p className="text-xs text-yellow-400/70">
                                                Your product will be reviewed by the platform team before it becomes available for sale.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-gray-300">Product Name *</Label>
                                        <Input
                                            value={customForm.name}
                                            onChange={(e) => setCustomForm(f => ({ ...f, name: e.target.value }))}
                                            placeholder="e.g., Johnnie Walker Blue Label"
                                            className="bg-gray-800 border-gray-700 text-white"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-gray-300">SKU *</Label>
                                        <Input
                                            value={customForm.sku}
                                            onChange={(e) => setCustomForm(f => ({ ...f, sku: e.target.value }))}
                                            placeholder="e.g., JW-BL-750"
                                            className="bg-gray-800 border-gray-700 text-white"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-gray-300">Category *</Label>
                                        <CreatableSelect
                                            options={categoryOptions}
                                            value={customForm.category}
                                            onValueChange={(v) => setCustomForm(f => ({ ...f, category: v }))}
                                            placeholder="Select category"
                                            searchPlaceholder="Search categories..."
                                            emptyMessage="No categories found."
                                            createLabel="Create new category"
                                            createDialogTitle="Create New Category"
                                            createDialogDescription="Add a new category to the catalog."
                                            onCreateNew={async (name, description) => {
                                                const newCat = await taxonomyService.createCategory({ name, description })
                                                await fetchTaxonomy()
                                                return { value: newCat.id, label: newCat.name }
                                            }}
                                            showDescription
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-gray-300">Brand</Label>
                                        <CreatableSelect
                                            options={brandOptions}
                                            value={customForm.brand}
                                            onValueChange={(v) => setCustomForm(f => ({ ...f, brand: v }))}
                                            placeholder="Select or create brand"
                                            searchPlaceholder="Search brands..."
                                            emptyMessage="No brands found."
                                            createLabel="Create new brand"
                                            createDialogTitle="Create New Brand"
                                            createDialogDescription="Add a new brand to the catalog."
                                            onCreateNew={async (name, description) => {
                                                const newBrand = await taxonomyService.createBrand({ name, description })
                                                await fetchTaxonomy()
                                                return { value: newBrand.id, label: newBrand.name }
                                            }}
                                            showDescription
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-gray-300">Price ($) *</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={customForm.price}
                                            onChange={(e) => setCustomForm(f => ({ ...f, price: e.target.value }))}
                                            placeholder="0.00"
                                            className="bg-gray-800 border-gray-700 text-white"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-gray-300">Cost ($)</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={customForm.cost}
                                            onChange={(e) => setCustomForm(f => ({ ...f, cost: e.target.value }))}
                                            placeholder="0.00"
                                            className="bg-gray-800 border-gray-700 text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-gray-300">Initial Quantity *</Label>
                                        <Input
                                            type="number"
                                            value={customForm.quantity}
                                            onChange={(e) => setCustomForm(f => ({ ...f, quantity: e.target.value }))}
                                            placeholder="0"
                                            className="bg-gray-800 border-gray-700 text-white"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-gray-300">Description</Label>
                                    <Textarea
                                        value={customForm.description}
                                        onChange={(e) => setCustomForm(f => ({ ...f, description: e.target.value }))}
                                        placeholder="Product description..."
                                        className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-gray-300">Product Image</Label>
                                    <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-gray-600 transition-colors cursor-pointer">
                                        <ImagePlus className="h-10 w-10 mx-auto text-gray-500" />
                                        <p className="mt-2 text-sm text-gray-400">
                                            Drag and drop or click to upload
                                        </p>
                                        <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                                    </div>
                                </div>

                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsAddDialogOpen(false)}
                                        className="border-gray-700 text-gray-300"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="bg-orange-600 hover:bg-orange-700"
                                        disabled={isSubmitting || !customForm.name || !customForm.sku || !customForm.category || !customForm.price || !customForm.quantity}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="h-4 w-4 mr-2" />
                                                Create Product
                                            </>
                                        )}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

            {/* View Product Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-white">Product Details</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            View product and inventory information
                        </DialogDescription>
                    </DialogHeader>

                    {selectedProduct && (
                        <div className="space-y-6">
                            {/* Product Header */}
                            <div className="flex items-start gap-4 p-4 bg-gray-800 rounded-lg">
                                <div className="h-20 w-20 bg-gray-700 rounded-lg flex items-center justify-center">
                                    {selectedProduct.thumbnail_url ? (
                                        <img
                                            src={selectedProduct.thumbnail_url}
                                            alt={selectedProduct.name}
                                            className="h-20 w-20 rounded-lg object-cover"
                                        />
                                    ) : (
                                        <Package className="h-10 w-10 text-gray-500" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-medium text-white">{selectedProduct.name}</h3>
                                    <p className="text-sm text-gray-400">{selectedProduct.brand || 'No brand'}</p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        <Badge className="bg-purple-500/20 text-purple-400">
                                            {selectedProduct.category}
                                        </Badge>
                                        {getApprovalBadge(selectedProduct.approval_status, selectedProduct.product_source)}
                                        {getStatusBadge(selectedProduct.quantity, selectedProduct.low_stock_threshold, selectedProduct.is_available)}
                                    </div>
                                </div>
                            </div>

                            {/* Inventory Details */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-gray-300">SKU</Label>
                                    <p className="text-white">{selectedProduct.sku}</p>
                                </div>
                                <div>
                                    <Label className="text-gray-300">Price</Label>
                                    <p className="text-white font-semibold">${selectedProduct.price.toFixed(2)}</p>
                                </div>
                                <div>
                                    <Label className="text-gray-300">Cost</Label>
                                    <p className="text-white">{selectedProduct.cost ? `$${selectedProduct.cost.toFixed(2)}` : '-'}</p>
                                </div>
                                <div>
                                    <Label className="text-gray-300">Quantity in Stock</Label>
                                    <p className="text-white">{selectedProduct.quantity}</p>
                                </div>
                                <div>
                                    <Label className="text-gray-300">Low Stock Threshold</Label>
                                    <p className="text-white">{selectedProduct.low_stock_threshold}</p>
                                </div>
                                <div>
                                    <Label className="text-gray-300">Availability</Label>
                                    <p className="text-white">{selectedProduct.is_available ? 'Available' : 'Not Available'}</p>
                                </div>
                            </div>

                            {/* Profit Margin */}
                            {selectedProduct.cost && (
                                <div className="p-4 bg-gray-800/50 rounded-lg">
                                    <Label className="text-gray-300">Profit Margin</Label>
                                    <p className="text-xl font-bold text-green-400">
                                        ${(selectedProduct.price - selectedProduct.cost).toFixed(2)} ({((selectedProduct.price - selectedProduct.cost) / selectedProduct.price * 100).toFixed(1)}%)
                                    </p>
                                </div>
                            )}

                            {/* Description */}
                            {selectedProduct.description && (
                                <div>
                                    <Label className="text-gray-300">Description</Label>
                                    <p className="mt-1 text-sm text-gray-400">{selectedProduct.description}</p>
                                </div>
                            )}

                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setIsViewDialogOpen(false)
                                        setSelectedProduct(null)
                                    }}
                                    className="border-gray-700 text-gray-300"
                                >
                                    Close
                                </Button>
                                <Button
                                    onClick={() => {
                                        setIsViewDialogOpen(false)
                                        handleEditProduct(selectedProduct)
                                    }}
                                    className="bg-orange-600 hover:bg-orange-700"
                                >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Inventory
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Edit Inventory Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="bg-gray-900 border-gray-800 max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-white">Edit Product Inventory</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Update pricing and stock information
                        </DialogDescription>
                    </DialogHeader>

                    {selectedProduct && (
                        <form onSubmit={handleSaveInventoryEdit} className="space-y-4">
                            {/* Product Info */}
                            <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                                <div className="h-12 w-12 bg-gray-700 rounded-lg flex items-center justify-center">
                                    {selectedProduct.thumbnail_url ? (
                                        <img
                                            src={selectedProduct.thumbnail_url}
                                            alt={selectedProduct.name}
                                            className="h-12 w-12 rounded-lg object-cover"
                                        />
                                    ) : (
                                        <Package className="h-6 w-6 text-gray-500" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-white">{selectedProduct.name}</p>
                                    <p className="text-xs text-gray-400">SKU: {selectedProduct.sku}</p>
                                </div>
                            </div>

                            {/* Price & Cost */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-gray-300">Price ($) *</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={editInventoryForm.price}
                                        onChange={(e) => setEditInventoryForm(f => ({ ...f, price: e.target.value }))}
                                        className="bg-gray-800 border-gray-700 text-white"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-gray-300">Cost ($)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={editInventoryForm.cost}
                                        onChange={(e) => setEditInventoryForm(f => ({ ...f, cost: e.target.value }))}
                                        className="bg-gray-800 border-gray-700 text-white"
                                    />
                                </div>
                            </div>

                            {/* Stock */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-gray-300">Quantity *</Label>
                                    <Input
                                        type="number"
                                        value={editInventoryForm.quantity}
                                        onChange={(e) => setEditInventoryForm(f => ({ ...f, quantity: e.target.value }))}
                                        className="bg-gray-800 border-gray-700 text-white"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-gray-300">Low Stock Alert</Label>
                                    <Input
                                        type="number"
                                        value={editInventoryForm.low_stock_threshold}
                                        onChange={(e) => setEditInventoryForm(f => ({ ...f, low_stock_threshold: e.target.value }))}
                                        className="bg-gray-800 border-gray-700 text-white"
                                    />
                                </div>
                            </div>

                            {/* Availability Toggle */}
                            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                                <div>
                                    <Label className="text-gray-300">Available for Sale</Label>
                                    <p className="text-xs text-gray-500">Enable or disable this product listing</p>
                                </div>
                                <Button
                                    type="button"
                                    variant={editInventoryForm.is_available ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setEditInventoryForm(f => ({ ...f, is_available: !f.is_available }))}
                                    className={editInventoryForm.is_available ? "bg-green-600 hover:bg-green-700" : "border-gray-700 text-gray-400"}
                                >
                                    {editInventoryForm.is_available ? 'Active' : 'Inactive'}
                                </Button>
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setIsEditDialogOpen(false)
                                        setSelectedProduct(null)
                                    }}
                                    className="border-gray-700 text-gray-300"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-orange-600 hover:bg-orange-700"
                                    disabled={isSubmitting || !editInventoryForm.price || !editInventoryForm.quantity}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Save Changes
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
