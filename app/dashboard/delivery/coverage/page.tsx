'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog'
import {
    MapPin,
    Plus,
    Trash2,
    Globe,
    Navigation,
    Info,
    Loader2,
    RefreshCw,
    Search,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface Jurisdiction {
    id: string
    state: string
    county?: string
    city?: string
    fipsCode?: string
    status: 'active' | 'inactive'
    deliveryFeeBase: number
}

export default function CoveragePage() {
    const { tenants } = useAuth()
    const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    // Form state
    const [newArea, setNewArea] = useState({
        state: 'FL',
        county: '',
        city: '',
        deliveryFeeBase: 5.00
    })

    const deliveryTenant = tenants.find(t => t.tenant.type === 'delivery_company')
    const tenantId = deliveryTenant?.tenant.id

    const fetchCoverage = useCallback(async () => {
        if (!tenantId) return

        try {
            setIsLoading(true)
            const supabase = createClient()

            // Get company ID
            const { data: company, error: companyError } = await supabase
                .from('delivery_companies')
                .select('id')
                .eq('tenant_id', tenantId)
                .single()

            if (companyError) throw companyError
            if (!company) return

            // Fetch jurisdictions
            const { data: coverageData, error } = await (supabase
                .from('delivery_company_jurisdictions' as any)
                .select('*')
                .eq('delivery_company_id', company.id) as any)

            if (error) throw error

            const transformed: Jurisdiction[] = (coverageData || []).map((j: any) => ({
                id: j.id,
                state: j.state_code,
                county: j.county_name,
                city: j.city_name,
                fipsCode: j.fips_code,
                status: j.is_active ? 'active' : 'inactive',
                deliveryFeeBase: parseFloat(j.delivery_fee_base) || 0
            }))

            setJurisdictions(transformed)
        } catch (err: any) {
            console.error('Error fetching coverage:', err)
            toast({
                title: 'Error',
                description: err.message || 'Failed to load coverage areas',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }, [tenantId])

    useEffect(() => {
        fetchCoverage()
    }, [fetchCoverage])

    const handleAddArea = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!tenantId) return

        setIsSubmitting(true)
        try {
            const supabase = createClient()

            const { data: company, error: companyError } = await supabase
                .from('delivery_companies')
                .select('id')
                .eq('tenant_id', tenantId)
                .single()

            if (companyError || !company) throw companyError || new Error('Company not found')

            const { error } = await (supabase
                .from('delivery_company_jurisdictions' as any)
                .insert({
                    delivery_company_id: company.id,
                    state_code: newArea.state,
                    county_name: newArea.county || null,
                    city_name: newArea.city || null,
                    delivery_fee_base: newArea.deliveryFeeBase,
                    is_active: true
                }) as any)

            if (error) throw error

            toast({
                title: 'Area added',
                description: 'New service area registered successfully',
            })

            setIsAddDialogOpen(false)
            setNewArea({ state: 'FL', county: '', city: '', deliveryFeeBase: 5.00 })
            fetchCoverage()
        } catch (err: any) {
            console.error('Error adding area:', err)
            toast({
                title: 'Error',
                description: err.message || 'Failed to add service area',
                variant: 'destructive',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const removeArea = async (id: string) => {
        try {
            const supabase = createClient()
            const { error } = await (supabase
                .from('delivery_company_jurisdictions' as any)
                .delete()
                .eq('id', id) as any)

            if (error) throw error

            setJurisdictions(jurisdictions.filter(j => j.id !== id))
            toast({ title: 'Area removed' })
        } catch (err) {
            toast({ title: 'Error', variant: 'destructive' })
        }
    }

    const filteredJurisdictions = jurisdictions.filter(j =>
        j.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.county?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.state.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Service Coverage</h1>
                    <p className="text-gray-400 mt-1">Define geographical areas where you provide delivery</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        className="border-gray-800 text-gray-300 hover:bg-gray-800"
                        onClick={() => fetchCoverage()}
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Service Area
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-gray-900 border-gray-800 text-white">
                            <form onSubmit={handleAddArea}>
                                <DialogHeader>
                                    <DialogTitle>Add Service Area</DialogTitle>
                                    <DialogDescription className="text-gray-400">
                                        Specify the jurisdiction and base delivery fee.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">State Code</label>
                                            <Input
                                                required
                                                maxLength={2}
                                                value={newArea.state}
                                                onChange={e => setNewArea({ ...newArea, state: e.target.value.toUpperCase() })}
                                                className="bg-gray-800 border-gray-700 uppercase"
                                                placeholder="FL"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Base Delivery Fee ($)</label>
                                            <Input
                                                required
                                                type="number"
                                                step="0.01"
                                                value={newArea.deliveryFeeBase}
                                                onChange={e => setNewArea({ ...newArea, deliveryFeeBase: parseFloat(e.target.value) })}
                                                className="bg-gray-800 border-gray-700"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">County Name (Optional)</label>
                                        <Input
                                            value={newArea.county}
                                            onChange={e => setNewArea({ ...newArea, county: e.target.value })}
                                            className="bg-gray-800 border-gray-700"
                                            placeholder="Miami-Dade"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">City Name (Optional)</label>
                                        <Input
                                            value={newArea.city}
                                            onChange={e => setNewArea({ ...newArea, city: e.target.value })}
                                            className="bg-gray-800 border-gray-700"
                                            placeholder="Miami"
                                        />
                                    </div>
                                    <div className="p-3 bg-blue-600/10 border border-blue-500/20 rounded-lg flex gap-3">
                                        <Info className="h-5 w-5 text-blue-400 flex-shrink-0" />
                                        <p className="text-xs text-blue-300">
                                            Leaving County or City blank will apply the coverage to the entire state or county respectively.
                                        </p>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto">
                                        {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                        Add Area
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-1 space-y-4">
                    <Card className="bg-gray-900 border-gray-800">
                        <CardHeader>
                            <CardTitle className="text-white text-lg flex items-center gap-2">
                                <Globe className="h-5 w-5 text-blue-400" />
                                Geographic Focus
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-400 text-sm">Active States</span>
                                    <Badge variant="secondary" className="bg-blue-600/20 text-blue-400">
                                        {new Set(jurisdictions.map(j => j.state)).size}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-400 text-sm">Total Areas</span>
                                    <Badge variant="secondary" className="bg-blue-600/20 text-blue-400">
                                        {jurisdictions.length}
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gray-900 border-gray-800">
                        <CardHeader>
                            <CardTitle className="text-white text-lg">Quick Filter</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search areas..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="pl-10 bg-gray-800 border-gray-700"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="md:col-span-3">
                    <Card className="bg-gray-900 border-gray-800 overflow-hidden">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-gray-800 hover:bg-transparent">
                                        <TableHead className="text-gray-400">Location</TableHead>
                                        <TableHead className="text-gray-400">FIPS / Code</TableHead>
                                        <TableHead className="text-gray-400">Base Fee</TableHead>
                                        <TableHead className="text-gray-400">Status</TableHead>
                                        <TableHead className="text-gray-400 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredJurisdictions.map((j) => (
                                        <TableRow key={j.id} className="border-gray-800 hover:bg-gray-800/50">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
                                                        <Navigation className="h-4 w-4 text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-medium">
                                                            {j.city || j.county || 'State-wide'}
                                                        </p>
                                                        <p className="text-gray-500 text-xs uppercase tracking-tighter">
                                                            {j.state} {j.county ? `• ${j.county} County` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-gray-400 font-mono text-xs">
                                                {j.fipsCode || 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-white font-medium">
                                                ${j.deliveryFeeBase.toFixed(2)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className="bg-green-600/20 text-green-400 border-green-500/30">
                                                    Active
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeArea(j.id)}
                                                    className="text-gray-500 hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {filteredJurisdictions.length === 0 && (
                                <div className="py-20 text-center">
                                    <MapPin className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                                    <p className="text-gray-500">No coverage areas defined</p>
                                    <Button
                                        variant="link"
                                        className="text-blue-400"
                                        onClick={() => setIsAddDialogOpen(true)}
                                    >
                                        Add your first service area
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
