"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, DropdownProps } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

// Get current year for range
const currentYear = new Date().getFullYear()

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: CalendarProps) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn("p-3 bg-neutral-950", className)}
            captionLayout="dropdown"
            fromYear={currentYear - 10}
            toYear={currentYear + 10}
            classNames={{
                months: "flex flex-col sm:flex-row gap-4",
                month: "flex flex-col gap-4",
                caption: "flex justify-center pt-1 relative items-center h-9",
                caption_label: "text-sm font-medium text-white hidden",
                caption_dropdowns: "flex gap-2 items-center",
                nav: "flex items-center gap-1",
                button_previous: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 border-neutral-800 absolute left-1 z-10"
                ),
                button_next: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 border-neutral-800 absolute right-1 z-10"
                ),
                month_grid: "border-collapse",
                weekdays: "flex",
                weekday: "text-neutral-500 rounded-md w-9 font-normal text-[0.8rem] text-center",
                week: "flex w-full mt-2",
                day: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-neutral-800 hover:text-white"
                ),
                day_button: "h-9 w-9 p-0 font-normal",
                range_start: "day-range-start",
                range_end: "day-range-end",
                selected:
                    "bg-orange-600 text-white hover:bg-orange-600 hover:text-white focus:bg-orange-600 focus:text-white rounded-md",
                today: "bg-neutral-800 text-white rounded-md",
                outside:
                    "outside text-neutral-500 opacity-50 aria-selected:bg-neutral-800/50 aria-selected:text-neutral-500 aria-selected:opacity-30",
                disabled: "text-neutral-500 opacity-50",
                range_middle:
                    "aria-selected:bg-neutral-800 aria-selected:text-neutral-100 rounded-none",
                hidden: "invisible",
                dropdown: "bg-neutral-900 border-neutral-700 text-white rounded-md",
                dropdown_root: "relative inline-block",
                ...classNames,
            }}
            components={{
                Chevron: ({ ...props }) => {
                    if (props.orientation === "left") {
                        return <ChevronLeft className="h-4 w-4" />
                    }
                    return <ChevronRight className="h-4 w-4" />
                },
                Dropdown: ({ value, onChange, options, ...props }: DropdownProps) => {
                    const selected = options?.find((option) => option.value === value)
                    const handleChange = (newValue: string) => {
                        const changeEvent = {
                            target: { value: newValue },
                        } as React.ChangeEvent<HTMLSelectElement>
                        onChange?.(changeEvent)
                    }
                    return (
                        <Select
                            value={value?.toString()}
                            onValueChange={handleChange}
                        >
                            <SelectTrigger className="h-8 bg-neutral-800 border-neutral-700 text-white text-sm min-w-[80px]">
                                <SelectValue>{selected?.label}</SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-900 border-neutral-700 max-h-[200px]">
                                {options?.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value.toString()}
                                        className="text-white hover:bg-neutral-800 focus:bg-neutral-800"
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )
                },
            }}
            {...props}
        />
    )
}
Calendar.displayName = "Calendar"

export { Calendar }
