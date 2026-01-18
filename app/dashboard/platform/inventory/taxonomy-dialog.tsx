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
import { Switch } from '@/components/ui/switch'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface TaxonomyDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    type: 'category' | 'brand'
    item?: any
    onSuccess: (newItem?: any) => void
}

export function TaxonomyDialog({ open, onOpenChange, type, item, onSuccess }: TaxonomyDialogProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        is_active: true,
        image_url: '',
        logo_url: ''
    })

    useEffect(() => {
        if (open) {
            if (item) {
                setFormData({
                    name: item.name || '',
                    description: item.description || '',
                    is_active: item.is_active ?? true,
                    image_url: item.image_url || '',
                    logo_url: item.logo_url || ''
                })
            } else {
                setFormData({
                    name: '',
                    description: '',
                    is_active: true,
                    image_url: '',
                    logo_url: ''
                })
            }
        }
    }, [item, open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        const supabase = createClient()
        const table = type === 'category' ? 'product_categories' : 'product_brands'
        const slug = formData.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')

        const payload: any = {
            name: formData.name,
            slug: item ? item.slug : slug,
            description: formData.description,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
        }

        if (type === 'category') payload.image_url = formData.image_url
        if (type === 'brand') payload.logo_url = formData.logo_url

        let data
        let error
        if (item) {
            const { error: updateError } = await supabase
                .from(table as any)
                .update(payload)
                .eq('id', item.id)
            error = updateError
        } else {
            const { data: insertData, error: insertError } = await supabase
                .from(table as any)
                .insert([payload])
                .select()
                .single()
            error = insertError
            data = insertData
        }

        if (error) {
            toast.error(error.message || 'Failed to save')
        } else {
            toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} saved`)
            onSuccess(data)
            onOpenChange(false)
        }
        setIsLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-neutral-900 border-neutral-800 text-white sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{item ? `Edit ${type}` : `Add New ${type}`}</DialogTitle>
                        <DialogDescription className="text-neutral-400">
                            Create a global {type} to organize your catalog.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder={`${type} name...`}
                                className="bg-neutral-950 border-neutral-800"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="bg-neutral-950 border-neutral-800 min-h-[80px]"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{type === 'category' ? 'Banner Image URL' : 'Brand Logo URL'}</Label>
                            <Input
                                value={type === 'category' ? formData.image_url : formData.logo_url}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    [type === 'category' ? 'image_url' : 'logo_url']: e.target.value
                                })}
                                placeholder="https://..."
                                className="bg-neutral-950 border-neutral-800"
                            />
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg border border-neutral-800 bg-neutral-950/50">
                            <div className="space-y-0.5">
                                <Label>Active Status</Label>
                                <p className="text-xs text-neutral-500">Visible in the marketplace</p>
                            </div>
                            <Switch
                                checked={formData.is_active}
                                onCheckedChange={(val) => setFormData({ ...formData, is_active: val })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700">
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Item'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
