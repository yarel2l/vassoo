'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Percent,
    Plus,
    Search,
    History,
    Edit3,
    Trash2,
    CheckCircle2,
    AlertCircle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { TaxRateDialog } from '@/components/platform/tax-rate-dialog'

interface TaxRate {
    id: string
    scope: 'state' | 'county' | 'city'
    name: string
    rate: number
    tax_type: string | null
    applies_to: string | null
    is_active: boolean | null
    state_id: string | null
    effective_date: string
    us_states: { name: string, usps_code: string } | null
}

export default function PlatformTaxesPage() {
    const [taxes, setTaxes] = useState<TaxRate[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedTaxRate, setSelectedTaxRate] = useState<TaxRate | null>(null)
    const { toast } = useToast()

    const fetchTaxes = async () => {
        setIsLoading(true)
        const supabase = createClient()

        const { data, error } = await supabase
            .from('tax_rates')
            .select(`
                *,
                us_states ( name, usps_code )
            `)
            .order('created_at', { ascending: false })

        if (error) {
            toast({
                title: 'Error fetching tax rates',
                description: error.message,
                variant: 'destructive'
            })
        } else {
            setTaxes(data || [])
        }
        setIsLoading(false)
    }

    useEffect(() => {
        fetchTaxes()
    }, [])

    const handleEdit = (tax: TaxRate) => {
        setSelectedTaxRate(tax)
        setIsDialogOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this tax rate?')) return

        const supabase = createClient()
        const { error } = await supabase
            .from('tax_rates')
            .delete()
            .eq('id', id)

        if (error) {
            toast({
                title: 'Error deleting tax rate',
                description: error.message,
                variant: 'destructive'
            })
        } else {
            toast({
                title: 'Tax rate deleted',
                description: 'The tax rate has been removed.'
            })
            fetchTaxes()
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Tax Configuration</h1>
                    <p className="text-neutral-400">Manage sales and specialized taxes by jurisdiction</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="bg-neutral-900 border-neutral-800 text-white hover:bg-neutral-800">
                        <History className="h-4 w-4 mr-2" />
                        Tax History
                    </Button>
                    <Button
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        onClick={() => {
                            setSelectedTaxRate(null)
                            setIsDialogOpen(true)
                        }}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Tax Rate
                    </Button>
                </div>
            </div>

            <Card className="bg-neutral-900 border-neutral-800">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-white">Active Tax Rates</CardTitle>
                        <CardDescription className="text-neutral-500">Current tax percentages being applied to orders</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                            <Input placeholder="Filter taxes..." className="pl-10 h-9 w-64 bg-neutral-950 border-neutral-800 text-white text-sm" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-neutral-800 hover:bg-transparent">
                                <TableHead className="text-neutral-400">Jurisdiction</TableHead>
                                <TableHead className="text-neutral-400">Tax Name</TableHead>
                                <TableHead className="text-neutral-400">Type</TableHead>
                                <TableHead className="text-neutral-400">Rate</TableHead>
                                <TableHead className="text-neutral-400">Status</TableHead>
                                <TableHead className="text-neutral-400 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10">
                                        <div className="animate-spin h-6 w-6 border-b-2 border-indigo-500 mx-auto"></div>
                                    </TableCell>
                                </TableRow>
                            ) : taxes.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10 text-neutral-500 italic">
                                        No tax rates configured yet.
                                    </TableCell>
                                </TableRow>
                            ) : taxes.map((tax) => (
                                <TableRow key={tax.id} className="border-neutral-800">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-white">{tax.us_states?.name || 'All States'}</span>
                                            <span className="text-xs text-indigo-400 uppercase font-bold tracking-tighter">{tax.scope}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-neutral-300">{tax.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="bg-neutral-800 text-neutral-400 border-neutral-700 capitalize">
                                            {tax.tax_type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 font-bold text-white">
                                            <Percent className="h-4 w-4 text-indigo-500" />
                                            {(Number(tax.rate) * 100).toFixed(2)}%
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className={cn(
                                            tax.is_active ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-neutral-800 text-neutral-600"
                                        )}>
                                            {tax.is_active ? "Active" : "Archived"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-neutral-500 hover:text-white"
                                                onClick={() => handleEdit(tax)}
                                            >
                                                <Edit3 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-neutral-500 hover:text-red-400"
                                                onClick={() => handleDelete(tax.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <TaxRateDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSave={fetchTaxes}
                taxRate={selectedTaxRate}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-indigo-500/5 border-indigo-500/20">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="h-5 w-5 text-indigo-500" />
                            <CardTitle className="text-sm font-semibold text-white">Tax Engine Status</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-neutral-400">
                            Automatic tax calculation is synchronized with the latest IRS and state-level guidelines. Last sync: Today, 02:00 AM.
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-amber-500/5 border-amber-500/20">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                            <CardTitle className="text-sm font-semibold text-white">Pending Updates</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-neutral-400">
                            New alcohol excise tax regulations for Arizona go into effect Nexus Q1-2024. Please prepare rate updates.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
