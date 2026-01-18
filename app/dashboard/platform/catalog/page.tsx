'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
    MoreHorizontal,
    Edit,
    Trash2,
    Eye,
    Package,
    ImagePlus,
    Loader2,
    CheckCircle,
    XCircle,
    Clock,
    ArrowUpCircle,
    Store,
    Globe,
    AlertTriangle,
    X,
    Upload,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import {
    platformProductsService,
    MasterProduct,
    StoreCustomProduct,
} from '@/lib/services/store-products'
import { taxonomyService, ProductCategory, ProductBrand } from '@/lib/services/taxonomy'
import { CreatableSelect, SelectOption } from '@/components/ui/creatable-select'
import { storageService } from '@/lib/services/storage'

export default function CatalogPage() {
    const { user } = useAuth()
    const [activeTab, setActiveTab] = useState('master')
    const [masterProducts, setMasterProducts] = useState<MasterProduct[]>([])
    const [pendingProducts, setPendingProducts] = useState<(StoreCustomProduct & { store_name: string })[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('')

    // Taxonomy data
    const [categories, setCategories] = useState<ProductCategory[]>([])
    const [brands, setBrands] = useState<ProductBrand[]>([])

    // Convert to select options
    const categoryOptions: SelectOption[] = categories.map(c => ({ value: c.id, label: c.name }))
    const brandOptions: SelectOption[] = brands.map(b => ({ value: b.id, label: b.name }))

    // Dialog states
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false)
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState<(StoreCustomProduct & { store_name: string }) | null>(null)
    const [selectedMasterProduct, setSelectedMasterProduct] = useState<MasterProduct | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [rejectionReason, setRejectionReason] = useState('')

    // Edit form state
    const [editForm, setEditForm] = useState({
        name: '',
        brand: '',
        category: '',
        subcategory: '',
        description: '',
        age_restriction: '21',
    })

    // Image upload states for edit dialog
    const [editImages, setEditImages] = useState<string[]>([])
    const [editThumbnail, setEditThumbnail] = useState<string | null>(null)
    const [newImageFiles, setNewImageFiles] = useState<File[]>([])
    const [isUploadingImages, setIsUploadingImages] = useState(false)

    // New product form
    const [productForm, setProductForm] = useState({
        sku: '',
        name: '',
        brand: '',
        category: '',
        subcategory: '',
        description: '',
        age_restriction: '21',
    })

    // Fetch data
    const fetchMasterProducts = useCallback(async () => {
        try {
            const data = await platformProductsService.getAllMasterProducts()
            setMasterProducts(data)
        } catch (error) {
            console.error('Error fetching master products:', error)
        }
    }, [])

    const fetchPendingProducts = useCallback(async () => {
        try {
            const data = await platformProductsService.getPendingProducts()
            setPendingProducts(data)
        } catch (error) {
            console.error('Error fetching pending products:', error)
        }
    }, [])

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
        setIsLoading(true)
        Promise.all([fetchMasterProducts(), fetchPendingProducts(), fetchTaxonomy()])
            .finally(() => setIsLoading(false))
    }, [fetchMasterProducts, fetchPendingProducts, fetchTaxonomy])

    // Filter master products
    const filteredMasterProducts = masterProducts.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (product.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
        const selectedCategoryName = selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : undefined
        const matchesCategory = !selectedCategory || product.category === selectedCategoryName
        return matchesSearch && matchesCategory
    })

    // Handle create master product
    const handleCreateMasterProduct = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        // Get category and brand names from IDs
        const categoryName = categories.find(c => c.id === productForm.category)?.name || productForm.category
        const brandName = brands.find(b => b.id === productForm.brand)?.name || productForm.brand

        try {
            await platformProductsService.createMasterProduct({
                sku: productForm.sku,
                name: productForm.name,
                brand: brandName || null,
                category: categoryName,
                subcategory: productForm.subcategory || null,
                description: productForm.description || null,
                age_restriction: parseInt(productForm.age_restriction) || 21,
                upc: null,
                tags: [],
                specifications: {},
                images: [],
                thumbnail_url: null,
                slug: null,
                is_active: true,
            })

            await fetchMasterProducts()
            setIsAddDialogOpen(false)
            setProductForm({
                sku: '',
                name: '',
                brand: '',
                category: '',
                subcategory: '',
                description: '',
                age_restriction: '21',
            })
        } catch (error) {
            console.error('Error creating master product:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Handle approve product
    const handleApproveProduct = async () => {
        if (!selectedProduct || !user?.id) return

        setIsSubmitting(true)
        try {
            await platformProductsService.approveProduct(selectedProduct.id, user.id)
            await fetchPendingProducts()
            setIsReviewDialogOpen(false)
            setSelectedProduct(null)
        } catch (error) {
            console.error('Error approving product:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Handle reject product
    const handleRejectProduct = async () => {
        if (!selectedProduct || !user?.id || !rejectionReason) return

        setIsSubmitting(true)
        try {
            await platformProductsService.rejectProduct(selectedProduct.id, user.id, rejectionReason)
            await fetchPendingProducts()
            setIsReviewDialogOpen(false)
            setSelectedProduct(null)
            setRejectionReason('')
        } catch (error) {
            console.error('Error rejecting product:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Handle promote to master
    const handlePromoteToMaster = async () => {
        if (!selectedProduct || !user?.id) return

        setIsSubmitting(true)
        try {
            await platformProductsService.promoteToMaster(selectedProduct.id, user.id)
            await Promise.all([fetchMasterProducts(), fetchPendingProducts()])
            setIsReviewDialogOpen(false)
            setSelectedProduct(null)
        } catch (error) {
            console.error('Error promoting product:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Handle deactivate master product
    const handleDeactivateMasterProduct = async (productId: string) => {
        try {
            await platformProductsService.deactivateMasterProduct(productId)
            await fetchMasterProducts()
        } catch (error) {
            console.error('Error deactivating product:', error)
        }
    }

    // Handle view master product
    const handleViewMasterProduct = (product: MasterProduct) => {
        setSelectedMasterProduct(product)
        setIsViewDialogOpen(true)
    }

    // Handle edit master product - open dialog with form
    const handleEditMasterProduct = (product: MasterProduct) => {
        setSelectedMasterProduct(product)
        // Find category and brand IDs from names
        const categoryId = categories.find(c => c.name === product.category)?.id || product.category
        const brandId = brands.find(b => b.name === product.brand)?.id || product.brand || ''

        setEditForm({
            name: product.name,
            brand: brandId,
            category: categoryId,
            subcategory: product.subcategory || '',
            description: product.description || '',
            age_restriction: String(product.age_restriction || 21),
        })
        // Initialize images from product
        setEditImages(product.images || [])
        setEditThumbnail(product.thumbnail_url || null)
        setNewImageFiles([])
        setIsEditDialogOpen(true)
    }

    // Handle save edit
    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedMasterProduct) return

        setIsSubmitting(true)
        try {
            // Get category and brand names from IDs
            const categoryName = categories.find(c => c.id === editForm.category)?.name || editForm.category
            const brandName = brands.find(b => b.id === editForm.brand)?.name || editForm.brand

            // Upload new images if any
            let finalImages = [...editImages]
            let finalThumbnail = editThumbnail

            if (newImageFiles.length > 0) {
                setIsUploadingImages(true)
                try {
                    const uploadResults = await storageService.uploadProductImages(
                        newImageFiles,
                        selectedMasterProduct.id
                    )
                    const newUrls = uploadResults.map(r => r.url)
                    finalImages = [...finalImages, ...newUrls]
                    // Set first image as thumbnail if none exists
                    if (!finalThumbnail && newUrls.length > 0) {
                        finalThumbnail = newUrls[0]
                    }
                } catch (uploadError) {
                    console.error('Error uploading images:', uploadError)
                } finally {
                    setIsUploadingImages(false)
                }
            }

            await platformProductsService.updateMasterProduct(selectedMasterProduct.id, {
                name: editForm.name,
                brand: brandName || null,
                category: categoryName,
                subcategory: editForm.subcategory || null,
                description: editForm.description || null,
                age_restriction: parseInt(editForm.age_restriction) || 21,
                thumbnail_url: finalThumbnail,
                images: finalImages,
            })

            await fetchMasterProducts()
            setIsEditDialogOpen(false)
            setSelectedMasterProduct(null)
            setNewImageFiles([])
        } catch (error) {
            console.error('Error updating product:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Handle file selection for edit dialog
    const handleEditImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files) return
        const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'))
        setNewImageFiles(prev => [...prev, ...fileArray])
    }

    // Handle removing an existing image
    const handleRemoveExistingImage = (imageUrl: string) => {
        setEditImages(prev => prev.filter(img => img !== imageUrl))
        if (editThumbnail === imageUrl) {
            // Set next available image as thumbnail, or null
            const remaining = editImages.filter(img => img !== imageUrl)
            setEditThumbnail(remaining[0] || null)
        }
    }

    // Handle removing a new image file (not yet uploaded)
    const handleRemoveNewImage = (index: number) => {
        setNewImageFiles(prev => prev.filter((_, i) => i !== index))
    }

    // Set an image as thumbnail
    const handleSetAsThumbnail = (imageUrl: string) => {
        setEditThumbnail(imageUrl)
    }

    if (isLoading) {
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
                    <h1 className="text-2xl font-bold text-white">Product Catalog</h1>
                    <p className="text-gray-400 mt-1">
                        Manage master catalog and approve store products
                    </p>
                </div>
                <Button
                    className="bg-orange-600 hover:bg-orange-700"
                    onClick={() => setIsAddDialogOpen(true)}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Master Product
                </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600/20 rounded-lg">
                                <Globe className="h-5 w-5 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{masterProducts.length}</p>
                                <p className="text-sm text-gray-400">Master Products</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-600/20 rounded-lg">
                                <CheckCircle className="h-5 w-5 text-green-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">
                                    {masterProducts.filter(p => p.is_active).length}
                                </p>
                                <p className="text-sm text-gray-400">Active Products</p>
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
                                <p className="text-2xl font-bold text-white">{pendingProducts.length}</p>
                                <p className="text-sm text-gray-400">Pending Approval</p>
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
                                <p className="text-2xl font-bold text-white">
                                    {new Set(masterProducts.map(p => p.category)).size}
                                </p>
                                <p className="text-sm text-gray-400">Categories</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-gray-800 border-gray-700">
                    <TabsTrigger value="master" className="data-[state=active]:bg-orange-600">
                        <Globe className="h-4 w-4 mr-2" />
                        Master Catalog
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="data-[state=active]:bg-orange-600">
                        <Clock className="h-4 w-4 mr-2" />
                        Pending Approval
                        {pendingProducts.length > 0 && (
                            <Badge className="ml-2 bg-yellow-600">{pendingProducts.length}</Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* Master Catalog Tab */}
                <TabsContent value="master" className="mt-4 space-y-4">
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
                                        <TableHead className="text-gray-400">Category</TableHead>
                                        <TableHead className="text-gray-400">Brand</TableHead>
                                        <TableHead className="text-gray-400">Status</TableHead>
                                        <TableHead className="text-gray-400 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredMasterProducts.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                                                No products found in the master catalog.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredMasterProducts.map((product) => (
                                            <TableRow key={product.id} className="border-gray-800 hover:bg-gray-800/50">
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
                                                        <span className="font-medium text-white">{product.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-gray-400">{product.sku}</TableCell>
                                                <TableCell className="text-gray-400">{product.category}</TableCell>
                                                <TableCell className="text-gray-400">{product.brand || '-'}</TableCell>
                                                <TableCell>
                                                    {product.is_active ? (
                                                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                                            Active
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                                                            Inactive
                                                        </Badge>
                                                    )}
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
                                                                onClick={() => handleViewMasterProduct(product)}
                                                            >
                                                                <Eye className="mr-2 h-4 w-4" />
                                                                View
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="text-white focus:bg-gray-800"
                                                                onClick={() => handleEditMasterProduct(product)}
                                                            >
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator className="bg-gray-800" />
                                                            <DropdownMenuItem
                                                                className="text-red-400 focus:bg-gray-800"
                                                                onClick={() => handleDeactivateMasterProduct(product.id)}
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                {product.is_active ? 'Deactivate' : 'Activate'}
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
                </TabsContent>

                {/* Pending Approval Tab */}
                <TabsContent value="pending" className="mt-4">
                    <Card className="bg-gray-900 border-gray-800">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-yellow-400" />
                                Products Pending Review
                            </CardTitle>
                            <CardDescription className="text-gray-400">
                                Review and approve custom products submitted by store owners
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-gray-800 hover:bg-transparent">
                                        <TableHead className="text-gray-400">Product</TableHead>
                                        <TableHead className="text-gray-400">Store</TableHead>
                                        <TableHead className="text-gray-400">Category</TableHead>
                                        <TableHead className="text-gray-400">Price</TableHead>
                                        <TableHead className="text-gray-400">Submitted</TableHead>
                                        <TableHead className="text-gray-400 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingProducts.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                                                No products pending approval.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        pendingProducts.map((product) => (
                                            <TableRow key={product.id} className="border-gray-800 hover:bg-gray-800/50">
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
                                                <TableCell>
                                                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                                                        <Store className="h-3 w-3 mr-1" />
                                                        {product.store_name}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-gray-400">{product.category}</TableCell>
                                                <TableCell className="text-white font-medium">
                                                    ${product.price.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-gray-400">
                                                    {product.submitted_at
                                                        ? new Date(product.submitted_at).toLocaleDateString()
                                                        : '-'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        size="sm"
                                                        className="bg-orange-600 hover:bg-orange-700"
                                                        onClick={() => {
                                                            setSelectedProduct(product)
                                                            setIsReviewDialogOpen(true)
                                                        }}
                                                    >
                                                        Review
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Add Master Product Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-white">Add Master Product</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Add a new product to the master catalog. All stores can import this product.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateMasterProduct} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-gray-300">Product Name *</Label>
                                <Input
                                    value={productForm.name}
                                    onChange={(e) => setProductForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="e.g., Johnnie Walker Blue Label"
                                    className="bg-gray-800 border-gray-700 text-white"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-300">SKU *</Label>
                                <Input
                                    value={productForm.sku}
                                    onChange={(e) => setProductForm(f => ({ ...f, sku: e.target.value }))}
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
                                    value={productForm.category}
                                    onValueChange={(v) => setProductForm(f => ({ ...f, category: v }))}
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
                                    value={productForm.brand}
                                    onValueChange={(v) => setProductForm(f => ({ ...f, brand: v }))}
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

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-gray-300">Subcategory</Label>
                                <Input
                                    value={productForm.subcategory}
                                    onChange={(e) => setProductForm(f => ({ ...f, subcategory: e.target.value }))}
                                    placeholder="e.g., Blended Scotch"
                                    className="bg-gray-800 border-gray-700 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-300">Age Restriction</Label>
                                <Select
                                    value={productForm.age_restriction}
                                    onValueChange={(v) => setProductForm(f => ({ ...f, age_restriction: v }))}
                                >
                                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-900 border-gray-800">
                                        <SelectItem value="0" className="text-white">None</SelectItem>
                                        <SelectItem value="18" className="text-white">18+</SelectItem>
                                        <SelectItem value="21" className="text-white">21+</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-gray-300">Description</Label>
                            <Textarea
                                value={productForm.description}
                                onChange={(e) => setProductForm(f => ({ ...f, description: e.target.value }))}
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
                                disabled={isSubmitting || !productForm.name || !productForm.sku || !productForm.category}
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
                </DialogContent>
            </Dialog>

            {/* Review Product Dialog */}
            <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
                <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-white">Review Custom Product</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Review and decide on this custom product submission.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedProduct && (
                        <div className="space-y-6">
                            {/* Product Details */}
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
                                    <div className="mt-2 flex gap-2">
                                        <Badge className="bg-purple-500/20 text-purple-400">
                                            {selectedProduct.category}
                                        </Badge>
                                        <Badge className="bg-blue-500/20 text-blue-400">
                                            ${selectedProduct.price.toFixed(2)}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            {/* Store Info */}
                            <div className="p-4 bg-gray-800/50 rounded-lg">
                                <p className="text-sm text-gray-400">Submitted by</p>
                                <p className="text-white font-medium">{selectedProduct.store_name}</p>
                                <p className="text-xs text-gray-500">
                                    {selectedProduct.submitted_at
                                        ? new Date(selectedProduct.submitted_at).toLocaleString()
                                        : 'Unknown date'}
                                </p>
                            </div>

                            {/* Description */}
                            {selectedProduct.description && (
                                <div>
                                    <Label className="text-gray-300">Description</Label>
                                    <p className="mt-1 text-sm text-gray-400">{selectedProduct.description}</p>
                                </div>
                            )}

                            {/* Product Details Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-gray-300">SKU</Label>
                                    <p className="text-white">{selectedProduct.sku}</p>
                                </div>
                                <div>
                                    <Label className="text-gray-300">UPC</Label>
                                    <p className="text-white">{selectedProduct.upc || '-'}</p>
                                </div>
                                <div>
                                    <Label className="text-gray-300">Quantity</Label>
                                    <p className="text-white">{selectedProduct.quantity}</p>
                                </div>
                                <div>
                                    <Label className="text-gray-300">Age Restriction</Label>
                                    <p className="text-white">{selectedProduct.age_restriction || 21}+</p>
                                </div>
                            </div>

                            {/* Rejection Reason */}
                            <div className="space-y-2">
                                <Label className="text-gray-300">Rejection Reason (if rejecting)</Label>
                                <Textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="Provide a reason for rejection..."
                                    className="bg-gray-800 border-gray-700 text-white"
                                />
                            </div>

                            <DialogFooter className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setIsReviewDialogOpen(false)
                                        setSelectedProduct(null)
                                        setRejectionReason('')
                                    }}
                                    className="border-gray-700 text-gray-300"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleRejectProduct}
                                    disabled={isSubmitting || !rejectionReason}
                                    className="border-red-700 text-red-400 hover:bg-red-900/20"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <XCircle className="h-4 w-4 mr-2" />
                                    )}
                                    Reject
                                </Button>
                                <Button
                                    onClick={handleApproveProduct}
                                    disabled={isSubmitting}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                    )}
                                    Approve
                                </Button>
                                <Button
                                    onClick={handlePromoteToMaster}
                                    disabled={isSubmitting}
                                    className="bg-purple-600 hover:bg-purple-700"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <ArrowUpCircle className="h-4 w-4 mr-2" />
                                    )}
                                    Approve & Promote
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* View Master Product Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-white">Product Details</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            View master product information
                        </DialogDescription>
                    </DialogHeader>

                    {selectedMasterProduct && (
                        <div className="space-y-6">
                            {/* Product Header */}
                            <div className="flex items-start gap-4 p-4 bg-gray-800 rounded-lg">
                                <div className="h-24 w-24 bg-gray-700 rounded-lg flex items-center justify-center">
                                    {selectedMasterProduct.thumbnail_url ? (
                                        <img
                                            src={selectedMasterProduct.thumbnail_url}
                                            alt={selectedMasterProduct.name}
                                            className="h-24 w-24 rounded-lg object-cover"
                                        />
                                    ) : (
                                        <Package className="h-12 w-12 text-gray-500" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-medium text-white">{selectedMasterProduct.name}</h3>
                                    <p className="text-sm text-gray-400">{selectedMasterProduct.brand || 'No brand'}</p>
                                    <div className="mt-2 flex gap-2">
                                        <Badge className="bg-purple-500/20 text-purple-400">
                                            {selectedMasterProduct.category}
                                        </Badge>
                                        {selectedMasterProduct.subcategory && (
                                            <Badge className="bg-blue-500/20 text-blue-400">
                                                {selectedMasterProduct.subcategory}
                                            </Badge>
                                        )}
                                        {selectedMasterProduct.is_active ? (
                                            <Badge className="bg-green-500/20 text-green-400">Active</Badge>
                                        ) : (
                                            <Badge className="bg-gray-500/20 text-gray-400">Inactive</Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Product Details Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-gray-300">SKU</Label>
                                    <p className="text-white">{selectedMasterProduct.sku}</p>
                                </div>
                                <div>
                                    <Label className="text-gray-300">UPC</Label>
                                    <p className="text-white">{selectedMasterProduct.upc || '-'}</p>
                                </div>
                                <div>
                                    <Label className="text-gray-300">Age Restriction</Label>
                                    <p className="text-white">{selectedMasterProduct.age_restriction || 21}+</p>
                                </div>
                                <div>
                                    <Label className="text-gray-300">Created</Label>
                                    <p className="text-white">
                                        {selectedMasterProduct.created_at
                                            ? new Date(selectedMasterProduct.created_at).toLocaleDateString()
                                            : '-'}
                                    </p>
                                </div>
                            </div>

                            {/* Description */}
                            {selectedMasterProduct.description && (
                                <div>
                                    <Label className="text-gray-300">Description</Label>
                                    <p className="mt-1 text-sm text-gray-400">{selectedMasterProduct.description}</p>
                                </div>
                            )}

                            {/* Tags */}
                            {selectedMasterProduct.tags && selectedMasterProduct.tags.length > 0 && (
                                <div>
                                    <Label className="text-gray-300">Tags</Label>
                                    <div className="mt-1 flex flex-wrap gap-2">
                                        {selectedMasterProduct.tags.map((tag, idx) => (
                                            <Badge key={idx} variant="outline" className="text-gray-300 border-gray-600">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setIsViewDialogOpen(false)
                                        setSelectedMasterProduct(null)
                                    }}
                                    className="border-gray-700 text-gray-300"
                                >
                                    Close
                                </Button>
                                <Button
                                    onClick={() => {
                                        setIsViewDialogOpen(false)
                                        handleEditMasterProduct(selectedMasterProduct)
                                    }}
                                    className="bg-orange-600 hover:bg-orange-700"
                                >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Product
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Edit Master Product Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-white">Edit Master Product</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Update product information in the master catalog
                        </DialogDescription>
                    </DialogHeader>

                    {selectedMasterProduct && (
                        <form onSubmit={handleSaveEdit} className="space-y-4">
                            <div className="flex items-center gap-4 p-3 bg-gray-800 rounded-lg">
                                <div className="h-12 w-12 bg-gray-700 rounded-lg flex items-center justify-center">
                                    {selectedMasterProduct.thumbnail_url ? (
                                        <img
                                            src={selectedMasterProduct.thumbnail_url}
                                            alt={selectedMasterProduct.name}
                                            className="h-12 w-12 rounded-lg object-cover"
                                        />
                                    ) : (
                                        <Package className="h-6 w-6 text-gray-500" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm text-gray-400">SKU: {selectedMasterProduct.sku}</p>
                                    <p className="text-xs text-gray-500">ID: {selectedMasterProduct.id}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-gray-300">Product Name *</Label>
                                <Input
                                    value={editForm.name}
                                    onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                                    className="bg-gray-800 border-gray-700 text-white"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-gray-300">Category *</Label>
                                    <CreatableSelect
                                        options={categoryOptions}
                                        value={editForm.category}
                                        onValueChange={(v) => setEditForm(f => ({ ...f, category: v }))}
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
                                        value={editForm.brand}
                                        onValueChange={(v) => setEditForm(f => ({ ...f, brand: v }))}
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

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-gray-300">Subcategory</Label>
                                    <Input
                                        value={editForm.subcategory}
                                        onChange={(e) => setEditForm(f => ({ ...f, subcategory: e.target.value }))}
                                        placeholder="e.g., Blended Scotch"
                                        className="bg-gray-800 border-gray-700 text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-gray-300">Age Restriction</Label>
                                    <Select
                                        value={editForm.age_restriction}
                                        onValueChange={(v) => setEditForm(f => ({ ...f, age_restriction: v }))}
                                    >
                                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-gray-900 border-gray-800">
                                            <SelectItem value="0" className="text-white">None</SelectItem>
                                            <SelectItem value="18" className="text-white">18+</SelectItem>
                                            <SelectItem value="21" className="text-white">21+</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-gray-300">Description</Label>
                                <Textarea
                                    value={editForm.description}
                                    onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Product description..."
                                    className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                                />
                            </div>

                            {/* Product Images Section */}
                            <div className="space-y-3">
                                <Label className="text-gray-300">Product Images</Label>

                                {/* Existing Images */}
                                {editImages.length > 0 && (
                                    <div className="grid grid-cols-4 gap-2">
                                        {editImages.map((imageUrl, index) => (
                                            <div
                                                key={index}
                                                className={`relative group rounded-lg overflow-hidden border-2 ${
                                                    editThumbnail === imageUrl
                                                        ? 'border-orange-500'
                                                        : 'border-gray-700'
                                                }`}
                                            >
                                                <img
                                                    src={imageUrl}
                                                    alt={`Product ${index + 1}`}
                                                    className="w-full h-20 object-cover"
                                                />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                                    {editThumbnail !== imageUrl && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSetAsThumbnail(imageUrl)}
                                                            className="p-1 bg-orange-600 rounded text-white text-xs"
                                                            title="Set as thumbnail"
                                                        >
                                                            Main
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveExistingImage(imageUrl)}
                                                        className="p-1 bg-red-600 rounded text-white"
                                                        title="Remove image"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </div>
                                                {editThumbnail === imageUrl && (
                                                    <div className="absolute top-1 left-1 bg-orange-600 text-white text-xs px-1 rounded">
                                                        Main
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* New Images (to be uploaded) */}
                                {newImageFiles.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs text-gray-400">New images to upload:</p>
                                        <div className="grid grid-cols-4 gap-2">
                                            {newImageFiles.map((file, index) => (
                                                <div
                                                    key={index}
                                                    className="relative group rounded-lg overflow-hidden border-2 border-dashed border-green-600"
                                                >
                                                    <img
                                                        src={URL.createObjectURL(file)}
                                                        alt={`New ${index + 1}`}
                                                        className="w-full h-20 object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveNewImage(index)}
                                                            className="p-1 bg-red-600 rounded text-white"
                                                            title="Remove image"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                    <div className="absolute top-1 left-1 bg-green-600 text-white text-xs px-1 rounded">
                                                        New
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Upload Zone */}
                                <label className="block border-2 border-dashed border-gray-700 rounded-lg p-4 text-center hover:border-gray-600 transition-colors cursor-pointer">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleEditImageSelect}
                                        className="hidden"
                                    />
                                    <Upload className="h-6 w-6 mx-auto text-gray-500" />
                                    <p className="mt-1 text-sm text-gray-400">
                                        Click to add images
                                    </p>
                                    <p className="text-xs text-gray-500">PNG, JPG up to 5MB each</p>
                                </label>

                                {isUploadingImages && (
                                    <div className="flex items-center gap-2 text-orange-400 text-sm">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Uploading images...
                                    </div>
                                )}
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setIsEditDialogOpen(false)
                                        setSelectedMasterProduct(null)
                                    }}
                                    className="border-gray-700 text-gray-300"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-orange-600 hover:bg-orange-700"
                                    disabled={isSubmitting || !editForm.name || !editForm.category}
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
