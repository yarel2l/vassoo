'use client'

import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Copy } from 'lucide-react'

export interface DayHours {
    open: string
    close: string
    is_open: boolean
}

export interface BusinessHours {
    monday: DayHours
    tuesday: DayHours
    wednesday: DayHours
    thursday: DayHours
    friday: DayHours
    saturday: DayHours
    sunday: DayHours
}

export const defaultBusinessHours: BusinessHours = {
    monday: { open: '09:00', close: '21:00', is_open: true },
    tuesday: { open: '09:00', close: '21:00', is_open: true },
    wednesday: { open: '09:00', close: '21:00', is_open: true },
    thursday: { open: '09:00', close: '21:00', is_open: true },
    friday: { open: '09:00', close: '22:00', is_open: true },
    saturday: { open: '10:00', close: '22:00', is_open: true },
    sunday: { open: '12:00', close: '18:00', is_open: false },
}

interface BusinessHoursEditorProps {
    value: BusinessHours
    onChange: (hours: BusinessHours) => void
}

const DAYS = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
] as const

// Generate time options from 00:00 to 23:30 in 30-min intervals
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
    const hours = Math.floor(i / 2)
    const minutes = i % 2 === 0 ? '00' : '30'
    const time = `${hours.toString().padStart(2, '0')}:${minutes}`
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
    const ampm = hours < 12 ? 'AM' : 'PM'
    return {
        value: time,
        label: `${displayHour}:${minutes} ${ampm}`,
    }
})

export function BusinessHoursEditor({ value, onChange }: BusinessHoursEditorProps) {
    const updateDay = (day: keyof BusinessHours, field: keyof DayHours, newValue: string | boolean) => {
        onChange({
            ...value,
            [day]: {
                ...value[day],
                [field]: newValue,
            },
        })
    }

    const copyToAll = (sourceDay: keyof BusinessHours) => {
        const sourceHours = value[sourceDay]
        const newHours: BusinessHours = { ...value }
        for (const day of DAYS) {
            newHours[day.key] = { ...sourceHours }
        }
        onChange(newHours)
    }

    return (
        <div className="space-y-4">
            {DAYS.map(({ key, label }) => (
                <div
                    key={key}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg bg-gray-800/50"
                >
                    <div className="flex items-center gap-3 min-w-[140px]">
                        <Switch
                            checked={value[key].is_open}
                            onCheckedChange={(checked) => updateDay(key, 'is_open', checked)}
                        />
                        <Label className="text-gray-300 font-medium w-24">{label}</Label>
                    </div>

                    {value[key].is_open ? (
                        <div className="flex items-center gap-2 flex-1">
                            <Select
                                value={value[key].open}
                                onValueChange={(v) => updateDay(key, 'open', v)}
                            >
                                <SelectTrigger className="w-[120px] bg-gray-800 border-gray-700 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700 max-h-60">
                                    {TIME_OPTIONS.map((opt) => (
                                        <SelectItem
                                            key={opt.value}
                                            value={opt.value}
                                            className="text-white hover:bg-gray-700"
                                        >
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <span className="text-gray-400">to</span>

                            <Select
                                value={value[key].close}
                                onValueChange={(v) => updateDay(key, 'close', v)}
                            >
                                <SelectTrigger className="w-[120px] bg-gray-800 border-gray-700 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700 max-h-60">
                                    {TIME_OPTIONS.map((opt) => (
                                        <SelectItem
                                            key={opt.value}
                                            value={opt.value}
                                            className="text-white hover:bg-gray-700"
                                        >
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToAll(key)}
                                className="text-gray-400 hover:text-white ml-2"
                                title="Copy to all days"
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <span className="text-gray-500 italic">Closed</span>
                    )}
                </div>
            ))}
        </div>
    )
}
