'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Package, Plus, Search, Filter, MoreVertical, Edit2, Trash2, ExternalLink, Tag, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import { ProductDialog } from './product-dialog'
import { TaxonomyDialog } from './taxonomy-dialog'
import { toast } from 'sonner'

interface Category {
    id: string
    name: string
    slug: string
    is_active: boolean
    image_url?: string
}

interface Brand {
    id: string
    name: string
    slug: string
    is_active: boolean
    logo_url?: string
}

interface MasterProduct {
    id: string
    name: string
    sku: string
    brand: string | null
    category: string
    subcategory: string | null
    thumbnail_url: string | null
    is_active: boolean
    created_at: string
    specifications?: any
    slug?: string
}

export default function MasterInventoryPage() {
    const [products, setProducts] = useState<MasterProduct[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [brands, setBrands] = useState<Brand[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    // Dialog states
    const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState<MasterProduct | undefined>(undefined)

    const [isTaxonomyDialogOpen, setIsTaxonomyDialogOpen] = useState(false)
    const [taxonomyType, setTaxonomyType] = useState<'category' | 'brand'>('category')
    const [selectedTaxonomy, setSelectedTaxonomy] = useState<any | undefined>(undefined)

    const fetchData = async () => {
        setIsLoading(true)
        const supabase = createClient()

        let productQuery = supabase
            .from('master_products')
            .select('*')
            .order('name', { ascending: true })

        if (searchQuery) {
            productQuery = productQuery.or(`name.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%`)
        }

        const { data: pData, error: pError } = await productQuery

        if (pError) {
            console.error('Error fetching master products:', pError)
            toast.error('Failed to load catalog')
        } else {
            // Ensure is_active is boolean and handle potential nulls
            const typedProducts = (pData as any[] || []).map(p => ({
                ...p,
                is_active: p.is_active ?? true
            }))
            setProducts(typedProducts)
        }

        const [catsRes, brandsRes] = await Promise.all([
            supabase.from('product_categories' as any).select('*').order('name'),
            supabase.from('product_brands' as any).select('*').order('name')
        ])

        if (catsRes.data) setCategories(catsRes.data as any)
        if (brandsRes.data) setBrands(brandsRes.data as any)

        setIsLoading(false)
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData()
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    const handleEditProduct = (product: MasterProduct) => {
        setSelectedProduct(product)
        setIsProductDialogOpen(true)
    }

    const handleCreateProduct = () => {
        setSelectedProduct(undefined)
        setIsProductDialogOpen(true)
    }

    const handleCreateTaxonomy = (type: 'category' | 'brand') => {
        setTaxonomyType(type)
        setSelectedTaxonomy(undefined)
        setIsTaxonomyDialogOpen(true)
    }

    const handleEditTaxonomy = (item: any, type: 'category' | 'brand') => {
        setTaxonomyType(type)
        setSelectedTaxonomy(item)
        setIsTaxonomyDialogOpen(true)
    }

    const handleDelete = async (id: string, table: string) => {
        if (!confirm(`Are you sure you want to delete this from ${table}?`)) return

        const supabase = createClient()
        const { error } = await supabase
            .from(table as any)
            .delete()
            .eq('id', id)

        if (error) {
            toast.error('Could not delete item')
        } else {
            toast.success('Item removed')
            fetchData()
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Master Catalog</h1>
                    <p className="text-neutral-400 text-sm">Manage global product definitions and taxonomy</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={handleCreateProduct}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New Product
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="products" className="w-full">
                <TabsList className="bg-neutral-900 border border-neutral-800 p-1 mb-6">
                    <TabsTrigger value="products" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all px-6">
                        Products
                    </TabsTrigger>
                    <TabsTrigger value="categories" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all px-6">
                        Categories
                    </TabsTrigger>
                    <TabsTrigger value="brands" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all px-6">
                        Brands
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="products" className="mt-0 outline-none">
                    <Card className="bg-neutral-900 border-neutral-800">
                        <CardHeader>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="relative flex-1 max-w-sm">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                                    <Input
                                        placeholder="Search products by SKU, name or brand..."
                                        className="pl-9 bg-neutral-950 border-neutral-800 text-white"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" className="border-neutral-800 text-neutral-400 hover:text-white">
                                        <Filter className="h-4 w-4 mr-2" />
                                        Filters
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border border-neutral-800 overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-neutral-800/50 text-neutral-400 font-medium whitespace-nowrap">
                                        <tr>
                                            <th className="px-4 py-3">Product</th>
                                            <th className="px-4 py-3">SKU</th>
                                            <th className="px-4 py-3">Category</th>
                                            <th className="px-4 py-3 text-right">Status</th>
                                            <th className="px-4 py-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-800 text-white">
                                        {isLoading ? (
                                            [1, 2, 3].map(i => (
                                                <tr key={i}>
                                                    <td className="px-4 py-4"><Skeleton className="h-10 w-48 bg-neutral-800" /></td>
                                                    <td className="px-4 py-4"><Skeleton className="h-4 w-24 bg-neutral-800" /></td>
                                                    <td className="px-4 py-4"><Skeleton className="h-6 w-20 bg-neutral-800" /></td>
                                                    <td className="px-4 py-4"><Skeleton className="h-6 w-16 ml-auto bg-neutral-800" /></td>
                                                    <td className="px-4 py-4"></td>
                                                </tr>
                                            ))
                                        ) : products.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-12 text-center text-neutral-500 text-lg italic">
                                                    No products found in the catalog.
                                                </td>
                                            </tr>
                                        ) : (
                                            products.map(product => (
                                                <tr key={product.id} className="hover:bg-neutral-800/30 transition-colors group">
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center gap-3 text-lg">
                                                            <div className="h-10 w-10 rounded bg-neutral-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                                {product.thumbnail_url ? (
                                                                    <img src={product.thumbnail_url} alt={product.name} className="h-full w-full object-cover" />
                                                                ) : (
                                                                    <Package className="h-5 w-5 text-neutral-500" />
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-medium text-white truncate">{product.name}</p>
                                                                <p className="text-xs text-neutral-500 truncate">{product.brand || 'No brand'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 font-mono text-xs text-neutral-400">
                                                        {product.sku}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 whitespace-nowrap">
                                                            {product.category}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-4 text-right">
                                                        <Badge className={product.is_active
                                                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                                            : "bg-red-500/10 text-red-500 border-red-500/20"
                                                        }>
                                                            {product.is_active ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500 hover:text-white">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="bg-neutral-900 border-neutral-800 text-white">
                                                                <DropdownMenuItem onClick={() => handleEditProduct(product)} className="focus:bg-neutral-800 cursor-pointer">
                                                                    <Edit2 className="h-4 w-4 mr-2" />
                                                                    Edit Details
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem className="focus:bg-neutral-800 cursor-pointer">
                                                                    <ExternalLink className="h-4 w-4 mr-2" />
                                                                    View in Store
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() => handleDelete(product.id, 'master_products')}
                                                                    className="focus:bg-neutral-800 text-red-400 cursor-pointer"
                                                                >
                                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="categories" className="mt-0 outline-none px-1 text-lg">
                    <Card className="bg-neutral-900 border-neutral-800">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-white">Product Categories</CardTitle>
                                <CardDescription>Manage the organizational taxonomy of the catalog</CardDescription>
                            </div>
                            <Button onClick={() => handleCreateTaxonomy('category')} className="bg-indigo-600 hover:bg-indigo-700 h-9">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Category
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border border-neutral-800 overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-neutral-800/50 text-neutral-400 font-medium">
                                        <tr>
                                            <th className="px-4 py-3">Category Name</th>
                                            <th className="px-4 py-3">Slug</th>
                                            <th className="px-4 py-3 text-right">Status</th>
                                            <th className="px-4 py-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-800 text-white">
                                        {categories.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-12 text-center text-neutral-500 italic">
                                                    No categories defined.
                                                </td>
                                            </tr>
                                        ) : categories.map(cat => (
                                            <tr key={cat.id} className="hover:bg-neutral-800/30">
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded bg-neutral-800 flex items-center justify-center">
                                                            <Tag className="h-4 w-4 text-indigo-400" />
                                                        </div>
                                                        <span className="font-medium">{cat.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-neutral-500 font-mono text-xs">{cat.slug}</td>
                                                <td className="px-4 py-4 text-right">
                                                    <Badge className={cat.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-neutral-800"}>
                                                        {cat.is_active ? 'Active' : 'Hidden'}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-white">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="bg-neutral-900 border-neutral-800 text-white">
                                                            <DropdownMenuItem onClick={() => handleEditTaxonomy(cat, 'category')} className="focus:bg-neutral-800">
                                                                <Edit2 className="h-3.5 w-3.5 mr-2" /> Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleDelete(cat.id, 'product_categories')} className="focus:bg-neutral-800 text-red-400">
                                                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="brands" className="mt-0 outline-none px-1 text-lg">
                    <Card className="bg-neutral-900 border-neutral-800">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-white">Master Brands</CardTitle>
                                <CardDescription>Manage global brand definitions</CardDescription>
                            </div>
                            <Button onClick={() => handleCreateTaxonomy('brand')} className="bg-indigo-600 hover:bg-indigo-700 h-9">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Brand
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border border-neutral-800 overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-neutral-800/50 text-neutral-400 font-medium">
                                        <tr>
                                            <th className="px-4 py-3">Brand Name</th>
                                            <th className="px-4 py-3">Slug</th>
                                            <th className="px-4 py-3 text-right">Status</th>
                                            <th className="px-4 py-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-800 text-white">
                                        {brands.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-12 text-center text-neutral-500 italic">
                                                    No brands defined.
                                                </td>
                                            </tr>
                                        ) : brands.map(brand => (
                                            <tr key={brand.id} className="hover:bg-neutral-800/30">
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded bg-neutral-800 flex items-center justify-center">
                                                            <ShieldCheck className="h-4 w-4 text-emerald-400" />
                                                        </div>
                                                        <span className="font-medium">{brand.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-neutral-500 font-mono text-xs">{brand.slug}</td>
                                                <td className="px-4 py-4 text-right">
                                                    <Badge className={brand.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-neutral-800"}>
                                                        {brand.is_active ? 'Active' : 'Hidden'}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-white">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="bg-neutral-900 border-neutral-800 text-white">
                                                            <DropdownMenuItem onClick={() => handleEditTaxonomy(brand, 'brand')} className="focus:bg-neutral-800">
                                                                <Edit2 className="h-3.5 w-3.5 mr-2" /> Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleDelete(brand.id, 'product_brands')} className="focus:bg-neutral-800 text-red-400">
                                                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <ProductDialog
                open={isProductDialogOpen}
                onOpenChange={setIsProductDialogOpen}
                product={selectedProduct}
                onSuccess={fetchData}
            />

            <TaxonomyDialog
                open={isTaxonomyDialogOpen}
                onOpenChange={setIsTaxonomyDialogOpen}
                type={taxonomyType}
                item={selectedTaxonomy}
                onSuccess={fetchData}
            />
        </div>
    )
}
