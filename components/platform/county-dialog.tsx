'use client'

import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface CountyDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    stateId: string
    onSuccess: () => void
    county?: any
}

export function CountyDialog({ open, onOpenChange, stateId, onSuccess, county }: CountyDialogProps) {
    const [name, setName] = useState(county?.name || '')
    const [fipsCode, setFipsCode] = useState(county?.fips_code || '')
    const [isLoading, setIsLoading] = useState(false)
    const { toast } = useToast()

    const handleSave = async () => {
        if (!name || !fipsCode) {
            toast({ title: 'Missing fields', description: 'Please fill in all fields.', variant: 'destructive' })
            return
        }

        setIsLoading(true)
        const supabase = createClient()

        const { error } = await supabase
            .from('us_counties')
            .upsert({
                id: county?.id, // undefined for new ones
                state_id: stateId,
                name,
                fips_code: fipsCode,
                is_active: county ? county.is_active : true
            }, { onConflict: 'fips_code' })

        if (error) {
            toast({ title: 'Save failed', description: error.message, variant: 'destructive' })
        } else {
            toast({ title: 'Saved successfully', description: `County ${name} has been ${county ? 'updated' : 'added'}.` })
            onOpenChange(false)
            onSuccess()
        }
        setIsLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-neutral-900 border-neutral-800 text-white sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{county ? 'Edit County' : 'Add New County'}</DialogTitle>
                    <DialogDescription className="text-neutral-400">
                        Enter the county details. FIPS codes are essential for tax calculations.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">County Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Los Angeles"
                            className="bg-neutral-950 border-neutral-800"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="fips">FIPS Code (5 digits)</Label>
                        <Input
                            id="fips"
                            value={fipsCode}
                            onChange={(e) => setFipsCode(e.target.value)}
                            placeholder="e.g. 06037"
                            maxLength={5}
                            className="bg-neutral-950 border-neutral-800 font-mono"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="text-neutral-400 hover:text-white"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        disabled={isLoading}
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {county ? 'Update' : 'Create'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
