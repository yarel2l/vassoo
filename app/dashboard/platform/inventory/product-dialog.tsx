'use client'

import { useEffect, useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Switch } from '@/components/ui/switch'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Plus, X, Image as ImageIcon, Globe, FlaskConical, Package } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TaxonomyDialog } from './taxonomy-dialog'
import { Separator } from '@/components/ui/separator'

interface ProductDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    product?: any
    onSuccess: () => void
}

export function ProductDialog({ open, onOpenChange, product, onSuccess }: ProductDialogProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [categories, setCategories] = useState<any[]>([])
    const [brands, setBrands] = useState<any[]>([])
    const [activeTab, setActiveTab] = useState('general')
    const [isUploading, setIsUploading] = useState(false)

    // Taxonomy Dialog state
    const [isTaxonomyDialogOpen, setIsTaxonomyDialogOpen] = useState(false)
    const [taxonomyType, setTaxonomyType] = useState<'category' | 'brand'>('category')

    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        upc: '',
        brand: '',
        category: '',
        description: '',
        age_restriction: 21,
        is_active: true,
        thumbnail_url: '',
        images: [] as string[]
    })

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        const supabase = createClient()
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2, 10)}.${fileExt}`
        const filePath = `products/${fileName}`

        try {
            const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('product-images')
                .getPublicUrl(filePath)

            setFormData(prev => ({
                ...prev,
                thumbnail_url: publicUrl,
                images: [...prev.images, publicUrl]
            }))
            toast.success('Image uploaded successfully')
        } catch (error: any) {
            toast.error(error.message || 'Error uploading image')
        } finally {
            setIsUploading(false)
        }
    }

    const [specs, setSpecs] = useState({
        volume: '',
        alcohol_percentage: '',
        country: '',
        region: '',
        type: ''
    })

    useEffect(() => {
        const fetchTaxonomy = async () => {
            const supabase = createClient()
            const [catsRes, brandsRes] = await Promise.all([
                supabase.from('product_categories' as any).select('*').eq('is_active', true).order('name'),
                supabase.from('product_brands' as any).select('*').eq('is_active', true).order('name')
            ])
            if (catsRes.data) setCategories(catsRes.data)
            if (brandsRes.data) setBrands(brandsRes.data)
        }

        if (open) {
            fetchTaxonomy()
            if (product) {
                setFormData({
                    name: product.name || '',
                    sku: product.sku || '',
                    upc: product.upc || '',
                    brand: product.brand || '',
                    category: product.category || '',
                    description: product.description || '',
                    age_restriction: product.age_restriction || 21,
                    is_active: product.is_active ?? true,
                    thumbnail_url: product.thumbnail_url || '',
                    images: product.images || []
                })
                setSpecs({
                    volume: product.specifications?.volume || '',
                    alcohol_percentage: product.specifications?.alcohol_percentage || '',
                    country: product.specifications?.country || '',
                    region: product.specifications?.region || '',
                    type: product.specifications?.type || ''
                })
            } else {
                setFormData({
                    name: '',
                    sku: '',
                    upc: '',
                    brand: '',
                    category: 'Spirits',
                    description: '',
                    age_restriction: 21,
                    is_active: true,
                    thumbnail_url: '',
                    images: []
                })
                setSpecs({
                    volume: '',
                    alcohol_percentage: '',
                    country: '',
                    region: '',
                    type: ''
                })
            }
            setActiveTab('general')
        }
    }, [product, open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        const supabase = createClient()
        const slug = formData.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')

        const payload = {
            ...formData,
            specifications: specs,
            slug: product ? product.slug : `${slug}-${Math.random().toString(36).substring(2, 7)}`,
            updated_at: new Date().toISOString()
        }

        let error
        if (product) {
            const { error: updateError } = await supabase
                .from('master_products')
                .update(payload)
                .eq('id', product.id)
            error = updateError
        } else {
            const { error: insertError } = await supabase
                .from('master_products')
                .insert([payload])
            error = insertError
        }

        if (error) {
            toast.error(error.message || 'Failed to save product')
        } else {
            toast.success(product ? 'Product updated' : 'Product created')
            onSuccess()
            onOpenChange(false)
        }
        setIsLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-neutral-900 border-neutral-800 text-white sm:max-w-[600px] overflow-hidden p-0">
                <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[90vh]">
                    <DialogHeader className="p-6 border-b border-neutral-800">
                        <DialogTitle>{product ? 'Edit Master Product' : 'Add New Master Product'}</DialogTitle>
                        <DialogDescription className="text-neutral-400">
                            Professional catalog definition with standardized attributes.
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
                        <div className="flex justify-center border-b border-neutral-800 bg-neutral-900/50">
                            <TabsList className="bg-transparent h-12 gap-8">
                                <TabsTrigger
                                    value="general"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:text-white text-neutral-400 bg-transparent px-2 pb-3 pt-3 transition-all"
                                >
                                    General Info
                                </TabsTrigger>
                                <TabsTrigger
                                    value="attributes"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:text-white text-neutral-400 bg-transparent px-2 pb-3 pt-3 transition-all"
                                >
                                    Attributes
                                </TabsTrigger>
                                <TabsTrigger
                                    value="media"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:text-white text-neutral-400 bg-transparent px-2 pb-3 pt-3 transition-all"
                                >
                                    Media
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <TabsContent value="general" className="mt-0 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 space-y-2">
                                        <Label htmlFor="name">Product Name</Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g. Johnnie Walker Black Label"
                                            className="bg-neutral-950 border-neutral-800"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="sku">Global SKU</Label>
                                        <Input
                                            id="sku"
                                            value={formData.sku}
                                            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                            placeholder="JW-BL-750"
                                            className="bg-neutral-950 border-neutral-800"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="upc">UPC / EAN</Label>
                                        <Input
                                            id="upc"
                                            value={formData.upc}
                                            onChange={(e) => setFormData({ ...formData, upc: e.target.value })}
                                            placeholder="5000267014203"
                                            className="bg-neutral-950 border-neutral-800"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Brand</Label>
                                        <Select
                                            value={formData.brand}
                                            onValueChange={(val) => {
                                                if (val === 'add-new') {
                                                    setTaxonomyType('brand')
                                                    setIsTaxonomyDialogOpen(true)
                                                } else {
                                                    setFormData({ ...formData, brand: val })
                                                }
                                            }}
                                        >
                                            <SelectTrigger className="bg-neutral-950 border-neutral-800">
                                                <SelectValue placeholder="Select brand" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-neutral-900 border-neutral-800 text-white">
                                                {brands.map(b => (
                                                    <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                                                ))}
                                                <Separator className="my-1 bg-neutral-800" />
                                                <SelectItem value="add-new" className="text-indigo-400 focus:text-indigo-300 font-medium">
                                                    <Plus className="h-3.5 w-3.5 mr-2 inline" />
                                                    Add New Brand
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Category</Label>
                                        <Select
                                            value={formData.category}
                                            onValueChange={(val) => {
                                                if (val === 'add-new') {
                                                    setTaxonomyType('category')
                                                    setIsTaxonomyDialogOpen(true)
                                                } else {
                                                    setFormData({ ...formData, category: val })
                                                }
                                            }}
                                        >
                                            <SelectTrigger className="bg-neutral-950 border-neutral-800">
                                                <SelectValue placeholder="Select category" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-neutral-900 border-neutral-800 text-white">
                                                {categories.map(c => (
                                                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                                ))}
                                                <Separator className="my-1 bg-neutral-800" />
                                                <SelectItem value="add-new" className="text-indigo-400 focus:text-indigo-300 font-medium">
                                                    <Plus className="h-3.5 w-3.5 mr-2 inline" />
                                                    Add New Category
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="bg-neutral-950 border-neutral-800 min-h-[100px]"
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="attributes" className="mt-0 space-y-4">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 mb-1">
                                            <FlaskConical className="h-4 w-4 text-indigo-400" />
                                            <Label>Volume (ml/L)</Label>
                                        </div>
                                        <Input
                                            value={specs.volume}
                                            onChange={(e) => setSpecs({ ...specs, volume: e.target.value })}
                                            placeholder="e.g. 750ml"
                                            className="bg-neutral-950 border-neutral-800"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 mb-1">
                                            <FlaskConical className="h-4 w-4 text-indigo-400" />
                                            <Label>Alcohol %</Label>
                                        </div>
                                        <Input
                                            value={specs.alcohol_percentage}
                                            onChange={(e) => setSpecs({ ...specs, alcohol_percentage: e.target.value })}
                                            placeholder="e.g. 40"
                                            className="bg-neutral-950 border-neutral-800"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Globe className="h-4 w-4 text-emerald-400" />
                                            <Label>Country of Origin</Label>
                                        </div>
                                        <Input
                                            value={specs.country}
                                            onChange={(e) => setSpecs({ ...specs, country: e.target.value })}
                                            placeholder="Scotland"
                                            className="bg-neutral-950 border-neutral-800"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Globe className="h-4 w-4 text-emerald-400" />
                                            <Label>Region</Label>
                                        </div>
                                        <Input
                                            value={specs.region}
                                            onChange={(e) => setSpecs({ ...specs, region: e.target.value })}
                                            placeholder="Speyside"
                                            className="bg-neutral-950 border-neutral-800"
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Package className="h-4 w-4 text-orange-400" />
                                            <Label>Product Type / Style</Label>
                                        </div>
                                        <Input
                                            value={specs.type}
                                            onChange={(e) => setSpecs({ ...specs, type: e.target.value })}
                                            placeholder="Single Malt Scotch Whisky"
                                            className="bg-neutral-950 border-neutral-800"
                                        />
                                    </div>
                                </div>
                                <div className="pt-4 flex items-center justify-between p-3 rounded-lg border border-neutral-800 bg-neutral-950/50">
                                    <div className="space-y-0.5">
                                        <Label>Age Restriction</Label>
                                        <p className="text-xs text-neutral-500">Minimum legal age for purchase</p>
                                    </div>
                                    <Input
                                        type="number"
                                        className="w-20 bg-neutral-950 border-neutral-800"
                                        value={formData.age_restriction}
                                        onChange={(e) => setFormData({ ...formData, age_restriction: parseInt(e.target.value) })}
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="media" className="mt-0 space-y-6">
                                <div className="space-y-4">
                                    <Label>Thumbnail URL</Label>
                                    <div className="flex gap-3">
                                        <div className="h-16 w-16 rounded border border-neutral-800 bg-neutral-950 flex items-center justify-center overflow-hidden flex-shrink-0">
                                            {formData.thumbnail_url ? (
                                                <img src={formData.thumbnail_url} className="h-full w-full object-cover" />
                                            ) : (
                                                <ImageIcon className="h-6 w-6 text-neutral-700" />
                                            )}
                                        </div>
                                        <Input
                                            value={formData.thumbnail_url}
                                            onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                                            placeholder="https://images.unsplash.com/..."
                                            className="bg-neutral-950 border-neutral-800"
                                        />
                                    </div>
                                </div>

                                <div className="p-8 border-2 border-dashed border-neutral-800 rounded-lg text-center space-y-3 relative overflow-hidden">
                                    {isUploading ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                                            <p className="text-sm text-neutral-400">Uploading...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <Button variant="outline" type="button" className="border-neutral-800 text-neutral-400 pointer-events-none">
                                                <Plus className="h-4 w-4 mr-2" />
                                                Upload Main Image
                                            </Button>
                                            <p className="text-xs text-neutral-500">Supported formats: JPG, PNG, WEBP (Max 2MB)</p>
                                            <input
                                                type="file"
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                accept="image/*"
                                                onChange={handleUpload}
                                                disabled={isUploading}
                                            />
                                        </>
                                    )}
                                </div>

                                {formData.images.length > 0 && (
                                    <div className="grid grid-cols-4 gap-4">
                                        {formData.images.map((img, idx) => (
                                            <div key={idx} className="relative aspect-square rounded-lg border border-neutral-800 overflow-hidden group">
                                                <img src={img} className="h-full w-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))}
                                                    className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>
                        </div>
                    </Tabs>

                    <DialogFooter className="p-6 border-t border-neutral-800 bg-neutral-900/50 flex items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={formData.is_active}
                                onCheckedChange={(val) => setFormData({ ...formData, is_active: val })}
                            />
                            <span className="text-xs text-neutral-400">Published in Catalog</span>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => onOpenChange(false)}
                                className="text-neutral-400 hover:text-white"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]"
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (product ? 'Save Changes' : 'Create Product')}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>

                <TaxonomyDialog
                    open={isTaxonomyDialogOpen}
                    onOpenChange={setIsTaxonomyDialogOpen}
                    type={taxonomyType}
                    onSuccess={(newItem) => {
                        const supabase = createClient()
                        const fetchUpdated = async () => {
                            const [catsRes, brandsRes] = await Promise.all([
                                supabase.from('product_categories' as any).select('*').eq('is_active', true).order('name'),
                                supabase.from('product_brands' as any).select('*').eq('is_active', true).order('name')
                            ])
                            if (catsRes.data) setCategories(catsRes.data)
                            if (brandsRes.data) setBrands(brandsRes.data)

                            if (newItem) {
                                if (taxonomyType === 'category') {
                                    setFormData(prev => ({ ...prev, category: newItem.name }))
                                } else {
                                    setFormData(prev => ({ ...prev, brand: newItem.name }))
                                }
                            }
                        }
                        fetchUpdated()
                    }}
                />
            </DialogContent>
        </Dialog>
    )
}
