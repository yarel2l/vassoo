import { Metadata } from 'next'

interface LayoutProps {
    children: React.ReactNode
    params: Promise<{ slug: string[] }>
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
    const { slug } = await params
    const fullSlug = slug?.join('/') || ''

    try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const response = await fetch(`${baseUrl}/api/pages/${fullSlug}`, {
            next: { revalidate: 60 }
        })

        if (!response.ok) {
            return {
                title: 'Page Not Found',
                description: 'The requested page could not be found.'
            }
        }

        const page = await response.json()

        return {
            title: page.meta_title || page.title,
            description: page.meta_description || page.excerpt || `Learn more about ${page.title}`,
            openGraph: {
                title: page.meta_title || page.title,
                description: page.meta_description || page.excerpt || `Learn more about ${page.title}`,
                type: 'article',
                modifiedTime: page.updated_at
            }
        }
    } catch {
        return {
            title: 'Page',
            description: 'Page content'
        }
    }
}

export default function PageLayout({ children }: LayoutProps) {
    return <>{children}</>
}
