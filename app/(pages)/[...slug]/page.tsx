'use client'

import { useEffect, useState } from 'react'
import { useParams, notFound } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { ArrowLeft, Loader2, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PageContent {
    title: string
    content: string
    excerpt: string | null
    meta_title: string | null
    meta_description: string | null
    updated_at: string
}

export default function DynamicPage() {
    const params = useParams()
    const [page, setPage] = useState<PageContent | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Build slug from params
    const slugArray = params.slug as string[]
    const fullSlug = slugArray?.join('/') || ''

    useEffect(() => {
        async function fetchPage() {
            if (!fullSlug) {
                setError('Page not found')
                setIsLoading(false)
                return
            }

            try {
                const response = await fetch(`/api/pages/${fullSlug}`)

                if (response.status === 404) {
                    setError('Page not found')
                    setIsLoading(false)
                    return
                }

                if (!response.ok) {
                    throw new Error('Failed to fetch page')
                }

                const data = await response.json()
                setPage(data)
            } catch (err) {
                setError('Failed to load page')
            } finally {
                setIsLoading(false)
            }
        }

        fetchPage()
    }, [fullSlug])

    // Determine category for back link
    const getBackLink = () => {
        const category = slugArray?.[0]
        switch (category) {
            case 'about':
                return { href: '/', label: 'Home' }
            case 'support':
                return { href: '/', label: 'Home' }
            case 'legal':
                return { href: '/', label: 'Home' }
            default:
                return { href: '/', label: 'Home' }
        }
    }

    const backLink = getBackLink()

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900">
                <Navbar />
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                </div>
                <Footer />
            </div>
        )
    }

    if (error || !page) {
        return (
            <div className="min-h-screen bg-gray-900">
                <Navbar />
                <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                    <h1 className="text-4xl font-bold text-white mb-4">Page Not Found</h1>
                    <p className="text-gray-400 mb-8">
                        The page you're looking for doesn't exist or has been moved.
                    </p>
                    <Button asChild>
                        <Link href="/">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Home
                        </Link>
                    </Button>
                </div>
                <Footer />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-900">
            <Navbar />

            <main className="max-w-4xl mx-auto px-4 py-12">
                {/* Back Link */}
                <Link
                    href={backLink.href}
                    className="inline-flex items-center text-gray-400 hover:text-white mb-8 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to {backLink.label}
                </Link>

                {/* Page Header */}
                <header className="mb-8">
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        {page.title}
                    </h1>
                    {page.excerpt && (
                        <p className="text-xl text-gray-400">
                            {page.excerpt}
                        </p>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-4">
                        <Calendar className="h-4 w-4" />
                        <span>Last updated: {new Date(page.updated_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}</span>
                    </div>
                </header>

                {/* Page Content */}
                <article
                    className="prose prose-invert prose-lg max-w-none
                        prose-headings:text-white prose-headings:font-bold
                        prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
                        prose-p:text-gray-300 prose-p:leading-relaxed
                        prose-a:text-orange-400 prose-a:no-underline hover:prose-a:underline
                        prose-strong:text-white
                        prose-ul:text-gray-300 prose-ol:text-gray-300
                        prose-li:marker:text-orange-500
                        prose-blockquote:border-l-orange-500 prose-blockquote:text-gray-400 prose-blockquote:italic
                        prose-code:text-orange-400 prose-code:bg-gray-800 prose-code:px-2 prose-code:py-1 prose-code:rounded
                        prose-hr:border-gray-700"
                    dangerouslySetInnerHTML={{ __html: page.content }}
                />
            </main>

            <Footer />
        </div>
    )
}
