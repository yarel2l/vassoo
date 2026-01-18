'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    FileText,
    Plus,
    Search,
    Loader2,
    Eye,
    EyeOff,
    Edit,
    Trash2,
    Info,
    HelpCircle,
    Scale,
    ExternalLink
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PageEditorDialog } from './components/page-editor-dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

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
    created_at: string
    updated_at: string
    published_at: string | null
}

const categoryLabels = {
    about: { label: 'About Us', icon: Info, color: 'bg-blue-600' },
    support: { label: 'Customer Support', icon: HelpCircle, color: 'bg-green-600' },
    legal: { label: 'Legal & Compliance', icon: Scale, color: 'bg-purple-600' }
}

export default function ContentManagementPage() {
    const [pages, setPages] = useState<PageContent[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [activeTab, setActiveTab] = useState<string>('all')
    const [isEditorOpen, setIsEditorOpen] = useState(false)
    const [editingPage, setEditingPage] = useState<PageContent | null>(null)
    const [deletePageId, setDeletePageId] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const { toast } = useToast()

    useEffect(() => {
        fetchPages()
    }, [])

    const fetchPages = async () => {
        setIsLoading(true)
        try {
            const response = await fetch('/api/platform/pages')
            if (response.ok) {
                const data = await response.json()
                setPages(data)
            } else {
                throw new Error('Failed to fetch pages')
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to load pages',
                variant: 'destructive'
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreatePage = () => {
        setEditingPage(null)
        setIsEditorOpen(true)
    }

    const handleEditPage = (page: PageContent) => {
        setEditingPage(page)
        setIsEditorOpen(true)
    }

    const handleDeletePage = async () => {
        if (!deletePageId) return

        setIsDeleting(true)
        try {
            const response = await fetch(`/api/platform/pages/${deletePageId}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                setPages(pages.filter(p => p.id !== deletePageId))
                toast({
                    title: 'Page deleted',
                    description: 'The page has been deleted successfully.'
                })
            } else {
                throw new Error('Failed to delete page')
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to delete page',
                variant: 'destructive'
            })
        } finally {
            setIsDeleting(false)
            setDeletePageId(null)
        }
    }

    const handleTogglePublish = async (page: PageContent) => {
        try {
            const response = await fetch(`/api/platform/pages/${page.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_published: !page.is_published })
            })

            if (response.ok) {
                const updatedPage = await response.json()
                setPages(pages.map(p => p.id === page.id ? updatedPage : p))
                toast({
                    title: page.is_published ? 'Page unpublished' : 'Page published',
                    description: `"${page.title}" is now ${page.is_published ? 'hidden' : 'visible'} to users.`
                })
            } else {
                throw new Error('Failed to update page')
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to update page status',
                variant: 'destructive'
            })
        }
    }

    const handleSavePage = async (pageData: Partial<PageContent>) => {
        try {
            const url = editingPage
                ? `/api/platform/pages/${editingPage.id}`
                : '/api/platform/pages'
            const method = editingPage ? 'PUT' : 'POST'

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pageData)
            })

            if (response.ok) {
                const savedPage = await response.json()
                if (editingPage) {
                    setPages(pages.map(p => p.id === savedPage.id ? savedPage : p))
                } else {
                    setPages([...pages, savedPage])
                }
                setIsEditorOpen(false)
                toast({
                    title: editingPage ? 'Page updated' : 'Page created',
                    description: `"${savedPage.title}" has been saved successfully.`
                })
            } else {
                const error = await response.json()
                throw new Error(error.error || 'Failed to save page')
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to save page',
                variant: 'destructive'
            })
        }
    }

    const filteredPages = pages.filter(page => {
        const matchesSearch = page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            page.slug.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory = activeTab === 'all' || page.category === activeTab
        return matchesSearch && matchesCategory
    })

    const getCategoryStats = () => {
        return {
            all: pages.length,
            about: pages.filter(p => p.category === 'about').length,
            support: pages.filter(p => p.category === 'support').length,
            legal: pages.filter(p => p.category === 'legal').length
        }
    }

    const stats = getCategoryStats()

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        )
    }

    return (
        <div className="space-y-6 pb-12">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Content Management</h1>
                    <p className="text-neutral-400">Manage footer pages and static content</p>
                </div>
                <Button
                    onClick={handleCreatePage}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    New Page
                </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <Input
                    placeholder="Search pages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-neutral-900 border-neutral-800 text-white"
                />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-neutral-900 border border-neutral-800 p-1">
                    <TabsTrigger
                        value="all"
                        className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-neutral-400"
                    >
                        <FileText className="h-4 w-4 mr-2" />
                        All Pages ({stats.all})
                    </TabsTrigger>
                    <TabsTrigger
                        value="about"
                        className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-neutral-400"
                    >
                        <Info className="h-4 w-4 mr-2" />
                        About Us ({stats.about})
                    </TabsTrigger>
                    <TabsTrigger
                        value="support"
                        className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-neutral-400"
                    >
                        <HelpCircle className="h-4 w-4 mr-2" />
                        Support ({stats.support})
                    </TabsTrigger>
                    <TabsTrigger
                        value="legal"
                        className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-neutral-400"
                    >
                        <Scale className="h-4 w-4 mr-2" />
                        Legal ({stats.legal})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-6">
                    {filteredPages.length === 0 ? (
                        <Card className="bg-neutral-900 border-neutral-800">
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <FileText className="h-12 w-12 text-neutral-600 mb-4" />
                                <h3 className="text-lg font-medium text-white mb-2">No pages found</h3>
                                <p className="text-neutral-400 text-sm mb-4">
                                    {searchQuery
                                        ? 'Try a different search term'
                                        : 'Create your first page to get started'}
                                </p>
                                {!searchQuery && (
                                    <Button onClick={handleCreatePage} variant="outline">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Create Page
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {filteredPages.map((page) => {
                                const categoryInfo = categoryLabels[page.category]
                                const CategoryIcon = categoryInfo.icon
                                return (
                                    <Card
                                        key={page.id}
                                        className="bg-neutral-900 border-neutral-800 hover:border-neutral-700 transition-colors"
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <Badge className={`${categoryInfo.color} text-white`}>
                                                            <CategoryIcon className="h-3 w-3 mr-1" />
                                                            {categoryInfo.label}
                                                        </Badge>
                                                        {page.is_published ? (
                                                            <Badge variant="outline" className="border-green-600 text-green-500">
                                                                <Eye className="h-3 w-3 mr-1" />
                                                                Published
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="border-neutral-600 text-neutral-400">
                                                                <EyeOff className="h-3 w-3 mr-1" />
                                                                Draft
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <h3 className="text-lg font-semibold text-white truncate">
                                                        {page.title}
                                                    </h3>
                                                    <p className="text-sm text-neutral-500 truncate">
                                                        /{page.slug}
                                                    </p>
                                                    {page.excerpt && (
                                                        <p className="text-sm text-neutral-400 mt-2 line-clamp-2">
                                                            {page.excerpt}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-neutral-600 mt-2">
                                                        Last updated: {new Date(page.updated_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <TooltipProvider delayDuration={0}>
                                                    <div className="flex items-center gap-1">
                                                        {page.is_published && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="text-neutral-400 hover:text-white"
                                                                        onClick={() => window.open(`/${page.slug}`, '_blank')}
                                                                    >
                                                                        <ExternalLink className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="bg-neutral-800 text-white border-neutral-700">
                                                                    View page
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-neutral-400 hover:text-white"
                                                                    onClick={() => handleTogglePublish(page)}
                                                                >
                                                                    {page.is_published ? (
                                                                        <EyeOff className="h-4 w-4" />
                                                                    ) : (
                                                                        <Eye className="h-4 w-4" />
                                                                    )}
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="bg-neutral-800 text-white border-neutral-700">
                                                                {page.is_published ? 'Unpublish' : 'Publish'}
                                                            </TooltipContent>
                                                        </Tooltip>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-neutral-400 hover:text-white"
                                                                    onClick={() => handleEditPage(page)}
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="bg-neutral-800 text-white border-neutral-700">
                                                                Edit page
                                                            </TooltipContent>
                                                        </Tooltip>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-neutral-400 hover:text-red-500"
                                                                    onClick={() => setDeletePageId(page.id)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="bg-neutral-800 text-white border-neutral-700">
                                                                Delete page
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </div>
                                                </TooltipProvider>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Page Editor Dialog */}
            <PageEditorDialog
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                page={editingPage}
                onSave={handleSavePage}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deletePageId} onOpenChange={() => setDeletePageId(null)}>
                <AlertDialogContent className="bg-neutral-900 border-neutral-800">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Delete Page</AlertDialogTitle>
                        <AlertDialogDescription className="text-neutral-400">
                            Are you sure you want to delete this page? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeletePage}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isDeleting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                'Delete'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
