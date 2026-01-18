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
import {
    Coins,
    Plus,
    History,
    Edit3,
    ArrowUpRight,
    ArrowDownRight,
    TrendingUp,
    ShieldCheck,
    Globe,
    Zap,
    MapPin
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { PlatformFeeDialog } from '@/components/platform/platform-fee-dialog'

interface PlatformFee {
    id: string
    scope: 'global' | 'state' | null
    name: string
    fee_type: string
    calculation_type: 'percentage' | 'fixed' | 'tiered'
    value: number
    is_active: boolean | null
    state_id: string | null
    effective_date: string
    us_states: { name: string, usps_code: string } | null
}

export default function PlatformFeesPage() {
    const [fees, setFees] = useState<PlatformFee[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedFee, setSelectedFee] = useState<PlatformFee | null>(null)
    const { toast } = useToast()

    const fetchFees = async () => {
        setIsLoading(true)
        const supabase = createClient()

        const { data, error } = await supabase
            .from('platform_fees')
            .select(`
                *,
                us_states ( name, usps_code )
            `)
            .order('scope', { ascending: true })

        if (error) {
            toast({
                title: 'Error fetching fees',
                description: error.message,
                variant: 'destructive'
            })
        } else {
            setFees((data || []) as PlatformFee[])
        }
        setIsLoading(false)
    }

    useEffect(() => {
        fetchFees()
    }, [])

    const handleEdit = (fee: PlatformFee) => {
        setSelectedFee(fee)
        setIsDialogOpen(true)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Platform Fees</h1>
                    <p className="text-neutral-400">Configure marketplace commissions and operational service fees</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="bg-neutral-900 border-neutral-800 text-white hover:bg-neutral-800">
                        <History className="h-4 w-4 mr-2" />
                        Change Log
                    </Button>
                    <Button
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        onClick={() => {
                            setSelectedFee(null)
                            setIsDialogOpen(true)
                        }}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New Fee Rule
                    </Button>
                </div>
            </div>

            {/* Fees Quick Access */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-neutral-900 border-neutral-800 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Zap className="h-16 w-16 text-indigo-500" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-400 uppercase tracking-widest">Marketplace</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">10.0%</div>
                        <p className="text-xs text-neutral-500 mt-1">Global Standard Commission</p>
                    </CardContent>
                </Card>

                <Card className="bg-neutral-900 border-neutral-800 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp className="h-16 w-16 text-green-500" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-400 uppercase tracking-widest">Processing</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">2.9% + 30¢</div>
                        <p className="text-xs text-neutral-500 mt-1">Stripe Connect Standard</p>
                    </CardContent>
                </Card>

                <Card className="bg-neutral-900 border-neutral-800 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Coins className="h-16 w-16 text-amber-500" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-400 uppercase tracking-widest">Revenue Split</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">$14.2k</div>
                        <p className="text-xs text-neutral-500 mt-1">Platform Revenue (MTD)</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-neutral-900 border-neutral-800">
                <CardHeader>
                    <CardTitle className="text-white">Fee Rules & Overrides</CardTitle>
                    <CardDescription className="text-neutral-500">Manage global and regional fee structures</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-neutral-800 hover:bg-transparent">
                                <TableHead className="text-neutral-400">Jurisdiction</TableHead>
                                <TableHead className="text-neutral-400">Fee Name</TableHead>
                                <TableHead className="text-neutral-400">Type</TableHead>
                                <TableHead className="text-neutral-400">Value</TableHead>
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
                            ) : fees.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10 text-neutral-500 italic">
                                        No fee rules configured.
                                    </TableCell>
                                </TableRow>
                            ) : fees.map((fee) => (
                                <TableRow key={fee.id} className="border-neutral-800">
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {fee.scope === 'global' ? <Globe className="h-4 w-4 text-indigo-400" /> : <MapPin className="h-4 w-4 text-amber-400" />}
                                            <span className="text-sm font-medium text-white capitalize">{fee.scope === 'global' ? 'Global' : fee.us_states?.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-neutral-300 font-medium">{fee.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="bg-neutral-800 text-neutral-400 border-neutral-700 font-mono">
                                            {fee.fee_type.replace('_', ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 font-bold text-white">
                                            {fee.calculation_type === 'percentage' ? (
                                                <>{(Number(fee.value) * 100).toFixed(1)}%</>
                                            ) : (
                                                <>${Number(fee.value).toFixed(2)}</>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className={cn("h-1.5 w-1.5 rounded-full", fee.is_active ? "bg-green-500" : "bg-neutral-600")} />
                                            <span className={cn("text-xs font-medium", fee.is_active ? "text-green-500" : "text-neutral-600")}>
                                                {fee.is_active ? "Active" : "Disabled"}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-neutral-500 hover:text-white"
                                            onClick={() => handleEdit(fee)}
                                        >
                                            <Edit3 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <PlatformFeeDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSave={fetchFees}
                fee={selectedFee as any}
            />

            {/* Smart Advisory */}
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-start gap-4">
                <div className="p-2 bg-indigo-500 rounded-lg">
                    <ShieldCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-white">Stripe Pricing Synchronization</h3>
                    <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                        The fees configured here are used for platform calculations and displayed summaries. Ensure these match your Stripe Connect Application fees to avoid revenue leakage. Payment processing fees are deducted at the source by Stripe.
                    </p>
                </div>
            </div>
        </div>
    )
}
