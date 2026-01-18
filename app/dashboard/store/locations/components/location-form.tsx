'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { AddressAutocomplete } from '@/components/address-autocomplete'
import { BusinessHoursEditor, BusinessHours, defaultBusinessHours } from './business-hours-editor'
import { toast } from '@/hooks/use-toast'
import {
    MapPin,
    Clock,
    Truck,
    Settings,
    Loader2,
    ArrowLeft,
    ChevronDown,
    ChevronUp,
} from 'lucide-react'

interface StoreLocation {
    id: string
    store_id: string
    name: string
    address_line1: string
    address_line2?: string
    city: string
    state: string
    zip_code: string
    country: string
    phone?: string
    coordinates?: { lat: number; lng: number }
    business_hours: BusinessHours
    timezone: string
    is_pickup_available: boolean
    is_delivery_available: boolean
    coverage_radius_miles: number
    is_active: boolean
    is_primary: boolean
}

interface LocationFormProps {
    location?: StoreLocation | null
    storeId: string
    mode: 'create' | 'edit'
}

const TIMEZONES = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
]

export function LocationForm({ location, storeId, mode }: LocationFormProps) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [expandedSections, setExpandedSections] = useState({
        businessHours: true,
        serviceOptions: true,
    })

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        zip_code: '',
        country: 'US',
        phone: '',
        coordinates: null as { lat: number; lng: number } | null,
        business_hours: defaultBusinessHours,
        timezone: 'America/New_York',
        is_pickup_available: true,
        is_delivery_available: true,
        coverage_radius_miles: 10,
        is_active: true,
        is_primary: false,
    })

    const [addressDisplay, setAddressDisplay] = useState('')
    const [errors, setErrors] = useState<Record<string, string>>({})

    // Load existing location data
    useEffect(() => {
        if (location) {
            setFormData({
                name: location.name || '',
                address_line1: location.address_line1 || '',
                address_line2: location.address_line2 || '',
                city: location.city || '',
                state: location.state || '',
                zip_code: location.zip_code || '',
                country: location.country || 'US',
                phone: location.phone || '',
                coordinates: location.coordinates || null,
                business_hours: location.business_hours || defaultBusinessHours,
                timezone: location.timezone || 'America/New_York',
                is_pickup_available: location.is_pickup_available ?? true,
                is_delivery_available: location.is_delivery_available ?? true,
                coverage_radius_miles: location.coverage_radius_miles || 10,
                is_active: location.is_active ?? true,
                is_primary: location.is_primary ?? false,
            })

            // Construct display address
            const parts = [
                location.address_line1,
                location.address_line2,
                location.city,
                location.state,
                location.zip_code,
            ].filter(Boolean)
            setAddressDisplay(parts.join(', '))
        }
    }, [location])

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections((prev) => ({
            ...prev,
            [section]: !prev[section],
        }))
    }

    const handleAddressSelect = (address: {
        street: string
        city: string
        state: string
        zipCode: string
        country: string
        placeId?: string
        coordinates?: { lat: number; lng: number }
    }) => {
        setFormData((prev) => ({
            ...prev,
            address_line1: address.street,
            city: address.city,
            state: address.state,
            zip_code: address.zipCode,
            country: address.country || 'US',
            coordinates: address.coordinates || null,
        }))

        // Clear address error if it was set
        if (errors.address) {
            setErrors((prev) => {
                const newErrors = { ...prev }
                delete newErrors.address
                return newErrors
            })
        }
    }

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {}

        if (!formData.name.trim()) {
            newErrors.name = 'Location name is required'
        }

        if (!formData.address_line1.trim()) {
            newErrors.address = 'Address is required'
        }

        if (!formData.city.trim()) {
            newErrors.city = 'City is required'
        }

        if (!formData.state.trim()) {
            newErrors.state = 'State is required'
        }

        if (!formData.coordinates) {
            newErrors.coordinates = 'Please select an address from the suggestions to get coordinates'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async () => {
        if (!validate()) {
            toast({
                title: 'Validation Error',
                description: 'Please fill in all required fields',
                variant: 'destructive',
            })
            return
        }

        setIsSubmitting(true)

        try {
            const supabase = createClient()

            // Format coordinates for PostGIS: POINT(lng lat)
            const coordinatesPoint = formData.coordinates
                ? `POINT(${formData.coordinates.lng} ${formData.coordinates.lat})`
                : null

            // Location data to save
            const locationData = {
                name: formData.name,
                address_line1: formData.address_line1,
                address_line2: formData.address_line2 || null,
                city: formData.city,
                state: formData.state,
                zip_code: formData.zip_code,
                country: formData.country,
                coordinates: coordinatesPoint,
                business_hours: formData.business_hours,
                timezone: formData.timezone,
                is_pickup_available: formData.is_pickup_available,
                is_delivery_available: formData.is_delivery_available,
                coverage_radius_miles: formData.coverage_radius_miles,
                is_active: formData.is_active,
                is_primary: formData.is_primary,
            }

            if (mode === 'edit' && location) {
                // Update existing
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error } = await supabase
                    .from('store_locations')
                    .update(locationData as any)
                    .eq('id', location.id)

                if (error) throw error
                toast({ title: 'Location updated successfully' })
            } else {
                // Create new - include store_id
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error } = await supabase
                    .from('store_locations')
                    .insert({
                        ...locationData,
                        store_id: storeId,
                    } as any)

                if (error) throw error
                toast({ title: 'Location created successfully' })
            }

            // Navigate back to locations list
            router.push('/dashboard/store/locations')
            router.refresh()
        } catch (err) {
            console.error('Error saving location:', err)
            toast({
                title: 'Error',
                description: err instanceof Error ? err.message : 'Failed to save location',
                variant: 'destructive',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/dashboard/store" className="text-gray-400 hover:text-white">
                            Dashboard
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="text-gray-600" />
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/dashboard/store/locations" className="text-gray-400 hover:text-white">
                            Locations
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="text-gray-600" />
                    <BreadcrumbItem>
                        <BreadcrumbPage className="text-white">
                            {mode === 'edit' ? 'Edit Location' : 'New Location'}
                        </BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/dashboard/store/locations')}
                    className="text-gray-400 hover:text-white"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-white">
                        {mode === 'edit' ? 'Edit Location' : 'Add New Location'}
                    </h1>
                    <p className="text-gray-400 mt-1">
                        {mode === 'edit'
                            ? 'Update location details and business hours'
                            : 'Add a new store location'}
                    </p>
                </div>
            </div>

            {/* Basic Information */}
            <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-orange-500" />
                        Basic Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-gray-300">
                                Location Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Main Store, Downtown Branch..."
                                className="bg-gray-800 border-gray-700 text-white"
                            />
                            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-300">Phone</Label>
                            <Input
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="(555) 123-4567"
                                className="bg-gray-800 border-gray-700 text-white"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <div>
                            <Label className="text-gray-300">Primary Location</Label>
                            <p className="text-sm text-gray-500">Mark as the main/default store location</p>
                        </div>
                        <Switch
                            checked={formData.is_primary}
                            onCheckedChange={(checked) => setFormData({ ...formData, is_primary: checked })}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Address */}
            <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-orange-500" />
                        Address
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                        Start typing to search for an address with Google Places
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-gray-300">
                            Street Address <span className="text-red-500">*</span>
                        </Label>
                        <AddressAutocomplete
                            value={addressDisplay}
                            onChange={setAddressDisplay}
                            onAddressSelect={handleAddressSelect}
                            placeholder="Start typing an address..."
                            error={errors.address || errors.coordinates}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-gray-300">Apartment, suite, etc.</Label>
                        <Input
                            value={formData.address_line2}
                            onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                            placeholder="Apt 4B, Suite 200..."
                            className="bg-gray-800 border-gray-700 text-white"
                        />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label className="text-gray-300">City</Label>
                            <Input
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                className="bg-gray-800 border-gray-700 text-white"
                                readOnly
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-300">State</Label>
                            <Input
                                value={formData.state}
                                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                className="bg-gray-800 border-gray-700 text-white"
                                readOnly
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-300">ZIP Code</Label>
                            <Input
                                value={formData.zip_code}
                                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                                className="bg-gray-800 border-gray-700 text-white"
                                readOnly
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-300">Country</Label>
                            <Input
                                value={formData.country}
                                className="bg-gray-800 border-gray-700 text-white"
                                readOnly
                            />
                        </div>
                    </div>

                    {formData.coordinates && (
                        <div className="p-3 bg-gray-800/50 rounded-lg">
                            <p className="text-sm text-gray-400">
                                Coordinates: {formData.coordinates.lat.toFixed(6)}, {formData.coordinates.lng.toFixed(6)}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Business Hours */}
            <Card className="bg-gray-900 border-gray-800">
                <CardHeader
                    className="cursor-pointer"
                    onClick={() => toggleSection('businessHours')}
                >
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-white flex items-center gap-2">
                            <Clock className="h-5 w-5 text-orange-500" />
                            Business Hours
                        </CardTitle>
                        {expandedSections.businessHours ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                    </div>
                </CardHeader>
                {expandedSections.businessHours && (
                    <CardContent>
                        <BusinessHoursEditor
                            value={formData.business_hours}
                            onChange={(hours) => setFormData({ ...formData, business_hours: hours })}
                        />
                    </CardContent>
                )}
            </Card>

            {/* Service Options */}
            <Card className="bg-gray-900 border-gray-800">
                <CardHeader
                    className="cursor-pointer"
                    onClick={() => toggleSection('serviceOptions')}
                >
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-white flex items-center gap-2">
                            <Truck className="h-5 w-5 text-orange-500" />
                            Fulfillment Options
                        </CardTitle>
                        {expandedSections.serviceOptions ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                    </div>
                    <CardDescription className="text-gray-500">
                        Configure which fulfillment methods are available at this specific location
                    </CardDescription>
                </CardHeader>
                {expandedSections.serviceOptions && (
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-gray-300">Pickup Available</Label>
                                <p className="text-sm text-gray-500">Allow customers to pick up orders at this location</p>
                            </div>
                            <Switch
                                checked={formData.is_pickup_available}
                                onCheckedChange={(checked) =>
                                    setFormData({ ...formData, is_pickup_available: checked })
                                }
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-gray-300">Delivery Available</Label>
                                <p className="text-sm text-gray-500">Deliver orders from this location</p>
                            </div>
                            <Switch
                                checked={formData.is_delivery_available}
                                onCheckedChange={(checked) =>
                                    setFormData({ ...formData, is_delivery_available: checked })
                                }
                            />
                        </div>

                        {formData.is_delivery_available && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-gray-300">Coverage Radius</Label>
                                    <span className="text-white font-medium">
                                        {formData.coverage_radius_miles} miles
                                    </span>
                                </div>
                                <Slider
                                    value={[formData.coverage_radius_miles]}
                                    onValueChange={([value]) =>
                                        setFormData({ ...formData, coverage_radius_miles: value })
                                    }
                                    min={1}
                                    max={50}
                                    step={1}
                                    className="w-full"
                                />
                                <p className="text-sm text-gray-500">
                                    Maximum distance for deliveries from this location
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label className="text-gray-300">Timezone</Label>
                            <Select
                                value={formData.timezone}
                                onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                            >
                                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700">
                                    {TIMEZONES.map((tz) => (
                                        <SelectItem
                                            key={tz.value}
                                            value={tz.value}
                                            className="text-white hover:bg-gray-700"
                                        >
                                            {tz.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="pt-4 border-t border-gray-800">
                            <p className="text-sm text-gray-500">
                                For delivery fees, free shipping thresholds, and estimated times, go to{' '}
                                <button
                                    type="button"
                                    onClick={() => router.push('/dashboard/store/delivery')}
                                    className="text-orange-400 hover:text-orange-300 underline"
                                >
                                    Delivery Settings
                                </button>
                            </p>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* Status */}
            <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Settings className="h-5 w-5 text-orange-500" />
                        Status
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-gray-300">Location Active</Label>
                            <p className="text-sm text-gray-500">
                                Inactive locations won&apos;t appear to customers
                            </p>
                        </div>
                        <Switch
                            checked={formData.is_active}
                            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 pt-4">
                <Button
                    variant="outline"
                    onClick={() => router.push('/dashboard/store/locations')}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="bg-orange-600 hover:bg-orange-700"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Saving...
                        </>
                    ) : mode === 'edit' ? (
                        'Update Location'
                    ) : (
                        'Create Location'
                    )}
                </Button>
            </div>
        </div>
    )
}
