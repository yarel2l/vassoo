"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
    date: Date | undefined
    onDateChange: (date: Date | undefined) => void
    placeholder?: string
    className?: string
    disabled?: boolean
}

export function DatePicker({
    date,
    onDateChange,
    placeholder = "Pick a date",
    className,
    disabled = false,
}: DatePickerProps) {
    const [open, setOpen] = React.useState(false)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-full justify-start text-left font-normal bg-gray-800 border-gray-700 hover:bg-gray-700",
                        !date && "text-gray-400",
                        date && "text-white",
                        className
                    )}
                    disabled={disabled}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-gray-900 border-gray-700" align="start">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => {
                        onDateChange(newDate)
                        setOpen(false)
                    }}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    )
}

// Helper to convert string date to Date object (without timezone issues)
export function parseLocalDate(dateString: string | null | undefined): Date | undefined {
    if (!dateString) return undefined
    // Extract date part only (YYYY-MM-DD)
    const datePart = dateString.split('T')[0]
    const [year, month, day] = datePart.split('-').map(Number)
    // Create date using local timezone (month is 0-indexed)
    return new Date(year, month - 1, day)
}

// Helper to format Date to string for database (YYYY-MM-DD)
export function formatDateForDB(date: Date | undefined): string | null {
    if (!date) return null
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

// Helper to display date string without timezone conversion
export function formatDateDisplay(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A'
    const datePart = dateString.split('T')[0]
    const [year, month, day] = datePart.split('-')
    return `${month}/${day}/${year}`
}
