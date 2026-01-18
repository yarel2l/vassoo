'use client'

import { useState, useEffect } from 'react'
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export interface SelectOption {
    value: string
    label: string
}

interface CreatableSelectProps {
    options: SelectOption[]
    value: string
    onValueChange: (value: string) => void
    placeholder?: string
    searchPlaceholder?: string
    emptyMessage?: string
    createLabel?: string
    createDialogTitle?: string
    createDialogDescription?: string
    onCreateNew?: (name: string, description?: string) => Promise<SelectOption>
    disabled?: boolean
    className?: string
    showDescription?: boolean
}

export function CreatableSelect({
    options,
    value,
    onValueChange,
    placeholder = 'Select...',
    searchPlaceholder = 'Search...',
    emptyMessage = 'No results found.',
    createLabel = 'Create new',
    createDialogTitle = 'Create New',
    createDialogDescription = 'Add a new option to the list.',
    onCreateNew,
    disabled = false,
    className,
    showDescription = false,
}: CreatableSelectProps) {
    const [open, setOpen] = useState(false)
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [newName, setNewName] = useState('')
    const [newDescription, setNewDescription] = useState('')
    const [searchQuery, setSearchQuery] = useState('')

    const selectedOption = options.find((opt) => opt.value === value)

    const filteredOptions = options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleCreate = async () => {
        if (!onCreateNew || !newName.trim()) return

        setIsCreating(true)
        try {
            const newOption = await onCreateNew(newName.trim(), newDescription.trim() || undefined)
            onValueChange(newOption.value)
            setCreateDialogOpen(false)
            setOpen(false)
            setNewName('')
            setNewDescription('')
        } catch (error) {
            console.error('Error creating new option:', error)
        } finally {
            setIsCreating(false)
        }
    }

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        disabled={disabled}
                        className={cn(
                            'w-full justify-between bg-gray-800 border-gray-700 text-white hover:bg-gray-700',
                            !value && 'text-gray-400',
                            className
                        )}
                    >
                        {selectedOption?.label || placeholder}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 bg-gray-900 border-gray-800" align="start">
                    <Command className="bg-gray-900">
                        <CommandInput
                            placeholder={searchPlaceholder}
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                            className="text-white"
                        />
                        <CommandList>
                            <CommandEmpty className="py-4 text-center text-gray-400">
                                {emptyMessage}
                            </CommandEmpty>
                            <CommandGroup>
                                {filteredOptions.map((option) => (
                                    <CommandItem
                                        key={option.value}
                                        value={option.label}
                                        onSelect={() => {
                                            onValueChange(option.value)
                                            setOpen(false)
                                            setSearchQuery('')
                                        }}
                                        className="text-white hover:bg-gray-800 cursor-pointer"
                                    >
                                        <Check
                                            className={cn(
                                                'mr-2 h-4 w-4',
                                                value === option.value ? 'opacity-100' : 'opacity-0'
                                            )}
                                        />
                                        {option.label}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                            {onCreateNew && (
                                <>
                                    <CommandSeparator className="bg-gray-800" />
                                    <CommandGroup>
                                        <CommandItem
                                            onSelect={() => {
                                                setCreateDialogOpen(true)
                                                setOpen(false)
                                                setSearchQuery('')
                                            }}
                                            className="text-orange-400 hover:bg-gray-800 cursor-pointer"
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            {createLabel}
                                        </CommandItem>
                                    </CommandGroup>
                                </>
                            )}
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {/* Create New Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="bg-gray-900 border-gray-800">
                    <DialogHeader>
                        <DialogTitle className="text-white">{createDialogTitle}</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            {createDialogDescription}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-gray-300">Name *</Label>
                            <Input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Enter name..."
                                className="bg-gray-800 border-gray-700 text-white"
                            />
                        </div>
                        {showDescription && (
                            <div className="space-y-2">
                                <Label className="text-gray-300">Description</Label>
                                <Textarea
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    placeholder="Enter description (optional)..."
                                    className="bg-gray-800 border-gray-700 text-white"
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setCreateDialogOpen(false)
                                setNewName('')
                                setNewDescription('')
                            }}
                            className="border-gray-700 text-gray-300"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={isCreating || !newName.trim()}
                            className="bg-orange-600 hover:bg-orange-700"
                        >
                            {isCreating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
