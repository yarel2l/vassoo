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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Plus,
    Search,
    Edit,
    Trash2,
    Loader2,
    Tag,
    Building2,
    ToggleLeft,
    ToggleRight,
} from 'lucide-react'
import {
    taxonomyService,
    ProductCategory,
    ProductBrand,
} from '@/lib/services/taxonomy'

export default function TaxonomyPage() {
    const [activeTab, setActiveTab] = useState('categories')
    const [categories, setCategories] = useState<ProductCategory[]>([])
    const [brands, setBrands] = useState<ProductBrand[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    // Dialog states
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
    const [isBrandDialogOpen, setIsBrandDialogOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null)
    const [editingBrand, setEditingBrand] = useState<ProductBrand | null>(null)

    // Form states
    const [categoryForm, setCategoryForm] = useState({
        name: '',
        description: '',
    })
    const [brandForm, setBrandForm] = useState({
        name: '',
        description: '',
        website_url: '',
    })

    // Fetch data
    const fetchCategories = useCallback(async () => {
        try {
            const data = await taxonomyService.getCategories(false)
            setCategories(data)
        } catch (error) {
            console.error('Error fetching categories:', error)
        }
    }, [])

    const fetchBrands = useCallback(async () => {
        try {
            const data = await taxonomyService.getBrands(false)
            setBrands(data)
        } catch (error) {
            console.error('Error fetching brands:', error)
        }
    }, [])

    useEffect(() => {
        setIsLoading(true)
        Promise.all([fetchCategories(), fetchBrands()])
            .finally(() => setIsLoading(false))
    }, [fetchCategories, fetchBrands])

    // Filter data
    const filteredCategories = categories.filter(cat =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    const filteredBrands = brands.filter(brand =>
        brand.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Handle create/edit category
    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        try {
            if (editingCategory) {
                await taxonomyService.updateCategory(editingCategory.id, {
                    name: categoryForm.name,
                    description: categoryForm.description || undefined,
                })
            } else {
                await taxonomyService.createCategory({
                    name: categoryForm.name,
                    description: categoryForm.description || undefined,
                })
            }
            await fetchCategories()
            setIsCategoryDialogOpen(false)
            setEditingCategory(null)
            setCategoryForm({ name: '', description: '' })
        } catch (error) {
            console.error('Error saving category:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Handle create/edit brand
    const handleSaveBrand = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        try {
            if (editingBrand) {
                await taxonomyService.updateBrand(editingBrand.id, {
                    name: brandForm.name,
                    description: brandForm.description || undefined,
                    website_url: brandForm.website_url || undefined,
                })
            } else {
                await taxonomyService.createBrand({
                    name: brandForm.name,
                    description: brandForm.description || undefined,
                    website_url: brandForm.website_url || undefined,
                })
            }
            await fetchBrands()
            setIsBrandDialogOpen(false)
            setEditingBrand(null)
            setBrandForm({ name: '', description: '', website_url: '' })
        } catch (error) {
            console.error('Error saving brand:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Handle toggle active
    const handleToggleCategoryActive = async (category: ProductCategory) => {
        try {
            await taxonomyService.toggleCategoryActive(category.id, !category.is_active)
            await fetchCategories()
        } catch (error) {
            console.error('Error toggling category:', error)
        }
    }

    const handleToggleBrandActive = async (brand: ProductBrand) => {
        try {
            await taxonomyService.toggleBrandActive(brand.id, !brand.is_active)
            await fetchBrands()
        } catch (error) {
            console.error('Error toggling brand:', error)
        }
    }

    // Handle delete
    const handleDeleteCategory = async (id: string) => {
        if (!confirm('Are you sure you want to delete this category?')) return
        try {
            await taxonomyService.deleteCategory(id)
            await fetchCategories()
        } catch (error) {
            console.error('Error deleting category:', error)
        }
    }

    const handleDeleteBrand = async (id: string) => {
        if (!confirm('Are you sure you want to delete this brand?')) return
        try {
            await taxonomyService.deleteBrand(id)
            await fetchBrands()
        } catch (error) {
            console.error('Error deleting brand:', error)
        }
    }

    // Open edit dialogs
    const openEditCategory = (category: ProductCategory) => {
        setEditingCategory(category)
        setCategoryForm({
            name: category.name,
            description: category.description || '',
        })
        setIsCategoryDialogOpen(true)
    }

    const openEditBrand = (brand: ProductBrand) => {
        setEditingBrand(brand)
        setBrandForm({
            name: brand.name,
            description: brand.description || '',
            website_url: brand.website_url || '',
        })
        setIsBrandDialogOpen(true)
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
                    <h1 className="text-2xl font-bold text-white">Categories & Brands</h1>
                    <p className="text-gray-400 mt-1">
                        Manage product categories and brands for the catalog
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-600/20 rounded-lg">
                                <Tag className="h-5 w-5 text-purple-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{categories.length}</p>
                                <p className="text-sm text-gray-400">Categories</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-600/20 rounded-lg">
                                <Tag className="h-5 w-5 text-green-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">
                                    {categories.filter(c => c.is_active).length}
                                </p>
                                <p className="text-sm text-gray-400">Active Categories</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600/20 rounded-lg">
                                <Building2 className="h-5 w-5 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{brands.length}</p>
                                <p className="text-sm text-gray-400">Brands</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-600/20 rounded-lg">
                                <Building2 className="h-5 w-5 text-green-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">
                                    {brands.filter(b => b.is_active).length}
                                </p>
                                <p className="text-sm text-gray-400">Active Brands</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex items-center justify-between gap-4">
                    <TabsList className="bg-gray-800 border-gray-700">
                        <TabsTrigger value="categories" className="data-[state=active]:bg-orange-600">
                            <Tag className="h-4 w-4 mr-2" />
                            Categories
                        </TabsTrigger>
                        <TabsTrigger value="brands" className="data-[state=active]:bg-orange-600">
                            <Building2 className="h-4 w-4 mr-2" />
                            Brands
                        </TabsTrigger>
                    </TabsList>
                    <div className="flex gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 w-64 bg-gray-800 border-gray-700 text-white"
                            />
                        </div>
                        {activeTab === 'categories' ? (
                            <Button
                                className="bg-orange-600 hover:bg-orange-700"
                                onClick={() => {
                                    setEditingCategory(null)
                                    setCategoryForm({ name: '', description: '' })
                                    setIsCategoryDialogOpen(true)
                                }}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Category
                            </Button>
                        ) : (
                            <Button
                                className="bg-orange-600 hover:bg-orange-700"
                                onClick={() => {
                                    setEditingBrand(null)
                                    setBrandForm({ name: '', description: '', website_url: '' })
                                    setIsBrandDialogOpen(true)
                                }}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Brand
                            </Button>
                        )}
                    </div>
                </div>

                {/* Categories Tab */}
                <TabsContent value="categories" className="mt-4">
                    <Card className="bg-gray-900 border-gray-800">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-gray-800 hover:bg-transparent">
                                        <TableHead className="text-gray-400">Name</TableHead>
                                        <TableHead className="text-gray-400">Slug</TableHead>
                                        <TableHead className="text-gray-400">Description</TableHead>
                                        <TableHead className="text-gray-400">Status</TableHead>
                                        <TableHead className="text-gray-400 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredCategories.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                                                No categories found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredCategories.map((category) => (
                                            <TableRow key={category.id} className="border-gray-800 hover:bg-gray-800/50">
                                                <TableCell className="font-medium text-white">
                                                    {category.name}
                                                </TableCell>
                                                <TableCell className="text-gray-400">{category.slug}</TableCell>
                                                <TableCell className="text-gray-400 max-w-xs truncate">
                                                    {category.description || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {category.is_active ? (
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
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleToggleCategoryActive(category)}
                                                            className="text-gray-400 hover:text-white"
                                                        >
                                                            {category.is_active ? (
                                                                <ToggleRight className="h-5 w-5 text-green-400" />
                                                            ) : (
                                                                <ToggleLeft className="h-5 w-5" />
                                                            )}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openEditCategory(category)}
                                                            className="text-gray-400 hover:text-white"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDeleteCategory(category.id)}
                                                            className="text-gray-400 hover:text-red-400"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Brands Tab */}
                <TabsContent value="brands" className="mt-4">
                    <Card className="bg-gray-900 border-gray-800">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-gray-800 hover:bg-transparent">
                                        <TableHead className="text-gray-400">Name</TableHead>
                                        <TableHead className="text-gray-400">Slug</TableHead>
                                        <TableHead className="text-gray-400">Website</TableHead>
                                        <TableHead className="text-gray-400">Status</TableHead>
                                        <TableHead className="text-gray-400 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredBrands.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                                                No brands found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredBrands.map((brand) => (
                                            <TableRow key={brand.id} className="border-gray-800 hover:bg-gray-800/50">
                                                <TableCell className="font-medium text-white">
                                                    {brand.name}
                                                </TableCell>
                                                <TableCell className="text-gray-400">{brand.slug}</TableCell>
                                                <TableCell className="text-gray-400">
                                                    {brand.website_url ? (
                                                        <a
                                                            href={brand.website_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-400 hover:underline"
                                                        >
                                                            {brand.website_url}
                                                        </a>
                                                    ) : (
                                                        '-'
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {brand.is_active ? (
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
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleToggleBrandActive(brand)}
                                                            className="text-gray-400 hover:text-white"
                                                        >
                                                            {brand.is_active ? (
                                                                <ToggleRight className="h-5 w-5 text-green-400" />
                                                            ) : (
                                                                <ToggleLeft className="h-5 w-5" />
                                                            )}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openEditBrand(brand)}
                                                            className="text-gray-400 hover:text-white"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDeleteBrand(brand.id)}
                                                            className="text-gray-400 hover:text-red-400"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
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

            {/* Category Dialog */}
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogContent className="bg-gray-900 border-gray-800">
                    <DialogHeader>
                        <DialogTitle className="text-white">
                            {editingCategory ? 'Edit Category' : 'Create Category'}
                        </DialogTitle>
                        <DialogDescription className="text-gray-400">
                            {editingCategory ? 'Update the category details.' : 'Add a new product category.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveCategory} className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-gray-300">Name *</Label>
                            <Input
                                value={categoryForm.name}
                                onChange={(e) => setCategoryForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="e.g., Whisky"
                                className="bg-gray-800 border-gray-700 text-white"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-300">Description</Label>
                            <Textarea
                                value={categoryForm.description}
                                onChange={(e) => setCategoryForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="Category description..."
                                className="bg-gray-800 border-gray-700 text-white"
                            />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCategoryDialogOpen(false)}
                                className="border-gray-700 text-gray-300"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-orange-600 hover:bg-orange-700"
                                disabled={isSubmitting || !categoryForm.name}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    editingCategory ? 'Update' : 'Create'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Brand Dialog */}
            <Dialog open={isBrandDialogOpen} onOpenChange={setIsBrandDialogOpen}>
                <DialogContent className="bg-gray-900 border-gray-800">
                    <DialogHeader>
                        <DialogTitle className="text-white">
                            {editingBrand ? 'Edit Brand' : 'Create Brand'}
                        </DialogTitle>
                        <DialogDescription className="text-gray-400">
                            {editingBrand ? 'Update the brand details.' : 'Add a new product brand.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveBrand} className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-gray-300">Name *</Label>
                            <Input
                                value={brandForm.name}
                                onChange={(e) => setBrandForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="e.g., Johnnie Walker"
                                className="bg-gray-800 border-gray-700 text-white"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-300">Description</Label>
                            <Textarea
                                value={brandForm.description}
                                onChange={(e) => setBrandForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="Brand description..."
                                className="bg-gray-800 border-gray-700 text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-300">Website URL</Label>
                            <Input
                                value={brandForm.website_url}
                                onChange={(e) => setBrandForm(f => ({ ...f, website_url: e.target.value }))}
                                placeholder="https://www.example.com"
                                className="bg-gray-800 border-gray-700 text-white"
                            />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsBrandDialogOpen(false)}
                                className="border-gray-700 text-gray-300"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-orange-600 hover:bg-orange-700"
                                disabled={isSubmitting || !brandForm.name}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    editingBrand ? 'Update' : 'Create'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
