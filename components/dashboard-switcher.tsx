'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    Store,
    Truck,
    ShieldCheck,
    ChevronRight,
    LucideIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

interface DashboardOption {
    title: string
    href: string
    icon: LucideIcon
    color: string
    description: string
    target?: string
}

const dashboards: DashboardOption[] = [
    {
        title: 'Platform Admin',
        href: '/dashboard/platform',
        icon: ShieldCheck,
        color: 'text-indigo-400',
        description: 'Global settings & analytics',
        target: '_self'
    },
    {
        title: 'Store Manager',
        href: '/dashboard/store',
        icon: Store,
        color: 'text-orange-400',
        description: 'Products & orders',
        target: '_blank'
    },
    {
        title: 'Delivery Partner',
        href: '/dashboard/delivery',
        icon: Truck,
        color: 'text-blue-400',
        description: 'Logistics & drivers',
        target: '_blank'
    }
]

interface DashboardSwitcherProps {
    isCollapsed?: boolean
}

export function DashboardSwitcher({ isCollapsed = false }: DashboardSwitcherProps) {
    const pathname = usePathname()

    return (
        <div className={cn("px-3 py-4 border-b border-white/5", isCollapsed ? "flex flex-col items-center" : "")}>
            {!isCollapsed && (
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-3 px-3">
                    Navigation
                </p>
            )}

            <div className="space-y-1">
                {dashboards.map((dash) => {
                    const isActive = pathname.startsWith(dash.href)
                    const Icon = dash.icon

                    const link = (
                        <Link
                            key={dash.href}
                            href={dash.href}
                            target={dash.target}
                            rel={dash.target === '_blank' ? 'noopener noreferrer' : undefined}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group",
                                isActive
                                    ? "bg-white/10 text-white"
                                    : "text-white/50 hover:bg-white/5 hover:text-white",
                                isCollapsed && "justify-center px-0 w-10 h-10"
                            )}
                        >
                            <Icon className={cn(
                                "h-5 w-5 transition-transform group-hover:scale-110",
                                isActive ? dash.color : "text-inherit"
                            )} />

                            {!isCollapsed && (
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-sm font-medium truncate">{dash.title}</p>
                                    <p className="text-[10px] text-white/30 truncate">{dash.description}</p>
                                </div>
                            )}

                            {!isCollapsed && isActive && (
                                <ChevronRight className="h-3 w-3 text-white/20" />
                            )}
                        </Link>
                    )

                    if (isCollapsed) {
                        return (
                            <Tooltip key={dash.href}>
                                <TooltipTrigger asChild>{link}</TooltipTrigger>
                                <TooltipContent side="right" className="bg-neutral-900 border-white/10 text-white">
                                    <p className="font-medium">{dash.title}</p>
                                    <p className="text-xs text-white/50">{dash.description}</p>
                                </TooltipContent>
                            </Tooltip>
                        )
                    }

                    return link
                })}
            </div>
        </div>
    )
}
