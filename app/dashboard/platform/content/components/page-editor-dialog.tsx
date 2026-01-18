'use client'

import { useState, useEffect } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, FileText, Settings, Eye } from 'lucide-react'
import { RichTextEditor } from '@/components/ui/rich-text-editor'

interface PageContent {
    id: string
    slug: string
    title: string
    content: string
    excerpt: string | null
    category: 'about' | 'support' | 'legal'
    meta_title: string | null
    meta_description: string | null
    is_published: boolean
}

interface PageEditorDialogProps {
    isOpen: boolean
    onClose: () => void
    page: PageContent | null
    onSave: (data: Partial<PageContent>) => Promise<void>
}

const categoryOptions = [
    { value: 'about', label: 'About Us', prefix: 'about/' },
    { value: 'support', label: 'Customer Support', prefix: 'support/' },
    { value: 'legal', label: 'Legal & Compliance', prefix: 'legal/' }
]

export function PageEditorDialog({ isOpen, onClose, page, onSave }: PageEditorDialogProps) {
    const [isSaving, setIsSaving] = useState(false)
    const [activeTab, setActiveTab] = useState('content')
    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        content: '',
        excerpt: '',
        category: 'about' as 'about' | 'support' | 'legal',
        meta_title: '',
        meta_description: '',
        is_published: false
    })

    useEffect(() => {
        if (page) {
            setFormData({
                title: page.title,
                slug: page.slug,
                content: page.content,
                excerpt: page.excerpt || '',
                category: page.category,
                meta_title: page.meta_title || '',
                meta_description: page.meta_description || '',
                is_published: page.is_published
            })
        } else {
            setFormData({
                title: '',
                slug: '',
                content: '',
                excerpt: '',
                category: 'about',
                meta_title: '',
                meta_description: '',
                is_published: false
            })
        }
        setActiveTab('content')
    }, [page, isOpen])

    const handleTitleChange = (title: string) => {
        setFormData(prev => ({
            ...prev,
            title,
            // Auto-generate slug from title if creating new page
            slug: page ? prev.slug : generateSlug(title, prev.category)
        }))
    }

    const handleCategoryChange = (category: 'about' | 'support' | 'legal') => {
        setFormData(prev => ({
            ...prev,
            category,
            // Update slug prefix if creating new page
            slug: page ? prev.slug : generateSlug(prev.title, category)
        }))
    }

    const generateSlug = (title: string, category: string) => {
        const prefix = categoryOptions.find(c => c.value === category)?.prefix || ''
        const slugPart = title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim()
        return `${prefix}${slugPart}`
    }

    const handleSave = async () => {
        if (!formData.title || !formData.slug || !formData.category) {
            return
        }

        setIsSaving(true)
        try {
            await onSave({
                title: formData.title,
                slug: formData.slug,
                content: formData.content,
                excerpt: formData.excerpt || null,
                category: formData.category,
                meta_title: formData.meta_title || null,
                meta_description: formData.meta_description || null,
                is_published: formData.is_published
            })
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col bg-neutral-900 border-neutral-800 text-white">
                <DialogHeader className="flex-shrink-0">
                    <DialogTitle className="text-xl">
                        {page ? 'Edit Page' : 'Create New Page'}
                    </DialogTitle>
                    <DialogDescription className="text-neutral-400">
                        {page ? 'Update the page content, settings, and SEO information.' : 'Create a new page for your website footer sections.'}
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                    <TabsList className="bg-neutral-800 border-neutral-700 flex-shrink-0">
                        <TabsTrigger
                            value="content"
                            className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
                        >
                            <FileText className="h-4 w-4 mr-2" />
                            Content
                        </TabsTrigger>
                        <TabsTrigger
                            value="settings"
                            className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
                        >
                            <Settings className="h-4 w-4 mr-2" />
                            Settings
                        </TabsTrigger>
                        <TabsTrigger
                            value="preview"
                            className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
                        >
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                        </TabsTrigger>
                    </TabsList>

                    <div className="mt-4 overflow-y-auto flex-1 min-h-0">
                        <TabsContent value="content" className="space-y-4 mt-0">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-neutral-300">Title *</Label>
                                    <Input
                                        value={formData.title}
                                        onChange={(e) => handleTitleChange(e.target.value)}
                                        placeholder="Page title"
                                        className="bg-neutral-800 border-neutral-700 text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-neutral-300">Category *</Label>
                                    <Select
                                        value={formData.category}
                                        onValueChange={(v) => handleCategoryChange(v as 'about' | 'support' | 'legal')}
                                    >
                                        <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-neutral-800 border-neutral-700">
                                            {categoryOptions.map(opt => (
                                                <SelectItem
                                                    key={opt.value}
                                                    value={opt.value}
                                                    className="text-white hover:bg-neutral-700"
                                                >
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-neutral-300">URL Slug *</Label>
                                <Input
                                    value={formData.slug}
                                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                                    placeholder="page-url-slug"
                                    className="bg-neutral-800 border-neutral-700 text-white font-mono text-sm"
                                />
                                <p className="text-xs text-neutral-500">
                                    Preview: /{formData.slug}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-neutral-300">Content</Label>
                                <RichTextEditor
                                    content={formData.content}
                                    onChange={(content) => setFormData(prev => ({ ...prev, content }))}
                                    placeholder="Write your page content here..."
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-neutral-300">Excerpt (optional)</Label>
                                <Textarea
                                    value={formData.excerpt}
                                    onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                                    placeholder="Brief description of the page..."
                                    className="bg-neutral-800 border-neutral-700 text-white min-h-[80px]"
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="settings" className="space-y-6 mt-0">
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-white">SEO Settings</h3>

                                <div className="space-y-2">
                                    <Label className="text-neutral-300">Meta Title</Label>
                                    <Input
                                        value={formData.meta_title}
                                        onChange={(e) => setFormData(prev => ({ ...prev, meta_title: e.target.value }))}
                                        placeholder={formData.title || 'Page title for search engines'}
                                        className="bg-neutral-800 border-neutral-700 text-white"
                                    />
                                    <p className="text-xs text-neutral-500">
                                        Leave empty to use the page title
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-neutral-300">Meta Description</Label>
                                    <Textarea
                                        value={formData.meta_description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                                        placeholder="Description for search engines (150-160 characters recommended)"
                                        className="bg-neutral-800 border-neutral-700 text-white min-h-[80px]"
                                    />
                                    <p className="text-xs text-neutral-500">
                                        {formData.meta_description.length}/160 characters
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-neutral-800">
                                <h3 className="text-lg font-medium text-white">Publishing</h3>

                                <div className="flex items-center justify-between p-4 bg-neutral-800 rounded-lg">
                                    <div className="space-y-0.5">
                                        <Label className="text-white">Publish Page</Label>
                                        <p className="text-xs text-neutral-500">
                                            Make this page visible to users
                                        </p>
                                    </div>
                                    <Switch
                                        checked={formData.is_published}
                                        onCheckedChange={(checked) =>
                                            setFormData(prev => ({ ...prev, is_published: checked }))
                                        }
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="preview" className="mt-0">
                            <div className="bg-white rounded-lg p-6 min-h-[400px]">
                                <div
                                    className="prose prose-neutral max-w-none"
                                    dangerouslySetInnerHTML={{ __html: formData.content || '<p class="text-gray-400 italic">No content yet. Start writing in the Content tab.</p>' }}
                                />
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>

                <DialogFooter className="flex-shrink-0 border-t border-neutral-800 pt-4 mt-4">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || !formData.title || !formData.slug}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save Page'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
