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
    Search,
    MapPin,
    Globe,
    ChevronRight,
    SearchCode,
    Activity,
    Lock,
    Unlock,
    Settings2,
    ArrowLeft
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { CountyDialog } from '@/components/platform/county-dialog'
import { CityDialog } from '@/components/platform/city-dialog'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'

interface USState {
    id: string
    fips_code: string
    usps_code: string
    name: string
    is_active: boolean | null
    alcohol_sale_allowed: boolean | null
}

interface USCounty {
    id: string
    state_id: string
    fips_code: string
    name: string
    is_active: boolean | null
}

interface USCity {
    id: string
    county_id: string
    state_id: string
    name: string
    is_active: boolean | null
}

type ViewMode = 'states' | 'counties' | 'cities'

export default function PlatformJurisdictionsPage() {
    const [states, setStates] = useState<USState[]>([])
    const [counties, setCounties] = useState<USCounty[]>([])
    const [cities, setCities] = useState<USCity[]>([])

    const [viewMode, setViewMode] = useState<ViewMode>('states')
    const [selectedState, setSelectedState] = useState<USState | null>(null)
    const [selectedCounty, setSelectedCounty] = useState<USCounty | null>(null)

    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isCountyDialogOpen, setIsCountyDialogOpen] = useState(false)
    const [isCityDialogOpen, setIsCityDialogOpen] = useState(false)
    const [isFipsToolOpen, setIsFipsToolOpen] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const { toast } = useToast()

    const fetchStates = async () => {
        setIsLoading(true)
        const supabase = createClient()
        const { data, error } = await supabase
            .from('us_states')
            .select('*')
            .order('name', { ascending: true })

        if (error) {
            toast({ title: 'Error fetching states', description: error.message, variant: 'destructive' })
        } else {
            setStates((data || []) as USState[])
        }
        setIsLoading(false)
    }

    const fetchCounties = async (stateId: string) => {
        setIsLoading(true)
        const supabase = createClient()
        const { data, error } = await supabase
            .from('us_counties')
            .select('*')
            .eq('state_id', stateId)
            .order('name', { ascending: true })

        if (error) {
            toast({ title: 'Error fetching counties', description: error.message, variant: 'destructive' })
        } else {
            setCounties((data || []) as USCounty[])
            setViewMode('counties')
        }
        setIsLoading(false)
    }

    const fetchCities = async (countyId: string) => {
        setIsLoading(true)
        const supabase = createClient()
        const { data, error } = await supabase
            .from('us_cities')
            .select('*')
            .eq('county_id', countyId)
            .order('name', { ascending: true })

        if (error) {
            toast({ title: 'Error fetching cities', description: error.message, variant: 'destructive' })
        } else {
            setCities((data || []) as USCity[])
            setViewMode('cities')
        }
        setIsLoading(false)
    }

    useEffect(() => {
        fetchStates()
    }, [])

    const toggleActive = async (id: string, table: any, currentStatus: boolean | null) => {
        const supabase = createClient()
        const { error } = await supabase
            .from(table)
            .update({ is_active: !currentStatus })
            .eq('id', id)

        if (error) {
            toast({ title: 'Operation failed', description: error.message, variant: 'destructive' })
        } else {
            toast({ title: 'Status updated', description: 'Operational status updated successfully.' })
            if (viewMode === 'states') fetchStates()
            else if (viewMode === 'counties') fetchCounties(selectedState!.id)
            else if (viewMode === 'cities') fetchCities(selectedCounty!.id)
        }
    }

    const handleBack = () => {
        setSearchTerm('')
        if (viewMode === 'cities') {
            setViewMode('counties')
            setCities([])
            setSelectedCounty(null)
        } else if (viewMode === 'counties') {
            setViewMode('states')
            setCounties([])
            setSelectedState(null)
        }
    }

    const filteredItems =
        viewMode === 'states' ? states.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.usps_code.toLowerCase().includes(searchTerm.toLowerCase())) :
            viewMode === 'counties' ? counties.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())) :
                cities.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))

    const handleGisSync = async () => {
        setSyncing(true)
        // Simulated GIS Sync - in reality this would call a background job
        await new Promise(resolve => setTimeout(resolve, 2000))

        toast({
            title: "GIS Data Synchronized",
            description: `Region-specific geometry and FIPS data for ${selectedState?.name || 'US'} updated.`,
        })
        setSyncing(false)
        if (viewMode === 'states') fetchStates()
        else if (viewMode === 'counties') fetchCounties(selectedState!.id)
        else if (viewMode === 'cities') fetchCities(selectedCounty!.id)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        {viewMode !== 'states' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-white" onClick={handleBack}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        )}
                        <h1 className="text-2xl font-bold text-white">
                            {viewMode === 'states' && "US Jurisdictions"}
                            {viewMode === 'counties' && `Counties in ${selectedState?.name}`}
                            {viewMode === 'cities' && `Cities in ${selectedCounty?.name}`}
                        </h1>
                    </div>
                    <p className="text-neutral-400">
                        {viewMode === 'states' && "Manage operational areas, regional laws and geographic footprint"}
                        {viewMode !== 'states' && `Drilling down into ${viewMode === 'counties' ? 'regional' : 'local'} operational sectors`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        className="bg-neutral-900 border-neutral-800 text-white hover:bg-neutral-800"
                        onClick={() => setIsFipsToolOpen(true)}
                    >
                        <SearchCode className="h-4 w-4 mr-2" />
                        FIPS Tool
                    </Button>
                    <Button
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        onClick={handleGisSync}
                        disabled={syncing}
                    >
                        {syncing ? <Activity className="h-4 w-4 mr-2 animate-spin" /> : <Globe className="h-4 w-4 mr-2" />}
                        Sync GIS Data
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 bg-neutral-900 border-neutral-800">
                    <CardHeader>
                        <div className="flex items-center justify-between gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                                <Input
                                    placeholder={`Search ${viewMode}...`}
                                    className="pl-10 bg-neutral-950 border-neutral-800 text-white"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            {viewMode !== 'states' && (
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 px-3 py-1">
                                        {selectedState?.usps_code} {selectedCounty ? `/ ${selectedCounty.name}` : ''}
                                    </Badge>
                                    <Button
                                        size="sm"
                                        className="bg-indigo-600 text-white hover:bg-indigo-700 h-9"
                                        onClick={() => {
                                            if (viewMode === 'counties') setIsCountyDialogOpen(true)
                                            else setIsCityDialogOpen(true)
                                        }}
                                    >
                                        Add {viewMode === 'counties' ? 'County' : 'City'}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow className="border-neutral-800 hover:bg-transparent">
                                    <TableHead className="text-neutral-400">
                                        {viewMode === 'states' ? 'State' : viewMode === 'counties' ? 'County' : 'City'}
                                    </TableHead>
                                    <TableHead className="text-neutral-400">
                                        {viewMode === 'states' ? 'Code' : 'FIPS'}
                                    </TableHead>
                                    <TableHead className="text-neutral-400">Status</TableHead>
                                    <TableHead className="text-neutral-400 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-10">
                                            <div className="animate-spin h-6 w-6 border-b-2 border-indigo-500 mx-auto"></div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredItems.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-10 text-neutral-500 italic">
                                            No {viewMode} found.
                                        </TableCell>
                                    </TableRow>
                                ) : filteredItems.map((item: any) => (
                                    <TableRow key={item.id} className="border-neutral-800">
                                        <TableCell className="font-medium text-white">{item.name}</TableCell>
                                        <TableCell className="text-neutral-400 font-mono text-xs">
                                            {viewMode === 'states' ? item.usps_code : item.fips_code || 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cn(
                                                item.is_active ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-neutral-800 text-neutral-500"
                                            )}>
                                                {item.is_active ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-neutral-400 hover:text-white"
                                                    onClick={() => toggleActive(item.id, viewMode === 'states' ? 'us_states' : viewMode === 'counties' ? 'us_counties' : 'us_cities', item.is_active)}
                                                >
                                                    {item.is_active ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                                                </Button>
                                                {viewMode !== 'cities' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-neutral-400 hover:text-white"
                                                        onClick={() => {
                                                            if (viewMode === 'states') {
                                                                setSelectedState(item)
                                                                fetchCounties(item.id)
                                                            } else {
                                                                setSelectedCounty(item)
                                                                fetchCities(item.id)
                                                            }
                                                            setSearchTerm('')
                                                        }}
                                                    >
                                                        <ChevronRight className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="bg-neutral-900 border-neutral-800">
                        <CardHeader>
                            <CardTitle className="text-white text-lg">Regional Statistics</CardTitle>
                            <CardDescription className="text-neutral-500">Global operational footprint</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-lg border border-neutral-800">
                                <div className="flex items-center gap-3">
                                    <Globe className="h-4 w-4 text-indigo-400" />
                                    <span className="text-sm text-white">Active States</span>
                                </div>
                                <span className="text-sm font-bold text-white">{states.filter(s => s.is_active).length} / 51</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-lg border border-neutral-800">
                                <div className="flex items-center gap-3">
                                    <Activity className="h-4 w-4 text-indigo-400" />
                                    <span className="text-sm text-white">Counties Covered</span>
                                </div>
                                <span className="text-sm font-bold text-white">842</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-lg border border-neutral-800">
                                <div className="flex items-center gap-3">
                                    <MapPin className="h-4 w-4 text-indigo-400" />
                                    <span className="text-sm text-white">Cities Served</span>
                                </div>
                                <span className="text-sm font-bold text-white">2.4k</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-neutral-900 border-neutral-800 border-dashed">
                        <CardContent className="pt-6 text-center">
                            <Settings2 className="h-8 w-8 text-neutral-600 mx-auto mb-3" />
                            <h3 className="text-sm font-medium text-white">Manual Override Active</h3>
                            <p className="text-xs text-neutral-500 mt-1">
                                {viewMode === 'states' ?
                                    "County and City level management can be automated via GIS Sync or manually overridden using the tools above." :
                                    "You are in manual override mode. Operational status changes here will take effect immediately platform-wide."
                                }
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Dialogs */}
            {selectedState && (
                <CountyDialog
                    open={isCountyDialogOpen}
                    onOpenChange={setIsCountyDialogOpen}
                    stateId={selectedState.id}
                    onSuccess={() => fetchCounties(selectedState.id)}
                />
            )}

            {selectedState && selectedCounty && (
                <CityDialog
                    open={isCityDialogOpen}
                    onOpenChange={setIsCityDialogOpen}
                    stateId={selectedState.id}
                    countyId={selectedCounty.id}
                    onSuccess={() => fetchCities(selectedCounty.id)}
                />
            )}

            <Dialog open={isFipsToolOpen} onOpenChange={setIsFipsToolOpen}>
                <DialogContent className="bg-neutral-900 border-neutral-800 text-white sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>FIPS Code Lookup Utility</DialogTitle>
                        <DialogDescription className="text-neutral-400">
                            FIPS (Federal Information Processing Series) codes are used to uniquely identify geographic areas for tax compliance.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="p-4 bg-neutral-950 rounded-lg border border-neutral-800">
                            <h4 className="text-sm font-semibold mb-2">Structure</h4>
                            <p className="text-xs text-neutral-400 leading-relaxed">
                                - <strong className="text-indigo-400">States</strong>: 2-digit code (e.g., 06 for CA)<br />
                                - <strong className="text-indigo-400">Counties</strong>: 5-digit code (State [2] + County [3], e.g., 06037)<br />
                                - <strong className="text-indigo-400">Cities/Places</strong>: 5 or 7-digit Census codes.
                            </p>
                        </div>
                        <div className="text-xs text-neutral-500 italic">
                            Tip: You can find official codes at the <a href="https://www.census.gov/library/reference/code-lists/ansi.html" target="_blank" className="text-indigo-500 underline">US Census ANSI/FIPS resource page</a>.
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
