'use client'

import React, { useState, useEffect } from 'react'
import { Bell, BellOff, CheckCheck, Trash2, Volume2, VolumeX, Wifi, WifiOff, Truck } from 'lucide-react'
import { useDriverNotifications } from '@/contexts/driver-notification-context'
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

interface DriverNotificationBellProps {
    className?: string
}

export function DriverNotificationBell({ className }: DriverNotificationBellProps) {
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
    } = useDriverNotifications()

    const [isOpen, setIsOpen] = useState(false)
    const [isMounted, setIsMounted] = useState(false)
    
    // Prevent hydration mismatch
    useEffect(() => {
        setIsMounted(true)
    }, [])

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'new_delivery':
                return '🚚'
            case 'delivery_cancelled':
                return '❌'
            case 'delivery_reminder':
                return '⏰'
            default:
                return '📦'
        }
    }
    
    // Don't render dropdown content until mounted to prevent IntersectionObserver errors
    if (!isMounted) {
        return (
            <Button 
                variant="ghost" 
                size="icon" 
                className={cn('relative', className)}
            >
                <Bell className="h-5 w-5 text-gray-400" />
                {unreadCount > 0 && (
                    <Badge
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 text-white border-0"
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                )}
            </Button>
        )
    }

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn('relative', className)}
                >
                    {isConnected ? (
                        <Bell className="h-5 w-5 text-gray-400" />
                    ) : (
                        <BellOff className="h-5 w-5 text-gray-500" />
                    )}
                    {unreadCount > 0 && (
                        <Badge
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 text-white border-0"
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
                align="end" 
                className="w-80 bg-gray-900 border-gray-700 text-white"
            >
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Notifications</span>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:bg-gray-800"
                            onClick={(e) => {
                                e.preventDefault()
                                setSoundEnabled(!soundEnabled)
                            }}
                            title={soundEnabled ? 'Mute notifications' : 'Enable sound'}
                        >
                            {soundEnabled ? (
                                <Volume2 className="h-3 w-3 text-gray-400" />
                            ) : (
                                <VolumeX className="h-3 w-3 text-gray-500" />
                            )}
                        </Button>
                        <div
                            className={cn(
                                'flex items-center gap-1 px-1.5 py-0.5 rounded text-xs',
                                isConnected
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-red-500/20 text-red-400'
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
                <DropdownMenuSeparator className="bg-gray-700" />
                
                {notifications.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">
                        <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No notifications</p>
                        <p className="text-xs mt-1">New deliveries will appear here</p>
                    </div>
                ) : (
                    <>
                        <ScrollArea className="h-[300px]">
                            {notifications.map((notification) => (
                                <DropdownMenuItem
                                    key={notification.id}
                                    className={cn(
                                        'flex flex-col items-start gap-1 p-3 cursor-pointer focus:bg-gray-800',
                                        !notification.isRead && 'bg-blue-500/10'
                                    )}
                                    onClick={() => markAsRead(notification.id)}
                                >
                                    <div className="flex items-start justify-between w-full">
                                        <div className="flex items-center gap-2">
                                            <span>{getNotificationIcon(notification.type)}</span>
                                            <span className="font-medium text-sm">
                                                {notification.title}
                                            </span>
                                        </div>
                                        {!notification.isRead && (
                                            <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-400 pl-6">
                                        {notification.message}
                                    </span>
                                    <span className="text-xs text-gray-500 pl-6">
                                        {formatDistanceToNow(notification.timestamp, {
                                            addSuffix: true,
                                        })}
                                    </span>
                                </DropdownMenuItem>
                            ))}
                        </ScrollArea>
                        <DropdownMenuSeparator className="bg-gray-700" />
                        <div className="flex items-center justify-between p-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7 text-gray-400 hover:text-white hover:bg-gray-800"
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
                                className="text-xs h-7 text-red-400 hover:text-red-300 hover:bg-gray-800"
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
