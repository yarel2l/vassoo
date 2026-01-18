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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Search,
    MoreHorizontal,
    Truck,
    Users,
    Star,
    ExternalLink,
    Filter,
    CheckCircle2,
    XCircle,
    MapPin,
    AlertTriangle
} from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface DeliveryPartner {
    id: string
    name: string
    slug: string
    is_active: boolean
    average_rating: number
    total_deliveries: number
    created_at: string
    driver_count: number
}

export default function PlatformDeliveryPage() {
    const [partners, setPartners] = useState<DeliveryPartner[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const { toast } = useToast()

    const fetchPartners = async () => {
        setIsLoading(true)
        const supabase = createClient()

        // Fetch companies and count their drivers
        const { data, error } = await supabase
            .from('delivery_companies')
            .select(`
                id,
                name,
                slug,
                is_active,
                average_rating,
                total_deliveries,
                created_at,
                delivery_drivers (id)
            `)
            .order('created_at', { ascending: false })

        if (error) {
            toast({
                title: 'Error fetching partners',
                description: error.message,
                variant: 'destructive'
            })
        } else {
            const formattedData = data.map((item: any) => ({
                id: item.id,
                name: item.name,
                slug: item.slug,
                is_active: item.is_active,
                average_rating: Number(item.average_rating) || 0,
                total_deliveries: item.total_deliveries || 0,
                created_at: item.created_at,
                driver_count: item.delivery_drivers?.length || 0
            }))
            setPartners(formattedData)
        }
        setIsLoading(false)
    }

    useEffect(() => {
        fetchPartners()
    }, [])

    const togglePartnerActive = async (id: string, currentStatus: boolean) => {
        const supabase = createClient()
        const { error } = await supabase
            .from('delivery_companies')
            .update({ is_active: !currentStatus })
            .eq('id', id)

        if (error) {
            toast({
                title: 'Operation failed',
                description: error.message,
                variant: 'destructive'
            })
        } else {
            toast({
                title: currentStatus ? 'Partner suspended' : 'Partner activated',
                description: `Successfully updated the status of the delivery partner.`
            })
            fetchPartners()
        }
    }

    const filteredPartners = partners.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.slug.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Delivery Partners</h1>
                    <p className="text-neutral-400">Manage logistics companies and delivery fleets</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="bg-neutral-900 border-neutral-800 text-white hover:bg-neutral-800">
                        <MapPin className="h-4 w-4 mr-2" />
                        Service Areas
                    </Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        Onboard Partner
                    </Button>
                </div>
            </div>

            <Card className="bg-neutral-900 border-neutral-800">
                <CardHeader>
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                        <Input
                            placeholder="Search partners..."
                            className="pl-10 bg-neutral-950 border-neutral-800 text-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-neutral-800 hover:bg-transparent">
                                <TableHead className="text-neutral-400">Company</TableHead>
                                <TableHead className="text-neutral-400">Status</TableHead>
                                <TableHead className="text-neutral-400">Fleet Size</TableHead>
                                <TableHead className="text-neutral-400">Performance</TableHead>
                                <TableHead className="text-neutral-400 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10">
                                        <div className="animate-spin h-6 w-6 border-b-2 border-indigo-500 mx-auto"></div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredPartners.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10 text-neutral-500">
                                        No delivery partners found.
                                    </TableCell>
                                </TableRow>
                            ) : filteredPartners.map((partner) => (
                                <TableRow key={partner.id} className="border-neutral-800">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-500/10 rounded-lg">
                                                <Truck className="h-4 w-4 text-indigo-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-white">{partner.name}</p>
                                                <p className="text-xs text-neutral-500">/{partner.slug}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={partner.is_active ? 'success' : 'destructive'} className={cn(
                                            partner.is_active ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                                        )}>
                                            {partner.is_active ? 'Online' : 'Disabled'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-neutral-300">
                                            <Users className="h-4 w-4 text-neutral-500" />
                                            <span className="text-sm">{partner.driver_count} Drivers</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                                                <span className="text-sm text-white font-medium">{partner.average_rating}</span>
                                            </div>
                                            <p className="text-xs text-neutral-500">{partner.total_deliveries} total tasks</p>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-neutral-900 border-neutral-800 text-white">
                                                <DropdownMenuLabel>Partner Actions</DropdownMenuLabel>
                                                <DropdownMenuSeparator className="bg-neutral-800" />
                                                <DropdownMenuItem className="focus:bg-neutral-800 cursor-pointer">
                                                    <Activity className="mr-2 h-4 w-4" />
                                                    Real-time Fleet Map
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="focus:bg-neutral-800 cursor-pointer">
                                                    <DollarSign className="mr-2 h-4 w-4" />
                                                    Billing & Payouts
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator className="bg-neutral-800" />
                                                <DropdownMenuItem
                                                    className={cn(
                                                        "focus:bg-neutral-800 cursor-pointer",
                                                        partner.is_active ? "text-red-400" : "text-green-400"
                                                    )}
                                                    onClick={() => togglePartnerActive(partner.id, partner.is_active)}
                                                >
                                                    {partner.is_active ? (
                                                        <>
                                                            <XCircle className="mr-2 h-4 w-4" />
                                                            Disable Services
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle2 className="mr-2 h-4 w-4" />
                                                            Enable Services
                                                        </>
                                                    )}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Alert for pending issues */}
            <Card className="bg-amber-500/5 border-amber-500/20">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-semibold text-amber-500">Logistics Advisory</h3>
                            <p className="text-sm text-neutral-400 mt-1">
                                2 delivery partners have high delay rates in the California region. Consider reviewing their capacity settings or onboarding new partners for the area.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

import { DollarSign, Activity } from 'lucide-react'
