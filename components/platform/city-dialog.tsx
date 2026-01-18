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

interface CityDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    stateId: string
    countyId: string
    onSuccess: () => void
    city?: any
}

export function CityDialog({ open, onOpenChange, stateId, countyId, onSuccess, city }: CityDialogProps) {
    const [name, setName] = useState(city?.name || '')
    const [placeCode, setPlaceCode] = useState(city?.fips_place_code || '')
    const [population, setPopulation] = useState(city?.population?.toString() || '')
    const [isLoading, setIsLoading] = useState(false)
    const { toast } = useToast()

    const handleSave = async () => {
        if (!name) {
            toast({ title: 'Missing fields', description: 'Name is required.', variant: 'destructive' })
            return
        }

        setIsLoading(true)
        const supabase = createClient()

        const { error } = await supabase
            .from('us_cities')
            .upsert({
                id: city?.id,
                state_id: stateId,
                county_id: countyId,
                name,
                fips_place_code: placeCode,
                population: population ? parseInt(population) : null,
                is_active: city ? city.is_active : true
            }, { onConflict: 'state_id,name' })

        if (error) {
            toast({ title: 'Save failed', description: error.message, variant: 'destructive' })
        } else {
            toast({ title: 'Saved successfully', description: `City ${name} has been ${city ? 'updated' : 'added'}.` })
            onOpenChange(false)
            onSuccess()
        }
        setIsLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-neutral-900 border-neutral-800 text-white sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{city ? 'Edit City' : 'Add New City'}</DialogTitle>
                    <DialogDescription className="text-neutral-400">
                        Add or update local city details for regional compliance.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">City Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Beverly Hills"
                            className="bg-neutral-950 border-neutral-800"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="code">FIPS Place Code (Optional)</Label>
                        <Input
                            id="code"
                            value={placeCode}
                            onChange={(e) => setPlaceCode(e.target.value)}
                            placeholder="Census place code"
                            className="bg-neutral-950 border-neutral-800 font-mono"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="population">Population</Label>
                        <Input
                            id="population"
                            type="number"
                            value={population}
                            onChange={(e) => setPopulation(e.target.value)}
                            placeholder="Approximate population"
                            className="bg-neutral-950 border-neutral-800"
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
                        {city ? 'Update' : 'Create'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
