'use client'

import { cn } from '@/lib/utils'

interface VassooLogoProps {
    size?: 'sm' | 'md' | 'lg'
    showText?: boolean
    className?: string
}

/**
 * Glass Icon - The Vassoo brand whisky glass
 * Unified design used across the entire application
 */
function GlassIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 32" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4 L20 4 L18 28 L6 28 Z" stroke="currentColor" strokeWidth="1.5" fill="transparent" />
            <rect x="4" y="20" width="14" height="8" fill="currentColor" opacity="0.6" />
            <line x1="6" y1="28" x2="18" y2="28" stroke="currentColor" strokeWidth="2" />
        </svg>
    )
}

/**
 * Vassoo Logo Component - Whisky Glass Icon
 * Uses a stylized whisky glass as the brand icon
 */
export function VassooLogo({ size = 'md', showText = true, className }: VassooLogoProps) {
    const sizes = {
        sm: { container: 'h-6 w-6', icon: 'w-4 h-4', text: 'text-sm' },
        md: { container: 'h-8 w-8', icon: 'w-5 h-5', text: 'text-base' },
        lg: { container: 'h-10 w-10', icon: 'w-6 h-6', text: 'text-xl' },
    }

    const s = sizes[size]

    return (
        <div className={cn('flex items-center gap-2', className)}>
            <div className={cn(
                'bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/25',
                s.container
            )}>
                <GlassIcon className={cn('text-white', s.icon)} />
            </div>
            {showText && (
                <span className={cn('font-bold text-white', s.text)}>Vassoo</span>
            )}
        </div>
    )
}

/**
 * Vassoo Logo Icon Only - For sidebar collapsed state
 */
export function VassooLogoIcon({ size = 'md', className }: Omit<VassooLogoProps, 'showText'>) {
    return <VassooLogo size={size} showText={false} className={className} />
}

export { GlassIcon }
export default VassooLogo
