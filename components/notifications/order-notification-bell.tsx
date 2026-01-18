'use client'

import React, { useState } from 'react'
import { Bell, BellOff, Check, CheckCheck, Trash2, Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react'
import { useOrderNotifications } from '@/contexts/order-notification-context'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface OrderNotificationBellProps {
    className?: string
}

export function OrderNotificationBell({ className }: OrderNotificationBellProps) {
    const {
        notifications,
        unreadCount,
        isConnected,
        connectionError,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        soundEnabled,
        setSoundEnabled,
    } = useOrderNotifications()

    const [isOpen, setIsOpen] = useState(false)

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className={cn('relative', className)}>
                    {isConnected ? (
                        <Bell className="h-5 w-5" />
                    ) : (
                        <BellOff className="h-5 w-5 text-muted-foreground" />
                    )}
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Notifications</span>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                                e.preventDefault()
                                setSoundEnabled(!soundEnabled)
                            }}
                            title={soundEnabled ? 'Mute notifications' : 'Enable sound'}
                        >
                            {soundEnabled ? (
                                <Volume2 className="h-3 w-3" />
                            ) : (
                                <VolumeX className="h-3 w-3" />
                            )}
                        </Button>
                        <div
                            className={cn(
                                'flex items-center gap-1 px-1 py-0.5 rounded text-xs',
                                isConnected
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            )}
                            title={connectionError || (isConnected ? 'Connected' : 'Disconnected')}
                        >
                            {isConnected ? (
                                <Wifi className="h-3 w-3" />
                            ) : (
                                <WifiOff className="h-3 w-3" />
                            )}
                        </div>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {notifications.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No notifications</p>
                    </div>
                ) : (
                    <>
                        <ScrollArea className="h-[300px]">
                            {notifications.map((notification) => (
                                <DropdownMenuItem
                                    key={notification.id}
                                    className={cn(
                                        'flex flex-col items-start gap-1 p-3 cursor-pointer',
                                        !notification.isRead && 'bg-primary/5'
                                    )}
                                    onClick={() => markAsRead(notification.id)}
                                >
                                    <div className="flex items-start justify-between w-full">
                                        <span className="font-medium text-sm">
                                            {notification.title}
                                        </span>
                                        {!notification.isRead && (
                                            <span className="h-2 w-2 rounded-full bg-primary" />
                                        )}
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {notification.message}
                                    </span>
                                    <span className="text-xs text-muted-foreground/70">
                                        {formatDistanceToNow(notification.timestamp, {
                                            addSuffix: true,
                                        })}
                                    </span>
                                </DropdownMenuItem>
                            ))}
                        </ScrollArea>
                        <DropdownMenuSeparator />
                        <div className="flex items-center justify-between p-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7"
                                onClick={(e) => {
                                    e.preventDefault()
                                    markAllAsRead()
                                }}
                            >
                                <CheckCheck className="h-3 w-3 mr-1" />
                                Mark all read
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                    e.preventDefault()
                                    clearNotifications()
                                }}
                            >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Clear
                            </Button>
                        </div>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
